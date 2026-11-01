using GununSorusu.Domain.Scoring;

namespace GununSorusu.Domain.Tests;

public class NumericGameTests
{
    private static readonly NumericRules Rules = NumericRules.Default;

    [Theory]
    [InlineData(100, 100)]
    [InlineData(95, 100)]   // tam -%5 sınırı doğru
    [InlineData(105, 100)]  // tam +%5 sınırı doğru
    public void Evaluate_WithinTolerance_IsCorrect(decimal guess, decimal answer)
    {
        Assert.Equal(GuessDirection.Correct, NumericGame.Evaluate(guess, answer, Rules).Direction);
    }

    [Fact]
    public void Evaluate_GuessTooLow_SaysHigher()
    {
        var result = NumericGame.Evaluate(50, 100, Rules);
        Assert.Equal(GuessDirection.Higher, result.Direction);
        Assert.False(result.IsClose);
    }

    [Fact]
    public void Evaluate_GuessTooHigh_SaysLower()
    {
        Assert.Equal(GuessDirection.Lower, NumericGame.Evaluate(150, 100, Rules).Direction);
    }

    [Theory]
    [InlineData(92, GuessDirection.Higher)]
    [InlineData(90, GuessDirection.Higher)]  // tam %10 sınırı "çok yakın"
    [InlineData(108, GuessDirection.Lower)]
    public void Evaluate_Within10Percent_IsClose(decimal guess, GuessDirection expected)
    {
        var result = NumericGame.Evaluate(guess, 100, Rules);
        Assert.Equal(expected, result.Direction);
        Assert.True(result.IsClose);
    }

    [Fact]
    public void Evaluate_Outside10Percent_IsNotClose()
    {
        Assert.False(NumericGame.Evaluate(89.9m, 100, Rules).IsClose);
    }

    [Theory]
    [InlineData(0, 100)]
    [InlineData(-5, 100)]
    [InlineData(10, 0)]
    public void Evaluate_NonPositiveInputs_Throw(decimal guess, decimal answer)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => NumericGame.Evaluate(guess, answer, Rules));
    }

    [Theory]
    [InlineData(1, 100)]
    [InlineData(2, 85)]
    [InlineData(4, 55)]  // PDF'teki örnek kart: 4/6 · 55 puan
    [InlineData(6, 25)]
    public void Score_Solved_Loses15PerExtraAttempt(int attempts, int expected)
    {
        Assert.Equal(expected, NumericGame.Score(attempts, solved: true, lastGuess: 100, answer: 100, hintUsed: false, Rules));
    }

    [Fact]
    public void Score_Solved_WithHint_Loses10More()
    {
        Assert.Equal(45, NumericGame.Score(4, solved: true, 100, 100, hintUsed: true, Rules));
    }

    [Theory]
    [InlineData(108, 20)]  // %8 hata → tam 20
    [InlineData(110, 20)]  // %10 sınırı → 20
    [InlineData(130, 10)]  // %30 hata → %10 ile %50 arasının ortası → 10
    [InlineData(150, 0)]   // %50 → 0
    [InlineData(400, 0)]
    public void Score_Unsolved_DependsOnLastGuessProximity(decimal lastGuess, int expected)
    {
        Assert.Equal(expected, NumericGame.Score(6, solved: false, lastGuess, 100, hintUsed: false, Rules));
    }

    [Fact]
    public void Score_Unsolved_NeverExceedsSolvedOnLastAttempt()
    {
        var bestUnsolved = NumericGame.Score(6, solved: false, 101, 100, false, Rules);
        var worstSolved = NumericGame.Score(6, solved: true, 100, 100, false, Rules);
        Assert.True(bestUnsolved < worstSolved);
    }

    [Fact]
    public void Score_NeverNegative_WithHint()
    {
        Assert.Equal(0, NumericGame.Score(6, solved: false, 400, 100, hintUsed: true, Rules));
    }

    [Fact]
    public void Score_UnsolvedBeforeAllAttemptsUsed_Throws()
    {
        Assert.Throws<ArgumentException>(() => NumericGame.Score(3, solved: false, 50, 100, false, Rules));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(7)]
    public void Score_InvalidAttemptCount_Throws(int attempts)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => NumericGame.Score(attempts, true, 100, 100, false, Rules));
    }

    [Theory]
    [InlineData(2, false, false, false)] // henüz erken
    [InlineData(3, false, false, true)]
    [InlineData(5, false, false, true)]
    [InlineData(6, false, false, false)] // hak kalmadı
    [InlineData(3, true, false, false)]  // oyun bitti
    [InlineData(3, false, true, false)]  // zaten kullanıldı
    public void CanUseHint_FollowsRules(int attempts, bool finished, bool used, bool expected)
    {
        Assert.Equal(expected, NumericGame.CanUseHint(attempts, finished, used, Rules));
    }
}
