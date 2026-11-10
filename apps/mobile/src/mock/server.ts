/**
 * Uygulama içi test sunucusu. Gerçek API ile aynı DTO'ları ve aynı Türkçe hata kodlarını üretir;
 * böylece ekranlar iki modda da aynı kodla çalışır. Veriler cihazda saklanır.
 *
 * Günlük set (docs/kararlar.md #61, #67): her gün dört mod (pahali · kac · yapar · unlu). Her mod ayrı
 * oynanır; gün hepsi bitince tamamlanır, seri bir artar ve yapboza bir parça eklenir.
 * Adresler: /days/{gün}, /q/{gün}/{mod}, /plays/{gün}/{mod}[/{işlem}]. Gerçek sunucu henüz tek
 * soruluk eski yapıda; bu adresler sunucuya taşınacak (DURUM.md).
 *
 * "Türkiye ne dedi?" sayıları simüle edilir (soru id'sine göre deterministik).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DAILY_MODES,
  type DailyMode,
  type DayRank,
  type DaySet,
  type GuessDirection,
  type Me,
  type ModeSummary,
  type PlayState,
  type QuestionFormat,
  type Stats,
} from '../api/types';
import { CELEB, celebScore, compareCeleb, namePattern } from '../lib/celeb';
import { findCeleb } from './celebs';
import type { Subscription } from '../lib/premium';
import { overallPercentile, percentileOf } from '../lib/rank';
import { simulatedCrowd } from './crowd';
import { MODE_BANK } from './dailyBank';
import { freshPractice, NOT_HANDLED, premiumRoute, type MockPractice, type PremiumContext } from './premium';
import { modeStats, type PlayRecord } from './modeStats';
import { toPublic } from './publicQuestion';
import { SOURCE_TEXT, type ResolvedQuestion } from './questions';
import { artFor } from '../lib/puzzleArt';
import { InvalidIdTokenError, type GoogleClaims } from '../lib/googleIdToken';
import { verifyInTestServer } from './googleVerify';
import * as R from './rules';

const STORAGE_KEY = 'gunun.mock.v2';
const LAUNCH_DAY = '2026-10-01';
const ARCHIVE_DAYS = 7;
const DAY_MS = 86_400_000;

export class MockError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

interface Step {
  value?: number;
  direction?: GuessDirection;
  close?: boolean;
  option?: number;
  round?: number;
  correct?: boolean;
  elapsedMs?: number;
  /** "Hangi ünlü?" tahmini (listedeki ad). */
  name?: string;
}

interface MockPlay {
  day: string;
  mode: DailyMode;
  archive: boolean;
  steps: Step[];
  hintUsed: boolean;
  hint: { min: number; max: number } | null;
  /** Ödüllü reklamla 7. tahmin alındı. */
  extraGuess?: boolean;
  chosenOption: number | null;
  poll: { option: number; predictedPct: number; actualPct: number | null } | null;
  score: number | null;
  solved: boolean;
  startedAt: number;
  finishedAt: number | null;
}

interface MockState {
  /** Anahtar: "gün/mod". */
  plays: Record<string, MockPlay>;
  streak: R.StreakState;
  /** Tamamlanan yapboz sayısı (eski kayıtlarla uyum; koleksiyonla aynı tutulur). */
  puzzlesCompleted: number;
  /** Tamamlanan yapbozların resmi ve günü (koleksiyon). */
  collection: { art: string; day: string }[];
  me: Me;
  /** Ücretsiz arşiv hakkının kullanıldığı gün ve o gün açılan arşiv günü sayısı. */
  archiveFree: { day: string; used: number };
  /** Ödüllü reklamla açılmış arşiv günleri. */
  archiveUnlocked: string[];
  /** Geliştirici aracı: saati gün gün ileri almak için. */
  dayOffset: number;
  practice: MockPractice;
  subscription: Subscription | null;
}

const freshState = (): MockState => ({
  plays: {},
  streak: R.EMPTY_STREAK,
  puzzlesCompleted: 0,
  collection: [],
  me: { playerId: 'test-oyuncu', displayName: null, city: null, notifyHour: 9, createdAt: new Date().toISOString() },
  archiveFree: { day: '', used: 0 },
  archiveUnlocked: [],
  dayOffset: 0,
  practice: freshPractice(),
  subscription: null,
});

let state: MockState | null = null;

