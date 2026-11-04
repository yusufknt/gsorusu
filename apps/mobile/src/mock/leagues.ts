/**
 * Test sunucusunda arkadaş ligi. Gerçek API (LeagueEndpoints.cs) ile aynı adresler, DTO'lar ve hata kodları.
 *
 * Başka gerçek oyuncu olmadığından ligler "test oyuncularıyla" doldurulur:
 * - Bilinmeyen ama geçerli bir kodla katılınca, test oyuncularından oluşan bir arkadaş ligi açılır.
 * - Kendi kurduğun lige Profil > Test araçları'ndan test oyuncusu eklenebilir.
 * Test oyuncularının puanları (oyuncu, gün) çiftine göre deterministiktir.
 */
import type { League, LeagueCell, LeagueSummary, QuestionFormat } from '../api/types';
import * as R from './rules';

export interface MockMember {
  id: string;
  name: string;
  joinedAt: number;
  /** Test oyuncusu: 0–1 arası beceri, puanlarını belirler. */
  skill?: number;
}

export interface MockLeague {
  id: string;
  code: string;
  name: string;
  ownerId: string;
  createdDay: string;
  members: MockMember[];
}

export interface LeagueContext {
  leagues: MockLeague[];
  me: { id: string; name: string | null };
  today: string;
  now: number;
  launchDay: string;
  formatOf: (day: string) => QuestionFormat;
  /** Oyuncunun o günkü (kendi gününde oynanmış) sonucu. */
  myCell: (day: string) => LeagueCell;
}

export class LeagueError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const BOT_NAMES = ['Ayşe', 'Mehmet', 'Zeynep', 'Can', 'Elif', 'Burak', 'Deniz', 'Selin', 'Emre', 'Ece', 'Kerem', 'Defne', 'Annem', 'Babam', 'Tolga', 'Merve', 'Oğuz', 'Şule', 'İlker', 'Gizem'];
const DAY_MS = 86_400_000;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

function botCell(ctx: LeagueContext, m: MockMember, day: string): LeagueCell {
  if (day > ctx.today || day < ctx.launchDay) return { played: false, score: null };
  const rnd = R.mulberry32(hash(`${m.id}|${day}`));
  // Bugün herkes henüz oynamamış olsun; geçmiş günlerde çoğu oynar.
  if (rnd() > (day === ctx.today ? 0.55 : 0.85)) return { played: false, score: null };
  if (ctx.formatOf(day) === 'poll' && day === ctx.today) return { played: true, score: null };
  const score = Math.round(Math.min(100, Math.max(0, (m.skill ?? 0.6) * 100 + (rnd() - 0.5) * 70)));
  return { played: true, score };
}

function cellsOf(ctx: LeagueContext, m: MockMember, start: string): LeagueCell[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(start, i);
    return m.id === ctx.me.id ? ctx.myCell(day) : botCell(ctx, m, day);
  });
}

function ranked(ctx: LeagueContext, l: MockLeague, start: string) {
  return R.rankStandings(
    l.members.map((m) => {
      const days = cellsOf(ctx, m, start);
      const name = m.id === ctx.me.id ? (ctx.me.name ?? 'Oyuncu') : m.name;
      return { key: m.id, name, total: days.reduce((a, d) => a + (d.score ?? 0), 0), played: days.filter((d) => d.played).length, days };
    }),
  );
}

