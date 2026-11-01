using GununSorusu.Api.Data;
using GununSorusu.Api.Infrastructure;
using GununSorusu.Domain;
using GununSorusu.Domain.Scoring;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;

namespace GununSorusu.Api.Game;

/// <summary>
/// Oyun akışı. Doğru cevap telefona hiç gönderilmez: her tahmin buraya gelir, puanı sunucu hesaplar.
/// Oyun son tahminde kendiliğinden biter (ayrı bir /finish çağrısı yoktur).
/// </summary>
public sealed class PlayService(GunDbContext db, GameClock clock, StreakService streaks, IOptions<GameOptions> options)
{
    public static readonly TriviaRules Trivia = TriviaRules.Default;

    /// <summary>Hangisi daha…? oyununda bu kadar doğru tur "bilindi" sayılır.</summary>
    public const int CompareSolvedRounds = 3;

    /// <summary>Bugünün ya da arşivdeki bir günün sorusu. Gelecek ve taslak sorular hiç görünmez.</summary>
    public async Task<Question?> FindVisibleAsync(DateOnly day, CancellationToken ct)
    {
        if (day > clock.Today) return null;
        return await db.Questions.SingleOrDefaultAsync(q => q.Day == day &&
            (q.Status == QuestionStatus.Scheduled || q.Status == QuestionStatus.Published || q.Status == QuestionStatus.Cancelled), ct);
    }

    public async Task<PlayStateDto> GetStateAsync(Guid playerId, DateOnly day, CancellationToken ct)
    {
        var q = await LoadAsync(day, forAction: false, ct);
        var play = await FindPlayAsync(playerId, q.Id, ct);
        if (play is not null && FinalizeIfTimedOut(q, play)) await db.SaveChangesAsync(ct);
        return await BuildStateAsync(q, play, ct);
    }

    /// <summary>Soruyu açar. Bilgi formatında süre bu anda başlar ve şıklar ilk kez burada görünür.</summary>
    public async Task<PlayStateDto> StartAsync(Guid playerId, DateOnly day, CancellationToken ct)
    {
        var q = await LoadAsync(day, forAction: true, ct);
        var play = await GetOrCreatePlayAsync(playerId, q, ct);

        // Bilgi formatında tek hak vardır: soruyu açmak oynamak demektir.
        if (q.Format == QuestionFormat.Trivia && !play.Archive) await streaks.RecordPlayAsync(playerId, q.Day, ct);
        FinalizeIfTimedOut(q, play);
        await db.SaveChangesAsync(ct);
        return await BuildStateAsync(q, play, ct);
    }

    public async Task<PlayStateDto> GuessAsync(Guid playerId, DateOnly day, decimal? value, CancellationToken ct)
    {
        var q = await LoadAsync(day, forAction: true, ct);
        RequireFormat(q, q.Format.IsNumeric());
        if (value is not { } guess || guess <= 0 || guess > 1_000_000_000_000m)
            throw ApiException.BadRequest("invalid_guess", "Tahmin 0'dan büyük bir sayı olmalı.");
        guess = Math.Round(guess, 2, MidpointRounding.AwayFromZero);
        if (guess == 0) throw ApiException.BadRequest("invalid_guess", "Tahmin 0'dan büyük bir sayı olmalı.");

        var play = await GetOrCreatePlayAsync(playerId, q, ct);
        EnsureNotFinished(play);

        var rules = q.GetNumericRules();
        var answer = q.AnswerNum!.Value;
        var feedback = NumericGame.Evaluate(guess, answer, rules);
        play.Steps.Add(new PlayStep { Value = guess, Direction = feedback.Direction, Close = feedback.IsClose });
        play.FirstDirection ??= feedback.Direction;

        var attempts = play.Steps.Count;
        if (feedback.IsCorrect || attempts >= rules.MaxAttempts)
        {
            var score = NumericGame.Score(attempts, feedback.IsCorrect, guess, answer, play.HintUsed, rules);
            await FinishAsync(q, play, score, feedback.IsCorrect, ct);
        }

        await db.SaveChangesAsync(ct);
        return await BuildStateAsync(q, play, ct);
    }

