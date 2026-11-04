using GununSorusu.Domain;
using GununSorusu.Domain.Scoring;
using GununSorusu.Domain.Streaks;

namespace GununSorusu.Api.Data;

/// <summary>
/// Sorunun yaşam döngüsü. Draft → Verified → Scheduled (güne atandı) → Published (gün geldi).
/// Cancelled: hatalı soru protokolü; o gün mazeretli sayılır.
/// </summary>
public enum QuestionStatus
{
    Draft,
    Verified,
    Scheduled,
    Published,
    Cancelled,
}

public sealed class Question
{
    public int Id { get; set; }

    /// <summary>Paylaşımda görünen numara (#31). Gün ile birebir: LaunchDay = #1.</summary>
    public int No { get; set; }

    public DateOnly Day { get; set; }
    public QuestionFormat Format { get; set; }
    public QuestionStatus Status { get; set; }
    public string Prompt { get; set; } = "";
    public string? MediaUrl { get; set; }
    public string? Unit { get; set; }

    /// <summary>Sayısal formatların doğru cevabı. Telefona yalnızca oyun bitince gönderilir.</summary>
    public decimal? AnswerNum { get; set; }

    /// <summary>Boşsa varsayılan ±%5.</summary>
    public decimal? TolerancePct { get; set; }

    /// <summary>Bilgi (4 şık) ve Türkiye ne diyor? (2–6 seçenek) formatlarının şıkları.</summary>
    public List<string>? Options { get; set; }

    /// <summary>Bilgi formatının doğru şıkkı (0 tabanlı).</summary>
    public int? CorrectOption { get; set; }

    /// <summary>Hangisi daha…? formatının 5 turu.</summary>
    public List<CompareRound>? Rounds { get; set; }

    public string? FactText { get; set; }
    public List<PricePoint>? PriceHistory { get; set; }
    public string? SourceText { get; set; }
    public string? SourceUrl { get; set; }
    public DateOnly? SourceDate { get; set; }
    public string? VerifiedBy1 { get; set; }
    public string? VerifiedBy2 { get; set; }
    public bool IsSponsored { get; set; }

    /// <summary>Anket sonuçlarının kesinleştiği an (yalnızca Türkiye ne diyor?).</summary>
    public DateTimeOffset? PollClosedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public NumericRules GetNumericRules() =>
        TolerancePct is { } t ? NumericRules.Default with { TolerancePct = t } : NumericRules.Default;
}

/// <param name="Prompt">Tura özel soru; boşsa sorunun ana metni kullanılır.</param>
/// <param name="Correct">Doğru seçenek: 0 = A, 1 = B.</param>
/// <param name="ValueA">Cevaptan sonra gösterilen değer (ör. "5,5 milyon").</param>
public sealed record CompareRound(string? Prompt, string OptionA, string OptionB, int Correct, string? ValueA, string? ValueB);

public sealed record PricePoint(DateOnly Date, decimal Price);

public sealed class Player
{
    public Guid Id { get; set; }

    /// <summary>Cihaz kimliğinin SHA-256 özeti. Ham cihaz kimliği saklanmaz.</summary>
    public string DeviceIdHash { get; set; } = "";

    /// <summary>null (anonim) / apple / google — v1.1.</summary>
    public string? AuthProvider { get; set; }

