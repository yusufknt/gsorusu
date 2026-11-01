namespace GununSorusu.Domain.Scoring;

/// <summary>Hangisi daha…? — 5 hızlı ikili tur, her doğru 20 puan.</summary>
public static class CompareGame
{
    public const int Rounds = 5;
    public const int PointsPerRound = 100 / Rounds;

    public static int Score(IReadOnlyList<bool> roundResults)
    {
        if (roundResults.Count != Rounds)
            throw new ArgumentException($"Tam olarak {Rounds} tur bekleniyor.", nameof(roundResults));
        return roundResults.Count(r => r) * PointsPerRound;
    }
}
