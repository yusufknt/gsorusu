namespace GununSorusu.Domain.Scoring;

/// <summary>
/// "Türkiye ne diyor?" formatı. Oyuncu önce oy verir, sonra kendi seçeneğini
/// oyuncuların yüzde kaçının seçtiğini tahmin eder. Puan gün kapanınca hesaplanır.
/// </summary>
public static class PollGame
{
    public const int PenaltyPerPoint = 2;

    /// <summary>100 − 2 × |tahmin − gerçek|, 0 ile 100 arasında sınırlı.</summary>
    public static int Score(int predictedPct, decimal actualPct)
    {
        if (predictedPct is < 0 or > 100) throw new ArgumentOutOfRangeException(nameof(predictedPct));
        if (actualPct is < 0 or > 100) throw new ArgumentOutOfRangeException(nameof(actualPct));

        var raw = 100m - PenaltyPerPoint * Math.Abs(predictedPct - actualPct);
        return Math.Clamp((int)Math.Round(raw, MidpointRounding.AwayFromZero), 0, 100);
    }

    /// <summary>Seçenek başına oy sayılarından yüzdeleri hesaplar (toplam 0 ise hepsi 0).</summary>
    public static IReadOnlyDictionary<int, decimal> Percentages(IReadOnlyDictionary<int, int> votesByOption)
    {
        var total = votesByOption.Values.Sum();
        return votesByOption.ToDictionary(
            kv => kv.Key,
            kv => total == 0 ? 0m : Math.Round(kv.Value * 100m / total, 1, MidpointRounding.AwayFromZero));
    }
}
