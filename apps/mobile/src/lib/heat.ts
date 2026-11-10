/**
 * Kaç? termometresi (saf; testte de kullanılır). Cevap istemcide bilinmez; yalnız tahminlerin yönünden
 * (daha fazla / daha az) ve "çok yakın" işaretinden cevabın bulunduğu aralık ve ne kadar "sıcak" olduğun çıkarılır.
 */
import type { Guess } from '../api/types';

export type Heat = 'none' | 'cold' | 'warm' | 'hot' | 'burning' | 'found';

/** Termometre dolumu (0–1) ve Soro'nun sözü. */
export const HEAT: Record<Heat, { level: number; say: string }> = {
  none: { level: 0, say: 'İlk tahminini yap, ısınalım!' },
  cold: { level: 0.2, say: 'Brr, buz gibi! Çok uzaktasın.' },
  warm: { level: 0.45, say: 'Ilık… yaklaşıyorsun.' },
  hot: { level: 0.7, say: 'Sıcak! Biraz daha.' },
  burning: { level: 0.9, say: 'Yanıyorsun! Çok yakın!' },
  found: { level: 1, say: 'Buldun!' },
};

/** Aralık en fazla bu kat genişse "sıcak", bundan genişse ama WARM_RATIO'dan darsa "ılık". */
const HOT_RATIO = 1.5;
const WARM_RATIO = 3;

/** Cevabın kesin olarak üstünde olduğu en büyük tahmin (low) ve altında olduğu en küçük tahmin (high). */
export function bounds(guesses: readonly Guess[]): { low: number | null; high: number | null } {
  let low: number | null = null;
  let high: number | null = null;
  for (const g of guesses) {
    if (g.direction === 'higher') low = low === null ? g.value : Math.max(low, g.value);
    if (g.direction === 'lower') high = high === null ? g.value : Math.min(high, g.value);
  }
  return { low, high };
}

/**
 * Isı: bulunduysa "found", son tahmin "çok yakın"sa "burning"; değilse iki yönden sıkıştırılmış aralığın
 * darlığına göre (üst/alt oranı). Tek yönden sınır varsa henüz soğuk.
 */
export function heatOf(guesses: readonly Guess[]): Heat {
  const last = guesses[guesses.length - 1];
  if (!last) return 'none';
  if (last.direction === 'correct') return 'found';
  if (last.close) return 'burning';
  const { low, high } = bounds(guesses);
  if (low === null || high === null || low <= 0) return 'cold';
  const ratio = high / low;
  return ratio <= HOT_RATIO ? 'hot' : ratio <= WARM_RATIO ? 'warm' : 'cold';
}
