namespace GununSorusu.Domain.Scoring;

public readonly record struct NumericRange(decimal Min, decimal Max)
{
    public bool Contains(decimal value) => value >= Min && value <= Max;
}

/// <summary>
/// "Aralığı daralt" ipucu. Aynı soru için herkese aynı aralık verilir (seed = soru id),
/// böylece ipucu tekrar istenerek yeni aralık "çekilemez" ve oyun adil kalır.
/// Cevap aralığın ortasına konmaz; aksi hâlde ipucu cevabı ele verirdi.
/// </summary>
public static class NumericHint
{
    /// <summary>Aralık genişliği, cevabın yüzdesi olarak.</summary>
    public const decimal WidthPct = 20m;

    public static NumericRange Build(decimal answer, int seed, IEnumerable<(decimal Guess, GuessDirection Direction)> previousGuesses)
    {
        if (answer <= 0) throw new ArgumentOutOfRangeException(nameof(answer));

        var rng = new Random(seed);
        // Cevabın aralık içindeki konumu: %20–%80 arası.
        var position = 0.2m + (decimal)rng.NextDouble() * 0.6m;
        var width = answer * WidthPct / 100m;

        var min = answer - width * position;
        var max = min + width;

        // Oyuncunun kendi tahminlerinden zaten bildiği sınırlarla kesiştir.
        foreach (var (guess, direction) in previousGuesses)
        {
            if (direction == GuessDirection.Higher && guess > min) min = guess;
            if (direction == GuessDirection.Lower && guess < max) max = guess;
        }

        var step = NiceStep(answer);
        min = Math.Max(0, Math.Floor(min / step) * step);
        max = Math.Ceiling(max / step) * step;
        return new NumericRange(min, max);
    }

    /// <summary>
    /// Yuvarlama adımı: aralık genişliğinin ~onda biri, 10'un kuvveti (ör. 87,5 → 1; 1.250 → 10).
    /// Böylece yuvarlama aralığı en fazla ~%20 genişletir.
    /// </summary>
    internal static decimal NiceStep(decimal answer)
    {
        var tenthOfWidth = (double)(answer * WidthPct / 100m) / 10d;
        var exponent = Math.Max((int)Math.Floor(Math.Log10(tenthOfWidth) + 1e-9), -2);
        var step = 1m;
        if (exponent > 0) for (var i = 0; i < exponent; i++) step *= 10m;
        else for (var i = 0; i < -exponent; i++) step /= 10m;
        return step;
    }
}
