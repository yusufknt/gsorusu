using GununSorusu.Api.Data;
using GununSorusu.Api.Game;
using GununSorusu.Api.Infrastructure;
using GununSorusu.Domain;
using GununSorusu.Domain.Scoring;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GununSorusu.Api.Jobs;

/// <summary>
/// Dakikalık işler. Her adım tekrar çalıştırılabilir (idempotent); kaçırılan bir dakika sorun yaratmaz.
/// Tek sunucu varsayılır; birden çok kopya çalışacaksa Postgres advisory lock eklenmeli.
/// </summary>
public sealed class DailyJobRunner(GunDbContext db, GameClock clock, IOptions<GameOptions> options, ILogger<DailyJobRunner> log)
{
    public async Task RunAsync(bool refreshCrowd, CancellationToken ct)
    {
        await PublishDueAsync(ct);
        await FinalizeTimedOutTriviaAsync(ct);
        await ClosePollsAsync(ct);
        if (refreshCrowd) await RefreshCrowdAsync(ct);
    }

    /// <summary>Günü gelen planlanmış soruları yayına alır. (Soru, gün geldiği anda zaten görünür; bu kayıt içindir.)</summary>
    public async Task PublishDueAsync(CancellationToken ct)
    {
        var today = clock.Today;
        var now = clock.UtcNow;
        var n = await db.Questions
            .Where(q => q.Status == QuestionStatus.Scheduled && q.Day <= today)
            .ExecuteUpdateAsync(s => s.SetProperty(q => q.Status, QuestionStatus.Published).SetProperty(q => q.UpdatedAt, now), ct);
        if (n > 0) log.LogInformation("{Count} soru yayına alındı", n);
    }

    /// <summary>Açılıp cevaplanmayan bilgi sorularını 0 puanla kapatır.</summary>
    public async Task FinalizeTimedOutTriviaAsync(CancellationToken ct)
    {
        var limit = PlayService.Trivia.TimeLimit + PlayService.Trivia.Grace;
        var cutoff = clock.UtcNow - limit;
        var stale = await db.Plays
            .Where(p => p.FinishedAt == null && p.StartedAt < cutoff
                        && p.Question.Format == QuestionFormat.Trivia && p.Question.Status != QuestionStatus.Cancelled)
            .ToListAsync(ct);
        foreach (var p in stale)
        {
            p.Score = 0;
            p.Solved = false;
            p.FinishedAt = p.StartedAt + limit;
        }
        if (stale.Count > 0) await db.SaveChangesAsync(ct);
    }

    /// <summary>Günü biten anketleri kapatır ve bekleyen oyları puanlar.</summary>
    public async Task ClosePollsAsync(CancellationToken ct)
    {
        var today = clock.Today;
        var due = await db.Questions
            .Where(q => q.Format == QuestionFormat.Poll && q.Day < today
                        && (q.Status == QuestionStatus.Scheduled || q.Status == QuestionStatus.Published)
                        && (q.PollClosedAt == null || db.PollVotes.Any(v => v.QuestionId == q.Id && v.Score == null)))
            .ToListAsync(ct);

        foreach (var q in due)
        {
            var pcts = await PollResults.PercentagesAsync(db, q, ct);
            var votes = await db.PollVotes.Where(v => v.QuestionId == q.Id && v.Score == null).ToListAsync(ct);
            var playerIds = votes.Select(v => v.PlayerId).ToList();
            var plays = await db.Plays
                .Where(p => p.QuestionId == q.Id && playerIds.Contains(p.PlayerId))
                .ToDictionaryAsync(p => p.PlayerId, ct);

            foreach (var v in votes)
                if (plays.TryGetValue(v.PlayerId, out var play))
                    PollResults.ApplyScore(v, play, pcts);

            q.PollClosedAt ??= clock.UtcNow;
            await db.SaveChangesAsync(ct);
            log.LogInformation("Anket #{No} kapandı, {Count} oy puanlandı", q.No, votes.Count);
        }
    }