    /// <summary>"Aralığı daralt" ipucu: herkese aynı aralık (seed = soru id), −10 puan.</summary>
    public async Task<PlayStateDto> HintAsync(Guid playerId, DateOnly day, CancellationToken ct)
    {
        var q = await LoadAsync(day, forAction: true, ct);
        RequireFormat(q, q.Format.IsNumeric());
        var play = await FindPlayAsync(playerId, q.Id, ct) ?? throw NotStarted();
        EnsureNotFinished(play);

        var rules = q.GetNumericRules();
        if (play.HintUsed) throw ApiException.Conflict("hint_already_used", "İpucunu zaten kullandın.");
        if (!NumericGame.CanUseHint(play.Steps.Count, play.IsFinished, play.HintUsed, rules))
            throw ApiException.Conflict("hint_unavailable", $"İpucu {rules.HintAfterAttempts}. tahminden sonra açılır.");

        var range = NumericHint.Build(q.AnswerNum!.Value, q.Id, play.Steps.Select(s => (s.Value!.Value, s.Direction!.Value)));
        play.HintUsed = true;
        play.HintMin = range.Min;
        play.HintMax = range.Max;
        await db.SaveChangesAsync(ct);
        return await BuildStateAsync(q, play, ct);
    }

    public async Task<PlayStateDto> AnswerTriviaAsync(Guid playerId, DateOnly day, int? option, CancellationToken ct)
    {
        var q = await LoadAsync(day, forAction: true, ct);
        RequireFormat(q, q.Format == QuestionFormat.Trivia);
        if (option is not { } chosen || chosen < 0 || chosen >= q.Options!.Count)
            throw ApiException.BadRequest("invalid_option", "Geçersiz şık.");

        var play = await FindPlayAsync(playerId, q.Id, ct) ?? throw NotStarted();
        if (FinalizeIfTimedOut(q, play))
        {
            await db.SaveChangesAsync(ct);
            return await BuildStateAsync(q, play, ct);
        }
        EnsureNotFinished(play);

        var elapsed = clock.UtcNow - play.StartedAt;
        var correct = chosen == q.CorrectOption;
        play.Steps.Add(new PlayStep { Option = chosen, Correct = correct, ElapsedMs = (int)elapsed.TotalMilliseconds });
        play.ChosenOption = chosen;
        await FinishAsync(q, play, TriviaGame.Score(correct, elapsed, Trivia), correct, ct);

        await db.SaveChangesAsync(ct);
        return await BuildStateAsync(q, play, ct);
    }

    public async Task<PlayStateDto> AnswerCompareAsync(Guid playerId, DateOnly day, int? round, int? choice, CancellationToken ct)
    {
        var q = await LoadAsync(day, forAction: true, ct);
        RequireFormat(q, q.Format == QuestionFormat.Compare);
        if (choice is not (0 or 1)) throw ApiException.BadRequest("invalid_choice", "Geçersiz seçim.");

        var play = await GetOrCreatePlayAsync(playerId, q, ct);
        EnsureNotFinished(play);
        if (round != play.Steps.Count)
            throw ApiException.Conflict("wrong_round", "Bu tur zaten cevaplandı. Ekranı yenile.");

        var r = q.Rounds![play.Steps.Count];
        play.Steps.Add(new PlayStep { Round = round, Option = choice, Correct = choice == r.Correct });

        if (play.Steps.Count == CompareGame.Rounds)
        {
            var results = play.Steps.Select(s => s.Correct == true).ToList();
            await FinishAsync(q, play, CompareGame.Score(results), results.Count(x => x) >= CompareSolvedRounds, ct);
        }

        await db.SaveChangesAsync(ct);
        return await BuildStateAsync(q, play, ct);
    }

