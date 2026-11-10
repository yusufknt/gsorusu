/**
 * Premium abonelik (saf; testte de kullanılır). Aylık 20 TL: sınırsız "Hangisi pahalı?" ve reklamsız oyun
 * (ödüllü reklamın verdiği şeyler video izlemeden gelir, geçiş reklamı çıkmaz). İptal edilen abonelik
 * dönem sonuna kadar sürer; mağazadaki gibi.
 */

export const PREMIUM = {
  price: '20 TL',
  periodLabel: 'ay',
  periodDays: 30,
  perks: ['Sınırsız Hangisi pahalı?', 'Reklamsız oyun: ipucu, ek tahmin ve seri kurtarma video izlemeden'],
} as const;

const DAY_MS = 86_400_000;
const PERIOD_MS = PREMIUM.periodDays * DAY_MS;

export interface Subscription {
  /** Dönemin bittiği ve yenileneceği an (ms). */
  renewsAt: number;
  autoRenew: boolean;
}

export function subscribe(now: number): Subscription {
  return { renewsAt: now + PERIOD_MS, autoRenew: true };
}

export function cancel(sub: Subscription): Subscription {
  return { ...sub, autoRenew: false };
}

/**
 * Şu anki hâli: dönem sürüyorsa aynen; dönem bittiyse yenileniyorsa geçen dönem sayısı kadar ileri alınır,
 * yenilenmiyorsa abonelik biter (null).
 */
export function settle(sub: Subscription | null, now: number): Subscription | null {
  if (!sub) return null;
  if (now < sub.renewsAt) return sub;
  if (!sub.autoRenew) return null;
  const periods = Math.floor((now - sub.renewsAt) / PERIOD_MS) + 1;
  return { ...sub, renewsAt: sub.renewsAt + periods * PERIOD_MS };
}
