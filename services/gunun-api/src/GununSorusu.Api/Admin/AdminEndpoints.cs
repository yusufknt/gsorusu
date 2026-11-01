using System.Security.Cryptography;
using System.Text;
using GununSorusu.Api.Data;
using GununSorusu.Api.Infrastructure;
using GununSorusu.Domain;
using GununSorusu.Domain.Scoring;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GununSorusu.Api.Admin;

public sealed record QuestionUpsertRequest(
    QuestionFormat? Format,
    QuestionStatus? Status,
    string? Prompt,
    string? MediaUrl,
    string? Unit,
    decimal? AnswerNum,
    decimal? TolerancePct,
    List<string>? Options,
    int? CorrectOption,
    List<CompareRound>? Rounds,
    string? FactText,
    List<PricePoint>? PriceHistory,
    string? SourceText,
    string? SourceUrl,
    DateOnly? SourceDate,
    string? VerifiedBy1,
    string? VerifiedBy2,
    bool IsSponsored = false);

/// <summary>
/// Geçici soru yönetimi (X-Admin-Key). Soru paneli v1.1'de bunun yerini alacak.
/// Yayına girmiş bir soru değiştirilemez; yalnızca iptal edilebilir (hatalı soru protokolü).
/// </summary>
public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var admin = app.MapGroup("/admin").AddEndpointFilter(async (ctx, next) =>
        {
            var key = ctx.HttpContext.RequestServices.GetRequiredService<IOptions<AdminOptions>>().Value.ApiKey;
            if (string.IsNullOrEmpty(key)) return Results.NotFound();
            var given = ctx.HttpContext.Request.Headers["X-Admin-Key"].ToString();
            if (!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(given), Encoding.UTF8.GetBytes(key)))
                return Results.Unauthorized();
            return await next(ctx);
        });

        admin.MapGet("/questions", async (DateOnly? from, DateOnly? to, GunDbContext db, GameClock clock, CancellationToken ct) =>
        {
            var f = from ?? clock.Today.AddDays(-7);
            var t = to ?? clock.Today.AddDays(30);
            return await db.Questions.AsNoTracking().Where(q => q.Day >= f && q.Day <= t).OrderBy(q => q.Day).ToListAsync(ct);
        });

        admin.MapPut("/questions/{day}", async (
            DateOnly day, QuestionUpsertRequest req, GunDbContext db, GameClock clock, IOptions<GameOptions> game, CancellationToken ct) =>
        {
            var today = clock.Today;
            var q = await db.Questions.SingleOrDefaultAsync(x => x.Day == day, ct);
            if (q is not null && day <= today && q.Status is QuestionStatus.Scheduled or QuestionStatus.Published or QuestionStatus.Cancelled)
                throw ApiException.Conflict("question_locked", "Yayına girmiş soru değiştirilemez. Hatalıysa iptal et.");
            if (day < today) throw ApiException.BadRequest("day_in_past", "Geçmiş bir güne soru girilemez.");

            var no = day.DayNumber - game.Value.LaunchDay.DayNumber + 1;
            if (no < 1) throw ApiException.BadRequest("day_before_launch", $"İlk soru günü {game.Value.LaunchDay:yyyy-MM-dd}.");

            var isNew = q is null;
            q ??= new Question { Day = day, No = no, CreatedAt = clock.UtcNow };
            Apply(q, req);
            q.UpdatedAt = clock.UtcNow;

            var errors = QuestionValidator.Validate(q);
            if (errors.Count > 0) throw ApiException.BadRequest("invalid_question", string.Join(" ", errors));

            if (isNew) db.Questions.Add(q);
            await db.SaveChangesAsync(ct);
            return q;
        });

        // Hatalı soru protokolü: o gün oynayan herkes 100 puan alır, kimsenin serisi bozulmaz.
        admin.MapPost("/questions/{day}/cancel", async (DateOnly day, GunDbContext db, GameClock clock, CancellationToken ct) =>
        {
            var q = await db.Questions.SingleOrDefaultAsync(x => x.Day == day, ct)
                    ?? throw ApiException.NotFound("question_not_found", "Bu güne ait soru yok.");
            if (q.Status == QuestionStatus.Cancelled) return q;

            q.Status = QuestionStatus.Cancelled;
            q.UpdatedAt = clock.UtcNow;

            var plays = await db.Plays.Where(p => p.QuestionId == q.Id).ToListAsync(ct);
            foreach (var p in plays)
            {
                p.Score = 100;
                p.FinishedAt ??= clock.UtcNow;
            }

            var votes = await db.PollVotes.Where(v => v.QuestionId == q.Id).ToListAsync(ct);
            foreach (var v in votes) v.Score = 100;

            await db.SaveChangesAsync(ct);
            return q;
        });
    }

    private static void Apply(Question q, QuestionUpsertRequest r)
    {
        q.Format = r.Format ?? q.Format;
        q.Status = r.Status ?? QuestionStatus.Draft;
        q.Prompt = r.Prompt?.Trim() ?? "";
        q.MediaUrl = r.MediaUrl;
        q.Unit = r.Unit;
        q.AnswerNum = r.AnswerNum;
        q.TolerancePct = r.TolerancePct;
        q.Options = r.Options;
        q.CorrectOption = r.CorrectOption;
        q.Rounds = r.Rounds;
        q.FactText = r.FactText;
        q.PriceHistory = r.PriceHistory;
        q.SourceText = r.SourceText;
        q.SourceUrl = r.SourceUrl;
        q.SourceDate = r.SourceDate;
        q.VerifiedBy1 = r.VerifiedBy1;
        q.VerifiedBy2 = r.VerifiedBy2;
        q.IsSponsored = r.IsSponsored;
    }
}

