/**
 * Sınırsız "Hangisi pahalı?" (saf; testte de kullanılır). Günlük turlardaki şeyler havuza toplanır,
 * her set aynı para birimindeki şeylerden 10 turluk bir zincir kurar (sağdaki sonraki turda sola geçer).
 */
import { parseApprox } from './approx';

export const PRACTICE = {
  /** Bir setteki tur sayısı. */
  rounds: 10,
} as const;

export interface PracticeItem<M> {
  label: string;
  value: string;
  /** Karşılaştırma için sayı ve birim ("~900 TL" → 900, "TL"). */
  n: number;
  unit: string;
  media: M | undefined;
}

export interface SourceRound<M> {
  a: string;
  b: string;
  valueA: string;
  valueB: string;
  mediaA?: M;
  mediaB?: M;
}

export interface ChainRound<M> {
  a: PracticeItem<M>;
  b: PracticeItem<M>;
  /** Pahalı olan taraf: 0 = a, 1 = b. */
  correct: 0 | 1;
}

/** Turlardaki her şeyi bir kez alır; fiyatı okunamayan ya da görseli olmayan şey havuza girmez. */
export function practicePool<M>(rounds: readonly SourceRound<M>[]): PracticeItem<M>[] {
  const byLabel = new Map<string, PracticeItem<M>>();
  for (const r of rounds) {
    for (const [label, value, media] of [
      [r.a, r.valueA, r.mediaA],
      [r.b, r.valueB, r.mediaB],
    ] as const) {
      const parsed = parseApprox(value);
      if (!parsed || media === undefined || byLabel.has(label)) continue;
      byLabel.set(label, { label, value, n: parsed.n, unit: parsed.unit, media });
    }
  }
  return [...byLabel.values()];
}

/**
 * Tek para biriminden `count` turluk zincir. Birim, en az count+1 farklı şeyi olanlar arasından
 * seçilir (yoksa en kalabalığı; şeyler tekrar edebilir). Ardışık iki şeyin fiyatı hiç eşit olmaz.
 */
export function practiceChain<M>(pool: readonly PracticeItem<M>[], random: () => number, count: number = PRACTICE.rounds): ChainRound<M>[] {
  const groups = new Map<string, PracticeItem<M>[]>();
  for (const item of pool) groups.set(item.unit, [...(groups.get(item.unit) ?? []), item]);
  const usable = [...groups.values()].filter((g) => new Set(g.map((x) => x.n)).size >= 2);
  if (!usable.length) return [];
  const roomy = usable.filter((g) => g.length > count);
  const candidates = roomy.length ? roomy : [usable.reduce((a, b) => (b.length > a.length ? b : a))];
  const items = candidates[Math.floor(random() * candidates.length)];

  const unused = shuffle(items, random);
  const take = (prev: PracticeItem<M> | null): PracticeItem<M> => {
    const fresh = unused.findIndex((x) => x.n !== prev?.n && x.label !== prev?.label);
    if (fresh >= 0) return unused.splice(fresh, 1)[0];
    // Havuz bitti: fiyatı farklı herhangi bir şey (tekrar olabilir).
    const others = items.filter((x) => x.n !== prev?.n);
    return others[Math.floor(random() * others.length)];
  };

  const out: ChainRound<M>[] = [];
  let left = take(null);
  for (let i = 0; i < count; i++) {
    const right = take(left);
    out.push({ a: left, b: right, correct: right.n > left.n ? 1 : 0 });
    left = right;
  }
  return out;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
