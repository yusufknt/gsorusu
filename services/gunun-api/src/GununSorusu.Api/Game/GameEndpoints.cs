using System.Security.Claims;
using GununSorusu.Api.Auth;
using GununSorusu.Api.Data;
using GununSorusu.Api.Infrastructure;
using GununSorusu.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GununSorusu.Api.Game;

public sealed record StatsDto(
    int CurrentStreak,
    int MaxStreak,
    bool CanRepairStreak,
    bool PlayedToday,
    int Played,
    int Solved,
    decimal? AvgScore,
    int ScoreSum,
    int PendingScores,
    IReadOnlyList<FormatStatsDto> ByFormat,
    IReadOnlyList<HistoryItemDto> Recent);

public sealed record FormatStatsDto(QuestionFormat Format, int Played, int Solved, decimal? AvgScore);

/// <param name="PlayedFromArchive">false ve Finished ise soru kendi gününde oynanmış.</param>
public sealed record ArchiveItemDto(
    DateOnly Day, int No, QuestionFormat Format, string Prompt, bool Cancelled,
    bool Started, bool Finished, int? Score, bool PlayedFromArchive);

public sealed record HistoryItemDto(DateOnly Day, int No, QuestionFormat Format, int? Score, bool Solved);

/// <param name="Final">false ise sonuçlar hâlâ değişebilir (gün bitmedi / anket kapanmadı).</param>
public sealed record CrowdDto(
    int QuestionId,
    int Plays,
    decimal? AvgScore,
    int[] Histogram,
    decimal? SolvedPct,
    decimal? UnderPct,
    decimal? OverPct,
    IReadOnlyList<decimal>? OptionPcts,
    bool Final,
    DateTimeOffset? UpdatedAt);

public static class GameEndpoints
{
    public static void MapGameEndpoints(this IEndpointRouteBuilder app)
    {
        // Herkese açık soru. Cloudflare önünde önbelleğe alınır; cevap içermez.
        app.MapGet("/q/today", async (HttpContext http, PlayService plays, GameClock clock, CancellationToken ct) =>
        {
            var q = await plays.FindVisibleAsync(clock.Today, ct) ?? throw PlayService.QuestionNotFound(isToday: true);
            http.Response.Headers.CacheControl = "public, max-age=60";
            return PublicQuestionDto.From(q);
        });

        app.MapGet("/q/{day}", async (DateOnly day, HttpContext http, PlayService plays, GameClock clock, CancellationToken ct) =>
        {
            var q = await plays.FindVisibleAsync(day, ct) ?? throw PlayService.QuestionNotFound(day == clock.Today);
            // Geçmiş günler değişmez (yalnızca iptal edilebilir); bugünkü kısa süreli tutulur.
            http.Response.Headers.CacheControl = day < clock.Today ? "public, max-age=3600" : "public, max-age=60";
            return PublicQuestionDto.From(q);
        });

        app.MapGet("/q/{day}/crowd", GetCrowdAsync).RequireAuthorization();

        // Arşiv sekmesi: son 7 günün soruları ve oyuncunun her birindeki durumu (bugün hariç).
        app.MapGet("/plays/archive", GetArchiveAsync).RequireAuthorization();

        var play = app.MapGroup("/plays/{day}").RequireAuthorization();
        play.MapGet("", (DateOnly day, ClaimsPrincipal user, PlayService s, CancellationToken ct) => s.GetStateAsync(user.PlayerId(), day, ct));
        play.MapPost("/start", (DateOnly day, ClaimsPrincipal user, PlayService s, CancellationToken ct) => s.StartAsync(user.PlayerId(), day, ct));
        play.MapPost("/guess", (DateOnly day, GuessRequest req, ClaimsPrincipal user, PlayService s, CancellationToken ct) =>
            s.GuessAsync(user.PlayerId(), day, req.Value, ct));
        play.MapPost("/hint", (DateOnly day, ClaimsPrincipal user, PlayService s, CancellationToken ct) => s.HintAsync(user.PlayerId(), day, ct));
        play.MapPost("/answer", (DateOnly day, TriviaAnswerRequest req, ClaimsPrincipal user, PlayService s, CancellationToken ct) =>
            s.AnswerTriviaAsync(user.PlayerId(), day, req.Option, ct));
        play.MapPost("/compare", (DateOnly day, CompareAnswerRequest req, ClaimsPrincipal user, PlayService s, CancellationToken ct) =>
            s.AnswerCompareAsync(user.PlayerId(), day, req.Round, req.Choice, ct));
        play.MapPost("/poll", (DateOnly day, PollVoteRequest req, ClaimsPrincipal user, PlayService s, CancellationToken ct) =>
            s.VotePollAsync(user.PlayerId(), day, req.Option, req.PredictedPct, ct));

        app.MapGet("/stats/me", GetStatsAsync).RequireAuthorization();

        // MVP: ödüllü reklam doğrulaması (AdMob SSV) v1.1'de eklenecek; kural yine de sunucuda uygulanır.
        app.MapPost("/streak/repair", async (ClaimsPrincipal user, StreakService streaks, GunDbContext db, CancellationToken ct) =>
        {
            await streaks.RepairAsync(user.PlayerId(), ct);
            await db.SaveChangesAsync(ct);
            return await streaks.ViewAsync(user.PlayerId(), ct);
        }).RequireAuthorization();
    }