function detail(ctx: LeagueContext, l: MockLeague, week?: string | null): League {
  const current = R.weekStart(ctx.today);
  const start = R.weekStart(week ?? ctx.today);
  if (start > current) throw new LeagueError(400, 'invalid_week', 'Bu haftanın sıralaması henüz başlamadı.');
  const first = R.weekStart(l.createdDay);
  const standings = ranked(ctx, l, start).map((r) => ({
    playerId: r.key,
    displayName: r.name,
    isMe: r.key === ctx.me.id,
    isOwner: r.key === l.ownerId,
    rank: r.rank,
    total: r.total,
    played: r.played,
    days: r.days,
  }));
  return {
    id: l.id,
    code: l.code,
    name: l.name,
    isOwner: l.ownerId === ctx.me.id,
    memberCount: l.members.length,
    maxMembers: R.LEAGUE.maxMembers,
    week: {
      start,
      end: addDays(start, 6),
      isCurrent: start === current,
      previous: start > first ? addDays(start, -7) : null,
      next: start < current ? addDays(start, 7) : null,
      days: Array.from({ length: 7 }, (_, i) => {
        const day = addDays(start, i);
        const exists = day <= ctx.today && day >= ctx.launchDay;
        return {
          day,
          no: exists ? R.dayNumber(day) - R.dayNumber(ctx.launchDay) + 1 : null,
          format: exists ? ctx.formatOf(day) : null,
          cancelled: false,
          future: day > ctx.today,
        };
      }),
    },
    standings,
  };
}

function summary(ctx: LeagueContext, l: MockLeague): LeagueSummary {
  const start = R.weekStart(ctx.today);
  const rows = ranked(ctx, l, start);
  const mine = rows.find((r) => r.key === ctx.me.id)!;
  const todayIndex = R.dayNumber(ctx.today) - R.dayNumber(start);
  return {
    id: l.id,
    code: l.code,
    name: l.name,
    isOwner: l.ownerId === ctx.me.id,
    memberCount: l.members.length,
    myRank: mine.rank,
    myTotal: mine.total,
    playedToday: rows.filter((r) => r.days[todayIndex].played).length,
    leaderName: rows[0].total > 0 ? rows[0].name : null,
  };
}

function ensureCanJoinAnother(ctx: LeagueContext) {
  if (!ctx.me.name) throw new LeagueError(409, 'display_name_required', 'Lige katılmak için önce bir görünen ad seç; sıralamada bu ad görünür.');
  if (ctx.leagues.filter((l) => l.members.some((m) => m.id === ctx.me.id)).length >= R.LEAGUE.maxPerPlayer) {
    throw new LeagueError(409, 'league_limit', `En fazla ${R.LEAGUE.maxPerPlayer} lige üye olabilirsin.`);
  }
}

function findForMember(ctx: LeagueContext, id: string): MockLeague {
  const l = ctx.leagues.find((x) => x.id === id && x.members.some((m) => m.id === ctx.me.id));
  if (!l) throw new LeagueError(404, 'league_not_found', 'Bu lig bulunamadı ya da artık üyesi değilsin.');
  return l;
}