    /// <summary>"Türkiye ne dedi?" önbelleğini son 7 günün soruları için yeniler. Yalnızca o günün oyunları sayılır.</summary>
    public async Task RefreshCrowdAsync(CancellationToken ct)
    {
        var today = clock.Today;
        var from = today.AddDays(-options.Value.ArchiveDays);
        var questions = await db.Questions.AsNoTracking()
            .Where(q => q.Day >= from && q.Day <= today
                        && (q.Status == QuestionStatus.Scheduled || q.Status == QuestionStatus.Published))
            .ToListAsync(ct);

        foreach (var q in questions)
        {
            var finished = db.Plays.Where(p => p.QuestionId == q.Id && !p.Archive && p.FinishedAt != null);
            var count = await finished.CountAsync(ct);
            var scored = finished.Where(p => p.Score != null);
            var avg = await scored.AverageAsync(p => (decimal?)p.Score, ct);
            var buckets = await scored
                .GroupBy(p => p.Score >= 100 ? 9 : p.Score!.Value / 10)
                .Select(g => new { Bucket = g.Key, Count = g.Count() })
                .ToListAsync(ct);
            var solved = await finished.CountAsync(p => p.Solved, ct);

            var histogram = new int[10];
            foreach (var b in buckets) histogram[Math.Clamp(b.Bucket, 0, 9)] = b.Count;

            decimal? under = null, over = null;
            List<decimal>? optionPcts = null;
            if (q.Format.IsNumeric())
            {
                var dirs = await finished
                    .Where(p => p.FirstDirection != null)
                    .GroupBy(p => p.FirstDirection)
                    .Select(g => new { Direction = g.Key, Count = g.Count() })
                    .ToListAsync(ct);
                var total = dirs.Sum(d => d.Count);
                if (total > 0)
                {
                    // Higher: cevap tahminden büyük → oyuncu "ucuz sandı".
                    under = Pct(dirs.Where(d => d.Direction == GuessDirection.Higher).Sum(d => d.Count), total);
                    over = Pct(dirs.Where(d => d.Direction == GuessDirection.Lower).Sum(d => d.Count), total);
                }
            }
            else if (q.Format == QuestionFormat.Poll)
            {
                var pcts = await PollResults.PercentagesAsync(db, q, ct);
                optionPcts = pcts.OrderBy(kv => kv.Key).Select(kv => kv.Value).ToList();
            }
            else if (q.Format == QuestionFormat.Trivia)
            {
                var chosen = await finished
                    .Where(p => p.ChosenOption != null)
                    .GroupBy(p => p.ChosenOption!.Value)
                    .Select(g => new { Option = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.Option, x => x.Count, ct);
                optionPcts = Enumerable.Range(0, q.Options?.Count ?? 0)
                    .Select(i => count == 0 ? 0m : Pct(chosen.GetValueOrDefault(i), count))
                    .ToList();
            }

            var row = await db.QuestionCrowd.FindAsync([q.Id], ct);
            if (row is null)
            {
                row = new QuestionCrowd { QuestionId = q.Id };
                db.QuestionCrowd.Add(row);
            }
            row.Plays = count;
            row.AvgScore = avg is { } a ? Math.Round(a, 1, MidpointRounding.AwayFromZero) : null;
            row.Histogram = histogram;
            row.SolvedPct = count == 0 ? null : Pct(solved, count);
            row.UnderPct = under;
            row.OverPct = over;
            row.OptionPcts = optionPcts;
            row.UpdatedAt = clock.UtcNow;
        }

        await db.SaveChangesAsync(ct);
    }

    private static decimal Pct(int part, int total) => Math.Round(part * 100m / total, 1, MidpointRounding.AwayFromZero);
}

public sealed class JobOptions
{
    public bool Enabled { get; set; } = true;
}

public sealed class DailyJobs(IServiceScopeFactory scopes, TimeProvider time, IOptions<JobOptions> options, ILogger<DailyJobs> log)
    : BackgroundService
{
    private static readonly TimeSpan Tick = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan CrowdEvery = TimeSpan.FromMinutes(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.Enabled) return;

        using var timer = new PeriodicTimer(Tick, time);
        var lastCrowd = DateTimeOffset.MinValue;
        do
        {
            try
            {
                var now = time.GetUtcNow();
                var crowd = now - lastCrowd >= CrowdEvery;
                await using var scope = scopes.CreateAsyncScope();
                await scope.ServiceProvider.GetRequiredService<DailyJobRunner>().RunAsync(crowd, stoppingToken);
                if (crowd) lastCrowd = now;
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogError(e, "Dakikalık iş başarısız oldu");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