    /// <summary>
    /// Türkiye ne diyor?: oy + "kaç kişi senin gibi dedi" tahmini. Seri oy verildiği anda sayılır,
    /// puan anket kapanınca (gün bitince) kesinleşir. Kapanmış ankete arşivden verilen oy hemen puanlanır.
    /// </summary>
    public async Task<PlayStateDto> VotePollAsync(Guid playerId, DateOnly day, int? option, int? predictedPct, CancellationToken ct)
    {
        var q = await LoadAsync(day, forAction: true, ct);
        RequireFormat(q, q.Format == QuestionFormat.Poll);
        if (option is not { } chosen || chosen < 0 || chosen >= q.Options!.Count)
            throw ApiException.BadRequest("invalid_option", "Geçersiz seçenek.");
        if (predictedPct is not { } predicted || predicted is < 0 or > 100)
            throw ApiException.BadRequest("invalid_prediction", "Tahmin 0 ile 100 arasında olmalı.");

        var play = await GetOrCreatePlayAsync(playerId, q, ct);
        if (play.IsFinished) throw ApiException.Conflict("already_voted", "Bu ankete zaten oy verdin.");

        var vote = new PollVote
        {
            QuestionId = q.Id,
            PlayerId = playerId,
            Option = chosen,
            PredictedPct = predicted,
            Archive = play.Archive,
            CreatedAt = clock.UtcNow,
        };
        db.PollVotes.Add(vote);
        play.Steps.Add(new PlayStep { Option = chosen, Value = predicted });
        play.ChosenOption = chosen;

        if (q.PollClosedAt is not null)
        {
            PollResults.ApplyScore(vote, play, await PollResults.PercentagesAsync(db, q, ct));
            await FinishAsync(q, play, play.Score, play.Solved, ct);
        }
        else
        {
            await FinishAsync(q, play, score: null, solved: false, ct);
        }

        await db.SaveChangesAsync(ct);
        return await BuildStateAsync(q, play, ct);
    }

    private async Task<Question> LoadAsync(DateOnly day, bool forAction, CancellationToken ct)
    {
        var today = clock.Today;
        if (day < today.AddDays(-options.Value.ArchiveDays))
            throw ApiException.Forbidden("archive_expired", $"Arşivde yalnızca son {options.Value.ArchiveDays} günün soruları oynanabilir.");

        var q = await FindVisibleAsync(day, ct) ?? throw QuestionNotFound(day == today);
        if (forAction && q.Status == QuestionStatus.Cancelled)
            throw ApiException.Conflict("question_cancelled", "Bu soru iptal edildi. Kimsenin serisi bozulmayacak.");
        return q;
    }

    public static ApiException QuestionNotFound(bool isToday) => isToday
        ? ApiException.NotFound("question_not_ready", "Bugünün sorusu hazırlanıyor. Birazdan tekrar dene.")
        : ApiException.NotFound("question_not_found", "Bu günün sorusu bulunamadı.");

    private Task<Play?> FindPlayAsync(Guid playerId, int questionId, CancellationToken ct) =>
        db.Plays.SingleOrDefaultAsync(p => p.PlayerId == playerId && p.QuestionId == questionId, ct);

