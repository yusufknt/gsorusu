/**
 * Seri sayfasındaki mod grafikleri için sayılar (saf; testte de kullanılır). Wordle'ın "tahmin dağılımı"
 * gibi: her mod kendi kovalarına ayrılır, en son oyunun kovası vurgulanır.
 */
import { DAILY_MODES, type DailyMode, type ModeStats } from '../api/types';
import { CELEB } from '../lib/celeb';
import { COMPARE_ROUNDS, numericMaxAttempts } from './rules';

export interface PlayRecord {
  mode: DailyMode;
  finishedAt: number;
  /** Anket puanı gün bitene kadar null. */
  score: number | null;
  solved: boolean;
  /** Kaç? ve Hangi ünlü?: tahmin sayısı. */
  attempts: number;
  /** Hangisi pahalı?: doğru tur sayısı. */
  correctRounds: number;
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

/** Yapar mıydın?: tahminin ne kadar isabetli olduğu (puan bantları, iyiden kötüye). */
const POLL_BANDS = [
  { label: 'Tam isabet', min: 90 },
  { label: 'Çok yakın', min: 70 },
  { label: 'Yakın', min: 40 },
  { label: 'Uzak', min: 0 },
] as const;

export const MODE_BUCKETS: Record<DailyMode, readonly string[]> = {
  pahali: range(0, COMPARE_ROUNDS),
  kac: [...range(1, numericMaxAttempts(true)), 'X'],
  yapar: POLL_BANDS.map((b) => b.label),
  unlu: [...range(1, CELEB.maxGuesses), 'X'],
};

/** Oyunun kovası; kovaya girmeyen (puanı bekleyen anket) null. */
export function bucketOf(p: PlayRecord): number | null {
  const buckets = MODE_BUCKETS[p.mode];
  switch (p.mode) {
    case 'pahali':
      return Math.min(COMPARE_ROUNDS, Math.max(0, p.correctRounds));
    case 'yapar':
      return p.score === null ? null : POLL_BANDS.findIndex((b) => p.score! >= b.min);
    case 'kac':
    case 'unlu':
      return p.solved ? Math.min(buckets.length - 2, Math.max(0, p.attempts - 1)) : buckets.length - 1;
  }
}

export function modeStats(plays: readonly PlayRecord[]): ModeStats[] {
  return DAILY_MODES.map((mode) => {
    const mine = plays.filter((p) => p.mode === mode);
    const counts = MODE_BUCKETS[mode].map(() => 0);
    for (const p of mine) {
      const b = bucketOf(p);
      if (b !== null) counts[b] += 1;
    }
    const last = [...mine].sort((a, b) => b.finishedAt - a.finishedAt).find((p) => bucketOf(p) !== null);
    const scores = mine.map((p) => p.score).filter((s): s is number => s !== null);
    return {
      mode,
      played: mine.length,
      solved: mine.filter((p) => p.solved).length,
      pending: mine.filter((p) => p.score === null).length,
      avgScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
      distribution: MODE_BUCKETS[mode].map((label, i) => ({ label, count: counts[i] })),
      lastBucket: last ? bucketOf(last) : null,
    };
  });
}
