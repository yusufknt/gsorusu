namespace GununSorusu.Api.Infrastructure;

public sealed class GameOptions
{
    /// <summary>#1 numaralı sorunun günü. Soru numarası = gün − LaunchDay + 1.</summary>
    public DateOnly LaunchDay { get; set; } = new(2026, 12, 1);

    /// <summary>Arşivde oynanabilen geçmiş gün sayısı (plan: son 7 gün).</summary>
    public int ArchiveDays { get; set; } = 7;
}

public sealed class AuthOptions
{
    /// <summary>HS256 anahtarı, en az 32 bayt. Üretimde ortam değişkeninden gelir (Auth__SigningKey).</summary>
    public string SigningKey { get; set; } = "";

    public string Issuer { get; set; } = "gunun-api";
    public string Audience { get; set; } = "gunun-app";
    public int TokenDays { get; set; } = 180;
}

public sealed class AdminOptions
{
    /// <summary>
    /// Geçici yönetim anahtarı (X-Admin-Key). Soru paneli (v1.1) gelene kadar soru girişi için.
    /// Boşsa /admin uç noktaları tamamen kapalıdır.
    /// </summary>
    public string ApiKey { get; set; } = "";
}

public sealed class ProxyOptions
{
    /// <summary>
    /// X-Forwarded-For başlığına güvenilen proxy adresleri (ör. Caddy). Boşsa yalnızca loopback güvenilir.
    /// Ortam değişkeni: Proxy__KnownProxies__0=10.0.0.5
    /// </summary>
    public string[] KnownProxies { get; set; } = [];

    /// <summary>Güvenilen proxy ağları, CIDR (ör. Docker ağı 172.16.0.0/12). Ortam değişkeni: Proxy__KnownNetworks__0</summary>
    public string[] KnownNetworks { get; set; } = [];
}

public sealed class RateLimitOptions
{
    /// <summary>Oyuncu (ya da IP) başına dakikalık istek sınırı.</summary>
    public int PerMinute { get; set; } = 120;

    /// <summary>IP başına dakikalık cihaz kaydı sınırı.</summary>
    public int AuthPerMinute { get; set; } = 10;
}
