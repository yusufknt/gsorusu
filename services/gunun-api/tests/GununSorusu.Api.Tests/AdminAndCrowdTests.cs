using System.Net;
using GununSorusu.Api.Data;
using GununSorusu.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using static GununSorusu.Api.Tests.Infrastructure.Q;

namespace GununSorusu.Api.Tests;

public sealed class AdminAndCrowdTests(ApiFactory api) : ApiTest(api)
{
    private static object PriceBody(string status = "scheduled", string? verifier2 = "ikinci") => new
    {
        format = "price",
        status,
        prompt = "1 L süt kaç TL?",
        unit = "TL",
        answerNum = 45.5m,
        factText = "Bilgi",
        sourceText = "Ulusal zincir, online, 1 L",
        verifiedBy1 = "birinci",
        verifiedBy2 = verifier2,
    };

    [Fact]
    public async Task Admin_requires_the_key()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await Api.CreateClient().GetJsonAsync("/admin/questions")).Status);

        var wrong = Api.CreateClient();
        wrong.DefaultRequestHeaders.Add("X-Admin-Key", "yanlis");
        Assert.Equal(HttpStatusCode.Unauthorized, (await wrong.PutJsonAsync($"/admin/questions/{D(Dec(11))}", PriceBody())).Status);
    }

    [Fact]
    public async Task Scheduled_question_needs_source_and_two_verifiers()
    {
        var admin = Api.Admin();
        var ok = (await admin.PutJsonAsync($"/admin/questions/{D(Dec(11))}", PriceBody())).Ok();
        Assert.Equal(11, ok["no"].GetInt32());

        var missing = await admin.PutJsonAsync($"/admin/questions/{D(Dec(12))}", PriceBody(verifier2: null));
        Assert.Equal(HttpStatusCode.BadRequest, missing.Status);
        Assert.Equal("invalid_question", missing.Code);
        Assert.Contains("iki kişi", missing["title"].GetString());

        // Taslak doğrulamasız kaydedilebilir.
        (await admin.PutJsonAsync($"/admin/questions/{D(Dec(12))}", PriceBody(status: "draft", verifier2: null))).Ok();
    }

    [Fact]
    public async Task Live_question_is_locked_and_past_days_are_rejected()
    {
        var admin = Api.Admin();
        (await admin.PutJsonAsync($"/admin/questions/{D(Dec(10))}", PriceBody())).Ok();

        var edit = await admin.PutJsonAsync($"/admin/questions/{D(Dec(10))}", PriceBody());
        Assert.Equal(HttpStatusCode.Conflict, edit.Status);
        Assert.Equal("question_locked", edit.Code);

        Assert.Equal("day_in_past", (await admin.PutJsonAsync($"/admin/questions/{D(Dec(9))}", PriceBody())).Code);
    }

    [Fact]
    public async Task Trivia_and_compare_shapes_are_validated()
    {
        var admin = Api.Admin();
        var trivia = await admin.PutJsonAsync($"/admin/questions/{D(Dec(11))}", new
        {
            format = "trivia", status = "draft", prompt = "Soru", options = new[] { "a", "b", "c" }, correctOption = 1,
        });
        Assert.Equal("invalid_question", trivia.Code);

        var compare = await admin.PutJsonAsync($"/admin/questions/{D(Dec(12))}", new
        {
            format = "compare", status = "draft", prompt = "Hangisi?",
            rounds = new[] { new { optionA = "a", optionB = "b", correct = 0 } },
        });
        Assert.Equal("invalid_question", compare.Code);
    }

    [Fact]
    public async Task Job_publishes_due_questions()
    {
        await Api.SeedAsync(Price(Dec(10)), Price(Dec(11)));
        await Api.RunJobsAsync();
        var statuses = await Api.WithDbAsync(db => db.Questions.OrderBy(q => q.Day).Select(q => q.Status).ToListAsync());
        Assert.Equal([QuestionStatus.Published, QuestionStatus.Scheduled], statuses);
    }

    [Fact]
    public async Task Crowd_is_hidden_until_the_player_finishes()
    {
        await Api.SeedAsync(Price(Dec(10), answer: 100m));
        var cheap = await Api.PlayerAsync();
        var pricey = await Api.PlayerAsync();

        var early = await cheap.GetJsonAsync($"/q/{D(Dec(10))}/crowd");
        Assert.Equal(HttpStatusCode.Forbidden, early.Status);
        Assert.Equal("finish_first", early.Code);

        await cheap.PostJsonAsync($"/plays/{D(Dec(10))}/guess", new { value = 50 });
        await cheap.PostJsonAsync($"/plays/{D(Dec(10))}/guess", new { value = 100 });
        await pricey.PostJsonAsync($"/plays/{D(Dec(10))}/guess", new { value = 200 });
        await pricey.PostJsonAsync($"/plays/{D(Dec(10))}/guess", new { value = 100 });
        await Api.RunJobsAsync();

        var crowd = (await cheap.GetJsonAsync($"/q/{D(Dec(10))}/crowd")).Ok();
        Assert.Equal(2, crowd["plays"].GetInt32());
        Assert.Equal(85m, crowd["avgScore"].GetDecimal());
        Assert.Equal(50m, crowd["underPct"].GetDecimal());
        Assert.Equal(50m, crowd["overPct"].GetDecimal());
        Assert.Equal(2, crowd["histogram"][8].GetInt32());
        Assert.False(crowd["final"].GetBoolean());
    }
}
