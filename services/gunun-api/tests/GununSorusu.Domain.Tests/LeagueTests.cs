using GununSorusu.Domain.Leagues;

namespace GununSorusu.Domain.Tests;

public class LeagueTests
{
    [Theory]
    [InlineData("2026-12-07", "2026-12-07")] // Pazartesi
    [InlineData("2026-12-09", "2026-12-07")] // Çarşamba
    [InlineData("2026-12-13", "2026-12-07")] // Pazar
    [InlineData("2026-12-14", "2026-12-14")] // ertesi Pazartesi
    [InlineData("2027-01-01", "2026-12-28")] // yıl dönümü
    public void Week_starts_on_monday(string day, string monday) =>
        Assert.Equal(DateOnly.Parse(monday), LeagueWeek.StartOf(DateOnly.Parse(day)));

    [Fact]
    public void Week_has_seven_days_from_monday_to_sunday()
    {
        var days = LeagueWeek.DaysOf(new DateOnly(2026, 12, 7)).ToList();
        Assert.Equal(7, days.Count);
        Assert.Equal(DayOfWeek.Monday, days[0].DayOfWeek);
        Assert.Equal(DayOfWeek.Sunday, days[6].DayOfWeek);
    }

    [Theory]
    [InlineData("K7P2QX", "K7P2QX")]
    [InlineData("k7p2qx", "K7P2QX")]
    [InlineData(" k7p-2qx ", "K7P2QX")]
    [InlineData("K7P 2QX", "K7P2QX")]
    [InlineData("şehir1", null)] // Türkçe harf ve 1 alfabede yok
    [InlineData("K7P2Q", null)] // kısa
    [InlineData("K7P2QXA", null)] // uzun
    [InlineData("K0P2QX", null)] // 0 yok
    [InlineData("", null)]
    [InlineData(null, null)]
    public void Code_is_normalized(string? input, string? expected) => Assert.Equal(expected, LeagueCode.Normalize(input));

    [Fact]
    public void Turkish_dotted_and_dotless_i_are_not_valid_code_letters()
    {
        // "I" alfabede yok; Türkçe klavyede yazılan i/ı/İ de geçersiz sayılır (hiçbiri "1" ile karışmasın).
        Assert.Null(LeagueCode.Normalize("abcdeı"));
        Assert.Null(LeagueCode.Normalize("abcdei"));
        Assert.Null(LeagueCode.Normalize("ABCDEİ"));
    }

    [Fact]
    public void Generated_codes_use_the_alphabet_and_normalize_to_themselves()
    {
        for (var i = 0; i < 200; i++)
        {
            var code = LeagueCode.Generate();
            Assert.Equal(LeagueCode.Length, code.Length);
            Assert.Equal(code, LeagueCode.Normalize(code));
        }
    }

    [Fact]
    public void Ties_share_a_rank_and_the_next_rank_is_skipped()
    {
        var ranked = Standings.Rank([
            new StandingInput<string>("a", "Ayşe", 250, 3),
            new StandingInput<string>("b", "Bora", 300, 3),
            new StandingInput<string>("c", "Cem", 250, 3),
            new StandingInput<string>("d", "Deniz", 100, 1),
        ]);

        Assert.Equal(["b", "a", "c", "d"], ranked.Select(r => r.Key));
        Assert.Equal([1, 2, 2, 4], ranked.Select(r => r.Rank));
    }

    [Fact]
    public void Within_a_tie_more_played_days_then_turkish_name_order_come_first()
    {
        var ranked = Standings.Rank([
            new StandingInput<string>("z", "Zeynep", 0, 0),
            new StandingInput<string>("c", "Çağla", 0, 0),
            new StandingInput<string>("can", "Can", 0, 0),
            new StandingInput<string>("p", "Pelin", 0, 1), // 0 puan ama oynadı (ör. anket puanı bekliyor)
        ]);

        // Türkçe alfabe: C < Ç < Z.
        Assert.Equal(["p", "can", "c", "z"], ranked.Select(r => r.Key));
        Assert.All(ranked, r => Assert.Equal(1, r.Rank));
    }
}
