/**
 * Uygulama içi test sunucusu. Gerçek API ile aynı adresleri, aynı DTO'ları ve aynı Türkçe hata
 * kodlarını üretir; böylece ekranlar iki modda da aynı kodla çalışır. Veriler cihazda saklanır.
 *
 * "Türkiye ne dedi?" sayıları simüle edilir (soru id'sine göre deterministik).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  ArchiveItem,
  Crowd,
  GuessDirection,
  Me,
  PlayState,
  PublicQuestion,
  QuestionFormat,
  Stats,
} from '../api/types';
import { BANK, formatForWeekday, SOURCE_TEXT, type MockQuestion } from './questions';
import * as R from './rules';

const STORAGE_KEY = 'gunun.mock.v1';
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
}

interface MockPlay {
  day: string;
  archive: boolean;
  steps: Step[];
  hintUsed: boolean;
  hint: { min: number; max: number } | null;
  chosenOption: number | null;
  poll: { option: number; predictedPct: number; actualPct: number | null } | null;
  score: number | null;
  solved: boolean;
  startedAt: number;
  finishedAt: number | null;
}

interface MockState {
  plays: Record<string, MockPlay>;
  streak: R.StreakState;
  me: Me;
  /** Geliştirici aracı: saati gün gün ileri almak için. */
  dayOffset: number;
}

const freshState = (): MockState => ({
  plays: {},
  streak: R.EMPTY_STREAK,
  me: { playerId: 'test-oyuncu', displayName: null, city: null, notifyHour: 9, createdAt: new Date().toISOString() },
  dayOffset: 0,
});

let state: MockState | null = null;

async function load(): Promise<MockState> {
  if (state) return state;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    state = raw ? { ...freshState(), ...(JSON.parse(raw) as MockState) } : freshState();
  } catch {
    state = freshState();
  }
  return state;
}