public static class QuestionValidator
{
    /// <summary>Formatın gerektirdiği alanları ve yayın koşullarını denetler. Boş liste: geçerli.</summary>
    public static List<string> Validate(Question q)
    {
        var e = new List<string>();
        if (!Enum.IsDefined(q.Format)) e.Add("Soru formatı geçersiz.");
        if (string.IsNullOrWhiteSpace(q.Prompt)) e.Add("Soru metni boş olamaz.");
        if (q.Status is QuestionStatus.Published or QuestionStatus.Cancelled)
            e.Add("Durum yalnızca draft, verified ya da scheduled olabilir.");

        switch (q.Format)
        {
            case QuestionFormat.Price or QuestionFormat.Number:
                if (q.AnswerNum is not > 0) e.Add("Sayısal cevap 0'dan büyük olmalı.");
                if (q.TolerancePct is { } t && (t <= 0 || t >= NumericRules.Default.ClosePct))
                    e.Add($"Hata payı 0 ile {NumericRules.Default.ClosePct} arasında olmalı.");
                if (q.Options is not null || q.Rounds is not null) e.Add("Sayısal soruda şık ya da tur olmaz.");
                break;
            case QuestionFormat.Trivia:
                if (q.Options is not { Count: 4 } || q.Options.Any(string.IsNullOrWhiteSpace)) e.Add("Bilgi sorusunda tam 4 dolu şık olmalı.");
                if (q.CorrectOption is not (>= 0 and <= 3)) e.Add("Doğru şık 0–3 arasında olmalı.");
                break;
            case QuestionFormat.Poll:
                if (q.Options is not { Count: >= 2 and <= 6 } || q.Options.Any(string.IsNullOrWhiteSpace))
                    e.Add("Ankette 2–6 dolu seçenek olmalı.");
                if (q.CorrectOption is not null) e.Add("Ankette doğru şık olmaz.");
                break;
            case QuestionFormat.Compare:
                if (q.Rounds is not { Count: CompareGame.Rounds }) e.Add($"Hangisi daha…? sorusunda tam {CompareGame.Rounds} tur olmalı.");
                else if (q.Rounds.Any(r => string.IsNullOrWhiteSpace(r.OptionA) || string.IsNullOrWhiteSpace(r.OptionB) || r.Correct is not (0 or 1)))
                    e.Add("Her turda iki dolu seçenek ve 0/1 doğru cevap olmalı.");
                break;
        }

        // Kaynak zorunlu; fiyat ve sayılarda iki kişi, diğerlerinde bir kişi doğrular.
        if (q.Status == QuestionStatus.Scheduled)
        {
            if (string.IsNullOrWhiteSpace(q.SourceText)) e.Add("Planlanan soruda kaynak zorunlu.");
            if (string.IsNullOrWhiteSpace(q.VerifiedBy1)) e.Add("Planlanan soru en az bir kişi tarafından doğrulanmalı.");
            if (q.Format.IsNumeric() && string.IsNullOrWhiteSpace(q.VerifiedBy2)) e.Add("Fiyat ve sayı sorularını iki kişi doğrulamalı.");
            if (!string.IsNullOrWhiteSpace(q.VerifiedBy1) && q.VerifiedBy1 == q.VerifiedBy2) e.Add("İki doğrulayıcı farklı kişiler olmalı.");
        }

        return e;
    }
}
