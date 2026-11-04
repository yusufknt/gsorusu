using System.Net;
using System.Text.Json;
using GununSorusu.Api.Tests.Infrastructure;
using static GununSorusu.Api.Tests.Infrastructure.Q;

namespace GununSorusu.Api.Tests;

/// <summary>Varsayılan saat: 10 Aralık 2026 Perşembe; hafta 7 Aralık Pazartesi başlar.</summary>
public sealed class LeagueTests(ApiFactory api) : ApiTest(api)
{
    private void GoTo(int day) => Clock.SetIstanbul(2026, 12, day);

    private async Task<HttpClient> Named(string name)
    {
        var c = await Api.PlayerAsync();
        (await c.PatchJsonAsync("/me", new { displayName = name })).Ok();
        return c;
    }

    /// <summary>Tek tahminde bulur: 100 puan.</summary>
    private static async Task Ace(HttpClient c, int day) =>
        (await c.PostJsonAsync($"/plays/{D(Dec(day))}/guess", new { value = 100 })).Ok();

    /// <summary>Üçüncü tahminde bulur: 70 puan.</summary>
    private static async Task Third(HttpClient c, int day)
    {
        foreach (var v in new[] { 50, 92, 104 }) (await c.PostJsonAsync($"/plays/{D(Dec(day))}/guess", new { value = v })).Ok();
    }

    private static async Task<JsonElement> CreateLeague(HttpClient c, string name = "Ofis") =>
        (await c.PostJsonAsync("/leagues", new { name })).Ok().Body;

    private static JsonElement Row(JsonElement league, string name) =>
        league.GetProperty("standings").EnumerateArray().Single(r => r.GetProperty("displayName").GetString() == name);

    private static string[] Order(JsonElement league) =>
        league.GetProperty("standings").EnumerateArray().Select(r => r.GetProperty("displayName").GetString()!).ToArray();

    [Fact]
    public async Task Creating_or_joining_needs_a_display_name()
    {
        var anon = await Api.PlayerAsync();
        var res = await anon.PostJsonAsync("/leagues", new { name = "Aile" });
        Assert.Equal(HttpStatusCode.Conflict, res.Status);
        Assert.Equal("display_name_required", res.Code);

        var owner = await Named("Ayşe");
        var code = (await CreateLeague(owner)).GetProperty("code").GetString();
        Assert.Equal("display_name_required", (await anon.PostJsonAsync("/leagues/join", new { code })).Code);
    }

    [Fact]
    public async Task League_name_is_validated()
    {
        var c = await Named("Ayşe");
        Assert.Equal("invalid_league_name", (await c.PostJsonAsync("/leagues", new { name = " a " })).Code);
        Assert.Equal("invalid_league_name", (await c.PostJsonAsync("/leagues", new { name = new string('x', 31) })).Code);
    }

    [Fact]
    public async Task Friend_joins_with_code_typed_loosely_and_both_see_the_same_board()
    {
        var ayse = await Named("Ayşe");
        var league = await CreateLeague(ayse, "Aile ligi");
        var code = league.GetProperty("code").GetString()!;
        Assert.Matches("^[A-HJ-NP-Z2-9]{6}$", code);
        Assert.True(league.GetProperty("isOwner").GetBoolean());
        Assert.Equal(1, league.GetProperty("memberCount").GetInt32());

        var bora = await Named("Bora");
        var typed = $" {code[..3].ToLowerInvariant()}-{code[3..]} ";
        var joined = (await bora.PostJsonAsync("/leagues/join", new { code = typed })).Ok().Body;
        Assert.Equal(league.GetProperty("id").GetString(), joined.GetProperty("id").GetString());
        Assert.False(joined.GetProperty("isOwner").GetBoolean());
        Assert.Equal(2, joined.GetProperty("memberCount").GetInt32());
        Assert.True(Row(joined, "Bora").GetProperty("isMe").GetBoolean());
        Assert.True(Row(joined, "Ayşe").GetProperty("isOwner").GetBoolean());

        // Aynı daveti ikinci kez açmak hata değil.
        Assert.Equal(2, (await bora.PostJsonAsync("/leagues/join", new { code })).Ok()["memberCount"].GetInt32());
    }

    [Fact]
    public async Task Bad_or_unknown_codes_are_rejected()
    {
        var c = await Named("Ayşe");
        Assert.Equal("invalid_league_code", (await c.PostJsonAsync("/leagues/join", new { code = "ABC" })).Code);
        var unknown = await c.PostJsonAsync("/leagues/join", new { code = "ZZZZZZ" });
        Assert.Equal(HttpStatusCode.NotFound, unknown.Status);
        Assert.Equal("league_not_found", unknown.Code);
    }

