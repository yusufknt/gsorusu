using System.Net;
using GununSorusu.Api.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;

namespace GununSorusu.Api.Tests;

/// <summary>Başlangıç yapılandırması: proxy arkasında gerçek IP ve geliştirme sırlarının üretime sızmaması. Veritabanı gerekmez.</summary>
public class StartupConfigTests
{
    private const string StrongKey = "uretim-icin-rastgele-uzun-bir-imza-anahtari-0123456789";

    [Fact]
    public void Proxy_ayari_bossa_yalnizca_loopback_guvenilir()
    {
        var options = new ForwardedHeadersOptions();

        ProxySetup.Apply(options, new ProxyOptions());

        Assert.Equal(ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto, options.ForwardedHeaders);
        Assert.Contains(options.KnownIPNetworks, n => n.Contains(IPAddress.Loopback));
        Assert.DoesNotContain(options.KnownProxies, ip => !IPAddress.IsLoopback(ip));
        Assert.DoesNotContain(options.KnownIPNetworks, n => !IPAddress.IsLoopback(n.BaseAddress));
    }

    [Fact]
    public void Tanimli_proxy_ve_aglar_guvenilenlere_eklenir()
    {
        var options = new ForwardedHeadersOptions();

        ProxySetup.Apply(options, new ProxyOptions { KnownProxies = ["10.0.0.5"], KnownNetworks = ["172.16.0.0/12"] });

        Assert.Contains(IPAddress.Parse("10.0.0.5"), options.KnownProxies);
        Assert.Contains(options.KnownIPNetworks, n => n.BaseAddress.Equals(IPAddress.Parse("172.16.0.0")) && n.PrefixLength == 12);
    }

    [Theory]
    [InlineData("10.0.0.300")]
    [InlineData("172.16.0.0/40")]
    public void Gecersiz_proxy_adresi_baslangicta_reddedilir(string bad)
    {
        var options = new ForwardedHeadersOptions();
        var proxy = bad.Contains('/') ? new ProxyOptions { KnownNetworks = [bad] } : new ProxyOptions { KnownProxies = [bad] };

        Assert.Throws<InvalidOperationException>(() => ProxySetup.Apply(options, proxy));
    }

    [Fact]
    public void Gelistirme_imza_anahtari_uretimde_reddedilir()
    {
        var auth = new AuthOptions { SigningKey = StartupGuards.DevSigningKey };

        Assert.Throws<InvalidOperationException>(() => StartupGuards.RejectDevSecrets("Production", auth, new AdminOptions()));
    }

    [Fact]
    public void Gelistirme_yonetim_anahtari_uretimde_reddedilir()
    {
        var admin = new AdminOptions { ApiKey = StartupGuards.DevAdminKey };

        Assert.Throws<InvalidOperationException>(() => StartupGuards.RejectDevSecrets("Production", new AuthOptions { SigningKey = StrongKey }, admin));
    }

    [Fact]
    public void Gelistirme_ortaminda_gelistirme_sirlari_kabul_edilir()
    {
        var auth = new AuthOptions { SigningKey = StartupGuards.DevSigningKey };
        var admin = new AdminOptions { ApiKey = StartupGuards.DevAdminKey };

        StartupGuards.RejectDevSecrets("Development", auth, admin);
    }

    [Fact]
    public void Uretimde_kendi_anahtarlariyla_acilir()
    {
        StartupGuards.RejectDevSecrets("Production", new AuthOptions { SigningKey = StrongKey }, new AdminOptions { ApiKey = "baska-bir-uzun-yonetim-anahtari" });
    }
}
