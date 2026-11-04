using System.Globalization;
using System.Security.Cryptography;

namespace GununSorusu.Domain.Leagues;

/// <summary>
/// Arkadaş ligi kuralları (aile, iş yeri). Lige 6 karakterlik kodla girilir; sıralama haftalıktır
/// (Pazartesi–Pazar, İstanbul günü) ve her Pazartesi sıfırdan başlar.
/// </summary>
public static class LeagueRules
{
    public const int MaxMembers = 50;
    public const int MaxLeaguesPerPlayer = 10;
    public const int NameMinLength = 2;
    public const int NameMaxLength = 30;
}

/// <summary>
/// Lig kodu: 6 karakter; birbirine benzeyen 0/O ve 1/I çıkarılmış 32 karakterlik alfabe.
/// 32⁶ ≈ 1 milyar olasılık; tahminle başka bir lige girmek pratikte mümkün değil.
/// </summary>
public static class LeagueCode
{
    public const int Length = 6;

    /// <summary>0, O, 1 ve I yok: sesli okunurken ve elle yazılırken karışmasın.</summary>
    public const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    public static string Generate() => new(RandomNumberGenerator.GetItems<char>(Alphabet, Length));

    /// <summary>
    /// Kullanıcının yazdığını kanonik koda çevirir: boşluk ve tire atılır, Türkçe harfler dahil
    /// büyük harfe çevrilir ("k7p-2qx" → "K7P2QX"). Geçerli bir kod değilse null.
    /// </summary>
    public static string? Normalize(string? input)
    {
        if (input is null) return null;
        var chars = input
            .Where(ch => !char.IsWhiteSpace(ch) && ch != '-')
            .Select(ch => ch switch { 'ı' or 'i' or 'İ' => 'I', _ => char.ToUpperInvariant(ch) })
            .ToArray();
        return chars.Length == Length && chars.All(ch => Alphabet.Contains(ch)) ? new string(chars) : null;
    }
}

/// <summary>Lig haftası: Pazartesi 00:00 – Pazar 23:59 (İstanbul).</summary>
public static class LeagueWeek
{
    public const int Days = 7;

    public static DateOnly StartOf(DateOnly day) => day.AddDays(-(((int)day.DayOfWeek + 6) % 7));

    public static IEnumerable<DateOnly> DaysOf(DateOnly start) => Enumerable.Range(0, Days).Select(start.AddDays);
}

/// <param name="Total">Haftanın toplam puanı. Bekleyen (anket) puanlar 0 sayılır.</param>
/// <param name="Played">Haftada oynanan gün sayısı.</param>
public sealed record StandingInput<TKey>(TKey Key, string Name, int Total, int Played);

public sealed record Standing<TKey>(TKey Key, int Rank, StandingInput<TKey> Input);

public static class Standings
{
    private static readonly StringComparer TurkishNames = StringComparer.Create(CultureInfo.GetCultureInfo("tr-TR"), ignoreCase: true);

    /// <summary>
    /// Toplam puana göre sıralar. Eşit puan aynı sırayı alır, sonraki sıra atlanır (1, 1, 3).
    /// Eşitlikte listede önce daha çok gün oynayan, sonra ada göre (Türkçe alfabe) gelir; bu sırayı etkilemez.
    /// </summary>
    public static IReadOnlyList<Standing<TKey>> Rank<TKey>(IEnumerable<StandingInput<TKey>> members)
    {
        var ordered = members
            .OrderByDescending(m => m.Total)
            .ThenByDescending(m => m.Played)
            .ThenBy(m => m.Name, TurkishNames)
            .ToList();

        var result = new List<Standing<TKey>>(ordered.Count);
        for (var i = 0; i < ordered.Count; i++)
        {
            var rank = i > 0 && ordered[i].Total == ordered[i - 1].Total ? result[i - 1].Rank : i + 1;
            result.Add(new Standing<TKey>(ordered[i].Key, rank, ordered[i]));
        }
        return result;
    }
}
