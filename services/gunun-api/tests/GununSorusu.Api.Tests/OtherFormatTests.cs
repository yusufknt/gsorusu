using System.Net;
using GununSorusu.Api.Tests.Infrastructure;
using static GununSorusu.Api.Tests.Infrastructure.Q;

namespace GununSorusu.Api.Tests;

public sealed class OtherFormatTests(ApiFactory api) : ApiTest(api)
{
    private static readonly string Today = D(Dec(10));

    [Fact]
    public async Task Trivia_time_is_measured_on_the_server()
    {
        await Api.SeedAsync(Trivia(Dec(10)));
        var c = await Api.PlayerAsync();

        Assert.Equal("not_started", (await c.PostJsonAsync($"/plays/{Today}/answer", new { option = 2 })).Code);

        var started = (await c.PostJsonAsync($"/plays/{Today}/start")).Ok();
        Assert.Equal(4, started["trivia"].GetProperty("options").GetArrayLength());
        Assert.Equal(System.Text.Json.JsonValueKind.Null, started["reveal"].ValueKind);

        Clock.Advance(TimeSpan.FromSeconds(5));
        var answered = (await c.PostJsonAsync($"/plays/{Today}/answer", new { option = 2 })).Ok();

        // 1 sn ağ payı düşülür: 60 + 40 × (1 − 4/30) = 94,67 → 95
        Assert.Equal(95, answered["score"].GetInt32());
        Assert.True(answered["solved"].GetBoolean());
        Assert.Equal(2, answered["reveal"].GetProperty("correctOption").GetInt32());
    }

    [Fact]
    public async Task Restarting_trivia_does_not_reset_the_timer()
    {
        await Api.SeedAsync(Trivia(Dec(10)));
        var c = await Api.PlayerAsync();
        var first = (await c.PostJsonAsync($"/plays/{Today}/start")).Ok()["trivia"].GetProperty("startedAt").GetString();
        Clock.Advance(TimeSpan.FromSeconds(10));
        var second = (await c.PostJsonAsync($"/plays/{Today}/start")).Ok()["trivia"].GetProperty("startedAt").GetString();
        Assert.Equal(first, second);
    }

    [Fact]
    public async Task Late_trivia_answer_scores_zero()
    {
        await Api.SeedAsync(Trivia(Dec(10)));
        var c = await Api.PlayerAsync();
        await c.PostJsonAsync($"/plays/{Today}/start");
        Clock.Advance(TimeSpan.FromSeconds(40));

        var res = (await c.PostJsonAsync($"/plays/{Today}/answer", new { option = 2 })).Ok();
        Assert.True(res["finished"].GetBoolean());
        Assert.Equal(0, res["score"].GetInt32());
        Assert.True(res["trivia"].GetProperty("timedOut").GetBoolean());
    }

    [Fact]
    public async Task Abandoned_trivia_is_closed_by_the_job_and_still_counts_for_streak()
    {
        await Api.SeedAsync(Trivia(Dec(10)));
        var c = await Api.PlayerAsync();
        await c.PostJsonAsync($"/plays/{Today}/start");
        Clock.Advance(TimeSpan.FromMinutes(5));
        await Api.RunJobsAsync();

        var stats = (await c.GetJsonAsync("/stats/me")).Ok();
        Assert.Equal(1, stats["played"].GetInt32());
        Assert.Equal(1, stats["currentStreak"].GetInt32());
        Assert.Equal(0, stats["scoreSum"].GetInt32());
    }

    [Fact]
    public async Task Compare_scores_20_per_correct_round()
    {
        await Api.SeedAsync(Compare(Dec(10)));
        var c = await Api.PlayerAsync();
        int[] choices = [0, 1, 0, 1, 1]; // son tur yanlış

        ApiResponse res = null!;
        for (var i = 0; i < choices.Length; i++)
        {
            res = (await c.PostJsonAsync($"/plays/{Today}/compare", new { round = i, choice = choices[i] })).Ok();
            var answered = res["compare"].GetProperty("answered");
            Assert.Equal(i + 1, answered.GetArrayLength());
            Assert.Equal($"{i}a", answered[i].GetProperty("valueA").GetString());
        }

        Assert.True(res["finished"].GetBoolean());
        Assert.Equal(80, res["score"].GetInt32());
        Assert.True(res["solved"].GetBoolean());
    }

    [Fact]
    public async Task Compare_round_cannot_be_answered_twice()
    {
        await Api.SeedAsync(Compare(Dec(10)));
        var c = await Api.PlayerAsync();
        (await c.PostJsonAsync($"/plays/{Today}/compare", new { round = 0, choice = 0 })).Ok();
        var dup = await c.PostJsonAsync($"/plays/{Today}/compare", new { round = 0, choice = 1 });
        Assert.Equal(HttpStatusCode.Conflict, dup.Status);
        Assert.Equal("wrong_round", dup.Code);
    }

    [Fact]
    public async Task Poll_is_scored_when_the_day_closes()
    {
        await Api.SeedAsync(Poll(Dec(10)), Price(Dec(11)));
        var p1 = await Api.PlayerAsync();
        var p2 = await Api.PlayerAsync();
        var p3 = await Api.PlayerAsync();

        var v1 = (await p1.PostJsonAsync($"/plays/{Today}/poll", new { option = 0, predictedPct = 60 })).Ok();
        (await p2.PostJsonAsync($"/plays/{Today}/poll", new { option = 1, predictedPct = 50 })).Ok();
        (await p3.PostJsonAsync($"/plays/{Today}/poll", new { option = 0, predictedPct = 70 })).Ok();

        Assert.True(v1["finished"].GetBoolean());
        Assert.True(v1["scorePending"].GetBoolean());
        Assert.Equal("already_voted", (await p1.PostJsonAsync($"/plays/{Today}/poll", new { option = 1, predictedPct = 10 })).Code);

        // Seri oy anında sayılır, puan beklemede.
        var stats = (await p1.GetJsonAsync("/stats/me")).Ok();
        Assert.Equal(1, stats["currentStreak"].GetInt32());
        Assert.Equal(1, stats["pendingScores"].GetInt32());

        Clock.SetIstanbul(2026, 12, 11, 0, 1);
        await Api.RunJobsAsync();

        // Çay %66,7 → p1: 100 − 2 × 6,7 = 86,6 → 87
        var s1 = (await p1.GetJsonAsync($"/plays/{Today}")).Ok();
        Assert.Equal(87, s1["score"].GetInt32());
        Assert.False(s1["scorePending"].GetBoolean());
        Assert.Equal(66.7m, s1["poll"].GetProperty("actualPct").GetDecimal());
        Assert.Equal(67, (await p2.GetJsonAsync($"/plays/{Today}")).Ok()["score"].GetInt32());
        Assert.Equal(93, (await p3.GetJsonAsync($"/plays/{Today}")).Ok()["score"].GetInt32());

        // Arşivden gelen oy hemen puanlanır ama sonucu değiştirmez.
        var late = await Api.PlayerAsync();
        var lv = (await late.PostJsonAsync($"/plays/{Today}/poll", new { option = 1, predictedPct = 33 })).Ok();
        Assert.True(lv["archive"].GetBoolean());
        Assert.Equal(99, lv["score"].GetInt32());

        await Api.RunJobsAsync();
        var crowd = (await p1.GetJsonAsync($"/q/{Today}/crowd")).Ok();
        Assert.True(crowd["final"].GetBoolean());
        Assert.Equal(66.7m, crowd["optionPcts"][0].GetDecimal());
        Assert.Equal(3, crowd["plays"].GetInt32());
    }
}
