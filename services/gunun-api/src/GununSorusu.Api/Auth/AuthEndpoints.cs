using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using GununSorusu.Api.Data;
using GununSorusu.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace GununSorusu.Api.Auth;

public sealed class TokenService(IOptions<AuthOptions> options)
{
    public string Issue(Guid playerId)
    {
        var o = options.Value;
        // Jetonun ömrü duvar saatine göredir; oyun günü (GameClock) ile karıştırılmaz.
        var now = DateTime.UtcNow;
        return new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = o.Issuer,
            Audience = o.Audience,
            Claims = new Dictionary<string, object> { [JwtRegisteredClaimNames.Sub] = playerId.ToString() },
            IssuedAt = now,
            NotBefore = now,
            Expires = now.AddDays(o.TokenDays),
            SigningCredentials = new SigningCredentials(SigningKey(o), SecurityAlgorithms.HmacSha256),
        });
    }

    public static SymmetricSecurityKey SigningKey(AuthOptions o)
    {
        var bytes = Encoding.UTF8.GetBytes(o.SigningKey);
        if (bytes.Length < 32)
            throw new InvalidOperationException("Auth:SigningKey en az 32 bayt olmalı (ortam değişkeni Auth__SigningKey).");
        return new SymmetricSecurityKey(bytes);
    }
}

public static class PlayerIdentity
{
    public static Guid PlayerId(this ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirstValue(JwtRegisteredClaimNames.Sub), out var id)
            ? id
            : throw new ApiException(401, "unauthorized", "Oturumun sona erdi. Uygulamayı yeniden aç.");
}

public sealed record DeviceAuthRequest(string? DeviceId);

public sealed record DeviceAuthResponse(string Token, Guid PlayerId, bool IsNew);

public sealed record GoogleAuthRequest(string? IdToken);

/// <param name="Switched">true: bu Google hesabı başka bir oyuncuya bağlıydı, oturum o oyuncuya geçti.</param>
public sealed record GoogleAuthResponse(string Token, Guid PlayerId, string? Email, string? DisplayName, bool Switched);

/// <param name="AuthProvider">null (misafir) ya da "google".</param>
public sealed record MeResponse(
    Guid PlayerId,
    string? DisplayName,
    string? City,
    int NotifyHour,
    DateTimeOffset CreatedAt,
    string? AuthProvider,
    string? Email);

public sealed record UpdateMeRequest(string? DisplayName, string? City, int? NotifyHour);

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        // Üyeliksiz oynama: uygulama ilk açılışta rastgele bir cihaz kimliği üretip güvenli depoda saklar.
        app.MapPost("/auth/device", async (DeviceAuthRequest req, GunDbContext db, TokenService tokens, TimeProvider time, CancellationToken ct) =>
        {
            var deviceId = req.DeviceId?.Trim();
            if (deviceId is null || deviceId.Length is < 16 or > 128)
                throw ApiException.BadRequest("invalid_device_id", "Cihaz kimliği geçersiz.");

            var hash = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(deviceId)));
            var player = await db.Players.SingleOrDefaultAsync(p => p.DeviceIdHash == hash, ct);
            var isNew = player is null;
            if (player is null)
            {
                player = new Player { Id = Guid.CreateVersion7(), DeviceIdHash = hash, CreatedAt = time.GetUtcNow() };
                db.Players.Add(player);
                await db.SaveChangesAsync(ct);
            }

            return new DeviceAuthResponse(tokens.Issue(player.Id), player.Id, isNew);
        }).RequireRateLimiting("auth");

        // Google ile giriş. Uygulama önce cihaz oturumu açar; bu uç nokta o oturumu Google hesabına bağlar:
        // - Google hesabı hiçbir oyuncuya bağlı değilse: cihazdaki oyuncu bağlanır, seri ve puanlar korunur.
        // - Google hesabı başka bir oyuncuya bağlıysa (ör. yeni telefon): oturum o oyuncuya geçer.
        app.MapPost("/auth/google", async (
            GoogleAuthRequest req, ClaimsPrincipal user, GunDbContext db, TokenService tokens,
            IGoogleTokenValidator google, TimeProvider time, CancellationToken ct) =>
        {
            if (!google.Enabled)
                throw new ApiException(StatusCodes.Status503ServiceUnavailable, "google_disabled", "Google ile giriş şu an kullanılamıyor.");

            var idToken = req.IdToken?.Trim();
            var identity = string.IsNullOrEmpty(idToken) || idToken.Length > 8192 ? null : await google.ValidateAsync(idToken, ct);
            if (identity is null)
                throw ApiException.BadRequest("invalid_google_token", "Google girişi doğrulanamadı. Lütfen tekrar dene.");

            var current = await LoadAsync(db, user, ct);
            var target = await db.Players.SingleOrDefaultAsync(p => p.GoogleSub == identity.Subject, ct);
            if (target is null && current.GoogleSub is null)
            {
                target = current;
            }
            else if (target is null)
            {
                // Bu cihazdaki oyuncu başka bir Google hesabına bağlı: yeni hesap için yeni oyuncu açılır.
                target = new Player
                {
                    Id = Guid.CreateVersion7(),
                    DeviceIdHash = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes($"google:{identity.Subject}"))),
                    CreatedAt = time.GetUtcNow(),
                };
                db.Players.Add(target);
            }

            target.GoogleSub = identity.Subject;
            target.AuthProvider = "google";
            if (identity.Email is { Length: <= 254 } email) target.Email = email;
            if (target.DisplayName is null && identity.Name?.Trim() is { Length: > 0 } name)
                target.DisplayName = name.Length > 24 ? name[..24].TrimEnd() : name;

            await db.SaveChangesAsync(ct);
            return new GoogleAuthResponse(tokens.Issue(target.Id), target.Id, target.Email, target.DisplayName, Switched: target.Id != current.Id);
        }).RequireAuthorization().RequireRateLimiting("auth");

        var me = app.MapGroup("/me").RequireAuthorization();

        me.MapGet("", async (ClaimsPrincipal user, GunDbContext db, CancellationToken ct) => ToResponse(await LoadAsync(db, user, ct)));

        me.MapPatch("", async (UpdateMeRequest req, ClaimsPrincipal user, GunDbContext db, CancellationToken ct) =>
        {
            var player = await LoadAsync(db, user, ct);

            if (req.DisplayName is not null)
            {
                var name = req.DisplayName.Trim();
                if (name.Length > 24) throw ApiException.BadRequest("invalid_display_name", "Görünen ad en fazla 24 karakter olabilir.");
                player.DisplayName = name.Length == 0 ? null : name;
            }

            if (req.City is not null)
            {
                var city = req.City.Trim();
                if (city.Length > 40) throw ApiException.BadRequest("invalid_city", "Şehir adı en fazla 40 karakter olabilir.");
                player.City = city.Length == 0 ? null : city;
            }

            if (req.NotifyHour is { } hour)
            {
                if (hour is < 0 or > 23) throw ApiException.BadRequest("invalid_notify_hour", "Bildirim saati 0 ile 23 arasında olmalı.");
                player.NotifyHour = hour;
            }

            await db.SaveChangesAsync(ct);
            return ToResponse(player);
        });
    }

    private static async Task<Player> LoadAsync(GunDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        await db.Players.FindAsync([user.PlayerId()], ct)
        ?? throw new ApiException(401, "unauthorized", "Oturumun sona erdi. Uygulamayı yeniden aç.");

    private static MeResponse ToResponse(Player p) => new(p.Id, p.DisplayName, p.City, p.NotifyHour, p.CreatedAt, p.AuthProvider, p.Email);
}
