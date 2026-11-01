using GununSorusu.Api.Data;
using GununSorusu.Domain;
using GununSorusu.Domain.Scoring;

namespace GununSorusu.Api.Game;

/// <summary>
/// Herkese açık soru (önbelleğe alınabilir). Doğru cevap, bilgi formatının şıkları
/// ve Hangisi daha…? doğruları burada asla yer almaz.
/// </summary>
public sealed record PublicQuestionDto(
    int Id,
    int No,
    DateOnly Day,
    QuestionFormat Format,
    string Prompt,
    string? MediaUrl,
    string? Unit,
    bool Cancelled,
    int? MaxAttempts,
    int? HintAfterAttempts,
    int? TimeLimitSec,
    IReadOnlyList<string>? Options,
    IReadOnlyList<PublicRoundDto>? Rounds,
    bool IsSponsored)
{
    public static PublicQuestionDto From(Question q)
    {
        var numeric = q.Format.IsNumeric() ? q.GetNumericRules() : null;
        return new PublicQuestionDto(
            q.Id, q.No, q.Day, q.Format, q.Prompt, q.MediaUrl, q.Unit,
            q.Status == QuestionStatus.Cancelled,
            numeric?.MaxAttempts,
            numeric?.HintAfterAttempts,
            q.Format == QuestionFormat.Trivia ? (int)PlayService.Trivia.TimeLimit.TotalSeconds : null,
            q.Format == QuestionFormat.Poll ? q.Options : null,
            q.Format == QuestionFormat.Compare ? q.Rounds?.Select(r => new PublicRoundDto(r.Prompt, r.OptionA, r.OptionB)).ToList() : null,
            q.IsSponsored);
    }
}

public sealed record PublicRoundDto(string? Prompt, string OptionA, string OptionB);

/// <summary>Oyuncunun bir sorudaki durumu. Her oyun işlemi bu nesnenin güncel hâlini döndürür.</summary>
public sealed record PlayStateDto(
    int QuestionId,
    int No,
    DateOnly Day,
    QuestionFormat Format,
    bool Started,
    bool Archive,
    bool Cancelled,
    bool Finished,
    int? Score,
    bool ScorePending,
    bool Solved,
    NumericStateDto? Numeric,
    TriviaStateDto? Trivia,
    CompareStateDto? Compare,
    PollStateDto? Poll,
    RevealDto? Reveal);

public sealed record NumericStateDto(
    int AttemptsUsed,
    int MaxAttempts,
    IReadOnlyList<GuessDto> Guesses,
    bool HintUsed,
    bool CanUseHint,
    int HintAfterAttempts,
    RangeDto? Hint);

public sealed record GuessDto(decimal Value, GuessDirection Direction, bool Close);

public sealed record RangeDto(decimal Min, decimal Max);

/// <param name="Deadline">İstemcideki geri sayım için; ağ payı sunucuda ayrıca tanınır.</param>
/// <param name="TimedOut">Süre dolduğu için cevapsız bitti.</param>
public sealed record TriviaStateDto(
    IReadOnlyList<string> Options,
    int TimeLimitSec,
    DateTimeOffset StartedAt,
    DateTimeOffset Deadline,
    int? ChosenOption,
    int? ElapsedMs,
    bool TimedOut);

public sealed record CompareStateDto(int Rounds, IReadOnlyList<CompareResultDto> Answered);

public sealed record CompareResultDto(int Round, int Choice, bool Correct, int CorrectChoice, string? ValueA, string? ValueB);

/// <param name="ActualPct">Anket kapanınca dolar: oyuncuların yüzde kaçı aynı şıkkı seçti.</param>
public sealed record PollStateDto(int Option, int PredictedPct, decimal? ActualPct);

/// <summary>Oyun bittikten sonra gösterilen cevap ve "Bunu biliyor muydun?" bilgisi.</summary>
public sealed record RevealDto(
    decimal? Answer,
    string? Unit,
    int? CorrectOption,
    string? FactText,
    IReadOnlyList<PricePoint>? PriceHistory,
    string? SourceText,
    string? SourceUrl,
    DateOnly? SourceDate);

public sealed record GuessRequest(decimal? Value);

public sealed record TriviaAnswerRequest(int? Option);

public sealed record CompareAnswerRequest(int? Round, int? Choice);

public sealed record PollVoteRequest(int? Option, int? PredictedPct);