    [Fact]
    public async Task Weekly_board_sums_own_day_plays_ranks_ties_and_ignores_archive_and_cancelled_days()
    {
        await Api.SeedAsync(Price(Dec(7)), Price(Dec(8)), Price(Dec(9)), Price(Dec(10)));
        var ayse = await Named("Ayşe");
        var bora = await Named("Bora");
        var cem = await Named("Cem");

        GoTo(7);
        var id = (await CreateLeague(ayse)).GetProperty("id").GetString();
        var code = (await ayse.GetJsonAsync($"/leagues/{id}")).Ok()["code"].GetString();
        await Ace(ayse, 7);   // Ayşe 100
        await Third(bora, 7); // Bora 70 (lige sonra katılacak; puanı yine sayılır)

        GoTo(8);
        await Ace(bora, 8); // Bora 170
        await Ace(cem, 8);  // iptal edilecek gün: sayılmaz

        GoTo(10);
        await Third(ayse, 10);                                                // Ayşe 170
        (await cem.PostJsonAsync($"/plays/{D(Dec(9))}/guess", new { value = 100 })).Ok(); // arşivden: sayılmaz
        // 8 Aralık iptal: oynayanlara 100 verilir (seri için) ama lig toplamına girmez.
        (await Api.Admin().PostJsonAsync($"/admin/questions/{D(Dec(8))}/cancel")).Ok();

        (await bora.PostJsonAsync("/leagues/join", new { code })).Ok();
        (await cem.PostJsonAsync("/leagues/join", new { code })).Ok();
        var board = (await cem.GetJsonAsync($"/leagues/{id}")).Ok().Body;

        // Bora: 7'de 70 + 8'de 100 (iptal) → 70. Ayşe: 100 + 70 = 170. Cem: 0.
        Assert.Equal(["Ayşe", "Bora", "Cem"], Order(board));
        Assert.Equal(170, Row(board, "Ayşe").GetProperty("total").GetInt32());
        Assert.Equal(2, Row(board, "Ayşe").GetProperty("played").GetInt32());
        Assert.Equal(70, Row(board, "Bora").GetProperty("total").GetInt32());
        Assert.Equal(0, Row(board, "Cem").GetProperty("total").GetInt32());
        Assert.Equal(0, Row(board, "Cem").GetProperty("played").GetInt32());

        var week = board.GetProperty("week");
        Assert.Equal("2026-12-07", week.GetProperty("start").GetString());
        Assert.Equal("2026-12-13", week.GetProperty("end").GetString());
        Assert.True(week.GetProperty("isCurrent").GetBoolean());
        var days = week.GetProperty("days").EnumerateArray().ToList();
        Assert.Equal(7, days.Count);
        Assert.True(days[1].GetProperty("cancelled").GetBoolean());
        Assert.False(days[3].GetProperty("future").GetBoolean());
        Assert.True(days[4].GetProperty("future").GetBoolean());
        Assert.Equal(JsonValueKind.Null, days[4].GetProperty("no").ValueKind);

        var ayseDays = Row(board, "Ayşe").GetProperty("days").EnumerateArray().ToList();
        Assert.Equal(100, ayseDays[0].GetProperty("score").GetInt32());
        Assert.False(ayseDays[1].GetProperty("played").GetBoolean());
        Assert.Equal(70, ayseDays[3].GetProperty("score").GetInt32());

        // Eşitlik: Cem de 70 alırsa Bora ile aynı sırayı paylaşır.
        await Third(cem, 10);
        var tied = (await cem.GetJsonAsync($"/leagues/{id}")).Ok().Body;
        Assert.Equal(1, Row(tied, "Ayşe").GetProperty("rank").GetInt32());
        Assert.Equal(2, Row(tied, "Bora").GetProperty("rank").GetInt32());
        Assert.Equal(2, Row(tied, "Cem").GetProperty("rank").GetInt32());
    }

    [Fact]
    public async Task Board_resets_on_monday_and_last_week_stays_viewable()
    {
        await Api.SeedAsync(Price(Dec(10)), Price(Dec(14)));
        var ayse = await Named("Ayşe");
        var id = (await CreateLeague(ayse)).GetProperty("id").GetString();
        await Ace(ayse, 10);

        GoTo(14); // Pazartesi
        var now = (await ayse.GetJsonAsync($"/leagues/{id}")).Ok().Body;
        Assert.Equal("2026-12-14", now.GetProperty("week").GetProperty("start").GetString());
        Assert.Equal(0, Row(now, "Ayşe").GetProperty("total").GetInt32());
        Assert.Equal("2026-12-07", now.GetProperty("week").GetProperty("previous").GetString());
        Assert.Equal(JsonValueKind.Null, now.GetProperty("week").GetProperty("next").ValueKind);

        // Haftanın herhangi bir günü verilebilir; Pazartesiye yuvarlanır.
        var last = (await ayse.GetJsonAsync($"/leagues/{id}?week=2026-12-09")).Ok().Body;
        Assert.Equal("2026-12-07", last.GetProperty("week").GetProperty("start").GetString());
        Assert.False(last.GetProperty("week").GetProperty("isCurrent").GetBoolean());
        Assert.Equal(100, Row(last, "Ayşe").GetProperty("total").GetInt32());
        // Lig 7 Aralık haftasında kuruldu; daha geriye gidilmez.
        Assert.Equal(JsonValueKind.Null, last.GetProperty("week").GetProperty("previous").ValueKind);
        Assert.Equal("2026-12-14", last.GetProperty("week").GetProperty("next").GetString());

        Assert.Equal("invalid_week", (await ayse.GetJsonAsync($"/leagues/{id}?week=2026-12-21")).Code);
    }

