using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using GununSorusu.Api.Data;
using GununSorusu.Api.Jobs;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Testcontainers.PostgreSql;

namespace GununSorusu.Api.Tests.Infrastructure;

/// <summary>Testlerin elle ileri-geri alabildiği saat.</summary>
public sealed class TestClock : TimeProvider
{
    public DateTimeOffset UtcNow { get; set; }
    public override DateTimeOffset GetUtcNow() => UtcNow;

    /// <summary>İstanbul saatiyle ayarlar.</summary>
    public void SetIstanbul(int year, int month, int day, int hour = 12, int minute = 0, int second = 0) =>
        UtcNow = new DateTimeOffset(year, month, day, hour, minute, second, TimeSpan.FromHours(3)).ToUniversalTime();

    public void Advance(TimeSpan by) => UtcNow += by;
}

/// <summary>Gerçek Postgres (Testcontainers) üzerinde tüm API. Tüm testler tek kapsayıcıyı paylaşır.</summary>
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string AdminKey = "test-admin-key";

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    private readonly PostgreSqlContainer _pg = new PostgreSqlBuilder("postgres:16-alpine").Build();

    public TestClock Clock { get; } = new();

    public async Task InitializeAsync()
    {
        await _pg.StartAsync();
        _ = Services; // Sunucuyu başlat → migration'lar uygulanır.
    }

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _pg.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Gunun", _pg.GetConnectionString());
        builder.UseSetting("Auth:SigningKey", "test-imza-anahtari-en-az-otuz-iki-bayt-uzunlugunda");
        builder.UseSetting("Admin:ApiKey", AdminKey);
        builder.UseSetting("Game:LaunchDay", "2026-12-01");
        builder.UseSetting("Jobs:Enabled", "false");
        builder.UseSetting("Database:MigrateOnStartup", "true");
        builder.UseSetting("RateLimit:PerMinute", "100000");
        builder.UseSetting("RateLimit:AuthPerMinute", "100000");
        builder.ConfigureTestServices(s =>
        {
            s.RemoveAll<TimeProvider>();
            s.AddSingleton<TimeProvider>(Clock);
        });
    }

    /// <summary>Her testten önce: tablolar boşaltılır, saat 10 Aralık 2026 12:00 (İstanbul) olur.</summary>
    public async Task ResetAsync()
    {
        Clock.SetIstanbul(2026, 12, 10);
        await WithDbAsync(db => db.Database.ExecuteSqlRawAsync(
            "TRUNCATE league_members, leagues, question_crowd, poll_votes, player_stats, plays, players, questions RESTART IDENTITY CASCADE"));
    }

    public async Task WithDbAsync(Func<GunDbContext, Task> action)
    {
        await using var scope = Services.CreateAsyncScope();
        await action(scope.ServiceProvider.GetRequiredService<GunDbContext>());
    }

    public async Task<T> WithDbAsync<T>(Func<GunDbContext, Task<T>> action)
    {
        await using var scope = Services.CreateAsyncScope();
        return await action(scope.ServiceProvider.GetRequiredService<GunDbContext>());
    }

    public async Task RunJobsAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<DailyJobRunner>().RunAsync(refreshCrowd: true, CancellationToken.None);
    }

    public HttpClient Admin()
    {
        var c = CreateClient();
        c.DefaultRequestHeaders.Add("X-Admin-Key", AdminKey);
        return c;
    }

    /// <summary>Yeni bir cihazla oturum açmış istemci.</summary>
    public async Task<HttpClient> PlayerAsync(string? deviceId = null)
    {
        var c = CreateClient();
        var res = await c.PostAsJsonAsync("/auth/device", new { deviceId = deviceId ?? Guid.NewGuid().ToString() });
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.GetProperty("token").GetString());
        return c;
    }
}

[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "api";
}

/// <summary>Testler sırayla çalışır (ortak saat ve veritabanı), her test temiz başlar.</summary>
[Collection(ApiCollection.Name)]
public abstract class ApiTest(ApiFactory api) : IAsyncLifetime
{
    protected ApiFactory Api { get; } = api;
    protected TestClock Clock => Api.Clock;

    public Task InitializeAsync() => Api.ResetAsync();
    public Task DisposeAsync() => Task.CompletedTask;
}