async function load(): Promise<MockState> {
  if (state) return state;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    state = raw ? { ...freshState(), ...(JSON.parse(raw) as MockState) } : freshState();
    // Koleksiyondan önceki kayıtlar: tamamlanan yapbozlar sıradaki resimlerle koleksiyona alınır.
    if (state.collection.length < state.puzzlesCompleted) {
      state.collection = Array.from({ length: state.puzzlesCompleted }, (_, i) => state!.collection[i] ?? { art: artFor(i).id, day: today() });
    }
  } catch {
    state = freshState();
  }
  return state;
}

async function save() {
  if (state) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const playKey = (day: string, mode: DailyMode) => `${day}/${mode}`;
const playOf = (s: MockState, day: string, mode: DailyMode): MockPlay | undefined => s.plays[playKey(day, mode)];
const dayPlays = (s: MockState, day: string) => DAILY_MODES.map((m) => playOf(s, day, m));

// --- Zaman ---

export function mockNow(): number {
  return Date.now() + (state?.dayOffset ?? 0) * DAY_MS;
}

/** İstanbul günü (UTC+3, yaz saati yok). */
function istanbulDay(ms: number): string {
  return new Date(ms + 3 * 3_600_000).toISOString().slice(0, 10);
}

const today = () => istanbulDay(mockNow());

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

// --- Sorular ---


const MODE_SEED: Record<DailyMode, number> = { pahali: 0, kac: 1, yapar: 2, unlu: 3 };

/** Her mod kendi stoğunda gün gün ilerler; aynı gün iki modda aynı tema gelmesin diye kaydırılır. */
function questionFor(day: string, mode: DailyMode): ResolvedQuestion {
  const dn = R.dayNumber(day);
  // Sabit mod numarası (ekran sırası değişse de günün sorusu ve kimliği değişmesin).
  const mi = MODE_SEED[mode];
  const list = MODE_BANK[mode];
  const q = list[(dn + mi * 3) % list.length];
  return { ...q, id: dn * 10 + mi, no: dn - R.dayNumber(LAUNCH_DAY) + 1, day, mode };
}

function parseMode(raw: string): DailyMode {
  if ((DAILY_MODES as readonly string[]).includes(raw)) return raw as DailyMode;
  throw new MockError(404, 'mode_not_found', 'Böyle bir oyun yok.');
}

function checkVisible(day: string) {
  const t = today();
  if (day > t || day < LAUNCH_DAY) {
    throw day === t
      ? new MockError(404, 'question_not_ready', 'Bugünün soruları hazırlanıyor. Birazdan tekrar dene.')
      : new MockError(404, 'question_not_found', 'Bu günün soruları bulunamadı.');
  }
}

function visibleQuestion(day: string, mode: DailyMode): ResolvedQuestion {
  checkVisible(day);
  return questionFor(day, mode);
}

function playableQuestion(day: string, mode: DailyMode): ResolvedQuestion {
  if (day < addDays(today(), -ARCHIVE_DAYS)) {
    throw new MockError(403, 'archive_expired', `Arşivde yalnızca son ${ARCHIVE_DAYS} günün soruları oynanabilir.`);
  }
  return visibleQuestion(day, mode);
}


function celebAnswer(q: ResolvedQuestion) {
  const c = findCeleb(q.celeb ?? '');
  if (!c) throw new MockError(500, 'celeb_missing', 'Günün ünlüsü bulunamadı.');
  return c;
}

function celebState(q: ResolvedQuestion, p: MockPlay | undefined) {
  if (q.format !== 'celeb') return null;
  const answer = celebAnswer(q);
  const used = p?.steps.length ?? 0;
  const over = !!p?.finishedAt;
  return {
    maxGuesses: CELEB.maxGuesses,
    hints: {
      fact: over || used >= CELEB.hintFactAfter ? answer.fact : null,
      pattern: over || used >= CELEB.hintPatternAfter ? namePattern(answer.name) : null,
      factAfter: CELEB.hintFactAfter,
      patternAfter: CELEB.hintPatternAfter,
    },
    guesses: (p?.steps ?? []).map((x) => compareCeleb(findCeleb(x.name!)!, answer)),
    answer: p?.finishedAt ? compareCeleb(answer, answer) : null,
  };
}

// --- Oyun durumu ---

/** Günün bütün modları bitti mi (bugün oynanmış, arşiv değil)? */
function dayComplete(s: MockState, day: string): boolean {
  return dayPlays(s, day).every((p) => !!p?.finishedAt && !p.archive);
}

function finish(q: ResolvedQuestion, p: MockPlay, score: number | null, solved: boolean, s: MockState) {
  p.score = score;
  p.solved = solved;
  p.finishedAt = mockNow();
  if (p.archive || !dayComplete(s, q.day)) return;
  const before = s.streak.current;
  s.streak = R.recordPlay(s.streak, q.day);
  if (s.streak.current !== before && R.completesPuzzle(s.streak.current)) completePuzzle(s, q.day);
}

/** Yapboz bitti: resmi koleksiyona girer; bir sonraki yapboz sıradaki resimle başlar. */
function completePuzzle(s: MockState, day: string) {
  s.collection = [...s.collection, { art: artFor(s.collection.length).id, day }];
  s.puzzlesCompleted = s.collection.length;
}

/** Anket günü bittiyse bekleyen puanı simüle sonuca göre kesinleştirir. */
function settlePoll(q: ResolvedQuestion, p: MockPlay) {
  if (q.format !== 'poll' || !p.poll || p.score !== null || q.day >= today()) return false;
  const actual = simulatedCrowd(q, true, today(), mockNow()).optionPcts?.[p.poll.option] ?? 0;
  p.poll.actualPct = actual;
  p.score = R.pollScore(p.poll.predictedPct, actual);
  p.solved = p.score >= R.POLL_SOLVED_SCORE;
  return true;
}

/**
 * 6 hak bitmiş, oyuncu ek tahmin ile "cevabı göster" arasında seçim yapmadan gün geçtiyse
 * oyun son tahmine göre kapanır (bekleyen soru seriyi askıda bırakmasın).
 * Ölçü sorunun günü değil oyunun başladığı gündür: arşiv sorusunun günü zaten geçmiştir.
 */
function settleNumeric(q: ResolvedQuestion, p: MockPlay, s: MockState) {
  if (!isAwaitingExtra(q, p) || istanbulDay(p.startedAt) >= today()) return false;
  revealNumeric(q, p, s);
  return true;
}

function isAwaitingExtra(q: ResolvedQuestion, p: MockPlay): boolean {
  const numeric = q.format === 'price' || q.format === 'number';
  return numeric && R.awaitingExtraGuess(p.steps.length, !!p.solved, !!p.finishedAt, !!p.extraGuess);
}

function revealNumeric(q: ResolvedQuestion, p: MockPlay, s: MockState) {
  const last = p.steps[p.steps.length - 1];
  finish(q, p, R.numericScore(p.steps.length, false, last.value!, q.answer!, p.hintUsed), false, s);
}

function settle(s: MockState, q: ResolvedQuestion) {
  const p = playOf(s, q.day, q.mode);
  if (!p) return;
  settlePoll(q, p);
  settleNumeric(q, p, s);
}

function archiveAccess(s: MockState, day: string): R.ArchiveAccess | null {
  if (day >= today()) return null;
  const freeUsed = s.archiveFree.day === today() ? s.archiveFree.used : 0;
  return R.archiveAccess(dayPlays(s, day).some(Boolean), s.archiveUnlocked.includes(day), freeUsed);
}

function buildState(q: ResolvedQuestion, p: MockPlay | undefined, s: MockState): PlayState {
  const finished = !!p?.finishedAt;
  const steps = p?.steps ?? [];
  const numeric = q.format === 'price' || q.format === 'number';
  return {
    questionId: q.id,
    no: q.no,
    day: q.day,
    mode: q.mode,
    format: q.format,
    started: !!p,
    archive: p?.archive ?? q.day < today(),
    cancelled: false,
    finished,
    score: p?.score ?? null,
    scorePending: finished && p?.score == null,
    solved: !!p?.solved,
    numeric: numeric
      ? {
          attemptsUsed: steps.length,
          maxAttempts: R.numericMaxAttempts(!!p?.extraGuess),
          guesses: steps.map((x) => ({ value: x.value!, direction: x.direction!, close: !!x.close })),
          hintUsed: !!p?.hintUsed,
          canUseHint: !!p && R.canUseHint(steps.length, finished, p.hintUsed),
          hintAfterAttempts: R.NUMERIC.hintAfter,
          hint: p?.hint ?? null,
          canBuyExtraGuess: !!p && isAwaitingExtra(q, p),
          extraGuessUsed: !!p?.extraGuess,
        }
      : null,
    trivia: null,
    compare:
      q.format === 'compare'
        ? {
            rounds: R.COMPARE_ROUNDS,
            answered: steps.map((x) => {
              const r = q.rounds![x.round!];
              return { round: x.round!, choice: x.option!, correct: !!x.correct, correctChoice: r.correct, valueA: r.valueA, valueB: r.valueB };
            }),
          }
        : null,
    poll: q.format === 'poll' && p?.poll ? { ...p.poll } : null,
    celeb: celebState(q, p),
    reveal: finished
      ? {
          answer: numeric ? (q.answer ?? null) : null,
          unit: q.unit ?? null,
          correctOption: null,
          factText: q.format === 'celeb' ? celebAnswer(q).fact : (q.fact ?? null),
          priceHistory: q.priceHistory ?? null,
          sourceText: SOURCE_TEXT,
          sourceUrl: null,
          sourceDate: null,
        }
      : null,
    archiveAccess: archiveAccess(s, q.day),
  };
}

/** Hub kartındaki kısa sonuç: "3/5", "4/6", "X/6", "%72". */
function resultLabel(q: ResolvedQuestion, p: MockPlay | undefined): string | null {
  if (!p?.finishedAt) return null;
  if (q.format === 'compare') return `${p.steps.filter((x) => x.correct).length}/${R.COMPARE_ROUNDS}`;
  if (q.format === 'poll') return p.poll ? `%${p.poll.predictedPct}` : null;
  if (q.format === 'celeb') return `${p.solved ? p.steps.length : 'X'}/${CELEB.maxGuesses}`;
  const max = R.numericMaxAttempts(!!p.extraGuess);
  return p.solved ? `${p.steps.length}/${max}` : `X/${max}`;
}

const SQUARE = { higher: '🟧', lower: '🟦', close: '🟥', correct: '🟩', miss: '⬛' } as const;

/** Paylaşım kareleri: Hangisi pahalı? turları ve Kaç? tahminleri (lib/share.ts ile aynı renkler). */
function squaresOf(q: ResolvedQuestion, p: MockPlay | undefined): string | null {
  if (!p?.finishedAt || q.format === 'poll') return null;
  if (q.format === 'compare') return p.steps.map((x) => (x.correct ? SQUARE.correct : SQUARE.miss)).join('');
  if (q.format === 'celeb') return celebSquares(q, p);
  return p.steps.map((x) => (x.direction === 'correct' ? SQUARE.correct : x.close ? SQUARE.close : SQUARE[x.direction!])).join('');
}

/**
 * "Hangi ünlü?" paylaşımı: her tahmin bir kare. Yeşil = bulundu, turuncu = 8 kutunun en az 4'ü
 * yeşil/turuncu (yaklaştı), kırmızı = uzak. Kimin tahmin edildiğini vermez.
 */
function celebSquares(q: ResolvedQuestion, p: MockPlay): string {
  const answer = celebAnswer(q);
  return p.steps
    .map((x) => {
      const g = compareCeleb(findCeleb(x.name!)!, answer);
      if (g.correct) return SQUARE.correct;
      return g.cells.filter((c) => c.status !== 'wrong').length >= 4 ? SQUARE.higher : SQUARE.close;
    })
    .join('');
}

function modeSummary(s: MockState, day: string, mode: DailyMode): ModeSummary {
  const q = questionFor(day, mode);
  settle(s, q);
  const p = playOf(s, day, mode);
  const finished = !!p?.finishedAt;
  return {
    mode,
    format: q.format,
    teaser: q.format === 'compare' ? `${q.rounds?.[0]?.a} mı, ${q.rounds?.[0]?.b} mı?` : q.format === 'celeb' ? `Günün ünlüsünü ${CELEB.maxGuesses} tahminde bul` : q.prompt,
    started: !!p,
    finished,
    score: p?.score ?? null,
    scorePending: finished && p?.score == null,
    solved: !!p?.solved,
    result: resultLabel(q, p),
    squares: squaresOf(q, p),
  };
}

function daySet(s: MockState, day: string): DaySet {
  checkVisible(day);
  const modes = DAILY_MODES.map((m) => modeSummary(s, day, m));
  const finishedCount = modes.filter((m) => m.finished).length;
  return {
    day,
    no: questionFor(day, 'kac').no,
    archive: day < today(),
    modes,
    finishedCount,
    complete: finishedCount === modes.length,
    locked: archiveAccess(s, day) === 'locked',
  };
}

function getOrCreate(s: MockState, q: ResolvedQuestion): MockPlay {
  const key = playKey(q.day, q.mode);
  if (!s.plays[key]) {
    const access = archiveAccess(s, q.day);
    if (access === 'locked') {
      throw new MockError(403, 'archive_locked', 'Bugünkü ücretsiz arşiv hakkını kullandın. Bu günü kısa bir videoyla açabilirsin.');
    }
    // Ücretsiz hak gün başına bir kez düşer (aynı günün diğer modları bedava).
    if (access === 'free') {
      const t = today();
      s.archiveFree = { day: t, used: (s.archiveFree.day === t ? s.archiveFree.used : 0) + 1 };
    }
  }
  return (s.plays[key] ??= {
    day: q.day,
    mode: q.mode,
    archive: q.day < today(),
    steps: [],
    hintUsed: false,
    hint: null,
    chosenOption: null,
    poll: null,
    score: null,
    solved: false,
    startedAt: mockNow(),
    finishedAt: null,
  });
}

function ensureNotFinished(p: MockPlay) {
  if (p.finishedAt) throw new MockError(409, 'already_finished', 'Bu oyunu zaten bitirdin.');
}

function wrongFormat(): MockError {
  return new MockError(400, 'wrong_format', 'Bu işlem bu oyun türüne uygun değil.');
}

// --- Yönlendirme ---

type Body = Record<string, unknown> | undefined;

export async function mockApi<T>(method: string, path: string, body?: unknown): Promise<T> {
  const s = await load();
  const b = body as Body;
  // Ağ gecikmesi hissi; yükleniyor durumları da görünsün.
  await new Promise((r) => setTimeout(r, 120));
  const [pathname, search = ''] = path.split('?');
  if (method === 'POST' && pathname === '/auth/google') {
    const result = applyGoogleSignIn(s, await verifiedGoogleClaims(b));
    await save();
    return result as T;
  }
  const result = route(s, method, pathname, new URLSearchParams(search), b);
  await save();
  return result as T;
}

const DAY = '(\\d{4}-\\d{2}-\\d{2})';

function route(s: MockState, method: string, path: string, query: URLSearchParams, b: Body): unknown {
  let m: RegExpMatchArray | null;

  if (method === 'POST' && path === '/auth/device') return { token: 'mock', playerId: s.me.playerId, isNew: false };
  if (path === '/me') {
    if (method === 'PATCH' && b) {
      if (typeof b.displayName === 'string') s.me.displayName = b.displayName.trim() || null;
      if (typeof b.notifyHour === 'number') s.me.notifyHour = b.notifyHour;
      if (typeof b.city === 'string') s.me.city = b.city.trim() || null;
    }
    return s.me;
  }
  const extra = premiumRoute(premiumContext(s), method, path, b);
  if (extra !== NOT_HANDLED) return extra;

  if (method === 'GET' && path === '/days/today') return daySet(s, today());
  if (method === 'GET' && (m = path.match(new RegExp(`^/days/${DAY}/rank$`)))) return dayRank(s, m[1]);
  if (method === 'GET' && (m = path.match(new RegExp(`^/days/${DAY}$`)))) return daySet(s, m[1]);
  if (method === 'POST' && (m = path.match(new RegExp(`^/days/${DAY}/unlock$`)))) return unlockDay(s, m[1]);
  if (method === 'GET' && (m = path.match(new RegExp(`^/q/${DAY}/(\\w+)$`)))) return toPublic(visibleQuestion(m[1], parseMode(m[2])));
  if (method === 'GET' && (m = path.match(new RegExp(`^/q/${DAY}/(\\w+)/crowd$`)))) {
    const q = visibleQuestion(m[1], parseMode(m[2]));
    const mine = playOf(s, q.day, q.mode);
    if (q.day === today() && !mine?.finishedAt) throw new MockError(403, 'finish_first', 'Sonuçları görmek için önce oyunu bitir.');
    return simulatedCrowd(q, !!mine?.finishedAt, today(), mockNow());
  }
  if (method === 'GET' && path === '/plays/archive') return archive(s);
  if (method === 'GET' && path === '/stats/me') return stats(s);
  if (method === 'POST' && path === '/streak/repair') {
    if (!R.canRepair(s.streak, today())) {
      throw new MockError(409, 'streak_not_repairable', 'Seri yalnızca tek gün kaçırıldıysa ve son 7 günde kurtarma yapılmadıysa kurtarılabilir.');
    }
    s.streak = R.repair(s.streak, today());
    return {};
  }

  if ((m = path.match(new RegExp(`^/plays/${DAY}/(\\w+)(?:/(\\w+))?$`)))) {
    const [, day, rawMode, action] = m;
    const mode = parseMode(rawMode);
    if (method === 'GET' && !action) {
      const q = visibleQuestion(day, mode);
      settle(s, q);
      return buildState(q, playOf(s, day, mode), s);
    }
    return playAction(s, playableQuestion(day, mode), action, b);
  }

  throw new MockError(404, 'not_found', 'Aradığın şey bulunamadı.');
}

function premiumContext(s: MockState): PremiumContext {
  const pahali = playOf(s, today(), 'pahali');
  return {
    practice: s.practice,
    subscription: s.subscription,
    setSubscription: (sub) => (s.subscription = sub),
    today: today(),
    now: mockNow(),
    pahaliFinishedToday: !!pahali?.finishedAt && !pahali.archive,
    fail: (status, code, message) => new MockError(status, code, message),
  };
}

/** Gün bitince her modda oyuncuların yüzde kaçından iyi olduğun (anket puanı gün bitince belli olur). */
function dayRank(s: MockState, day: string): DayRank {
  checkVisible(day);
  if (!dayComplete(s, day)) throw new MockError(403, 'finish_first', 'Sıralamayı görmek için günün 4 oyununu bitir.');
  let players = 0;
  const modes = DAILY_MODES.map((mode) => {
    const q = questionFor(day, mode);
    settle(s, q);
    const score = playOf(s, day, mode)?.score ?? null;
    const crowd = simulatedCrowd(q, true, today(), mockNow());
    players = Math.max(players, crowd.plays);
    return { mode, percentile: score === null ? null : percentileOf(crowd.histogram, score), pending: score === null };
  });
  return { day, overall: overallPercentile(modes.map((x) => x.percentile)), players, modes };
}

/** Arşiv günü ödüllü reklamla açıldı (gerçek sunucuda AdMob SSV ile doğrulanacak). */
function unlockDay(s: MockState, day: string): DaySet {
  if (day >= today()) throw new MockError(400, 'not_archive', 'Bu gün arşivde değil.');
  if (!s.archiveUnlocked.includes(day)) s.archiveUnlocked.push(day);
  const oldest = addDays(today(), -ARCHIVE_DAYS);
  s.archiveUnlocked = s.archiveUnlocked.filter((d) => d >= oldest);
  return daySet(s, day);
}

function playAction(s: MockState, q: ResolvedQuestion, action: string | undefined, b: Body): PlayState {
  const numeric = q.format === 'price' || q.format === 'number';
  const existing = () => playOf(s, q.day, q.mode);

  switch (action) {
    case 'start':
      return buildState(q, getOrCreate(s, q), s);
    case 'guess': {
      if (!numeric) throw wrongFormat();
      const raw = Number(b?.value);
      const value = Math.round(raw * 100) / 100;
      if (!Number.isFinite(raw) || value <= 0) throw new MockError(400, 'invalid_guess', 'Tahmin 0’dan büyük bir sayı olmalı.');
      const p = getOrCreate(s, q);
      ensureNotFinished(p);
      if (p.steps.length >= R.numericMaxAttempts(!!p.extraGuess)) {
        throw new MockError(409, 'no_attempts_left', 'Tahmin hakkın bitti.');
      }
      const fb = R.evaluateGuess(value, q.answer!);
      p.steps.push({ value, direction: fb.direction, close: fb.close });
      const solved = fb.direction === 'correct';
      if (solved) {
        finish(q, p, R.numericScore(p.steps.length, true, value, q.answer!, p.hintUsed), true, s);
      } else if (p.steps.length >= R.numericMaxAttempts(!!p.extraGuess) && !isAwaitingExtra(q, p)) {
        // Ek tahmin teklif edilecekse oyun açık kalır; cevap oyuncu seçince açılır.
        revealNumeric(q, p, s);
      }
      return buildState(q, p, s);
    }
    case 'extra': {
      // Ödüllü reklam izlendi (gerçek sunucuda AdMob SSV ile doğrulanacak).
      if (!numeric) throw wrongFormat();
      const p = existing();
      if (!p || !isAwaitingExtra(q, p)) throw new MockError(409, 'extra_unavailable', 'Ek tahmin şu an alınamaz.');
      p.extraGuess = true;
      return buildState(q, p, s);
    }
    case 'reveal': {
      if (!numeric) throw wrongFormat();
      const p = existing();
      if (!p || !isAwaitingExtra(q, p)) throw new MockError(409, 'reveal_unavailable', 'Cevap şu an açılamaz.');
      revealNumeric(q, p, s);
      return buildState(q, p, s);
    }
    case 'unlock':
      unlockDay(s, q.day);
      return buildState(q, existing(), s);
    case 'hint': {
      if (!numeric) throw wrongFormat();
      const p = existing();
      if (!p) throw new MockError(409, 'not_started', 'Önce oyunu aç.');
      ensureNotFinished(p);
      if (p.hintUsed) throw new MockError(409, 'hint_already_used', 'İpucunu zaten kullandın.');
      if (!R.canUseHint(p.steps.length, false, false)) {
        throw new MockError(409, 'hint_unavailable', `İpucu ${R.NUMERIC.hintAfter}. tahminden sonra açılır.`);
      }
      p.hintUsed = true;
      p.hint = R.buildHint(
        q.answer!,
        q.id,
        p.steps.map((x) => ({ value: x.value!, direction: x.direction! })),
      );
      return buildState(q, p, s);
    }
    case 'compare': {
      if (q.format !== 'compare') throw wrongFormat();
      const choice = Number(b?.choice);
      if (choice !== 0 && choice !== 1) throw new MockError(400, 'invalid_choice', 'Geçersiz seçim.');
      const p = getOrCreate(s, q);
      ensureNotFinished(p);
      if (Number(b?.round) !== p.steps.length) throw new MockError(409, 'wrong_round', 'Bu tur zaten cevaplandı. Ekranı yenile.');
      const r = q.rounds![p.steps.length];
      p.steps.push({ round: p.steps.length, option: choice, correct: choice === r.correct });
      if (p.steps.length === R.COMPARE_ROUNDS) {
        const results = p.steps.map((x) => !!x.correct);
        finish(q, p, R.compareScore(results), results.filter(Boolean).length >= R.COMPARE_SOLVED_ROUNDS, s);
      }
      return buildState(q, p, s);
    }
    case 'celeb': {
      if (q.format !== 'celeb') throw wrongFormat();
      const guess = findCeleb(typeof b?.name === 'string' ? b.name : '');
      if (!guess) throw new MockError(400, 'unknown_celeb', 'Bu ünlü listede yok. Önerilerden birini seç.');
      const p = getOrCreate(s, q);
      ensureNotFinished(p);
      if (p.steps.some((x) => x.name === guess.name)) throw new MockError(409, 'already_guessed', 'Bu ünlüyü zaten denedin.');
      p.steps.push({ name: guess.name });
      const solved = guess.name === celebAnswer(q).name;
      if (solved || p.steps.length >= CELEB.maxGuesses) finish(q, p, celebScore(p.steps.length, solved), solved, s);
      return buildState(q, p, s);
    }
    case 'poll': {
      if (q.format !== 'poll') throw wrongFormat();
      const option = Number(b?.option);
      const predicted = Number(b?.predictedPct);
      if (!Number.isInteger(option) || option < 0 || option >= (q.options?.length ?? 0)) {
        throw new MockError(400, 'invalid_option', 'Geçersiz seçenek.');
      }
      if (!Number.isInteger(predicted) || predicted < 0 || predicted > 100) {
        throw new MockError(400, 'invalid_prediction', 'Tahmin 0 ile 100 arasında olmalı.');
      }
      const p = getOrCreate(s, q);
      if (p.finishedAt) throw new MockError(409, 'already_voted', 'Bu soruya zaten cevap verdin.');
      p.steps.push({ option, value: predicted });
      p.chosenOption = option;
      p.poll = { option, predictedPct: predicted, actualPct: null };
      finish(q, p, null, false, s);
      settlePoll(q, p);
      return buildState(q, p, s);
    }
  }
  throw new MockError(404, 'not_found', 'Aradığın şey bulunamadı.');
}

/** Son 7 günün setleri (yeniden eskiye). */
function archive(s: MockState): DaySet[] {
  const t = today();
  const items: DaySet[] = [];
  for (let i = 1; i <= ARCHIVE_DAYS; i++) {
    const day = addDays(t, -i);
    if (day < LAUNCH_DAY) break;
    items.push(daySet(s, day));
  }
  return items;
}

/** Bitmiş, arşiv dışı oyunlar ve soruları (anket ve bekleyen sayı puanları kesinleştirilir). */
function finishedRows(s: MockState) {
  return Object.values(s.plays)
    .filter((p) => !p.archive)
    .map((p) => {
      const q = questionFor(p.day, p.mode);
      settle(s, q);
      return { p, q };
    })
    .filter(({ p }) => p.finishedAt);
}

function playRecord(p: MockPlay): PlayRecord {
  return {
    mode: p.mode,
    finishedAt: p.finishedAt ?? 0,
    score: p.score,
    solved: p.solved,
    attempts: p.steps.length,
    correctRounds: p.steps.filter((x) => x.correct).length,
  };
}

function stats(s: MockState): Stats {
  const t = today();
  const rows = finishedRows(s);

  const scored = rows.filter(({ p }) => p.score !== null);
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  const formats = [...new Set(rows.map(({ q }) => q.format))] as QuestionFormat[];
  const current = R.effectiveStreak(s.streak, t);

  return {
    currentStreak: current,
    maxStreak: s.streak.max,
    canRepairStreak: R.canRepair(s.streak, t),
    playedToday: s.streak.lastPlayedDay === t,
    puzzle: {
      size: R.PUZZLE_SIZE,
      pieces: R.puzzlePieces(current),
      earnedToday: s.streak.lastPlayedDay === t && current > 0,
      completed: s.collection.length,
      // Yapboz bugün tamamlandıysa dolu hâliyle o resim kalır; yarın sıradaki resim başlar.
      art: R.puzzlePieces(current) === R.PUZZLE_SIZE && s.collection.length ? s.collection[s.collection.length - 1].art : artFor(s.collection.length).id,
    },
    collection: [...s.collection],
    played: rows.length,
    solved: rows.filter(({ p }) => p.solved).length,
    avgScore: avg(scored.map(({ p }) => p.score!)),
    scoreSum: scored.reduce((a, { p }) => a + p.score!, 0),
    pendingScores: rows.length - scored.length,
    byFormat: formats.map((f) => {
      const fr = rows.filter(({ q }) => q.format === f);
      return {
        format: f,
        played: fr.length,
        solved: fr.filter(({ p }) => p.solved).length,
        avgScore: avg(fr.filter(({ p }) => p.score !== null).map(({ p }) => p.score!)),
      };
    }),
    byMode: modeStats(rows.map(({ p }) => playRecord(p))),
    recent: rows
      .sort((a, b) => (a.q.day < b.q.day ? 1 : -1))
      .slice(0, 30)
      .map(({ p, q }) => ({ day: q.day, no: q.no, format: q.format, score: p.score, solved: p.solved })),
  };
}

// --- Geliştirici araçları (Profil ekranında, yalnızca test modunda) ---

export async function mockShiftDays(n: number) {
  const s = await load();
  s.dayOffset += n;
  await save();
}

/**
 * Test sunucusunda Google ile giriş. id_token, gerçek sunucudaki gibi Google'ın açık anahtarlarıyla doğrulanır
 * (imza, yayıncı, hedef kitle, süre; `lib/googleIdToken.ts`). Test verisi tek oyunculu olduğu için ilerleme korunur.
 */
async function verifiedGoogleClaims(b: Body): Promise<GoogleClaims> {
  const invalid = () => new MockError(400, 'invalid_google_token', 'Google girişi doğrulanamadı. Lütfen tekrar dene.');
  if (typeof b?.idToken !== 'string' || b.idToken.length > 8192) throw invalid();
  try {
    return await verifyInTestServer(b.idToken);
  } catch (e) {
    if (e instanceof InvalidIdTokenError) throw invalid();
    throw new MockError(503, 'google_unreachable', 'Google’a ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.');
  }
}

function applyGoogleSignIn(s: MockState, claims: GoogleClaims) {
  const name = claims.name?.trim().slice(0, 24).trim() ?? '';
  s.me.authProvider = 'google';
  s.me.email = claims.email;
  if (!s.me.displayName && name) s.me.displayName = name;
  return { token: 'mock', playerId: s.me.playerId, email: claims.email, displayName: s.me.displayName, switched: false };
}

/** Test sunucusunda çıkış: Google bağlantısı kaldırılır, test verisi (seri, puanlar) olduğu gibi kalır. */
export async function mockGoogleSignOut() {
  const s = await load();
  s.me.authProvider = null;
  s.me.email = null;
  await save();
}

export async function mockReset() {
  state = freshState();
  await save();
}

/** Geliştirici aracı: koleksiyona sıradaki resmi tamamlanmış olarak ekler (15 gün oynamadan denemek için). */
export async function mockCompletePuzzle() {
  const s = await load();
  completePuzzle(s, today());
  await save();
}

export async function mockDayOffset(): Promise<number> {
  return (await load()).dayOffset;
}
