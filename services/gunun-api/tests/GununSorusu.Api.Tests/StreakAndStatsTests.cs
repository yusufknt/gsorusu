using System.Net;
using GununSorusu.Api.Tests.Infrastructure;
using static GununSorusu.Api.Tests.Infrastructure.Q;

namespace GununSorusu.Api.Tests;

public sealed class StreakAndStatsTests(ApiFactory api) : ApiTest(api)
{
    private static Task Solve(HttpClient c, int day) => c.PostJsonAsync($"/plays/{D(Dec(day))}/guess", new { value = 100 });

    private void GoTo(int day) => Clock.SetIstanbul(2026, 12, day);

    [Fact]
    public async Task Consecutive_days_build_a_streak_and_a_miss_breaks_it()
    {
        await Api.SeedAsync(Price(Dec(10)), Price(Dec(11)), Price(Dec(12)), Price(Dec(13)));
        var c = await Api.PlayerAsync();

        await Solve(c, 10);
        GoTo(11);
        await Solve(c, 11);
        var s = (await c.GetJsonAsync("/stats/me")).Ok();
        Assert.Equal(2, s["currentStreak"].GetInt32());
        Assert.True(s["playedToday"].GetBoolean());

        // Ertesi gün henüz oynamadıysa seri hâlâ canlı.
        GoTo(12);
        Assert.Equal(2, (await c.GetJsonAsync("/stats/me")).Ok()["currentStreak"].GetInt32());

        // 12'yi kaçırdı.
        GoTo(13);
        var broken = (await c.GetJsonAsync("/stats/me")).Ok();
        Assert.Equal(0, broken["currentStreak"].GetInt32());
        Assert.Equal(2, broken["maxStreak"].GetInt32());
        Assert.True(broken["canRepairStreak"].GetBoolean());
    }

    [Fact]
    public async Task Streak_repair_covers_one_missed_day_once_a_week()
    {
        await Api.SeedAsync(Price(Dec(10)), Price(Dec(11)), Price(Dec(12)), Price(Dec(13)));
        var c = await Api.PlayerAsync();
        await Solve(c, 10);
        GoTo(11);
        await Solve(c, 11);
        GoTo(13);

        var repaired = (await c.PostJsonAsync("/streak/repair")).Ok();
        Assert.Equal(2, repaired["current"].GetInt32());

        await Solve(c, 13);
        Assert.Equal(3, (await c.GetJsonAsync("/stats/me")).Ok()["currentStreak"].GetInt32());

        var again = await c.PostJsonAsync("/streak/repair");
        Assert.Equal(HttpStatusCode.Conflict, again.Status);
        Assert.Equal("streak_not_repairable", again.Code);
    }

    [Fact]
    public async Task Day_without_a_question_does_not_break_the_streak()
    {
        await Api.SeedAsync(Price(Dec(10)), Price(Dec(12)));
        var c = await Api.PlayerAsync();
        await Solve(c, 10);
        GoTo(12);
        await Solve(c, 12);
        Assert.Equal(2, (await c.GetJsonAsync("/stats/me")).Ok()["currentStreak"].GetInt32());
    }

    [Fact]
    public async Task Cancelled_question_gives_100_and_protects_everyones_streak()
    {
        await Api.SeedAsync(Price(Dec(10)), Price(Dec(11)), Price(Dec(12)));
        var played = await Api.PlayerAsync();
        var skipped = await Api.PlayerAsync();

        await Solve(played, 10);
        await Solve(skipped, 10);
        GoTo(11);
        await played.PostJsonAsync($"/plays/{D(Dec(11))}/guess", new { value = 10 });

        (await Api.Admin().PostJsonAsync($"/admin/questions/{D(Dec(11))}/cancel")).Ok();

        var cancelledState = (await played.GetJsonAsync($"/plays/{D(Dec(11))}")).Ok();
        Assert.True(cancelledState["cancelled"].GetBoolean());
        Assert.Equal(100, cancelledState["score"].GetInt32());
        Assert.Equal(System.Text.Json.JsonValueKind.Null, cancelledState["reveal"].ValueKind);
        Assert.Equal("question_cancelled", (await skipped.PostJsonAsync($"/plays/{D(Dec(11))}/guess", new { value = 10 })).Code);
        Assert.True((await Api.CreateClient().GetJsonAsync("/q/today")).Ok()["cancelled"].GetBoolean());

        GoTo(12);
        await Solve(skipped, 12);
        Assert.Equal(2, (await skipped.GetJsonAsync("/stats/me")).Ok()["currentStreak"].GetInt32());
    }

    [Fact]
    public async Task Archive_play_does_not_touch_streak_or_stats()
    {
        await Api.SeedAsync(Price(Dec(4)), Price(Dec(10)), Price(Dec(12)));
        var c = await Api.PlayerAsync();
        GoTo(12);

        var res = (await c.PostJsonAsync($"/plays/{D(Dec(10))}/guess", new { value = 100 })).Ok();
        Assert.True(res["archive"].GetBoolean());
        Assert.Equal(100, res["score"].GetInt32());

        var stats = (await c.GetJsonAsync("/stats/me")).Ok();
        Assert.Equal(0, stats["played"].GetInt32());
        Assert.Equal(0, stats["currentStreak"].GetInt32());

        var expired = await c.PostJsonAsync($"/plays/{D(Dec(4))}/guess", new { value = 100 });
        Assert.Equal(HttpStatusCode.Forbidden, expired.Status);
        Assert.Equal("archive_expired", expired.Code);
    }

    [Fact]
    public async Task Archive_lists_last_seven_days_with_my_status()
    {
        await Api.SeedAsync(Price(Dec(4)), Price(Dec(5)), Trivia(Dec(10)), Price(Dec(11)), Price(Dec(12)));
        var c = await Api.PlayerAsync();
        GoTo(11);
        await Solve(c, 11);
        GoTo(12);

        var list = (await c.GetJsonAsync("/plays/archive")).Ok().Body;
        Assert.Equal([11, 10, 5], list.EnumerateArray().Select(x => x.GetProperty("no").GetInt32()));
        var first = list[0];
        Assert.True(first.GetProperty("finished").GetBoolean());
        Assert.Equal(100, first.GetProperty("score").GetInt32());
        Assert.False(first.GetProperty("playedFromArchive").GetBoolean());
        Assert.False(list[1].GetProperty("started").GetBoolean());
    }

    [Fact]
    public async Task Stats_aggregate_scores_by_format()
    {
        await Api.SeedAsync(Price(Dec(10)), Trivia(Dec(11)), Compare(Dec(12)));
        var c = await Api.PlayerAsync();

        await Solve(c, 10); // 100
        GoTo(11);
        await c.PostJsonAsync($"/plays/{D(Dec(11))}/start");
        await c.PostJsonAsync($"/plays/{D(Dec(11))}/answer", new { option = 0 }); // yanlış → 0
        GoTo(12);
        for (var i = 0; i < 5; i++) await c.PostJsonAsync($"/plays/{D(Dec(12))}/compare", new { round = i, choice = i % 2 }); // 100

        var s = (await c.GetJsonAsync("/stats/me")).Ok();
        Assert.Equal(3, s["played"].GetInt32());
        Assert.Equal(2, s["solved"].GetInt32());
        Assert.Equal(66.7m, s["avgScore"].GetDecimal());
        Assert.Equal(3, s["currentStreak"].GetInt32());
        Assert.Equal(3, s["byFormat"].GetArrayLength());
        Assert.Equal("price", s["byFormat"][0].GetProperty("format").GetString());
        Assert.Equal(12, s["recent"][0].GetProperty("no").GetInt32());
    }
}