    [Fact]
    public async Task List_shows_my_rank_leader_and_who_played_today()
    {
        await Api.SeedAsync(Price(Dec(10)));
        var ayse = await Named("Ayşe");
        var bora = await Named("Bora");
        var league = await CreateLeague(ayse, "Ofis");
        (await bora.PostJsonAsync("/leagues/join", new { code = league.GetProperty("code").GetString() })).Ok();

        var before = (await bora.GetJsonAsync("/leagues")).Ok().Body.EnumerateArray().Single();
        Assert.Equal(JsonValueKind.Null, before.GetProperty("leaderName").ValueKind);
        Assert.Equal(0, before.GetProperty("playedToday").GetInt32());

        await Ace(ayse, 10);
        var item = (await bora.GetJsonAsync("/leagues")).Ok().Body.EnumerateArray().Single();
        Assert.Equal("Ofis", item.GetProperty("name").GetString());
        Assert.Equal(2, item.GetProperty("memberCount").GetInt32());
        Assert.Equal(2, item.GetProperty("myRank").GetInt32());
        Assert.Equal(0, item.GetProperty("myTotal").GetInt32());
        Assert.Equal(1, item.GetProperty("playedToday").GetInt32());
        Assert.Equal("Ayşe", item.GetProperty("leaderName").GetString());
        Assert.False(item.GetProperty("isOwner").GetBoolean());

        Assert.Empty((await (await Named("Cem")).GetJsonAsync("/leagues")).Ok().Body.EnumerateArray());
    }

    [Fact]
    public async Task Outsiders_cannot_see_a_league()
    {
        var ayse = await Named("Ayşe");
        var id = (await CreateLeague(ayse)).GetProperty("id").GetString();
        var other = await Named("Bora");
        var res = await other.GetJsonAsync($"/leagues/{id}");
        Assert.Equal(HttpStatusCode.NotFound, res.Status);
        Assert.Equal("league_not_found", res.Code);
    }

    [Fact]
    public async Task Only_the_owner_removes_members_and_ownership_passes_on_when_owner_leaves()
    {
        var ayse = await Named("Ayşe");
        var league = await CreateLeague(ayse);
        var id = league.GetProperty("id").GetString();
        var code = league.GetProperty("code").GetString();
        var bora = await Named("Bora");
        var cem = await Named("Cem");
        var boraId = (await bora.PostJsonAsync("/leagues/join", new { code })).Ok().Body.GetProperty("standings")
            .EnumerateArray().Single(r => r.GetProperty("isMe").GetBoolean()).GetProperty("playerId").GetString();
        var joined = (await cem.PostJsonAsync("/leagues/join", new { code })).Ok().Body;
        var cemId = Row(joined, "Cem").GetProperty("playerId").GetString();
        var ayseId = Row(joined, "Ayşe").GetProperty("playerId").GetString();

        var denied = await bora.DeleteJsonAsync($"/leagues/{id}/members/{cemId}");
        Assert.Equal(HttpStatusCode.Forbidden, denied.Status);
        Assert.Equal("not_league_owner", denied.Code);

        var kicked = (await ayse.DeleteJsonAsync($"/leagues/{id}/members/{cemId}")).Ok().Body;
        Assert.Equal(["Ayşe", "Bora"], Order(kicked).Order());
        Assert.Equal("league_not_found", (await cem.GetJsonAsync($"/leagues/{id}")).Code);

        // Sahip ayrılınca en eski üye (Bora) sahip olur.
        Assert.Equal(HttpStatusCode.NoContent, (await ayse.DeleteJsonAsync($"/leagues/{id}/members/{ayseId}")).Status);
        var after = (await bora.GetJsonAsync($"/leagues/{id}")).Ok().Body;
        Assert.True(after.GetProperty("isOwner").GetBoolean());
        Assert.Equal(1, after.GetProperty("memberCount").GetInt32());

        // Son üye de ayrılınca lig silinir; kod artık çalışmaz.
        Assert.Equal(HttpStatusCode.NoContent, (await bora.DeleteJsonAsync($"/leagues/{id}/members/{boraId}")).Status);
        Assert.Equal("league_not_found", (await cem.PostJsonAsync("/leagues/join", new { code })).Code);
    }

    [Fact]
    public async Task A_player_can_be_in_at_most_ten_leagues()
    {
        var c = await Named("Ayşe");
        for (var i = 0; i < 10; i++) await CreateLeague(c, $"Lig {i}");
        var res = await c.PostJsonAsync("/leagues", new { name = "On birinci" });
        Assert.Equal(HttpStatusCode.Conflict, res.Status);
        Assert.Equal("league_limit", res.Code);
    }
}
