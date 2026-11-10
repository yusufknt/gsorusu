/**
 * Oyun kuralları — sunucudaki GununSorusu.Domain'in birebir TypeScript karşılığı.
 * Yalnızca uygulama içi test sunucusu (mock) için; gerçek modda puanı sunucu hesaplar.
 * Kural değişirse iki taraf birlikte güncellenmeli (services/gunun-api/src/GununSorusu.Domain).
 */
import type { GuessDirection } from '../api/types';

export const NUMERIC = { tolerancePct: 5, closePct: 10, maxAttempts: 6, hintAfter: 3 } as const;
export const TRIVIA = { limitMs: 30_000, graceMs: 1_000, base: 60, maxBonus: 40 } as const;
export const COMPARE_ROUNDS = 5;
export const COMPARE_SOLVED_ROUNDS = 3;
export const POLL_SOLVED_SCORE = 80;
export const REPAIR_COOLDOWN_DAYS = 7;

const round = (n: number) => Math.round(n); // pozitif sayılarda "sıfırdan uzağa" ile aynı
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function errorPct(guess: number, answer: number): number {
  return (Math.abs(guess - answer) / answer) * 100;
}

export function evaluateGuess(guess: number, answer: number, tolerancePct: number = NUMERIC.tolerancePct) {
  const e = errorPct(guess, answer);
  if (e <= tolerancePct) return { direction: 'correct' as GuessDirection, close: true };
  return { direction: (answer > guess ? 'higher' : 'lower') as GuessDirection, close: e <= NUMERIC.closePct };
}

/** 1. hakta 100, sonraki her hakta −15; bulunamazsa son tahminin yakınlığına göre 0–20; ipucu −10. */
export function numericScore(attempts: number, solved: boolean, lastGuess: number, answer: number, hintUsed: boolean): number {
  let score: number;
  if (solved) {
    score = 100 - 15 * (attempts - 1);
  } else {
    const e = errorPct(lastGuess, answer);
    score = e <= NUMERIC.closePct ? 20 : e >= 50 ? 0 : round((20 * (50 - e)) / (50 - NUMERIC.closePct));
  }
  if (hintUsed) score -= 10;
  return clamp(score, 0, 100);
}

export function canUseHint(attempts: number, finished: boolean, hintUsed: boolean): boolean {
  return !finished && !hintUsed && attempts >= NUMERIC.hintAfter && attempts < NUMERIC.maxAttempts;
}

// --- Ödüllü reklamla açılan haklar (v1.1, sunucuya henüz eklenmedi; bkz. docs/kararlar.md #51) ---

/** Hak bittiğinde ödüllü reklamla alınabilen ek tahmin sayısı (soru başına). */
export const EXTRA_GUESSES = 1;

/** Arşivden günde ücretsiz açılabilen soru sayısı; sonrakiler ödüllü reklamla açılır. */
export const ARCHIVE_FREE_PER_DAY = 1;

export function numericMaxAttempts(extraUsed: boolean): number {
  return NUMERIC.maxAttempts + (extraUsed ? EXTRA_GUESSES : 0);
}

/**
 * 6 hak bitti, bilinemedi ve ek tahmin henüz alınmadı: cevap açılmadan önce oyuncuya
 * "video izle, 1 tahmin daha" ya da "cevabı göster" seçeneği sunulur.
 */
export function awaitingExtraGuess(attempts: number, solved: boolean, finished: boolean, extraUsed: boolean): boolean {
  return !finished && !solved && !extraUsed && attempts >= NUMERIC.maxAttempts;
}

export type ArchiveAccess = 'open' | 'free' | 'locked';

/**
 * Arşivdeki bir günün oynanabilirliği. `open`: zaten başlanmış ya da reklamla açılmış;
 * `free`: ilk işlemde günün ücretsiz hakkı kullanılır; `locked`: ödüllü reklam gerekir.
 */
export function archiveAccess(started: boolean, unlocked: boolean, freeUsedToday: number): ArchiveAccess {
  if (started || unlocked) return 'open';
  return freeUsedToday < ARCHIVE_FREE_PER_DAY ? 'free' : 'locked';
}

/** Aynı soru için herkese aynı aralık (seed = soru id); cevap aralığın %20–80'inde. */
export function buildHint(answer: number, seed: number, guesses: { value: number; direction: GuessDirection }[]) {
  const position = 0.2 + mulberry32(seed)() * 0.6;
  const width = (answer * 20) / 100;
  let min = answer - width * position;
  let max = min + width;
  for (const g of guesses) {
    if (g.direction === 'higher' && g.value > min) min = g.value;
    if (g.direction === 'lower' && g.value < max) max = g.value;
  }
  const step = niceStep(answer);
  return { min: Math.max(0, Math.floor(min / step) * step), max: Math.ceil(max / step) * step };
}

