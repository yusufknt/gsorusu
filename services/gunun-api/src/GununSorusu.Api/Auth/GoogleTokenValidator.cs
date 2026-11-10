using Google.Apis.Auth;
using GununSorusu.Api.Infrastructure;
using Microsoft.Extensions.Options;

namespace GununSorusu.Api.Auth;

/// <summary>Google'ın doğruladığı kimlik. <see cref="Subject"/> Google hesabının değişmez kimliğidir.</summary>
public sealed record GoogleIdentity(string Subject, string? Email, string? Name);

public interface IGoogleTokenValidator
{
    /// <summary>Google istemci kimliği tanımlı değilse Google ile giriş kapalıdır.</summary>
    bool Enabled { get; }

    /// <summary>id_token geçerliyse kimliği, değilse null döner.</summary>
    Task<GoogleIdentity?> ValidateAsync(string idToken, CancellationToken ct);
}

/// <summary>
/// id_token'ı Google'ın açık anahtarlarıyla doğrular: imza, süre, yayıncı (accounts.google.com) ve
/// hedef kitle (bizim istemci kimliklerimizden biri olmalı). Anahtarlar kütüphane tarafından önbelleklenir.
/// </summary>
public sealed class GoogleTokenValidator(IOptions<GoogleAuthOptions> options, ILogger<GoogleTokenValidator> log) : IGoogleTokenValidator
{
    public bool Enabled => options.Value.ClientIds.Any(id => !string.IsNullOrWhiteSpace(id));

    public async Task<GoogleIdentity?> ValidateAsync(string idToken, CancellationToken ct)
    {
        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = options.Value.ClientIds.Where(id => !string.IsNullOrWhiteSpace(id)).ToArray(),
            });
            return new GoogleIdentity(payload.Subject, payload.EmailVerified ? payload.Email : null, payload.Name);
        }
        // Bozuk jetonda kütüphane InvalidJwtException dışında FormatException / JSON hataları da atar.
        // Google'ın anahtarlarına ulaşılamaması (ağ) ise geçersiz jeton değildir; sunucu hatası olarak kalır.
        catch (Exception e) when (e is not (HttpRequestException or OperationCanceledException))
        {
            log.LogInformation("Geçersiz Google id_token ({Type}): {Reason}", e.GetType().Name, e.Message);
            return null;
        }
    }
}
