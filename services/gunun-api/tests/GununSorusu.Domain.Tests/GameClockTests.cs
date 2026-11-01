using Microsoft.Extensions.Time.Testing;

namespace GununSorusu.Domain.Tests;

public class GameClockTests
{
    [Fact]
    public void Today_UsesIstanbulTime_NotUtc()
    {
        // 30 Kasım 21:30 UTC = 1 Aralık 00:30 İstanbul
        var time = new FakeTimeProvider(new DateTimeOffset(2026, 11, 30, 21, 30, 0, TimeSpan.Zero));
        Assert.Equal(new DateOnly(2026, 12, 1), new GameClock(time).Today);
    }

    [Fact]
    public void Today_JustBeforeMidnightIstanbul_IsStillPreviousDay()
    {
        var time = new FakeTimeProvider(new DateTimeOffset(2026, 11, 30, 20, 59, 59, TimeSpan.Zero));
        Assert.Equal(new DateOnly(2026, 11, 30), new GameClock(time).Today);
    }

    [Fact]
    public void StartOfDayUtc_IsMidnightIstanbul()
    {
        Assert.Equal(
            new DateTimeOffset(2026, 11, 30, 21, 0, 0, TimeSpan.Zero),
            GameClock.StartOfDayUtc(new DateOnly(2026, 12, 1)));
    }

    [Fact]
    public void UntilNextReset_CountsToIstanbulMidnight()
    {
        var time = new FakeTimeProvider(new DateTimeOffset(2026, 12, 1, 12, 18, 48, TimeSpan.Zero)); // 15:18:48 TSİ
        Assert.Equal(new TimeSpan(8, 41, 12), new GameClock(time).UntilNextReset);
    }
}
