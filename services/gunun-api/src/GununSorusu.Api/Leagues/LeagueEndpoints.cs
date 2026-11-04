using System.Security.Claims;
using GununSorusu.Api.Auth;
using GununSorusu.Api.Data;
using GununSorusu.Api.Infrastructure;
using GununSorusu.Domain;
using GununSorusu.Domain.Leagues;
using Microsoft.EntityFrameworkCore;

namespace GununSorusu.Api.Leagues;

public sealed record CreateLeagueRequest(string? Name);

public sealed record JoinLeagueRequest(string? Code);

/// <param name="MyRank">Bu haftaki sıran (eşit puanda aynı sıra).</param>
/// <param name="PlayedToday">Üyelerden bugünün sorusunu bitirenlerin sayısı.</param>
public sealed record LeagueSummaryDto(
    Guid Id, string Code, string Name, bool IsOwner, int MemberCount, int MyRank, int MyTotal, int PlayedToday, string? LeaderName);

public sealed record LeagueDto(
    Guid Id, string Code, string Name, bool IsOwner, int MemberCount, int MaxMembers, LeagueWeekDto Week, IReadOnlyList<LeagueStandingDto> Standings);

/// <param name="Previous">Bir önceki haftanın Pazartesisi; lig o hafta yoksa null.</param>
/// <param name="Next">Bir sonraki hafta; bu hafta gösteriliyorsa null.</param>
public sealed record LeagueWeekDto(DateOnly Start, DateOnly End, bool IsCurrent, DateOnly? Previous, DateOnly? Next, IReadOnlyList<LeagueDayDto> Days);

/// <param name="No">O günün soru numarası; soru yoksa (ya da gün gelmediyse) null.</param>
/// <param name="Cancelled">İptal edilen soru haftalık toplama girmez.</param>
public sealed record LeagueDayDto(DateOnly Day, int? No, QuestionFormat? Format, bool Cancelled, bool Future);

/// <param name="Days">Haftanın 7 günü (Pazartesi → Pazar).</param>
public sealed record LeagueStandingDto(
    Guid PlayerId, string DisplayName, bool IsMe, bool IsOwner, int Rank, int Total, int Played, IReadOnlyList<LeagueCellDto> Days);

/// <param name="Score">Oynandı ama null: anket puanı gün bitince kesinleşir.</param>
public sealed record LeagueCellDto(bool Played, int? Score);

/// <summary>
/// Arkadaş ligi: özel kodla girilen grup ve haftalık sıralama (plan A4, MVP).
/// Haftalık puan, üyelerin o hafta <b>kendi gününde</b> oynadığı soruların toplamıdır; arşiv oyunları
/// ve iptal edilen sorular sayılmaz. Lige sonradan katılan, haftanın önceki günlerinin puanını da getirir.
/// </summary>
public static class LeagueEndpoints
{
    public const string FallbackName = "Oyuncu";

    public static void MapLeagueEndpoints(this IEndpointRouteBuilder app)
    {
        var leagues = app.MapGroup("/leagues").RequireAuthorization();

        leagues.MapGet("", ListAsync);
        leagues.MapPost("", CreateAsync);
        leagues.MapPost("/join", JoinAsync);
        leagues.MapGet("/{id:guid}", (Guid id, DateOnly? week, ClaimsPrincipal user, GunDbContext db, GameClock clock, CancellationToken ct) =>
            GetAsync(db, clock, user.PlayerId(), id, week, ct));
        leagues.MapDelete("/{id:guid}/members/{playerId:guid}", RemoveMemberAsync);
    }

    private static async Task<List<LeagueSummaryDto>> ListAsync(ClaimsPrincipal user, GunDbContext db, GameClock clock, CancellationToken ct)
    {
        var me = user.PlayerId();
        var mine = await db.LeagueMembers.AsNoTracking()
            .Where(m => m.PlayerId == me)
            .Join(db.Leagues, m => m.LeagueId, l => l.Id, (m, l) => new { League = l, m.JoinedAt })
            .OrderBy(x => x.JoinedAt)
            .Select(x => x.League)
            .ToListAsync(ct);
        if (mine.Count == 0) return [];

        var today = clock.Today;
        var start = LeagueWeek.StartOf(today);
        var board = await LoadBoardAsync(db, mine.Select(l => l.Id).ToList(), start, ct);

        return mine.Select(l =>
        {
            var ranked = Rank(board, l.Id);
            var mineRow = ranked.Single(r => r.Key == me);
            var todayIndex = today.DayNumber - start.DayNumber;
            return new LeagueSummaryDto(
                l.Id, l.Code, l.Name, l.OwnerId == me, ranked.Count, mineRow.Rank, mineRow.Input.Total,
                ranked.Count(r => board.Cells(r.Key)[todayIndex].Played),
                ranked[0].Input.Total > 0 ? ranked[0].Input.Name : null);
        }).ToList();
    }

