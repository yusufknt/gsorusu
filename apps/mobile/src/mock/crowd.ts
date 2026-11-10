/** Simüle "Türkiye ne dedi?": soru kimliğinden sabit tohumla üretilen oyuncu dağılımı (test sunucusu). */
import type { Crowd } from '../api/types';
import type { MockQuestion } from './questions';
import * as R from './rules';

export type CrowdQuestion = MockQuestion & { id: number; day: string };

export function simulatedCrowd(q: CrowdQuestion, mineFinished: boolean, today: string, now: number): Crowd {
  const rnd = R.mulberry32(q.id * 7919);
  const plays = 2000 + Math.floor(rnd() * 7000) + (mineFinished ? 1 : 0);
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
    final: q.day < today,
    updatedAt: new Date(now).toISOString(),
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