function newId(): string {
  return `lig-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function uniqueCode(ctx: LeagueContext): string {
  let code: string;
  do code = R.generateLeagueCode();
  while (ctx.leagues.some((l) => l.code === code));
  return code;
}

/** Test oyuncusu üretir; aynı ligde aynı ad iki kez kullanılmaz. */
export function makeBots(league: MockLeague, count: number, now: number): MockMember[] {
  const used = new Set(league.members.map((m) => m.name));
  const free = BOT_NAMES.filter((n) => !used.has(n));
  const rnd = R.mulberry32(hash(`${league.id}|${league.members.length}`));
  const bots: MockMember[] = [];
  for (let i = 0; i < count && free.length > 0; i++) {
    const name = free.splice(Math.floor(rnd() * free.length), 1)[0];
    bots.push({ id: `bot-${league.id}-${name}`, name, joinedAt: now + i, skill: 0.35 + rnd() * 0.5 });
  }
  return bots;
}

/** Kendi kurduğun liglere test oyuncusu ekler (Profil > Test araçları). Eklenen oyuncu sayısını döndürür. */
export function addBotsToOwnedLeagues(leagues: MockLeague[], meId: string, now: number, perLeague = 3): number {
  let added = 0;
  for (const l of leagues.filter((x) => x.ownerId === meId)) {
    const bots = makeBots(l, Math.min(perLeague, R.LEAGUE.maxMembers - l.members.length), now);
    l.members.push(...bots);
    added += bots.length;
  }
  return added;
}

type Body = Record<string, unknown> | undefined;

/** /leagues… isteklerini karşılar; bu adres değilse NOT_HANDLED döner. */
export function leagueRoute(ctx: LeagueContext, method: string, path: string, query: URLSearchParams, b: Body): unknown {
  if (path === '/leagues' && method === 'GET') {
    return ctx.leagues
      .filter((l) => l.members.some((m) => m.id === ctx.me.id))
      .sort((a, b) => joinedAt(ctx, a) - joinedAt(ctx, b))
      .map((l) => summary(ctx, l));
  }

  if (path === '/leagues' && method === 'POST') {
    const name = typeof b?.name === 'string' ? b.name.trim() : '';
    if (name.length < R.LEAGUE.nameMin || name.length > R.LEAGUE.nameMax) {
      throw new LeagueError(400, 'invalid_league_name', `Lig adı ${R.LEAGUE.nameMin}–${R.LEAGUE.nameMax} karakter olmalı.`);
    }
    ensureCanJoinAnother(ctx);
    const l: MockLeague = {
      id: newId(),
      code: uniqueCode(ctx),
      name,
      ownerId: ctx.me.id,
      createdDay: ctx.today,
      members: [{ id: ctx.me.id, name: ctx.me.name!, joinedAt: ctx.now }],
    };
    ctx.leagues.push(l);
    return detail(ctx, l);
  }

  if (path === '/leagues/join' && method === 'POST') {
    const code = normalizeOrThrow(b?.code);
    let l = ctx.leagues.find((x) => x.code === code);
    if (l?.members.some((m) => m.id === ctx.me.id)) return detail(ctx, l);
    ensureCanJoinAnother(ctx);
    if (!l) {
      // Test modu: bilinmeyen kod, test oyuncularından oluşan bir arkadaş ligi açar.
      // İki hafta önce kurulmuş sayılır; geçen haftanın sıralaması da görülebilsin.
      l = { id: newId(), code, name: 'Arkadaşlar', ownerId: '', createdDay: addDays(ctx.today, -14), members: [] };
      l.members.push(...makeBots(l, 6, ctx.now - DAY_MS));
      l.ownerId = l.members[0].id;
      ctx.leagues.push(l);
    }
    if (l.members.length >= R.LEAGUE.maxMembers) throw new LeagueError(409, 'league_full', `Bu lig dolu (en fazla ${R.LEAGUE.maxMembers} kişi).`);
    l.members.push({ id: ctx.me.id, name: ctx.me.name!, joinedAt: ctx.now });
    return detail(ctx, l);
  }

  let m: RegExpMatchArray | null;
  if (method === 'GET' && (m = path.match(/^\/leagues\/([\w-]+)$/))) {
    return detail(ctx, findForMember(ctx, m[1]), query.get('week'));
  }

  if (method === 'DELETE' && (m = path.match(/^\/leagues\/([\w-]+)\/members\/([\w-]+)$/))) {
    const l = findForMember(ctx, m[1]);
    const target = m[2];
    if (target !== ctx.me.id && l.ownerId !== ctx.me.id) {
      throw new LeagueError(403, 'not_league_owner', 'Üyeleri yalnızca ligin sahibi çıkarabilir.');
    }
    if (!l.members.some((x) => x.id === target)) throw new LeagueError(404, 'member_not_found', 'Bu oyuncu artık ligde değil.');
    l.members = l.members.filter((x) => x.id !== target);
    if (l.ownerId === target) {
      const heir = [...l.members].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      if (heir) l.ownerId = heir.id;
      else ctx.leagues.splice(ctx.leagues.indexOf(l), 1);
    }
    return target === ctx.me.id ? undefined : detail(ctx, l);
  }

  return NOT_HANDLED;
}

export const NOT_HANDLED = Symbol('not-handled');

function joinedAt(ctx: LeagueContext, l: MockLeague): number {
  return l.members.find((m) => m.id === ctx.me.id)?.joinedAt ?? 0;
}

function normalizeOrThrow(raw: unknown): string {
  const code = R.normalizeLeagueCode(typeof raw === 'string' ? raw : null);
  if (!code) throw new LeagueError(400, 'invalid_league_code', `Lig kodu ${R.LEAGUE.codeLength} karakterden oluşur. Kodu kontrol et.`);
  return code;
}