    private static async Task<LeagueDto> CreateAsync(
        CreateLeagueRequest req, ClaimsPrincipal user, GunDbContext db, GameClock clock, TimeProvider time, CancellationToken ct)
    {
        var me = user.PlayerId();
        var name = req.Name?.Trim() ?? "";
        if (name.Length is < LeagueRules.NameMinLength or > LeagueRules.NameMaxLength)
            throw ApiException.BadRequest("invalid_league_name",
                $"Lig adı {LeagueRules.NameMinLength}–{LeagueRules.NameMaxLength} karakter olmalı.");
        await EnsureCanJoinAnotherAsync(db, me, ct);

        string code;
        do code = LeagueCode.Generate();
        while (await db.Leagues.AnyAsync(l => l.Code == code, ct));

        var now = time.GetUtcNow();
        var league = new League { Id = Guid.CreateVersion7(), Code = code, Name = name, OwnerId = me, CreatedAt = now };
        db.Leagues.Add(league);
        db.LeagueMembers.Add(new LeagueMember { LeagueId = league.Id, PlayerId = me, JoinedAt = now });
        // Kod çakışması (çok düşük olasılık) tekil indekste yakalanır → 409 conflict_retry.
        await db.SaveChangesAsync(ct);

        return await GetAsync(db, clock, me, league.Id, null, ct);
    }

    private static async Task<LeagueDto> JoinAsync(
        JoinLeagueRequest req, ClaimsPrincipal user, GunDbContext db, GameClock clock, TimeProvider time, CancellationToken ct)
    {
        var me = user.PlayerId();
        var code = LeagueCode.Normalize(req.Code)
                   ?? throw ApiException.BadRequest("invalid_league_code", $"Lig kodu {LeagueCode.Length} karakterden oluşur. Kodu kontrol et.");
        var league = await db.Leagues.AsNoTracking().SingleOrDefaultAsync(l => l.Code == code, ct)
                     ?? throw ApiException.NotFound("league_not_found", "Bu kodla bir lig bulunamadı. Kodu kontrol et.");

        // Zaten üyeyse aynı daveti ikinci kez açmak hata değildir.
        if (!await db.LeagueMembers.AnyAsync(m => m.LeagueId == league.Id && m.PlayerId == me, ct))
        {
            await EnsureCanJoinAnotherAsync(db, me, ct);
            if (await db.LeagueMembers.CountAsync(m => m.LeagueId == league.Id, ct) >= LeagueRules.MaxMembers)
                throw ApiException.Conflict("league_full", $"Bu lig dolu (en fazla {LeagueRules.MaxMembers} kişi).");

            db.LeagueMembers.Add(new LeagueMember { LeagueId = league.Id, PlayerId = me, JoinedAt = time.GetUtcNow() });
            await db.SaveChangesAsync(ct);
        }

        return await GetAsync(db, clock, me, league.Id, null, ct);
    }

    /// <summary>
    /// Kendini çıkarmak ligden ayrılmaktır. Başkasını yalnızca ligin sahibi çıkarabilir.
    /// Sahip ayrılırsa sahiplik en eski üyeye geçer; son üye de ayrılırsa lig silinir.
    /// </summary>
    private static async Task<IResult> RemoveMemberAsync(
        Guid id, Guid playerId, ClaimsPrincipal user, GunDbContext db, GameClock clock, CancellationToken ct)
    {
        var me = user.PlayerId();
        var league = await FindForMemberAsync(db, id, me, ct, tracking: true);
        if (playerId != me && league.OwnerId != me)
            throw ApiException.Forbidden("not_league_owner", "Üyeleri yalnızca ligin sahibi çıkarabilir.");

        var member = await db.LeagueMembers.SingleOrDefaultAsync(m => m.LeagueId == id && m.PlayerId == playerId, ct)
                     ?? throw ApiException.NotFound("member_not_found", "Bu oyuncu artık ligde değil.");

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        db.LeagueMembers.Remove(member);
        if (league.OwnerId == playerId)
        {
            var heir = await db.LeagueMembers
                .Where(m => m.LeagueId == id && m.PlayerId != playerId)
                .OrderBy(m => m.JoinedAt)
                .Select(m => (Guid?)m.PlayerId)
                .FirstOrDefaultAsync(ct);
            if (heir is { } next) league.OwnerId = next;
            else db.Leagues.Remove(league);
        }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return playerId == me ? Results.NoContent() : Results.Ok(await GetAsync(db, clock, me, id, null, ct));
    }

