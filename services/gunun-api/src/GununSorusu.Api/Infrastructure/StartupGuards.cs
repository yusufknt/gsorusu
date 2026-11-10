namespace GununSorusu.Api.Infrastructure;

/// <summary>
/// appsettings.Development.json depoda herkese açık. Ortam yanlışlıkla Development dışında bu anahtarlarla
/// açılırsa herkes JWT üretebilir ve /admin'e girebilir; bu yüzden başlangıçta reddedilir.
/// </summary>
public static class StartupGuards
{
    public const string DevSigningKey = "yalnizca-gelistirme-icin-imza-anahtari-uretimde-kullanma";
    public const string DevAdminKey = "dev-admin-key";

    public static void RejectDevSecrets(string environment, AuthOptions auth, AdminOptions admin)
    {
        if (string.Equals(environment, "Development", StringComparison.OrdinalIgnoreCase)) return;

        if (auth.SigningKey == DevSigningKey)
            throw new InvalidOperationException("Geliştirme imza anahtarı Development dışında kullanılamaz (Auth__SigningKey).");
        if (admin.ApiKey == DevAdminKey)
            throw new InvalidOperationException("Geliştirme yönetim anahtarı Development dışında kullanılamaz (Admin__ApiKey).");
    }
}
