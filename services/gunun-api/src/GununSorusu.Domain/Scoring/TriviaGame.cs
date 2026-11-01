namespace GununSorusu.Domain.Scoring;

/// <param name="TimeLimit">Cevap süresi.</param>
/// <param name="Grace">Ağ gecikmesi için tanınan pay; ilk bu kadar süre bonustan düşmez.</param>
public sealed record TriviaRules(TimeSpan TimeLimit, TimeSpan Grace, int BaseScore = 60, int MaxSpeedBonus = 40)
{
    public static readonly TriviaRules Default = new(TimeSpan.FromSeconds(30), TimeSpan.FromSeconds(1));
}

/// <summary>
/// Bilgi formatı: 4 şık, 1 hak. Süre sunucuda ölçülür (soru /start ile açıldığı an → cevap anı).
/// </summary>
public static class TriviaGame
{
    public static int Score(bool correct, TimeSpan elapsed, TriviaRules rules)
    {
        if (elapsed < TimeSpan.Zero) throw new ArgumentOutOfRangeException(nameof(elapsed));
        if (!correct || IsTimedOut(elapsed, rules)) return 0;

        var effective = elapsed - rules.Grace;
        if (effective < TimeSpan.Zero) effective = TimeSpan.Zero;

        var remaining = 1d - effective.TotalMilliseconds / rules.TimeLimit.TotalMilliseconds;
        var bonus = (int)Math.Round(rules.MaxSpeedBonus * Math.Clamp(remaining, 0d, 1d), MidpointRounding.AwayFromZero);
        return rules.BaseScore + bonus;
    }

    /// <summary>Süre + ağ payı aşıldıysa cevap kabul edilmez.</summary>
    public static bool IsTimedOut(TimeSpan elapsed, TriviaRules rules) => elapsed > rules.TimeLimit + rules.Grace;
}