    private static async Task<LeagueDto> GetAsync(GunDbContext db, GameClock clock, Guid me, Guid id, DateOnly? week, CancellationToken ct)
    {
        var league = await FindForMemberAsync(db, id, me, ct);
        var today = clock.Today;
        var current = LeagueWeek.StartOf(today);
        var start = LeagueWeek.StartOf(week ?? today);
        if (start > current) throw ApiException.BadRequest("invalid_week", "Bu haftanın sıralaması henüz başlamadı.");

        var first = LeagueWeek.StartOf(GameClock.DayOf(league.CreatedAt));
        var board = await LoadBoardAsync(db, [id], start, ct);
        var questions = await db.Questions.AsNoTracking()
            .Where(q => q.Day >= start && q.Day <= start.AddDays(LeagueWeek.Days - 1) && q.Day <= today &&
                        (q.Status == QuestionStatus.Scheduled || q.Status == QuestionStatus.Published || q.Status == QuestionStatus.Cancelled))
            .Select(q => new { q.Day, q.No, q.Format, q.Status })
            .ToDictionaryAsync(q => q.Day, ct);

        var days = LeagueWeek.DaysOf(start).Select(d =>
        {
            var q = questions.GetValueOrDefault(d);
            return new LeagueDayDto(d, q?.No, q?.Format, q?.Status == QuestionStatus.Cancelled, d > today);
        }).ToList();

        var standings = Rank(board, id)
            .Select(r => new LeagueStandingDto(
                r.Key, r.Input.Name, r.Key == me, r.Key == league.OwnerId, r.Rank, r.Input.Total, r.Input.Played, board.Cells(r.Key)))
            .ToList();

        return new LeagueDto(
            league.Id, league.Code, league.Name, league.OwnerId == me, standings.Count, LeagueRules.MaxMembers,
            new LeagueWeekDto(start, start.AddDays(LeagueWeek.Days - 1), start == current,
                start > first ? start.AddDays(-LeagueWeek.Days) : null,
                start < current ? start.AddDays(LeagueWeek.Days) : null,
                days),
            standings);
    }

    /// <summary>Üye olmayan için lig yokmuş gibi davranılır (kimliği tahmin eden içeriği göremez).</summary>
    private static async Task<League> FindForMemberAsync(GunDbContext db, Guid id, Guid me, CancellationToken ct, bool tracking = false)
    {
        var query = tracking ? db.Leagues : db.Leagues.AsNoTracking();
        return await query.SingleOrDefaultAsync(l => l.Id == id && db.LeagueMembers.Any(m => m.LeagueId == l.Id && m.PlayerId == me), ct)
               ?? throw ApiException.NotFound("league_not_found", "Bu lig bulunamadı ya da artık üyesi değilsin.");
    }

    private static async Task EnsureCanJoinAnotherAsync(GunDbContext db, Guid me, CancellationToken ct)
    {
        var name = await db.Players.Where(p => p.Id == me).Select(p => p.DisplayName).SingleOrDefaultAsync(ct);
        if (string.IsNullOrWhiteSpace(name))
            throw ApiException.Conflict("display_name_required", "Lige katılmak için önce bir görünen ad seç; sıralamada bu ad görünür.");
        if (await db.LeagueMembers.CountAsync(m => m.PlayerId == me, ct) >= LeagueRules.MaxLeaguesPerPlayer)
            throw ApiException.Conflict("league_limit", $"En fazla {LeagueRules.MaxLeaguesPerPlayer} lige üye olabilirsin.");
    }

    private static IReadOnlyList<Standing<Guid>> Rank(Board board, Guid leagueId) =>
        Standings.Rank(board.Members.Where(m => m.LeagueId == leagueId).Select(m =>
        {
            var cells = board.Cells(m.PlayerId);
            return new StandingInput<Guid>(m.PlayerId, m.Name, cells.Sum(c => c.Score ?? 0), cells.Count(c => c.Played));
        }));

    private static async Task<Board> LoadBoardAsync(GunDbContext db, List<Guid> leagueIds, DateOnly start, CancellationToken ct)
    {
        var end = start.AddDays(LeagueWeek.Days - 1);
        var members = await db.LeagueMembers.AsNoTracking()
            .Where(m => leagueIds.Contains(m.LeagueId))
            .Join(db.Players, m => m.PlayerId, p => p.Id, (m, p) => new BoardMember(m.LeagueId, m.PlayerId, p.DisplayName ?? FallbackName))
            .ToListAsync(ct);
        var playerIds = members.Select(m => m.PlayerId).Distinct().ToList();

        var plays = await db.Plays.AsNoTracking()
            .Where(p => playerIds.Contains(p.PlayerId) && !p.Archive && p.FinishedAt != null &&
                        p.Question.Day >= start && p.Question.Day <= end && p.Question.Status != QuestionStatus.Cancelled)
            .Select(p => new { p.PlayerId, p.Question.Day, p.Score })
            .ToListAsync(ct);

        var cells = plays
            .GroupBy(p => p.PlayerId)
            .ToDictionary(g => g.Key, g =>
            {
                var row = Enumerable.Repeat(new LeagueCellDto(false, null), LeagueWeek.Days).ToArray();
                foreach (var p in g) row[p.Day.DayNumber - start.DayNumber] = new LeagueCellDto(true, p.Score);
                return (IReadOnlyList<LeagueCellDto>)row;
            });
        return new Board(members, cells);
    }

    private sealed record BoardMember(Guid LeagueId, Guid PlayerId, string Name);

    private sealed record Board(List<BoardMember> Members, Dictionary<Guid, IReadOnlyList<LeagueCellDto>> ByPlayer)
    {
        private static readonly IReadOnlyList<LeagueCellDto> Empty = Enumerable.Repeat(new LeagueCellDto(false, null), LeagueWeek.Days).ToList();

        public IReadOnlyList<LeagueCellDto> Cells(Guid playerId) => ByPlayer.GetValueOrDefault(playerId) ?? Empty;
    }
}
