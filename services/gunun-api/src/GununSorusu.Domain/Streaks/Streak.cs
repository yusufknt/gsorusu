namespace GununSorusu.Domain.Streaks;

/// <param name="Current">Saklanan seri. Görüntülenecek değer için <see cref="Streak.Effective"/> kullanılır.</param>
/// <param name="LastPlayedDay">Serinin kapsadığı son gün (oynanan ya da kurtarılan).</param>
/// <param name="LastRepairDay">En son seri kurtarma yapılan gün.</param>
public sealed record StreakState(int Current, int Max, DateOnly? LastPlayedDay, DateOnly? LastRepairDay)
{
    public static readonly StreakState Empty = new(0, 0, null, null);
}

/// <summary>
/// Seri kuralları. "Mazeretli gün" (iptal edilen soru) kaçırılmış sayılmaz; böylece hatalı
/// soru iptal edildiğinde kimsenin serisi bozulmaz. Arşiv oyunları seriyi etkilemez,
/// bu yüzden buraya hiç gelmemelidir.
/// </summary>
public static class Streak
{
    public const int RepairCooldownDays = 7;

    /// <summary>Günün sorusu oynandığında çağrılır. Aynı gün ikinci kez çağrılırsa değişiklik olmaz.</summary>
    public static StreakState RecordPlay(StreakState state, DateOnly day, Func<DateOnly, bool>? isExcused = null)
    {
        if (state.LastPlayedDay is { } last)
        {
            if (day < last) throw new ArgumentException("Geçmiş bir gün seriye yazılamaz (arşiv seriyi etkilemez).", nameof(day));
            if (day == last) return state;
        }

        var current = state.LastPlayedDay is { } prev && MissedDays(prev, day, isExcused) == 0
            ? state.Current + 1
            : 1;

        return state with { Current = current, Max = Math.Max(state.Max, current), LastPlayedDay = day };
    }

    /// <summary>
    /// Kullanıcıya gösterilecek seri. Bugün henüz oynanmadıysa ama dün oynandıysa seri hâlâ canlıdır.
    /// </summary>
    public static int Effective(StreakState state, DateOnly today, Func<DateOnly, bool>? isExcused = null)
    {
        if (state.LastPlayedDay is not { } last) return 0;
        if (last >= today) return state.Current;
        return MissedDays(last, today, isExcused) == 0 ? state.Current : 0;
    }

    /// <summary>
    /// Ödüllü reklamla seri kurtarma: tam olarak bir gün kaçırıldıysa ve son 7 günde
    /// kurtarma yapılmadıysa mümkündür.
    /// </summary>
    public static bool CanRepair(StreakState state, DateOnly today, Func<DateOnly, bool>? isExcused = null)
    {
        if (state.Current <= 0 || state.LastPlayedDay is not { } last || last >= today) return false;
        if (MissedDays(last, today, isExcused) != 1) return false;
        return state.LastRepairDay is not { } repaired || today.DayNumber - repaired.DayNumber >= RepairCooldownDays;
    }

    /// <summary>Kaçırılan günü kapsar; bugün oynanınca seri kaldığı yerden devam eder.</summary>
    public static StreakState Repair(StreakState state, DateOnly today, Func<DateOnly, bool>? isExcused = null)
    {
        if (!CanRepair(state, today, isExcused)) throw new InvalidOperationException("Seri kurtarılamaz.");
        return state with { LastPlayedDay = today.AddDays(-1), LastRepairDay = today };
    }

    /// <summary>(from, to) aralığındaki, iki uç hariç, mazeretsiz gün sayısı.</summary>
    internal static int MissedDays(DateOnly from, DateOnly to, Func<DateOnly, bool>? isExcused)
    {
        var missed = 0;
        for (var d = from.AddDays(1); d < to; d = d.AddDays(1))
            if (isExcused is null || !isExcused(d)) missed++;
        return missed;
    }
}
