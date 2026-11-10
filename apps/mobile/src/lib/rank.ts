/** "Bugün oyuncuların yüzde kaçından iyisin?" (saf; testte de kullanılır). */

/**
 * Puanın (0–100) dağılımdaki yeri. Histogram eşit genişlikte kovalar (10 kova: 0–9, 10–19 … 90–100).
 * Senden düşük kovadakilerin tamamı ve seninle aynı kovadakilerin yarısı "senden geride" sayılır.
 * Sonuç 1–99 arasına sıkıştırılır: "%100'ünden iyisin" ya da "%0" tek kişilik örnekte bile yanıltır.
 */
export function percentileOf(histogram: readonly number[], score: number): number | null {
  const total = histogram.reduce((a, b) => a + b, 0);
  if (!histogram.length || total <= 0 || !Number.isFinite(score)) return null;
  const width = 100 / histogram.length;
  const bucket = Math.min(histogram.length - 1, Math.max(0, Math.floor(score / width)));
  const below = histogram.slice(0, bucket).reduce((a, b) => a + b, 0);
  const pct = ((below + histogram[bucket] / 2) / total) * 100;
  return Math.min(99, Math.max(1, Math.round(pct)));
}

/** Hazır olan mod yüzdeliklerinin ortalaması; hiçbiri hazır değilse null. */
export function overallPercentile(values: readonly (number | null)[]): number | null {
  const ready = values.filter((v): v is number => v !== null);
  return ready.length ? Math.round(ready.reduce((a, b) => a + b, 0) / ready.length) : null;
}