export function niceStep(answer: number): number {
  const tenthOfWidth = (answer * 20) / 100 / 10;
  const exponent = Math.max(Math.floor(Math.log10(tenthOfWidth) + 1e-9), -2);
  return Number((10 ** exponent).toFixed(2));
}

/** Doğru cevap 60 + hız bonusu (en fazla 40); 1 sn ağ payı; süre aşılırsa 0. */
export function triviaScore(correct: boolean, elapsedMs: number): number {
  if (!correct || triviaTimedOut(elapsedMs)) return 0;
  const effective = Math.max(0, elapsedMs - TRIVIA.graceMs);
  return TRIVIA.base + round(TRIVIA.maxBonus * clamp(1 - effective / TRIVIA.limitMs, 0, 1));
}

export function triviaTimedOut(elapsedMs: number): boolean {
  return elapsedMs > TRIVIA.limitMs + TRIVIA.graceMs;
}

export function compareScore(results: boolean[]): number {
  return results.filter(Boolean).length * (100 / COMPARE_ROUNDS);
}

/** 100 − 2 × |tahmin − gerçek|, 0–100. */
export function pollScore(predictedPct: number, actualPct: number): number {
  return clamp(round(100 - 2 * Math.abs(predictedPct - actualPct)), 0, 100);
}

export function pollPercentages(votes: number[]): number[] {
  const total = votes.reduce((a, b) => a + b, 0);
  return votes.map((v) => (total === 0 ? 0 : Math.round(((v * 100) / total) * 10) / 10));
}

// --- Seri ---

export interface StreakState {
  current: number;
  max: number;
  lastPlayedDay: string | null;
  lastRepairDay: string | null;
}

export const EMPTY_STREAK: StreakState = { current: 0, max: 0, lastPlayedDay: null, lastRepairDay: null };

type Excused = (day: string) => boolean;

export function dayNumber(day: string): number {
  return Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
}

function fromDayNumber(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10);
}

function missedDays(from: string, to: string, isExcused?: Excused): number {
  let missed = 0;
  for (let d = dayNumber(from) + 1; d < dayNumber(to); d++) if (!isExcused?.(fromDayNumber(d))) missed++;
  return missed;
}

export function recordPlay(s: StreakState, day: string, isExcused?: Excused): StreakState {
  if (s.lastPlayedDay && day <= s.lastPlayedDay) return s;
  const current = s.lastPlayedDay && missedDays(s.lastPlayedDay, day, isExcused) === 0 ? s.current + 1 : 1;
  return { ...s, current, max: Math.max(s.max, current), lastPlayedDay: day };
}

export function effectiveStreak(s: StreakState, today: string, isExcused?: Excused): number {
  if (!s.lastPlayedDay) return 0;
  if (s.lastPlayedDay >= today) return s.current;
  return missedDays(s.lastPlayedDay, today, isExcused) === 0 ? s.current : 0;
}

export function canRepair(s: StreakState, today: string, isExcused?: Excused): boolean {
  if (s.current <= 0 || !s.lastPlayedDay || s.lastPlayedDay >= today) return false;
  if (missedDays(s.lastPlayedDay, today, isExcused) !== 1) return false;
  return !s.lastRepairDay || dayNumber(today) - dayNumber(s.lastRepairDay) >= REPAIR_COOLDOWN_DAYS;
}

export function repair(s: StreakState, today: string): StreakState {
  return { ...s, lastPlayedDay: fromDayNumber(dayNumber(today) - 1), lastRepairDay: today };
}

// --- Seri yapbozu (docs/kararlar.md #61, #74) ---
// Günün bütün modları bitince seri bir artar ve yapboza bir parça eklenir. Gün kaçırılınca seri sıfırlanır,
// parçalar da dağılır (seri kurtarma haftada 1 kez bunu önler). 15. parçada yapboz tamamlanır ve resim
// koleksiyona girer; ertesi gün yeni resimle yeni yapboz başlar.

export const PUZZLE_SIZE = 15;

/** Yapbozdaki parça sayısı: seri 15'in katındayken yapboz dolu görünür. */
export function puzzlePieces(streak: number): number {
  return streak <= 0 ? 0 : ((streak - 1) % PUZZLE_SIZE) + 1;
}

/** Bu seri değerine ulaşan gün bir yapbozu tamamlar mı? */
export function completesPuzzle(streak: number): boolean {
  return streak > 0 && streak % PUZZLE_SIZE === 0;
}

// --- Yardımcılar ---

/** Küçük, deterministik rastgele sayı üreteci (aynı seed → aynı dizi). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
