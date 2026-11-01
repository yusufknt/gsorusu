using System.Net;
using GununSorusu.Api.Data;
using GununSorusu.Api.Tests.Infrastructure;
using static GununSorusu.Api.Tests.Infrastructure.Q;

namespace GununSorusu.Api.Tests;

public sealed class AuthAndQuestionTests(ApiFactory api) : ApiTest(api)
{
    [Fact]
    public async Task Same_device_gets_same_player()
    {
        var c = Api.CreateClient();
        var first = (await c.PostJsonAsync("/auth/device", new { deviceId = "cihaz-1234567890abcdef" })).Ok();
        var second = (await c.PostJsonAsync("/auth/device", new { deviceId = "cihaz-1234567890abcdef" })).Ok();

        Assert.True(first["isNew"].GetBoolean());
        Assert.False(second["isNew"].GetBoolean());
        Assert.Equal(first["playerId"].GetString(), second["playerId"].GetString());
    }

    [Fact]
    public async Task Raw_device_id_is_not_stored()
    {
        await Api.PlayerAsync("gizli-cihaz-kimligi-12345");
        var stored = await Api.WithDbAsync(db => Task.FromResult(db.Players.Single().DeviceIdHash));
        Assert.DoesNotContain("gizli", stored);
        Assert.Equal(64, stored.Length);
    }

    [Fact]
    public async Task Invalid_device_id_returns_turkish_problem()
    {
        var res = await Api.CreateClient().PostJsonAsync("/auth/device", new { deviceId = "kisa" });
        Assert.Equal(HttpStatusCode.BadRequest, res.Status);
        Assert.Equal("invalid_device_id", res.Code);
        Assert.Equal("Cihaz kimliği geçersiz.", res["title"].GetString());
    }

    [Fact]
    public async Task Protected_endpoints_require_token()
    {
        var res = await Api.CreateClient().GetJsonAsync("/stats/me");
        Assert.Equal(HttpStatusCode.Unauthorized, res.Status);
        Assert.Equal("unauthorized", res.Code);
    }

    [Fact]
    public async Task Profile_can_be_updated_and_validated()
    {
        var c = await Api.PlayerAsync();
        var me = (await c.SendAsync(new HttpRequestMessage(HttpMethod.Patch, "/me")
        {
            Content = System.Net.Http.Json.JsonContent.Create(new { displayName = " Enes ", city = "İzmir", notifyHour = 8 }),
        }));
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);

        var after = (await c.GetJsonAsync("/me")).Ok();
        Assert.Equal("Enes", after["displayName"].GetString());
        Assert.Equal(8, after["notifyHour"].GetInt32());

        var bad = await c.SendAsync(new HttpRequestMessage(HttpMethod.Patch, "/me")
        {
            Content = System.Net.Http.Json.JsonContent.Create(new { notifyHour = 25 }),
        });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }

    [Fact]
    public async Task Public_question_never_contains_the_answer()
    {
        await Api.SeedAsync(Price(Dec(10), answer: 123.45m));
        var res = (await Api.CreateClient().GetJsonAsync("/q/today")).Ok();

        Assert.Equal("price", res["format"].GetString());
        Assert.Equal(10, res["no"].GetInt32());
        Assert.Equal(6, res["maxAttempts"].GetInt32());
        Assert.DoesNotContain("123.45", res.Body.GetRawText());
        Assert.DoesNotContain("Biliyor muydun", res.Body.GetRawText());
    }

    [Fact]
    public async Task Public_trivia_hides_options_until_start()
    {
        await Api.SeedAsync(Trivia(Dec(10)));
        var res = (await Api.CreateClient().GetJsonAsync("/q/today")).Ok();
        Assert.Equal(System.Text.Json.JsonValueKind.Null, res["options"].ValueKind);
        Assert.Equal(30, res["timeLimitSec"].GetInt32());
    }

    [Fact]
    public async Task Future_and_draft_questions_are_hidden()
    {
        var draft = Price(Dec(10));
        draft.Status = QuestionStatus.Draft;
        await Api.SeedAsync(draft, Price(Dec(11)));
        var c = Api.CreateClient();

        var today = await c.GetJsonAsync("/q/today");
        Assert.Equal(HttpStatusCode.NotFound, today.Status);
        Assert.Equal("question_not_ready", today.Code);

        Assert.Equal(HttpStatusCode.NotFound, (await c.GetJsonAsync($"/q/{D(Dec(11))}")).Status);
    }

    [Fact]
    public async Task Question_appears_at_istanbul_midnight()
    {
        await Api.SeedAsync(Price(Dec(11)));
        var c = Api.CreateClient();

        Clock.SetIstanbul(2026, 12, 10, 23, 59, 59);
        Assert.Equal(HttpStatusCode.NotFound, (await c.GetJsonAsync("/q/today")).Status);

        Clock.SetIstanbul(2026, 12, 11, 0, 0, 0);
        Assert.Equal(11, (await c.GetJsonAsync("/q/today")).Ok()["no"].GetInt32());
    }

    [Fact]
    public async Task Health_reports_ok()
    {
        (await Api.CreateClient().GetJsonAsync("/health")).Ok();
    }
}
