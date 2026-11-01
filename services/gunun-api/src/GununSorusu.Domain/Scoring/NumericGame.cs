namespace GununSorusu.Domain.Scoring;

/// <summary>Bir sayısal tahminin sonucu. Higher: doğru cevap tahminden büyük ("daha pahalı").</summary>
public enum GuessDirection
{
    Higher,
    Lower,
    Correct,
}

public readonly record struct GuessFeedback(GuessDirection Direction, bool IsClose)
{
    public bool IsCorrect => Direction == GuessDirection.Correct;
}

/// <param name="TolerancePct">Bu yüzdelik hata payı içindeki tahmin doğru sayılır (±%5).</param>
/// <param name="ClosePct">Bu yüzdelik hata payı içindeki yanlış tahmine "çok yakın" denir (%10).</param>
/// <param name="MaxAttempts">Toplam hak sayısı.</param>
/// <param name="HintAfterAttempts">İpucu bu kadar hak kullanıldıktan sonra açılır.</param>
public sealed record NumericRules(
    decimal TolerancePct = 5m,
    decimal ClosePct = 10m,
    int MaxAttempts = 6,
    int HintAfterAttempts = 3)
{
    public static readonly NumericRules Default = new();
}

/// <summary>Fiyatı Ne? ve Sayı tahmini formatlarının kuralları ve puanlaması.</summary>
public static class NumericGame
{
    public const int FirstAttemptScore = 100;
    public const int PenaltyPerExtraAttempt = 15;
    public const int MaxUnsolvedScore = 20;
    public const int HintPenalty = 10;

    /// <summary>Çözülemeyen oyunda bu hata oranı ve üstü 0 puan alır.</summary>
    public const decimal UnsolvedZeroErrorPct = 50m;

    public static GuessFeedback Evaluate(decimal guess, decimal answer, NumericRules rules)
    {
        if (answer <= 0) throw new ArgumentOutOfRangeException(nameof(answer), "Cevap pozitif olmalı.");
        if (guess <= 0) throw new ArgumentOutOfRangeException(nameof(guess), "Tahmin pozitif olmalı.");

        var errorPct = ErrorPct(guess, answer);
        if (errorPct <= rules.TolerancePct) return new GuessFeedback(GuessDirection.Correct, IsClose: true);

        var direction = answer > guess ? GuessDirection.Higher : GuessDirection.Lower;
        return new GuessFeedback(direction, IsClose: errorPct <= rules.ClosePct);
    }

    /// <summary>
    /// 0–100 puan. Çözüldüyse 1. hakta 100, sonraki her hakta −15.
    /// Çözülemediyse son tahminin yakınlığına göre 0–20. İpucu −10.
    /// </summary>
    public static int Score(int attemptsUsed, bool solved, decimal lastGuess, decimal answer, bool hintUsed, NumericRules rules)
    {
        if (attemptsUsed < 1 || attemptsUsed > rules.MaxAttempts)
            throw new ArgumentOutOfRangeException(nameof(attemptsUsed));

        int score;
        if (solved)
        {
            score = FirstAttemptScore - PenaltyPerExtraAttempt * (attemptsUsed - 1);
        }
        else
        {
            if (attemptsUsed != rules.MaxAttempts)
                throw new ArgumentException("Çözülmemiş oyun ancak tüm haklar bittiğinde puanlanır.", nameof(attemptsUsed));
            score = UnsolvedScore(ErrorPct(lastGuess, answer), rules);
        }

        if (hintUsed) score -= HintPenalty;
        return Math.Clamp(score, 0, 100);
    }

    public static bool CanUseHint(int attemptsUsed, bool finished, bool hintAlreadyUsed, NumericRules rules) =>
        !finished && !hintAlreadyUsed && attemptsUsed >= rules.HintAfterAttempts && attemptsUsed < rules.MaxAttempts;

    internal static decimal ErrorPct(decimal guess, decimal answer) => Math.Abs(guess - answer) / answer * 100m;

    private static int UnsolvedScore(decimal errorPct, NumericRules rules)
    {
        if (errorPct <= rules.ClosePct) return MaxUnsolvedScore;
        if (errorPct >= UnsolvedZeroErrorPct) return 0;
        var ratio = (UnsolvedZeroErrorPct - errorPct) / (UnsolvedZeroErrorPct - rules.ClosePct);
        return (int)Math.Round(MaxUnsolvedScore * ratio, MidpointRounding.AwayFromZero);
    }
}