    public string? DisplayName { get; set; }
    public string? City { get; set; }
    public int NotifyHour { get; set; } = 9;
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class Play
{
    public Guid PlayerId { get; set; }
    public int QuestionId { get; set; }
    public Question Question { get; set; } = null!;

    /// <summary>Geçmiş günün sorusu arşivden oynandı; seriyi ve istatistikleri etkilemez.</summary>
    public bool Archive { get; set; }

    /// <summary>Tahminler / cevaplar (veritabanında "guesses").</summary>
    public List<PlayStep> Steps { get; set; } = [];

    public bool HintUsed { get; set; }
    public decimal? HintMin { get; set; }
    public decimal? HintMax { get; set; }

    /// <summary>Sayısal formatta ilk tahminin yönü. "Oyuncuların %62'si ucuz sandı" bundan hesaplanır.</summary>
    public GuessDirection? FirstDirection { get; set; }

    /// <summary>Bilgi ve anket formatında seçilen şık.</summary>
    public int? ChosenOption { get; set; }

    /// <summary>null: oyun bitmedi ya da anket puanı henüz kesinleşmedi.</summary>
    public int? Score { get; set; }

    public bool Solved { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? FinishedAt { get; set; }

    /// <summary>Postgres xmin; aynı anda gelen iki tahmini ayırt etmek için.</summary>
    public uint Version { get; set; }

    public bool IsFinished => FinishedAt is not null;
}

/// <summary>Bir tahmin ya da cevap. Hangi alanların dolu olduğu formata bağlıdır.</summary>
public sealed record PlayStep
{
    /// <summary>Sayısal tahmin; ankette tahmin edilen yüzde.</summary>
    public decimal? Value { get; init; }

    public GuessDirection? Direction { get; init; }
    public bool? Close { get; init; }

    /// <summary>Seçilen şık (bilgi, anket) ya da Hangisi daha…? turunda seçim (0/1).</summary>
    public int? Option { get; init; }

    public int? Round { get; init; }
    public bool? Correct { get; init; }
    public int? ElapsedMs { get; init; }
}

public sealed class PollVote
{
    public int QuestionId { get; set; }
    public Guid PlayerId { get; set; }
    public int Option { get; set; }
    public int PredictedPct { get; set; }

    /// <summary>Arşivden verilen oy sonuçlara katılmaz, yalnızca puanlanır.</summary>
    public bool Archive { get; set; }

    public decimal? ActualPct { get; set; }
    public int? Score { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>
/// Yalnızca seri durumunu tutar. Oynanan gün, ortalama puan gibi sayaçlar
/// plays tablosundan hesaplanır (bkz. docs/kararlar.md).
/// </summary>
public sealed class PlayerStats
{
    public Guid PlayerId { get; set; }
    public int CurrentStreak { get; set; }
    public int MaxStreak { get; set; }
    public DateOnly? LastPlayedDay { get; set; }
    public DateOnly? LastRepairDay { get; set; }

    public StreakState ToState() => new(CurrentStreak, MaxStreak, LastPlayedDay, LastRepairDay);

    public void Apply(StreakState s)
    {
        CurrentStreak = s.Current;
        MaxStreak = s.Max;
        LastPlayedDay = s.LastPlayedDay;
        LastRepairDay = s.LastRepairDay;
    }
}

/// <summary>"Türkiye ne dedi?" önbelleği; 5 dakikada bir yenilenir.</summary>
public sealed class QuestionCrowd
{
    public int QuestionId { get; set; }
    public int Plays { get; set; }
    public decimal? AvgScore { get; set; }

    /// <summary>10 kova: 0–9, 10–19, …, 90–100.</summary>
    public int[] Histogram { get; set; } = new int[10];

    public decimal? SolvedPct { get; set; }

    /// <summary>Sayısal: ilk tahmini cevaptan düşük olanlar ("ucuz sandı").</summary>
    public decimal? UnderPct { get; set; }

    public decimal? OverPct { get; set; }

    /// <summary>Bilgi / anket: şık başına yüzde.</summary>
    public List<decimal>? OptionPcts { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}

/// <summary>Arkadaş ligi (aile, iş yeri). Lige <see cref="Code"/> ile girilir.</summary>
public sealed class League
{
    public Guid Id { get; set; }

    /// <summary>6 karakter, tekil (bkz. GununSorusu.Domain.Leagues.LeagueCode).</summary>
    public string Code { get; set; } = "";

    public string Name { get; set; } = "";

    /// <summary>Ligi kuran ya da ondan devralan üye. Üyeleri yalnızca o çıkarabilir.</summary>
    public Guid OwnerId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class LeagueMember
{
    public Guid LeagueId { get; set; }
    public Guid PlayerId { get; set; }
    public DateTimeOffset JoinedAt { get; set; }
}
