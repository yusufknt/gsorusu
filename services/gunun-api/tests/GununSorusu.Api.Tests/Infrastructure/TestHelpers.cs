using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using GununSorusu.Api.Data;
using GununSorusu.Domain;

namespace GununSorusu.Api.Tests.Infrastructure;

public sealed record ApiResponse(HttpStatusCode Status, JsonElement Body)
{
    public JsonElement this[string name] => Body.GetProperty(name);

    /// <summary>ProblemDetails "code" alanı.</summary>
    public string? Code => Body.ValueKind == JsonValueKind.Object && Body.TryGetProperty("code", out var c) ? c.GetString() : null;

    public ApiResponse Ok()
    {
        Assert.True(Status == HttpStatusCode.OK, $"Beklenen 200, gelen {(int)Status}: {Body}");
        return this;
    }
}

public static class Http
{
    public static async Task<ApiResponse> GetJsonAsync(this HttpClient c, string url) => await ReadAsync(await c.GetAsync(url));

    public static async Task<ApiResponse> PostJsonAsync(this HttpClient c, string url, object? body = null) =>
        await ReadAsync(await c.PostAsJsonAsync(url, body ?? new { }, ApiFactory.Json));

    public static async Task<ApiResponse> PutJsonAsync(this HttpClient c, string url, object body) =>
        await ReadAsync(await c.PutAsJsonAsync(url, body, ApiFactory.Json));

    private static async Task<ApiResponse> ReadAsync(HttpResponseMessage res)
    {
        var text = await res.Content.ReadAsStringAsync();
        var json = string.IsNullOrEmpty(text) ? default : JsonDocument.Parse(text).RootElement.Clone();
        return new ApiResponse(res.StatusCode, json);
    }
}

/// <summary>Doğrudan veritabanına yazılan test soruları (yönetim uç noktası geçmiş güne izin vermez).</summary>
public static class Q
{
    public static readonly DateOnly LaunchDay = new(2026, 12, 1);

    public static DateOnly Dec(int day) => new(2026, 12, day);

    public static Question Price(DateOnly day, decimal answer = 100m) => Base(day, QuestionFormat.Price, q =>
    {
        q.AnswerNum = answer;
        q.Unit = "TL";
        q.PriceHistory = [new PricePoint(new DateOnly(2025, 12, 1), answer * 0.7m)];
    });

    public static Question Trivia(DateOnly day) => Base(day, QuestionFormat.Trivia, q =>
    {
        q.Options = ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı"];
        q.CorrectOption = 2;
    });

    public static Question Poll(DateOnly day) => Base(day, QuestionFormat.Poll, q => q.Options = ["Çay", "Kahve", "İkisi de"]);

    /// <summary>Doğru seçimler sırasıyla: 0, 1, 0, 1, 0.</summary>
    public static Question Compare(DateOnly day) => Base(day, QuestionFormat.Compare, q =>
        q.Rounds = Enumerable.Range(0, 5).Select(i => new CompareRound(null, $"A{i}", $"B{i}", i % 2, $"{i}a", $"{i}b")).ToList());

    private static Question Base(DateOnly day, QuestionFormat format, Action<Question> configure)
    {
        var q = new Question
        {
            Day = day,
            No = day.DayNumber - LaunchDay.DayNumber + 1,
            Format = format,
            Status = QuestionStatus.Scheduled,
            Prompt = $"Test sorusu {day:dd.MM}",
            FactText = "Biliyor muydun?",
            SourceText = "Test kaynağı",
            VerifiedBy1 = "a",
            VerifiedBy2 = "b",
            CreatedAt = new DateTimeOffset(2026, 11, 1, 0, 0, 0, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(2026, 11, 1, 0, 0, 0, TimeSpan.Zero),
        };
        configure(q);
        return q;
    }

    public static Task SeedAsync(this ApiFactory api, params Question[] questions) => api.WithDbAsync(db =>
    {
        db.Questions.AddRange(questions);
        return db.SaveChangesAsync();
    });

    public static string D(DateOnly day) => day.ToString("yyyy-MM-dd");
}
