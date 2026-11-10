using System.Net;
using System.Net.Http.Headers;
using GununSorusu.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using static GununSorusu.Api.Tests.Infrastructure.Q;

namespace GununSorusu.Api.Tests;

public sealed class GoogleAuthTests(ApiFactory api) : ApiTest(api)
{
    private static async Task<ApiResponse> SignInAsync(HttpClient c, string idToken)
    {
        var res = await c.PostJsonAsync("/auth/google", new { idToken });
        if (res.Status == HttpStatusCode.OK)
            c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", res["token"].GetString());
        return res;
    }

    [Fact]
    public async Task First_sign_in_links_the_device_player_and_keeps_progress()
    {
        await Api.SeedAsync(Price(Dec(10), answer: 100m));
        var c = await Api.PlayerAsync();
        var before = (await c.GetJsonAsync("/me")).Ok()["playerId"].GetString();
        (await c.PostJsonAsync("/plays/2026-12-10/guess", new { value = 50 })).Ok();

        var res = (await SignInAsync(c, FakeGoogle.Token("g-1", "ayse@example.com", "Ayşe Yılmaz"))).Ok();

        Assert.Equal(before, res["playerId"].GetString());
        Assert.False(res["switched"].GetBoolean());
        Assert.Equal("Ayşe Yılmaz", res["displayName"].GetString());

        var me = (await c.GetJsonAsync("/me")).Ok();
        Assert.Equal(before, me["playerId"].GetString());
        Assert.Equal("google", me["authProvider"].GetString());
        Assert.Equal("ayse@example.com", me["email"].GetString());
        Assert.Equal(1, await Api.WithDbAsync(db => db.Plays.CountAsync()));
    }

    [Fact]
    public async Task Existing_display_name_is_not_overwritten()
    {
        var c = await Api.PlayerAsync();
        await c.SendAsync(new HttpRequestMessage(HttpMethod.Patch, "/me")
        {
            Content = System.Net.Http.Json.JsonContent.Create(new { displayName = "Enes" }),
        });

        var res = (await SignInAsync(c, FakeGoogle.Token("g-1", "enes@example.com", "Enes Kaya"))).Ok();
        Assert.Equal("Enes", res["displayName"].GetString());
    }

    [Fact]
    public async Task Same_google_account_on_new_device_returns_the_same_player()
    {
        var phone = await Api.PlayerAsync();
        var linked = (await SignInAsync(phone, FakeGoogle.Token("g-1", "a@example.com"))).Ok()["playerId"].GetString();

        var laptop = await Api.PlayerAsync();
        var res = (await SignInAsync(laptop, FakeGoogle.Token("g-1", "a@example.com"))).Ok();

        Assert.Equal(linked, res["playerId"].GetString());
        Assert.True(res["switched"].GetBoolean());
        Assert.Equal(linked, (await laptop.GetJsonAsync("/me")).Ok()["playerId"].GetString());
    }

    [Fact]
    public async Task Signing_in_again_is_idempotent()
    {
        var c = await Api.PlayerAsync();
        var first = (await SignInAsync(c, FakeGoogle.Token("g-1"))).Ok()["playerId"].GetString();
        var second = (await SignInAsync(c, FakeGoogle.Token("g-1"))).Ok();

        Assert.Equal(first, second["playerId"].GetString());
        Assert.False(second["switched"].GetBoolean());
        Assert.Equal(1, await Api.WithDbAsync(db => db.Players.CountAsync(p => p.GoogleSub == "g-1")));
    }

    [Fact]
    public async Task Different_google_account_on_a_linked_device_gets_its_own_player()
    {
        var c = await Api.PlayerAsync();
        var first = (await SignInAsync(c, FakeGoogle.Token("g-1"))).Ok()["playerId"].GetString();
        var second = (await SignInAsync(c, FakeGoogle.Token("g-2"))).Ok();

        Assert.NotEqual(first, second["playerId"].GetString());
        Assert.True(second["switched"].GetBoolean());
        Assert.Equal(2, await Api.WithDbAsync(db => db.Players.CountAsync(p => p.GoogleSub != null)));
    }

    [Fact]
    public async Task Invalid_token_returns_turkish_problem()
    {
        var c = await Api.PlayerAsync();
        var res = await SignInAsync(c, "sahte-jeton");

        Assert.Equal(HttpStatusCode.BadRequest, res.Status);
        Assert.Equal("invalid_google_token", res.Code);
        Assert.Equal("Google girişi doğrulanamadı. Lütfen tekrar dene.", res["title"].GetString());
    }

    [Fact]
    public async Task Requires_a_device_session()
    {
        var res = await Api.CreateClient().PostJsonAsync("/auth/google", new { idToken = FakeGoogle.Token("g-1") });
        Assert.Equal(HttpStatusCode.Unauthorized, res.Status);
    }
}
