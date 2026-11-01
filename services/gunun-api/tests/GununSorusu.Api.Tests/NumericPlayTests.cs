using System.Net;
using GununSorusu.Api.Tests.Infrastructure;
using static GununSorusu.Api.Tests.Infrastructure.Q;

namespace GununSorusu.Api.Tests;

public sealed class NumericPlayTests(ApiFactory api) : ApiTest(api)
{
    private static readonly string Today = D(Dec(10));

    [Fact]
    public async Task Guesses_narrow_down_and_third_attempt_scores_70()
    {
        await Api.SeedAsync(Price(Dec(10), answer: 100m));
        var c = await Api.PlayerAsync();

        var g1 = (await c.PostJsonAsync($"/plays/{Today}/guess", new { value = 50 })).Ok();
        var guess1 = g1["numeric"].GetProperty("guesses")[0];
        Assert.Equal("higher", guess1.GetProperty("direction").GetString());
        Assert.False(guess1.GetProperty("close").GetBoolean());
        Assert.False(g1["finished"].GetBoolean());
        Assert.Equal(System.Text.Json.JsonValueKind.Null, g1["reveal"].ValueKind);

        var g2 = (await c.PostJsonAsync($"/plays/{Today}/guess", new { value = 92 })).Ok();
        Assert.True(g2["numeric"].GetProperty("guesses")[1].GetProperty("close").GetBoolean());

        var g3 = (await c.PostJsonAsync($"/plays/{Today}/guess", new { value = 104 })).Ok();
        Assert.True(g3["finished"].GetBoolean());
        Assert.True(g3["solved"].GetBoolean());
        Assert.Equal(70, g3["score"].GetInt32());
        Assert.Equal(100m, g3["reveal"].GetProperty("answer").GetDecimal());
        Assert.Equal("Biliyor muydun?", g3["reveal"].GetProperty("factText").GetString());

        var again = await c.PostJsonAsync($"/plays/{Today}/guess", new { value = 100 });
        Assert.Equal(HttpStatusCode.Conflict, again.Status);
        Assert.Equal("already_finished", again.Code);
    }

    [Fact]
    public async Task Six_misses_score_by_last_guess_closeness()
    {
        await Api.SeedAsync(Price(Dec(10), answer: 100m));
        var c = await Api.PlayerAsync();

        for (var i = 0; i < 5; i++) (await c.PostJsonAsync($"/plays/{Today}/guess", new { value = 10 })).Ok();
        var last = (await c.PostJsonAsync($"/plays/{Today}/guess", new { value = 60 })).Ok();

        Assert.True(last["finished"].GetBoolean());
        Assert.False(last["solved"].GetBoolean());
        // %40 hata → 20 × (50 − 40) / 40 = 5
        Assert.Equal(5, last["score"].GetInt32());
    }

    [Fact]
    public async Task Hint_unlocks_after_three_guesses_and_costs_10()
    {
        await Api.SeedAsync(Price(Dec(10), answer: 100m));
        var c = await Api.PlayerAsync();

        await c.PostJsonAsync($"/plays/{Today}/guess", new { value = 10 });
        await c.PostJsonAsync($"/plays/{Today}/guess", new { value = 300 });
        var early = await c.PostJsonAsync($"/plays/{Today}/hint");
        Assert.Equal(HttpStatusCode.Conflict, early.Status);
        Assert.Equal("hint_unavailable", early.Code);

        var third = (await c.PostJsonAsync($"/plays/{Today}/guess", new { value = 150 })).Ok();
        Assert.True(third["numeric"].GetProperty("canUseHint").GetBoolean());

        var hint = (await c.PostJsonAsync($"/plays/{Today}/hint")).Ok()["numeric"].GetProperty("hint");
        var min = hint.GetProperty("min").GetDecimal();
        var max = hint.GetProperty("max").GetDecimal();
        Assert.InRange(100m, min, max);
        Assert.True(max - min <= 30m, $"Aralık çok geniş: {min}–{max}");

        Assert.Equal("hint_already_used", (await c.PostJsonAsync($"/plays/{Today}/hint")).Code);

        var win = (await c.PostJsonAsync($"/plays/{Today}/guess", new { value = 100 })).Ok();
        Assert.Equal(100 - 3 * 15 - 10, win["score"].GetInt32());
    }

    [Fact]
    public async Task Hint_range_is_the_same_for_everyone()
    {
        await Api.SeedAsync(Price(Dec(10), answer: 250m));
        async Task<string> HintFor()
        {
            var c = await Api.PlayerAsync();
            foreach (var v in new[] { 1, 2, 3 }) await c.PostJsonAsync($"/plays/{Today}/guess", new { value = v });
            return (await c.PostJsonAsync($"/plays/{Today}/hint")).Ok()["numeric"].GetProperty("hint").GetRawText();
        }

        Assert.Equal(await HintFor(), await HintFor());
    }

    [Fact]
    public async Task Invalid_guess_is_rejected()
    {
        await Api.SeedAsync(Price(Dec(10)));
        var c = await Api.PlayerAsync();
        Assert.Equal("invalid_guess", (await c.PostJsonAsync($"/plays/{Today}/guess", new { value = -5 })).Code);
        Assert.Equal("invalid_guess", (await c.PostJsonAsync($"/plays/{Today}/guess", new { value = 0.001 })).Code);
        Assert.Equal(HttpStatusCode.BadRequest, (await c.PostJsonAsync($"/plays/{Today}/guess", new { value = "abc" })).Status);
    }

    [Fact]
    public async Task Wrong_format_action_is_rejected()
    {
        await Api.SeedAsync(Price(Dec(10)));
        var c = await Api.PlayerAsync();
        Assert.Equal("wrong_format", (await c.PostJsonAsync($"/plays/{Today}/answer", new { option = 1 })).Code);
    }

    [Fact]
    public async Task State_survives_reopening_the_app()
    {
        await Api.SeedAsync(Price(Dec(10)));
        var c = await Api.PlayerAsync("ayni-cihaz-123456789");
        await c.PostJsonAsync($"/plays/{Today}/guess", new { value = 40 });

        var reopened = await Api.PlayerAsync("ayni-cihaz-123456789");
        var state = (await reopened.GetJsonAsync($"/plays/{Today}")).Ok();
        Assert.True(state["started"].GetBoolean());
        Assert.Equal(1, state["numeric"].GetProperty("attemptsUsed").GetInt32());
    }
}
