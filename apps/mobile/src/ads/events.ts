/**
 * Reklam olayları (plan A11: ad_shown, ad_rewarded, ad_skipped; yerleşim adıyla).
 * Şimdilik cihazda son 30 olay tutulur ve Profil > Test araçları'nda görünür.
 * Analitik bağlanınca (yayın aşaması) buradan gönderilecek.
 */
import type { AdPlacement } from './config';
import type { BlockReason } from './policy';

export type AdEventType = 'ad_shown' | 'ad_rewarded' | 'ad_skipped' | 'ad_failed' | 'ad_blocked';

export interface AdEvent {
  type: AdEventType;
  placement: AdPlacement;
  at: number;
  reason?: BlockReason | 'busy' | 'not_ready' | 'game_in_progress';
}

const MAX = 30;
/** Her olayda yeni dizi: useSyncExternalStore anlık görüntüsü olarak doğrudan kullanılabilir. */
let log: readonly AdEvent[] = [];
const listeners = new Set<() => void>();

export function logAdEvent(e: AdEvent) {
  log = [e, ...log].slice(0, MAX);
  if (__DEV__) console.log(`[reklam] ${e.type} ${e.placement}${e.reason ? ` (${e.reason})` : ''}`);
  listeners.forEach((l) => l());
}

export function recentAdEvents(): readonly AdEvent[] {
  return log;
}

export function subscribeAdEvents(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
