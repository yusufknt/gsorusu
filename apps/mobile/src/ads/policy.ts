/**
 * Geçiş reklamı sıklık kuralları (saf fonksiyonlar; policy.test.ts).
 * Sayaçlar cihazda tutulur; gün İstanbul gününe göre döner.
 */
import { AD_RULES, type InterstitialPlacement } from './config';

export interface AdLedger {
  /** Uygulamanın bu cihazda ilk açıldığı gün (YYYY-MM-DD). */
  installDay: string;
  /** Sayaçların ait olduğu gün. */
  day: string;
  /** Bugün gösterilen geçiş reklamları. */
  shown: { placement: InterstitialPlacement; at: number }[];
  /** Son geçiş reklamından bu yana sekme değişimi. */
  tabSwitches: number;
  lastShownAt: number | null;
}

export type BlockReason = 'grace_period' | 'daily_cap' | 'placement_cap' | 'too_soon' | 'not_enough_switches';
export type Decision = { ok: true } | { ok: false; reason: BlockReason };

const DAY_MS = 86_400_000;

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function freshLedger(today: string): AdLedger {
  return { installDay: today, day: today, shown: [], tabSwitches: 0, lastShownAt: null };
}

/** Gün değiştiyse günlük sayaçlar sıfırlanır (son gösterim zamanı korunur). */
export function rollover(l: AdLedger, today: string): AdLedger {
  return l.day === today ? l : { ...l, day: today, shown: [], tabSwitches: 0 };
}

/** Kurulumun kaçıncı günü (ilk gün = 1). */
export function installDayNo(l: AdLedger, today: string): number {
  return daysBetween(l.installDay, today) + 1;
}

export function interstitialDecision(ledger: AdLedger, placement: InterstitialPlacement, now: number, today: string): Decision {
  const l = rollover(ledger, today);
  if (daysBetween(l.installDay, today) < AD_RULES.graceDays) return { ok: false, reason: 'grace_period' };
  if (l.shown.length >= AD_RULES.interstitialDailyCap) return { ok: false, reason: 'daily_cap' };
  if (l.shown.filter((s) => s.placement === placement).length >= AD_RULES.perPlacementDaily[placement]) {
    return { ok: false, reason: 'placement_cap' };
  }
  if (l.lastShownAt !== null && now - l.lastShownAt < AD_RULES.minGapMs) return { ok: false, reason: 'too_soon' };
  if (placement === 'tab_switch' && l.tabSwitches < AD_RULES.tabSwitchEvery) return { ok: false, reason: 'not_enough_switches' };
  return { ok: true };
}

export function recordInterstitial(ledger: AdLedger, placement: InterstitialPlacement, now: number, today: string): AdLedger {
  const l = rollover(ledger, today);
  return { ...l, shown: [...l.shown, { placement, at: now }], tabSwitches: 0, lastShownAt: now };
}

export function recordTabSwitch(ledger: AdLedger, today: string): AdLedger {
  const l = rollover(ledger, today);
  return { ...l, tabSwitches: l.tabSwitches + 1 };
}
