using System.Net;
using Microsoft.AspNetCore.HttpOverrides;

namespace GununSorusu.Api.Infrastructure;

/// <summary>
/// Cloudflare + Caddy arkasında gerçek istemci IP'si: hız sınırı IP'ye göre bölündüğü için, proxy adresi
/// tanınmazsa bütün anonim trafik ve /auth/device tek kovaya düşer (bir kişi herkesin kaydını kilitler).
/// Başlığa yalnızca tanımlı proxy'lerden gelirse güvenilir; başkasının gönderdiği X-Forwarded-For yok sayılır.
/// </summary>
public static class ProxySetup
{
    public static void Apply(ForwardedHeadersOptions options, ProxyOptions proxy)
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

        foreach (var address in proxy.KnownProxies)
        {
            if (!IPAddress.TryParse(address, out var ip))
                throw new InvalidOperationException($"Proxy:KnownProxies içinde geçersiz adres: '{address}'.");
            options.KnownProxies.Add(ip);
        }

        foreach (var network in proxy.KnownNetworks)
        {
            if (!System.Net.IPNetwork.TryParse(network, out var parsed))
                throw new InvalidOperationException($"Proxy:KnownNetworks içinde geçersiz ağ: '{network}' (CIDR bekleniyor).");
            options.KnownIPNetworks.Add(parsed);
        }
    }
}
