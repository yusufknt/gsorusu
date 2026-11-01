/**
 * Paylaşım kartı metni (plan A6): sonucu gösterir, cevabı asla göstermez.
 *
 *   Günün Sorusu ? #31
 *   Fiyatı Ne? · 4/6 · 55 puan
 *   🟧🟦🟥🟩
 *   Seri: 17 gün
 *   gununsorusu.app/31
 *
 * Turuncu: daha pahalı/fazla · Mavi: daha ucuz/az · Kırmızı: çok yakın · Yeşil: bulundu.
 */
import type { PlayState } from '../api/types';
import { FORMAT_LABEL, formatTrNumber } from './format';

export const SHARE_HOST = 'gununsorusu.app';

const SQUARE = { higher: '🟧', lower: '🟦', close: '🟥', correct: '🟩', miss: '⬛' } as const;

/** Kartın parçaları: özet ("4/6 · 55 puan") ve varsa renkli kare dizisi. Görsel kart da bunu kullanır. */
export function shareParts(play: PlayState): { summary: string; squares: string | null } {
  const score = play.scorePending || play.score === null ? 'puan yarın' : `${play.score} puan`;

  switch (play.format) {
    case 'price':
    case 'number': {
      const n = play.numeric!;
      const attempts = n.guesses.some((g) => g.direction === 'correct') ? `${n.attemptsUsed}/${n.maxAttempts}` : `X/${n.maxAttempts}`;
      const squares = n.guesses
        .map((g) => (g.direction === 'correct' ? SQUARE.correct : g.close ? SQUARE.close : SQUARE[g.direction]))
        .join('');
      return { summary: `${attempts} · ${score}`, squares: n.hintUsed ? `${squares} 💡` : squares };
    }
    case 'trivia': {
      const t = play.trivia;
      const mark = t?.timedOut ? '⏱️ süre doldu' : play.solved ? `✅ ${seconds(t?.elapsedMs)}` : '❌';
      return { summary: `${mark} · ${score}`, squares: null };
    }
    case 'compare': {
      const answered = play.compare?.answered ?? [];
      const correct = answered.filter((r) => r.correct).length;
      return {
        summary: `${correct}/${play.compare?.rounds ?? 5} · ${score}`,
        squares: answered.map((r) => (r.correct ? SQUARE.correct : SQUARE.miss)).join(''),
      };
    }
    case 'poll':
      return { summary: score, squares: null };
  }
}

export function shareText(play: PlayState, streak: number): string {
  const { summary, squares } = shareParts(play);
  const lines = [`Günün Sorusu ? #${play.no}${play.archive ? ' (arşiv)' : ''}`, `${FORMAT_LABEL[play.format]} · ${summary}`];
  if (squares) lines.push(squares);
  if (!play.archive && streak > 0) lines.push(`Seri: ${streak} gün`);
  lines.push(`${SHARE_HOST}/${play.no}`);
  return lines.join('\n');
}

function seconds(ms: number | null | undefined): string {
  return ms == null ? '' : `${formatTrNumber(ms / 1000, 1)} sn`;
}