async function save() {
  if (state) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

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

interface ResolvedQuestion extends MockQuestion {
  id: number;
  no: number;
  day: string;
}

function questionFor(day: string): ResolvedQuestion {
  const dn = R.dayNumber(day);
  const weekday = new Date(Date.parse(`${day}T00:00:00Z`)).getUTCDay();
  const format = formatForWeekday(weekday);
  const week = Math.floor(dn / 7);
  // Pazartesi/Cuma fiyat, Çarşamba/Pazar anket: aynı hafta içinde farklı soru gelsin.
  const slot = weekday === 5 || weekday === 0 ? 1 : 0;
  const list = BANK[format];
  const q = list[(week * 2 + slot) % list.length];
  return { ...q, id: dn, no: dn - R.dayNumber(LAUNCH_DAY) + 1, day };
}

function visibleQuestion(day: string): ResolvedQuestion {
  const t = today();
  if (day > t || day < LAUNCH_DAY) {
    throw day === t
      ? new MockError(404, 'question_not_ready', 'Bugünün sorusu hazırlanıyor. Birazdan tekrar dene.')
      : new MockError(404, 'question_not_found', 'Bu günün sorusu bulunamadı.');
  }
  return questionFor(day);
}

function playableQuestion(day: string): ResolvedQuestion {
  if (day < addDays(today(), -ARCHIVE_DAYS)) {
    throw new MockError(403, 'archive_expired', `Arşivde yalnızca son ${ARCHIVE_DAYS} günün soruları oynanabilir.`);
  }
  return visibleQuestion(day);
}

function toPublic(q: ResolvedQuestion): PublicQuestion {
  const numeric = q.format === 'price' || q.format === 'number';
  return {
    id: q.id,
    no: q.no,
    day: q.day,
    format: q.format,
    prompt: q.prompt,
    mediaUrl: null,
    unit: q.unit ?? null,
    cancelled: false,
    maxAttempts: numeric ? R.NUMERIC.maxAttempts : null,
    hintAfterAttempts: numeric ? R.NUMERIC.hintAfter : null,
    timeLimitSec: q.format === 'trivia' ? R.TRIVIA.limitMs / 1000 : null,
    options: q.format === 'poll' ? (q.options ?? null) : null,
    rounds: q.format === 'compare' ? (q.rounds ?? []).map((r) => ({ prompt: r.prompt ?? null, optionA: r.a, optionB: r.b })) : null,
    isSponsored: false,
  };
}

// --- Simüle "Türkiye ne dedi?" ---

function simulatedCrowd(q: ResolvedQuestion, mine: MockPlay | undefined): Crowd {
  const rnd = R.mulberry32(q.id * 7919);
  const plays = 2000 + Math.floor(rnd() * 7000) + (mine?.finishedAt ? 1 : 0);
  const avg = Math.round((40 + rnd() * 30) * 10) / 10;
  const histogram = Array.from({ length: 10 }, (_, i) => {
    const center = avg / 10;
    return Math.round(plays * Math.exp(-((i - center) ** 2) / 6) * 0.12);
  });
  const crowd: Crowd = {
    questionId: q.id,
    plays,
    avgScore: avg,
    histogram,
    solvedPct: Math.round((40 + rnd() * 40) * 10) / 10,
    underPct: null,
    overPct: null,
    optionPcts: null,
    final: q.day < today(),
    updatedAt: new Date(mockNow()).toISOString(),
  };

  if (q.format === 'price' || q.format === 'number') {
    const under = Math.round((30 + rnd() * 40) * 10) / 10;
    crowd.underPct = under;
    crowd.overPct = Math.round((100 - under - 3) * 10) / 10;
  } else if (q.format === 'trivia') {
    const correctPct = 45 + rnd() * 30;
    const weights = (q.options ?? []).map((_, i) => (i === q.correctOption ? correctPct : 5 + rnd() * 20));
    crowd.optionPcts = R.pollPercentages(weights.map((w) => Math.round(w * 10)));
    crowd.solvedPct = Math.round(crowd.optionPcts[q.correctOption ?? 0] * 0.95 * 10) / 10;
  } else if (q.format === 'poll') {
    const weights = (q.pollWeights ?? (q.options ?? []).map(() => 1)).map((w) => Math.max(1, w + (rnd() - 0.5) * 8));
    crowd.optionPcts = R.pollPercentages(weights.map((w) => Math.round(w * plays)));
    crowd.solvedPct = null;
  }
  return crowd;
}

// --- Oyun durumu ---

function finish(q: ResolvedQuestion, p: MockPlay, score: number | null, solved: boolean, s: MockState) {
  p.score = score;
  p.solved = solved;
  p.finishedAt = mockNow();
  if (!p.archive) s.streak = R.recordPlay(s.streak, q.day);
}

/** Anket günü bittiyse bekleyen puanı simüle sonuca göre kesinleştirir. */
function settlePoll(q: ResolvedQuestion, p: MockPlay) {
  if (q.format !== 'poll' || !p.poll || p.score !== null || q.day >= today()) return false;
  const actual = simulatedCrowd(q, p).optionPcts?.[p.poll.option] ?? 0;
  p.poll.actualPct = actual;
  p.score = R.pollScore(p.poll.predictedPct, actual);
  p.solved = p.score >= R.POLL_SOLVED_SCORE;
  return true;
}

function settleTrivia(q: ResolvedQuestion, p: MockPlay) {
  if (q.format !== 'trivia' || p.finishedAt || !R.triviaTimedOut(mockNow() - p.startedAt)) return false;
  p.score = 0;
  p.solved = false;
  p.finishedAt = p.startedAt + R.TRIVIA.limitMs + R.TRIVIA.graceMs;
  return true;
}

function buildState(q: ResolvedQuestion, p: MockPlay | undefined): PlayState {
  const finished = !!p?.finishedAt;
  const steps = p?.steps ?? [];
  const numeric = q.format === 'price' || q.format === 'number';
  return {
    questionId: q.id,
    no: q.no,
    day: q.day,
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
          maxAttempts: R.NUMERIC.maxAttempts,
          guesses: steps.map((s) => ({ value: s.value!, direction: s.direction!, close: !!s.close })),
          hintUsed: !!p?.hintUsed,
          canUseHint: !!p && R.canUseHint(steps.length, finished, p.hintUsed),
          hintAfterAttempts: R.NUMERIC.hintAfter,
          hint: p?.hint ?? null,
        }
      : null,
    trivia:
      q.format === 'trivia' && p
        ? {
            options: q.options ?? [],
            timeLimitSec: R.TRIVIA.limitMs / 1000,
            startedAt: new Date(p.startedAt).toISOString(),
            deadline: new Date(p.startedAt + R.TRIVIA.limitMs).toISOString(),
            chosenOption: p.chosenOption,
            elapsedMs: steps[0]?.elapsedMs ?? null,
            timedOut: finished && p.chosenOption === null,
          }
        : null,
    compare:
      q.format === 'compare'
        ? {
            rounds: R.COMPARE_ROUNDS,
            answered: steps.map((s) => {
              const r = q.rounds![s.round!];
              return { round: s.round!, choice: s.option!, correct: !!s.correct, correctChoice: r.correct, valueA: r.valueA, valueB: r.valueB };
            }),
          }
        : null,
    poll: q.format === 'poll' && p?.poll ? { ...p.poll } : null,
    reveal: finished
      ? {
          answer: numeric ? (q.answer ?? null) : null,
          unit: q.unit ?? null,
          correctOption: q.format === 'trivia' ? (q.correctOption ?? null) : null,
          factText: q.fact ?? null,
          priceHistory: q.priceHistory ?? null,
          sourceText: SOURCE_TEXT,
          sourceUrl: null,
          sourceDate: null,
        }
      : null,
  };
}