    private async Task<Play> GetOrCreatePlayAsync(Guid playerId, Question q, CancellationToken ct)
    {
        var play = await FindPlayAsync(playerId, q.Id, ct);
        if (play is not null) return play;

        play = new Play
        {
            PlayerId = playerId,
            QuestionId = q.Id,
            Question = q,
            Archive = q.Day < clock.Today,
            StartedAt = clock.UtcNow,
        };
        db.Plays.Add(play);
        try
        {
            await db.SaveChangesAsync(ct);
            return play;
        }
        catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Aynı anda iki istek geldi; diğerinin oluşturduğu kaydı kullan.
            db.Entry(play).State = EntityState.Detached;
            var existing = await FindPlayAsync(playerId, q.Id, ct);
            if (existing is null) throw;
            return existing;
        }
    }

    private async Task FinishAsync(Question q, Play play, int? score, bool solved, CancellationToken ct)
    {
        play.Score = score;
        play.Solved = solved;
        play.FinishedAt = clock.UtcNow;
        if (!play.Archive) await streaks.RecordPlayAsync(play.PlayerId, q.Day, ct);
    }

    /// <summary>Süresi dolan bilgi sorusunu 0 puanla kapatır. Kapattıysa true.</summary>
    private bool FinalizeIfTimedOut(Question q, Play play)
    {
        if (q.Format != QuestionFormat.Trivia || play.IsFinished) return false;
        if (!TriviaGame.IsTimedOut(clock.UtcNow - play.StartedAt, Trivia)) return false;

        play.Score = 0;
        play.Solved = false;
        play.FinishedAt = play.StartedAt + Trivia.TimeLimit + Trivia.Grace;
        return true;
    }

    private static void RequireFormat(Question q, bool ok)
    {
        if (!ok) throw ApiException.BadRequest("wrong_format", "Bu işlem bugünkü soru türüne uygun değil. Uygulamayı güncellemeyi dene.");
    }

    private static void EnsureNotFinished(Play play)
    {
        if (play.IsFinished) throw ApiException.Conflict("already_finished", "Bu soruyu zaten bitirdin.");
    }

    private static ApiException NotStarted() => ApiException.Conflict("not_started", "Önce soruyu aç.");

    private async Task<PlayStateDto> BuildStateAsync(Question q, Play? play, CancellationToken ct)
    {
        var cancelled = q.Status == QuestionStatus.Cancelled;
        var finished = play?.IsFinished == true;
        var steps = play?.Steps ?? [];

        NumericStateDto? numeric = null;
        if (q.Format.IsNumeric())
        {
            var rules = q.GetNumericRules();
            numeric = new NumericStateDto(
                steps.Count,
                rules.MaxAttempts,
                steps.Select(s => new GuessDto(s.Value!.Value, s.Direction!.Value, s.Close == true)).ToList(),
                play?.HintUsed == true,
                play is not null && !cancelled && NumericGame.CanUseHint(steps.Count, finished, play.HintUsed, rules),
                rules.HintAfterAttempts,
                play is { HintMin: { } min, HintMax: { } max } ? new RangeDto(min, max) : null);
        }

        TriviaStateDto? trivia = null;
        if (q.Format == QuestionFormat.Trivia && play is not null)
        {
            var step = steps.FirstOrDefault();
            trivia = new TriviaStateDto(
                q.Options!,
                (int)Trivia.TimeLimit.TotalSeconds,
                play.StartedAt,
                play.StartedAt + Trivia.TimeLimit,
                play.ChosenOption,
                step?.ElapsedMs,
                finished && play.ChosenOption is null);
        }

        CompareStateDto? compare = null;
        if (q.Format == QuestionFormat.Compare)
        {
            compare = new CompareStateDto(
                CompareGame.Rounds,
                steps.Select(s =>
                {
                    var r = q.Rounds![s.Round!.Value];
                    return new CompareResultDto(s.Round.Value, s.Option!.Value, s.Correct == true, r.Correct, r.ValueA, r.ValueB);
                }).ToList());
        }

        PollStateDto? poll = null;
        if (q.Format == QuestionFormat.Poll && play is not null && finished)
        {
            var vote = await db.PollVotes.AsNoTracking()
                .SingleOrDefaultAsync(v => v.QuestionId == q.Id && v.PlayerId == play.PlayerId, ct);
            if (vote is not null) poll = new PollStateDto(vote.Option, vote.PredictedPct, vote.ActualPct);
        }

        RevealDto? reveal = null;
        if (finished && !cancelled)
        {
            reveal = new RevealDto(
                q.Format.IsNumeric() ? q.AnswerNum : null,
                q.Unit,
                q.Format == QuestionFormat.Trivia ? q.CorrectOption : null,
                q.FactText,
                q.PriceHistory,
                q.SourceText,
                q.SourceUrl,
                q.SourceDate);
        }

        return new PlayStateDto(
            q.Id, q.No, q.Day, q.Format,
            Started: play is not null,
            Archive: play?.Archive ?? q.Day < clock.Today,
            Cancelled: cancelled,
            Finished: finished,
            Score: play?.Score,
            ScorePending: finished && play!.Score is null,
            Solved: play?.Solved == true,
            numeric, trivia, compare, poll, reveal);
    }
}
