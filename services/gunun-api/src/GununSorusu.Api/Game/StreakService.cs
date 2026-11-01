using GununSorusu.Api.Data;
using GununSorusu.Domain;
using GununSorusu.Domain.Streaks;
using Microsoft.EntityFrameworkCore;

namespace GununSorusu.Api.Game;

/// <summary>
/// Seri durumunu kalıcı hâle getirir. Kuralların kendisi <see cref="Streak"/> içindedir.
/// Mazeretli gün: o gün için yayında soru yoksa (hiç girilmemiş ya da iptal edilmiş). Böylece
/// iptal edilen ya da eksik kalan bir gün yüzünden kimsenin serisi bozulmaz.
/// </summary>
public sealed class StreakService(GunDbContext db, GameClock clock)
{
    public async Task<PlayerStats> GetOrAddAsync(Guid playerId, CancellationToken ct)
    {
        var stats = await db.PlayerStats.FindAsync([playerId], ct);
        if (stats is null)
        {
            stats = new PlayerStats { PlayerId = playerId };
            db.PlayerStats.Add(stats);
        }
        return stats;
    }

    /// <summary>Günün sorusu oynandı. Aynı gün için tekrar çağrılması zararsızdır. Arşiv buraya gelmez.</summary>
    public async Task RecordPlayAsync(Guid playerId, DateOnly day, CancellationToken ct)
    {
        var stats = await GetOrAddAsync(playerId, ct);
        var state = stats.ToState();
        if (state.LastPlayedDay is { } last && day <= last) return;

        stats.Apply(Streak.RecordPlay(state, day, await ExcusedAsync(state.LastPlayedDay, day, ct)));
    }

    public async Task<StreakView> ViewAsync(Guid playerId, CancellationToken ct)
    {
        var stats = await db.PlayerStats.AsNoTracking().SingleOrDefaultAsync(s => s.PlayerId == playerId, ct);
        var state = stats?.ToState() ?? StreakState.Empty;
        var today = clock.Today;
        var excused = await ExcusedAsync(state.LastPlayedDay, today, ct);
        return new StreakView(
            Streak.Effective(state, today, excused),
            state.Max,
            Streak.CanRepair(state, today, excused),
            state.LastPlayedDay == today);
    }

    public async Task RepairAsync(Guid playerId, CancellationToken ct)
    {
        var stats = await GetOrAddAsync(playerId, ct);
        var state = stats.ToState();
        var today = clock.Today;
        var excused = await ExcusedAsync(state.LastPlayedDay, today, ct);
        if (!Streak.CanRepair(state, today, excused))
            throw Infrastructure.ApiException.Conflict(
                "streak_not_repairable",
                $"Seri yalnızca tek gün kaçırıldıysa ve son {Streak.RepairCooldownDays} günde kurtarma yapılmadıysa kurtarılabilir.");
        stats.Apply(Streak.Repair(state, today, excused));
    }

    /// <summary>(from, to) arasındaki günlerden hangilerinin mazeretli olduğunu döndürür.</summary>
    private async Task<Func<DateOnly, bool>?> ExcusedAsync(DateOnly? from, DateOnly to, CancellationToken ct)
    {
        if (from is not { } f || to.DayNumber - f.DayNumber <= 1) return null;

        var liveDays = await db.Questions
            .Where(q => q.Day > f && q.Day < to && (q.Status == QuestionStatus.Scheduled || q.Status == QuestionStatus.Published))
            .Select(q => q.Day)
            .ToListAsync(ct);
        var live = liveDays.ToHashSet();
        return d => !live.Contains(d);
    }
}

public sealed record StreakView(int Current, int Max, bool CanRepair, bool PlayedToday);
