/** "~1.100 TL" gibi yaklaşık değerleri sayarak göstermek için (saf; testte de kullanılır). */

export interface Approx {
  prefix: string;
  n: number;
  decimals: number;
  unit: string;
}

/** "~1.100 TL" → { prefix: "~", n: 1100, decimals: 0, unit: "TL" }; "~0,40 €" → n 0.4, 2 basamak. Okunamazsa null. */
export function parseApprox(value: string): Approx | null {
  const m = value.trim().match(/^(~?)\s*([\d.]+(?:,(\d+))?)\s*(.*)$/);
  if (!m) return null;
  const n = Number(m[2].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? { prefix: m[1], n, decimals: m[3]?.length ?? 0, unit: m[4] } : null;
}

/** Değerin `t` (0–1) kadarı, aynı biçimde: formatApprox(parse("~1.100 TL"), 0.5) → "~550 TL". */
export function formatApprox(a: Approx, t = 1): string {
  const n = a.n * Math.min(1, Math.max(0, t));
  // Intl'e güvenmeden (Hermes): binlik nokta, ondalık virgül, ondalık basamak sayısı korunur.
  const [int, frac] = n.toFixed(a.decimals).split('.');
  const text = `${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${frac ? `,${frac}` : ''}`;
  return `${a.prefix}${text}${a.unit ? ` ${a.unit}` : ''}`;
}
