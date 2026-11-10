/**
 * Test sunucusunda premium abonelik ve sınırsız "Hangisi pahalı?" (premium özelliği). Satın alma şimdilik
 * mağazasız bir test satın almasıdır; gerçek ödeme App Store / Google Play aboneliğiyle (development build)
 * gelecek ve sunucu makbuzu doğrulayacak (docs/kararlar.md #84, #88).
 */
import type { PracticeState, PremiumState } from '../api/types';
import { PRACTICE, practiceChain, practicePool } from '../lib/practice';
import { cancel, PREMIUM, settle, subscribe, type Subscription } from '../lib/premium';
import { MODE_BANK } from './dailyBank';
import { mediaOf } from './media';
import * as R from './rules';

export interface MockPractice {
  /** Sayaçların ait olduğu gün; gün değişince bugünkü set sayısı sıfırlanır. */
  day: string;
  sets: number;
  best: number;
  total: number;
  current: { no: number; finished: boolean; correct: number | null } | null;
}

export const freshPractice = (): MockPractice => ({ day: '', sets: 0, best: 0, total: 0, current: null });

export interface PremiumContext {
  practice: MockPractice;
  subscription: Subscription | null;
  setSubscription: (sub: Subscription | null) => void;
  today: string;
  now: number;
  /** Bugünün "Hangisi pahalı?" oyunu bitti mi (sınırsız mod günün fiyatlarını ele vermesin diye sonra açılır). */
  pahaliFinishedToday: boolean;
  fail: (status: number, code: string, message: string) => Error;
}

export const NOT_HANDLED = Symbol('not_handled');
type Body = Record<string, unknown> | undefined;

const POOL = practicePool(MODE_BANK.pahali.flatMap((q) => q.rounds ?? []));

/** /me/premium… ve /practice… isteklerini karşılar; bu adres değilse NOT_HANDLED. */
export function premiumRoute(ctx: PremiumContext, method: string, path: string, b: Body): unknown {
  // Dönemi biten abonelik her istekte kesinleşir (yenilenir ya da biter).
  const sub = settle(ctx.subscription, ctx.now);
  if (sub !== ctx.subscription) ctx.setSubscription(sub);

  if (method === 'GET' && path === '/me/premium') return premiumState(sub);
  if (method === 'POST' && path === '/me/premium/purchase') {
    // Test satın alması: gerçek sürümde mağaza makbuzu doğrulanır.
    const next = sub ? { ...sub, autoRenew: true } : subscribe(ctx.now);
    ctx.setSubscription(next);
    return premiumState(next);
  }
  if (method === 'POST' && path === '/me/premium/cancel') {
    if (!sub) throw ctx.fail(409, 'not_subscribed', 'Aktif bir premium aboneliğin yok.');
    const next = cancel(sub);
    ctx.setSubscription(next);
    return premiumState(next);
  }
  if (path.startsWith('/practice/pahali')) return practiceRoute(ctx, !!sub, method, path, b);
  return NOT_HANDLED;
}

function premiumState(sub: Subscription | null): PremiumState {
  return {
    active: !!sub,
    renewsAt: sub ? new Date(sub.renewsAt).toISOString() : null,
    autoRenew: !!sub?.autoRenew,
    price: PREMIUM.price,
  };
}

// --- Sınırsız mod ---

function practiceRoute(ctx: PremiumContext, premium: boolean, method: string, path: string, b: Body): PracticeState {
  const p = ctx.practice;
  if (p.day !== ctx.today) Object.assign(p, { day: ctx.today, sets: 0, current: null });

  if (method === 'GET' && path === '/practice/pahali') return practiceState(ctx, premium);
  if (!premium) throw ctx.fail(403, 'premium_required', 'Sınırsız Hangisi pahalı? premium özelliği.');

  if (method === 'POST' && path === '/practice/pahali/sets') {
    if (!ctx.pahaliFinishedToday) throw ctx.fail(403, 'practice_locked', 'Sınırsız mod, günün Hangisi pahalı? oyunu bitince açılır.');
    if (p.current && !p.current.finished) throw ctx.fail(409, 'set_in_progress', 'Önce açık seti bitir.');
    p.sets += 1;
    p.current = { no: p.sets, finished: false, correct: null };
    return practiceState(ctx, premium);
  }
  if (method === 'POST' && path === '/practice/pahali/finish') {
    const correct = Number(b?.correct);
    if (!p.current || p.current.finished) throw ctx.fail(409, 'no_open_set', 'Açık bir set yok.');
    if (!Number.isInteger(correct) || correct < 0 || correct > PRACTICE.rounds) throw ctx.fail(400, 'invalid_correct', 'Geçersiz sonuç.');
    p.current = { ...p.current, finished: true, correct };
    p.best = Math.max(p.best, correct);
    p.total += correct;
    return practiceState(ctx, premium);
  }
  throw ctx.fail(404, 'not_found', 'Aradığın şey bulunamadı.');
}

function practiceState(ctx: PremiumContext, premium: boolean): PracticeState {
  const p = ctx.practice;
  return {
    premium,
    unlocked: ctx.pahaliFinishedToday,
    setsToday: p.sets,
    best: p.best,
    totalCorrect: p.total,
    // Premium bittiyse açık set gösterilmez (turlar premium içeriği).
    set: premium && p.current ? { ...p.current, rounds: practiceRounds(ctx.today, p.current.no) } : null,
  };
}

/** Gün ve set numarasından sabit tohum: aynı set yeniden açılınca aynı turlar gelir. */
function practiceRounds(day: string, no: number) {
  return practiceChain(POOL, R.mulberry32(R.dayNumber(day) * 1000 + no)).map((r) => ({
    prompt: 'Hangisi daha pahalı?',
    optionA: r.a.label,
    optionB: r.b.label,
    mediaA: mediaOf(r.a.media),
    mediaB: mediaOf(r.b.media),
    correct: r.correct,
    valueA: r.a.value,
    valueB: r.b.value,
  }));
}
