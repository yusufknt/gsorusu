using GununSorusu.Api.Data;
using GununSorusu.Domain.Scoring;
using Microsoft.EntityFrameworkCore;

namespace GununSorusu.Api.Game;

public static class PollResults
{
    /// <summary>
    /// Şık başına yüzde (0 tabanlı şık → yüzde). Yalnızca o gün verilen oylar sayılır;
    /// arşivden verilen oylar sonucu değiştirmez.
    /// </summary>
    public static async Task<IReadOnlyDictionary<int, decimal>> PercentagesAsync(GunDbContext db, Question q, CancellationToken ct)
    {
        var counts = await db.PollVotes
            .Where(v => v.QuestionId == q.Id && !v.Archive)
            .GroupBy(v => v.Option)
            .Select(g => new { Option = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Option, x => x.Count, ct);

        var all = Enumerable.Range(0, q.Options?.Count ?? 0).ToDictionary(i => i, i => counts.GetValueOrDefault(i));
        return PollGame.Percentages(all);
    }

    /// <summary>Oyu puanlar ve aynı puanı oyuncunun play kaydına yazar.</summary>
    public static void ApplyScore(PollVote vote, Play play, IReadOnlyDictionary<int, decimal> pcts)
    {
        var actual = pcts.GetValueOrDefault(vote.Option);
        var score = PollGame.Score(vote.PredictedPct, actual);
        vote.ActualPct = actual;
        vote.Score = score;
        play.Score = score;
        play.Solved = score >= SolvedThreshold;
    }

    /// <summary>Tahmin gerçeğe en fazla 10 puan uzaksa (puan ≥ 80) anket "bilindi" sayılır.</summary>
    public const int SolvedThreshold = 80;
}