function getOrCreate(s: MockState, q: ResolvedQuestion): MockPlay {
  return (s.plays[q.day] ??= {
    day: q.day,
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
  if (p.finishedAt) throw new MockError(409, 'already_finished', 'Bu soruyu zaten bitirdin.');
}

function wrongFormat(): MockError {
  return new MockError(400, 'wrong_format', 'Bu işlem bugünkü soru türüne uygun değil.');
}

// --- Yönlendirme ---

type Body = Record<string, unknown> | undefined;

export async function mockApi<T>(method: string, path: string, body?: unknown): Promise<T> {
  const s = await load();
  const b = body as Body;
  // Ağ gecikmesi hissi; yükleniyor durumları da görünsün.
  await new Promise((r) => setTimeout(r, 120));
  const result = route(s, method, path, b);
  await save();
  return result as T;
}

function route(s: MockState, method: string, path: string, b: Body): unknown {
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
  if (method === 'GET' && path === '/q/today') return toPublic(visibleQuestion(today()));
  if (method === 'GET' && (m = path.match(/^\/q\/(\d{4}-\d{2}-\d{2})$/))) return toPublic(visibleQuestion(m[1]));
  if (method === 'GET' && (m = path.match(/^\/q\/(\d{4}-\d{2}-\d{2})\/crowd$/))) {
    const q = visibleQuestion(m[1]);
    const mine = s.plays[q.day];
    if (q.day === today() && !mine?.finishedAt) throw new MockError(403, 'finish_first', 'Sonuçları görmek için önce soruyu bitir.');
    return simulatedCrowd(q, mine);
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

  if ((m = path.match(/^\/plays\/(\d{4}-\d{2}-\d{2})(?:\/(\w+))?$/))) {
    const [, day, action] = m;
    if (method === 'GET' && !action) {
      const q = visibleQuestion(day);
      const p = s.plays[day];
      if (p) {
        settleTrivia(q, p);
        settlePoll(q, p);
      }
      return buildState(q, p);
    }
    return playAction(s, playableQuestion(day), action, b);
  }

  throw new MockError(404, 'not_found', 'Aradığın şey bulunamadı.');
}

function playAction(s: MockState, q: ResolvedQuestion, action: string | undefined, b: Body): PlayState {
  const numeric = q.format === 'price' || q.format === 'number';

  switch (action) {
    case 'start': {
      const p = getOrCreate(s, q);
      if (q.format === 'trivia' && !p.archive) s.streak = R.recordPlay(s.streak, q.day);
      settleTrivia(q, p);
      return buildState(q, p);
    }
    case 'guess': {
      if (!numeric) throw wrongFormat();
      const raw = Number(b?.value);
      const value = Math.round(raw * 100) / 100;
      if (!Number.isFinite(raw) || value <= 0) throw new MockError(400, 'invalid_guess', 'Tahmin 0’dan büyük bir sayı olmalı.');
      const p = getOrCreate(s, q);
      ensureNotFinished(p);
      const fb = R.evaluateGuess(value, q.answer!);
      p.steps.push({ value, direction: fb.direction, close: fb.close });
      const solved = fb.direction === 'correct';
      if (solved || p.steps.length >= R.NUMERIC.maxAttempts) {
        finish(q, p, R.numericScore(p.steps.length, solved, value, q.answer!, p.hintUsed), solved, s);
      }
      return buildState(q, p);
    }
    case 'hint': {
      if (!numeric) throw wrongFormat();
      const p = s.plays[q.day];
      if (!p) throw new MockError(409, 'not_started', 'Önce soruyu aç.');
      ensureNotFinished(p);
      if (p.hintUsed) throw new MockError(409, 'hint_already_used', 'İpucunu zaten kullandın.');
      if (!R.canUseHint(p.steps.length, false, false)) {
        throw new MockError(409, 'hint_unavailable', `İpucu ${R.NUMERIC.hintAfter}. tahminden sonra açılır.`);
      }
      p.hintUsed = true;
      p.hint = R.buildHint(q.answer!, q.id, p.steps.map((x) => ({ value: x.value!, direction: x.direction! })));
      return buildState(q, p);
    }
    case 'answer': {
      if (q.format !== 'trivia') throw wrongFormat();
      const option = Number(b?.option);
      if (!Number.isInteger(option) || option < 0 || option >= (q.options?.length ?? 0)) {
        throw new MockError(400, 'invalid_option', 'Geçersiz şık.');
      }
      const p = s.plays[q.day];
      if (!p) throw new MockError(409, 'not_started', 'Önce soruyu aç.');
      if (settleTrivia(q, p)) return buildState(q, p);
      ensureNotFinished(p);
      const elapsedMs = mockNow() - p.startedAt;
      const correct = option === q.correctOption;
      p.steps.push({ option, correct, elapsedMs });
      p.chosenOption = option;
      finish(q, p, R.triviaScore(correct, elapsedMs), correct, s);
      return buildState(q, p);
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
      return buildState(q, p);
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
      if (p.finishedAt) throw new MockError(409, 'already_voted', 'Bu ankete zaten oy verdin.');
      p.steps.push({ option, value: predicted });
      p.chosenOption = option;
      p.poll = { option, predictedPct: predicted, actualPct: null };
      finish(q, p, null, false, s);
      settlePoll(q, p);
      return buildState(q, p);
    }
  }
  throw new MockError(404, 'not_found', 'Aradığın şey bulunamadı.');
}

function archive(s: MockState): ArchiveItem[] {
  const t = today();
  const items: ArchiveItem[] = [];
  for (let i = 1; i <= ARCHIVE_DAYS; i++) {
    const day = addDays(t, -i);
    if (day < LAUNCH_DAY) break;
    const q = questionFor(day);
    const p = s.plays[day];
    if (p) {
      settlePoll(q, p);
      settleTrivia(q, p);
    }
    items.push({
      day,
      no: q.no,
      format: q.format,
      prompt: q.prompt,
      cancelled: false,
      started: !!p,
      finished: !!p?.finishedAt,
      score: p?.score ?? null,
      playedFromArchive: !!p?.archive,
    });
  }
  return items;
}

function stats(s: MockState): Stats {
  const t = today();
  const rows = Object.values(s.plays)
    .filter((p) => !p.archive)
    .map((p) => {
      const q = questionFor(p.day);
      settlePoll(q, p);
      settleTrivia(q, p);
      return { p, q };
    })
    .filter(({ p }) => p.finishedAt);

  const scored = rows.filter(({ p }) => p.score !== null);
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  const formats = [...new Set(rows.map(({ q }) => q.format))] as QuestionFormat[];

  return {
    currentStreak: R.effectiveStreak(s.streak, t),
    maxStreak: s.streak.max,
    canRepairStreak: R.canRepair(s.streak, t),
    playedToday: s.streak.lastPlayedDay === t,
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

export async function mockReset() {
  state = freshState();
  await save();
}

export async function mockDayOffset(): Promise<number> {
  return (await load()).dayOffset;
}
