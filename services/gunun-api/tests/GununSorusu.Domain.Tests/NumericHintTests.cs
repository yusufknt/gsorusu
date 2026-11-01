using GununSorusu.Domain.Scoring;

namespace GununSorusu.Domain.Tests;

public class NumericHintTests
{
    private static readonly (decimal, GuessDirection)[] NoGuesses = [];

    [Theory]
    [InlineData(87.5)]
    [InlineData(69.9)]
    [InlineData(1250)]
    [InlineData(3.75)]
    [InlineData(450000)]
    public void Range_AlwaysContainsAnswer(decimal answer)
    {
        for (var seed = 0; seed < 500; seed++)
            Assert.True(NumericHint.Build(answer, seed, NoGuesses).Contains(answer), $"seed {seed}");
    }

    [Fact]
    public void Range_IsDeterministicPerSeed()
    {
        Assert.Equal(NumericHint.Build(87.5m, 42, NoGuesses), NumericHint.Build(87.5m, 42, NoGuesses));
    }

    [Fact]
    public void Range_AnswerIsNotAlwaysInTheMiddle()
    {
        var midpoints = Enumerable.Range(0, 50)
            .Select(seed => NumericHint.Build(1000m, seed, NoGuesses))
            .Select(r => (r.Min + r.Max) / 2)
            .Distinct()
            .Count();
        Assert.True(midpoints > 10);
    }

    [Fact]
    public void Range_IsNarrowedByKnownBounds()
    {
        // Oyuncu zaten 95'ten büyük ve 103'ten küçük olduğunu biliyor.
        var guesses = new[] { (95m, GuessDirection.Higher), (103m, GuessDirection.Lower) };
        var range = NumericHint.Build(100m, 7, guesses);
        Assert.True(range.Min >= 95m);
        Assert.True(range.Max <= 103m);
        Assert.True(range.Contains(100m));
    }

    [Fact]
    public void Range_WidthIsAboutTwentyPercent()
    {
        var range = NumericHint.Build(1000m, 1, NoGuesses);
        Assert.InRange(range.Max - range.Min, 200m, 220m);
    }

    [Theory]
    [InlineData(87.5, 1)]
    [InlineData(1250, 10)]
    [InlineData(3.75, 0.01)]
    [InlineData(0.5, 0.01)]
    public void NiceStep_ScalesWithMagnitude(decimal answer, decimal expected)
    {
        Assert.Equal(expected, NumericHint.NiceStep(answer));
    }
}
