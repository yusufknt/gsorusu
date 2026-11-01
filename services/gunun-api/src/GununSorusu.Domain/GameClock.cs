namespace GununSorusu.Domain;

/// <summary>
/// Oyun gününü belirler. Gün sınırı her zaman Europe/Istanbul saatine göredir;
/// istemcinin (telefonun) saatine asla güvenilmez.
/// </summary>
public sealed class GameClock(TimeProvider time)
{
    public static readonly TimeZoneInfo Istanbul = TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");

    public DateTimeOffset UtcNow => time.GetUtcNow();

    /// <summary>Şu anki oyun günü.</summary>
    public DateOnly Today => DayOf(time.GetUtcNow());

    /// <summary>Bir sonraki sorunun açılacağı an (UTC).</summary>
    public DateTimeOffset NextResetUtc => StartOfDayUtc(Today.AddDays(1));

    public TimeSpan UntilNextReset => NextResetUtc - time.GetUtcNow();

    public static DateOnly DayOf(DateTimeOffset instant) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, Istanbul).DateTime);

    public static DateTimeOffset StartOfDayUtc(DateOnly day)
    {
        var localMidnight = day.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        var offset = Istanbul.GetUtcOffset(localMidnight);
        return new DateTimeOffset(localMidnight, offset).ToUniversalTime();
    }
}