    private static async Task<List<ArchiveItemDto>> GetArchiveAsync(
        ClaimsPrincipal user, GunDbContext db, GameClock clock, IOptions<GameOptions> options, CancellationToken ct)
    {
        var playerId = user.PlayerId();
        var today = clock.Today;
        var from = today.AddDays(-options.Value.ArchiveDays);
        var questions = await db.Questions.AsNoTracking()
            .Where(q => q.Day >= from && q.Day < today &&
                        (q.Status == QuestionStatus.Scheduled || q.Status == QuestionStatus.Published || q.Status == QuestionStatus.Cancelled))
            .OrderByDescending(q => q.Day)
            .Select(q => new { q.Id, q.Day, q.No, q.Format, q.Prompt, q.Status })
            .ToListAsync(ct);
        var ids = questions.Select(q => q.Id).ToList();
        var plays = await db.Plays.AsNoTracking()
            .Where(p => p.PlayerId == playerId && ids.Contains(p.QuestionId))
            .ToDictionaryAsync(p => p.QuestionId, ct);

        return questions.Select(q =>
        {
            var p = plays.GetValueOrDefault(q.Id);
            return new ArchiveItemDto(q.Day, q.No, q.Format, q.Prompt, q.Status == QuestionStatus.Cancelled,
                p is not null, p?.FinishedAt is not null, p?.Score, p?.Archive ?? false);
        }).ToList();
    }

    private static async Task<CrowdDto> GetCrowdAsync(
        DateOnly day, ClaimsPrincipal user, PlayService plays, GunDbContext db, GameClock clock, CancellationToken ct)
    {
        var q = await plays.FindVisibleAsync(day, ct) ?? throw PlayService.QuestionNotFound(day == clock.Today);
        var playerId = user.PlayerId();

        // Bugünün dağılımı cevabı ele verebilir; yalnızca oyununu bitirene gösterilir.
        if (day == clock.Today)
        {
            var finished = await db.Plays.AnyAsync(p => p.PlayerId == playerId && p.QuestionId == q.Id && p.FinishedAt != null, ct);
            if (!finished) throw ApiException.Forbidden("finish_first", "Sonuçları görmek için önce soruyu bitir.");
        }

        var c = await db.QuestionCrowd.AsNoTracking().SingleOrDefaultAsync(x => x.QuestionId == q.Id, ct);
        var final = q.Format == QuestionFormat.Poll ? q.PollClosedAt is not null : day < clock.Today;
        return c is null
            ? new CrowdDto(q.Id, 0, null, new int[10], null, null, null, null, final, null)
            : new CrowdDto(q.Id, c.Plays, c.AvgScore, c.Histogram, c.SolvedPct, c.UnderPct, c.OverPct, c.OptionPcts, final, c.UpdatedAt);
    }

    /// <summary>Sayaçlar plays tablosundan hesaplanır; arşiv oyunları sayılmaz.</summary>
    private static async Task<StatsDto> GetStatsAsync(ClaimsPrincipal user, GunDbContext db, StreakService streaks, CancellationToken ct)
    {
        var playerId = user.PlayerId();
        var rows = await db.Plays.AsNoTracking()
            .Where(p => p.PlayerId == playerId && !p.Archive && p.FinishedAt != null)
            .Select(p => new { p.Question.Day, p.Question.No, p.Question.Format, p.Score, p.Solved })
            .ToListAsync(ct);

        var scored = rows.Where(r => r.Score is not null).ToList();
        var byFormat = rows
            .GroupBy(r => r.Format)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var s = g.Where(r => r.Score is not null).ToList();
                return new FormatStatsDto(g.Key, g.Count(), g.Count(r => r.Solved), Average(s.Select(r => r.Score!.Value)));
            })
            .ToList();

        var recent = rows
            .OrderByDescending(r => r.Day)
            .Take(30)
            .Select(r => new HistoryItemDto(r.Day, r.No, r.Format, r.Score, r.Solved))
            .ToList();

        var streak = await streaks.ViewAsync(playerId, ct);
        return new StatsDto(
            streak.Current,
            streak.Max,
            streak.CanRepair,
            streak.PlayedToday,
            rows.Count,
            rows.Count(r => r.Solved),
            Average(scored.Select(r => r.Score!.Value)),
            scored.Sum(r => r.Score!.Value),
            rows.Count - scored.Count,
            byFormat,
            recent);
    }

    private static decimal? Average(IEnumerable<int> values)
    {
        var list = values.ToList();
        return list.Count == 0 ? null : Math.Round((decimal)list.Sum() / list.Count, 1, MidpointRounding.AwayFromZero);
    }
}
