/** Türkçe ad araması (saf; testte de kullanılır). */

/** Büyük/küçük harf, şapka ve Türkçe harf farkını siler: "Âşık Veysel" → "asik veysel". */
export function foldName(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/[âà]/g, 'a')
    .replace(/[îı]/g, 'i')
    .replace(/û/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/\s+/g, ' ');
}

/** Sorguyla eşleşen adlar: önce bir kelimesi sorguyla başlayanlar, sonra içinde geçenler. */
export function searchNames(names: readonly string[], query: string, exclude: readonly string[] = [], limit = 6): string[] {
  const q = foldName(query);
  if (!q) return [];
  const pool = names.filter((n) => !exclude.includes(n));
  const folded = pool.map((n) => [n, foldName(n)] as const);
  const starts = folded.filter(([, f]) => f.startsWith(q) || f.split(' ').some((w) => w.startsWith(q))).map(([n]) => n);
  const contains = folded.filter(([n, f]) => !starts.includes(n) && f.includes(q)).map(([n]) => n);
  return [...starts, ...contains].slice(0, limit);
}
