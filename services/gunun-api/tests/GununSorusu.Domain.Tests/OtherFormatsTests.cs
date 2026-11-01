using GununSorusu.Domain.Scoring;

namespace GununSorusu.Domain.Tests;

public class PollGameTests
{
    [Theory]
    [InlineData(62, 62, 100)]
    [InlineData(50, 60, 80)]
    [InlineData(70, 60, 80)]
    [InlineData(0, 100, 0)]   // 100 − 200 → 0'da sınırlanır
    [InlineData(10, 80, 0)]   // 100 − 140 → 0
    [InlineData(40, 62.4, 55)] // 100 − 44.8 = 55.2 → 55
    public void Score_IsClampedLinearDistance(int predicted, decimal actual, int expected)
    {
        Assert.Equal(expected, PollGame.Score(predicted, actual));
    }

    [Theory]
    [InlineData(-1, 50)]
    [InlineData(101, 50)]
    [InlineData(50, 100.1)]
    public void Score_OutOfRange_Throws(int predicted, decimal actual)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => PollGame.Score(predicted, actual));
    }

    [Fact]
    public void Percentages_AreComputedPerOption()
    {
        var pct = PollGame.Percentages(new Dictionary<int, int> { [0] = 2, [1] = 1 });
        Assert.Equal(66.7m, pct[0]);
        Assert.Equal(33.3m, pct[1]);
    }

    [Fact]
    public void Percentages_NoVotes_AreZero()
    {
        var pct = PollGame.Percentages(new Dictionary<int, int> { [0] = 0, [1] = 0 });
        Assert.All(pct.Values, v => Assert.Equal(0m, v));
    }
}

public class TriviaGameTests
{
    private static readonly TriviaRules Rules = TriviaRules.Default;

    [Theory]
    [InlineData(0, 100)]
    [InlineData(1000, 100)]   // ağ payı içinde → tam bonus
    [InlineData(16000, 80)]   // 15 sn efektif → bonusun yarısı
    [InlineData(31000, 60)]   // tam süre sınırında → yalnız taban puan
    public void Score_Correct_GetsSpeedBonus(int elapsedMs, int expected)
    {
        Assert.Equal(expected, TriviaGame.Score(true, TimeSpan.FromMilliseconds(elapsedMs), Rules));
    }

    [Fact]
    public void Score_Wrong_IsZero()
    {
        Assert.Equal(0, TriviaGame.Score(false, TimeSpan.FromSeconds(2), Rules));
    }

    [Fact]
    public void Score_AfterTimeout_IsZero()
    {
        Assert.Equal(0, TriviaGame.Score(true, TimeSpan.FromSeconds(31.5), Rules));
        Assert.True(TriviaGame.IsTimedOut(TimeSpan.FromSeconds(31.5), Rules));
    }
}

public class CompareGameTests
{
    [Fact]
    public void Score_Is20PerCorrectRound()
    {
        Assert.Equal(60, CompareGame.Score([true, false, true, true, false]));
        Assert.Equal(100, CompareGame.Score([true, true, true, true, true]));
        Assert.Equal(0, CompareGame.Score([false, false, false, false, false]));
    }

    [Fact]
    public void Score_WrongRoundCount_Throws()
    {
        Assert.Throws<ArgumentException>(() => CompareGame.Score([true, true]));
    }
}
