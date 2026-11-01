using GununSorusu.Domain.Streaks;

namespace GununSorusu.Domain.Tests;

public class StreakTests
{
    private static readonly DateOnly D1 = new(2026, 12, 1);

    private static StreakState PlayedOn(params DateOnly[] days) =>
        days.Aggregate(StreakState.Empty, (s, d) => Streak.RecordPlay(s, d));

    [Fact]
    public void FirstPlay_StartsAtOne()
    {
        var s = Streak.RecordPlay(StreakState.Empty, D1);
        Assert.Equal(1, s.Current);
        Assert.Equal(1, s.Max);
        Assert.Equal(D1, s.LastPlayedDay);
    }

    [Fact]
    public void ConsecutiveDays_Increment()
    {
        var s = PlayedOn(D1, D1.AddDays(1), D1.AddDays(2));
        Assert.Equal(3, s.Current);
        Assert.Equal(3, s.Max);
    }

    [Fact]
    public void SameDayTwice_IsIdempotent()
    {
        var s = PlayedOn(D1, D1.AddDays(1));
        Assert.Equal(s, Streak.RecordPlay(s, D1.AddDays(1)));
    }

    [Fact]
    public void MissedDay_ResetsToOne_KeepsMax()
    {
        var s = PlayedOn(D1, D1.AddDays(1), D1.AddDays(2), D1.AddDays(4));
        Assert.Equal(1, s.Current);
        Assert.Equal(3, s.Max);
    }

    [Fact]
    public void PastDay_Throws()
    {
        var s = PlayedOn(D1.AddDays(3));
        Assert.Throws<ArgumentException>(() => Streak.RecordPlay(s, D1));
    }

    [Fact]
    public void ExcusedDay_DoesNotBreakStreak()
    {
        var cancelled = D1.AddDays(1);
        var s = PlayedOn(D1);
        s = Streak.RecordPlay(s, D1.AddDays(2), d => d == cancelled);
        Assert.Equal(2, s.Current);
    }

    [Fact]
    public void Effective_AliveUntilEndOfNextDay()
    {
        var s = PlayedOn(D1, D1.AddDays(1));
        Assert.Equal(2, Streak.Effective(s, D1.AddDays(1))); // bugün oynandı
        Assert.Equal(2, Streak.Effective(s, D1.AddDays(2))); // bugün henüz oynamadı, seri canlı
        Assert.Equal(0, Streak.Effective(s, D1.AddDays(3))); // bir gün kaçtı
        Assert.Equal(0, Streak.Effective(StreakState.Empty, D1));
    }

    [Fact]
    public void Repair_AfterExactlyOneMissedDay_ContinuesStreak()
    {
        var s = PlayedOn(D1, D1.AddDays(1), D1.AddDays(2)); // seri 3
        var today = D1.AddDays(4);                            // D+3 kaçtı

        Assert.True(Streak.CanRepair(s, today));
        s = Streak.Repair(s, today);
        Assert.Equal(3, Streak.Effective(s, today));

        s = Streak.RecordPlay(s, today);
        Assert.Equal(4, s.Current);
        Assert.Equal(today, s.LastRepairDay);
    }

    [Fact]
    public void Repair_NotPossible_AfterTwoMissedDays()
    {
        var s = PlayedOn(D1);
        Assert.False(Streak.CanRepair(s, D1.AddDays(3)));
        Assert.Throws<InvalidOperationException>(() => Streak.Repair(s, D1.AddDays(3)));
    }

    [Fact]
    public void Repair_NotNeeded_WhenStreakAlive()
    {
        var s = PlayedOn(D1);
        Assert.False(Streak.CanRepair(s, D1.AddDays(1)));
        Assert.False(Streak.CanRepair(s, D1));
    }

    [Fact]
    public void Repair_LimitedToOncePerWeek()
    {
        var s = PlayedOn(D1);
        s = Streak.Repair(s, D1.AddDays(2));
        s = Streak.RecordPlay(s, D1.AddDays(2));
        // 4 gün sonra tekrar bir gün kaçırır
        Assert.False(Streak.CanRepair(s, D1.AddDays(4)));
        // 7 gün dolduktan sonra yine kurtarabilir
        var later = PlayedOn(D1.AddDays(2)) with { Current = 5, LastRepairDay = D1.AddDays(2), LastPlayedDay = D1.AddDays(7) };
        Assert.True(Streak.CanRepair(later, D1.AddDays(9)));
    }

    [Fact]
    public void Repair_NotPossible_WithZeroStreak()
    {
        Assert.False(Streak.CanRepair(StreakState.Empty, D1));
    }
}
