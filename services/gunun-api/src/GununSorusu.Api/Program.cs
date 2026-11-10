using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using GununSorusu.Api.Admin;
using GununSorusu.Api.Auth;
using GununSorusu.Api.Data;
using GununSorusu.Api.Game;
using GununSorusu.Api.Infrastructure;
using GununSorusu.Api.Jobs;
using GununSorusu.Domain;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var services = builder.Services;
var config = builder.Configuration;

services.Configure<GameOptions>(config.GetSection("Game"));
services.Configure<AuthOptions>(config.GetSection("Auth"));
services.Configure<GoogleAuthOptions>(config.GetSection("Google"));
services.Configure<AdminOptions>(config.GetSection("Admin"));
services.Configure<RateLimitOptions>(config.GetSection("RateLimit"));
services.Configure<ProxyOptions>(config.GetSection("Proxy"));
services.AddOptions<ForwardedHeadersOptions>()
    .Configure<IOptions<ProxyOptions>>((fwd, proxy) => ProxySetup.Apply(fwd, proxy.Value));
services.Configure<JobOptions>(config.GetSection("Jobs"));

services.AddSingleton(TimeProvider.System);
services.AddSingleton<GameClock>();
services.AddSingleton<TokenService>();
services.AddSingleton<IGoogleTokenValidator, GoogleTokenValidator>();
services.AddScoped<StreakService>();
services.AddScoped<PlayService>();
services.AddScoped<DailyJobRunner>();
services.AddHostedService<DailyJobs>();

services.AddDbContext<GunDbContext>((sp, o) => o
    .UseNpgsql(sp.GetRequiredService<IConfiguration>().GetConnectionString("Gunun")
               ?? throw new InvalidOperationException("ConnectionStrings:Gunun tanımlı değil."))
    .UseSnakeCaseNamingConvention());

services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));
services.Configure<RouteHandlerOptions>(o => o.ThrowOnBadRequest = true);
services.AddProblemDetails(o => o.CustomizeProblemDetails = ApiExceptionHandler.Customize);
services.AddExceptionHandler<ApiExceptionHandler>();
services.AddOpenApi();

services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<AuthOptions>>((jwt, auth) =>
    {
        var a = auth.Value;
        jwt.MapInboundClaims = false;
        jwt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = a.Issuer,
            ValidAudience = a.Audience,
            IssuerSigningKey = TokenService.SigningKey(a),
            ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
            ClockSkew = TimeSpan.FromMinutes(2),
        };
    });
services.AddAuthorization();

services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(http =>
    {
        var key = http.User.FindFirst("sub")?.Value ?? http.Connection.RemoteIpAddress?.ToString() ?? "anon";
        var limit = http.RequestServices.GetRequiredService<IOptions<RateLimitOptions>>().Value.PerMinute;
        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = limit,
            Window = TimeSpan.FromMinutes(1),
        });
    });
    o.AddPolicy("auth", http =>
    {
        var key = http.Connection.RemoteIpAddress?.ToString() ?? "anon";
        var limit = http.RequestServices.GetRequiredService<IOptions<RateLimitOptions>>().Value.AuthPerMinute;
        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = limit,
            Window = TimeSpan.FromMinutes(1),
        });
    });
});

var app = builder.Build();

// Yanlış yapılandırmayla açılmasın: imza anahtarı ilk istekte değil, başlangıçta denetlenir.
var authOptions = app.Services.GetRequiredService<IOptions<AuthOptions>>().Value;
TokenService.SigningKey(authOptions);
StartupGuards.RejectDevSecrets(app.Environment.EnvironmentName, authOptions, app.Services.GetRequiredService<IOptions<AdminOptions>>().Value);
_ = app.Services.GetRequiredService<IOptions<ForwardedHeadersOptions>>().Value; // geçersiz Proxy ayarı başlangıçta düşsün

if (config.GetValue("Database:MigrateOnStartup", false))
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<GunDbContext>().Database.MigrateAsync();
}

if (config.GetValue("Seed:DevQuestions", false)) await DevSeeder.SeedAsync(app.Services);

// Hız sınırı ve günlükler gerçek istemci IP'sini görsün diye her şeyden önce.
app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

if (app.Environment.IsDevelopment()) app.MapOpenApi();

app.MapGet("/health", async (GunDbContext db, CancellationToken ct) =>
    await db.Database.CanConnectAsync(ct) ? Results.Ok(new { status = "ok" }) : Results.StatusCode(503));

app.MapAuthEndpoints();
app.MapGameEndpoints();
app.MapAdminEndpoints();

app.Run();

public partial class Program;
