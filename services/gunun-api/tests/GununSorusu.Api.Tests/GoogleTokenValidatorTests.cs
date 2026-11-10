using GununSorusu.Api.Auth;
using GununSorusu.Api.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace GununSorusu.Api.Tests;

/// <summary>Gerçek doğrulayıcı: bozuk jetonlar sunucu hatası (500) değil, "geçersiz" (null) olmalı.</summary>
public sealed class GoogleTokenValidatorTests
{
    private static GoogleTokenValidator Create(params string[] clientIds) =>
        new(Options.Create(new GoogleAuthOptions { ClientIds = clientIds }), NullLogger<GoogleTokenValidator>.Instance);

    [Theory]
    [InlineData("sahte-jeton")]
    [InlineData("a.b.c")]
    [InlineData("eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0.imza")]
    public async Task Malformed_tokens_are_rejected_without_throwing(string token)
    {
        Assert.Null(await Create("istemci.apps.googleusercontent.com").ValidateAsync(token, CancellationToken.None));
    }

    [Fact]
    public void Disabled_without_client_ids()
    {
        Assert.False(Create().Enabled);
        Assert.False(Create(" ").Enabled);
        Assert.True(Create("istemci.apps.googleusercontent.com").Enabled);
    }
}
