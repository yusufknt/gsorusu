import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { serverNow } from '@/api/client';
import { keys } from '@/api/hooks';
import type { PlayState, PublicQuestion } from '@/api/types';
import { useToast } from '@/components/ui';
import { addDays, istanbulDay } from '@/lib/format';

import type { InterstitialPlacement, RewardedPlacement } from './config';
import { logAdEvent } from './events';
import { MockAdOverlay, type MockAdOutcome, type MockAdRequest } from './MockAdOverlay';
import { freshLedger, interstitialDecision, recordInterstitial, recordTabSwitch, rollover, type AdLedger } from './policy';

const KEY = 'gunun.ads.v1';

interface AdsCtx {
  /**
   * Ödüllü reklam. Yalnızca oyuncu bir düğmeye bastığında çağrılır; sonuna kadar izlenirse true.
   * Ödül (ipucu, ek tahmin…) ancak true dönünce verilir.
   */
  showRewarded: (placement: RewardedPlacement) => Promise<boolean>;
  /** Geçiş reklamı: sıklık kuralları izin verirse gösterir. Gösterildiyse true. */
  maybeShowInterstitial: (placement: InterstitialPlacement) => Promise<boolean>;
  /** Sekme değişimini sayar (genel sekme geçişi reklamı için). */
  noteTabSwitch: () => void;
  /** Profil > Test araçları için. */
  ledger: AdLedger | null;
  dev: {
    /** Kurulum gününü geriye alıp ilk 2 günlük reklamsız dönemi atlar. */
    skipGracePeriod: () => void;
    reset: () => void;
  };
}

const AdsContext = createContext<AdsCtx | null>(null);

const today = () => istanbulDay(serverNow());

/** Bugünün sorusu bitti mi? Bitmeden (ya da yüklenmeden) hiçbir geçiş reklamı gösterilmez (plan A11, kural 1). */
function todayDone(qc: QueryClient): boolean {
  const q = qc.getQueryData<PublicQuestion>(keys.question('today'));
  if (!q) return false;
  if (q.cancelled) return true;
  return !!qc.getQueryData<PlayState>(keys.play(q.day))?.finished;
}

/**
 * Reklamların tek giriş noktası. Ekranlar AdMob'u değil bu bağlamı kullanır; development
 * build'e geçince yalnızca `present` içindeki test reklamı ekranı AdMob çağrısıyla değişir.
 */
export function AdsProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [ledger, setLedger] = useState<AdLedger | null>(null);
  const ledgerRef = useRef<AdLedger | null>(null);
  const [request, setRequest] = useState<MockAdRequest | null>(null);
  const pending = useRef<((o: MockAdOutcome) => void) | null>(null);

  const commit = useCallback((next: AdLedger) => {
    ledgerRef.current = next;
    setLedger(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => (raw ? (JSON.parse(raw) as AdLedger) : null))
      .catch(() => null)
      .then((stored) => {
        if (!alive) return;
        // İlk açılış: kurulum günü bugündür (ilk 2 gün geçiş reklamı yok).
        commit(stored ? rollover(stored, today()) : freshLedger(today()));
      });
    return () => {
      alive = false;
    };
  }, [commit]);

  /** Aynı anda tek reklam. Kullanıcı kapatınca sonuç döner. */
  const present = useCallback((req: MockAdRequest) => {
    if (pending.current) return Promise.resolve<MockAdOutcome | null>(null);
    return new Promise<MockAdOutcome | null>((resolve) => {
      pending.current = resolve;
      setRequest(req);
    });
  }, []);

  const onDone = useCallback((o: MockAdOutcome) => {
    const resolve = pending.current;
    pending.current = null;
    setRequest(null);
    resolve?.(o);
  }, []);

  const showRewarded = useCallback(
    async (placement: RewardedPlacement) => {
      const at = serverNow();
      const outcome = await present({ kind: 'rewarded', placement });
      if (outcome === null) {
        logAdEvent({ type: 'ad_blocked', placement, at, reason: 'busy' });
        return false;
      }
      logAdEvent({ type: 'ad_shown', placement, at });
      if (outcome === 'rewarded') {
        logAdEvent({ type: 'ad_rewarded', placement, at: serverNow() });
        return true;
      }
      logAdEvent({ type: 'ad_skipped', placement, at: serverNow() });
      toast('Ödül için videoyu sonuna kadar izlemelisin');
      return false;
    },
    [present, toast],
  );

  const maybeShowInterstitial = useCallback(
    async (placement: InterstitialPlacement) => {
      const l = ledgerRef.current;
      const now = serverNow();
      const t = today();
      if (!l) {
        logAdEvent({ type: 'ad_blocked', placement, at: now, reason: 'not_ready' });
        return false;
      }
      if (!todayDone(qc)) {
        logAdEvent({ type: 'ad_blocked', placement, at: now, reason: 'game_in_progress' });
        return false;
      }
      const decision = interstitialDecision(l, placement, now, t);
      if (!decision.ok) {
        logAdEvent({ type: 'ad_blocked', placement, at: now, reason: decision.reason });
        return false;
      }
      if (pending.current) {
        logAdEvent({ type: 'ad_blocked', placement, at: now, reason: 'busy' });
        return false;
      }
      // Sayaç gösterimden önce yazılır: uygulama reklam sırasında kapanırsa da sayılır.
      commit(recordInterstitial(l, placement, now, t));
      logAdEvent({ type: 'ad_shown', placement, at: now });
      await present({ kind: 'interstitial', placement });
      return true;
    },
    [commit, present, qc],
  );

  const noteTabSwitch = useCallback(() => {
    const l = ledgerRef.current;
    if (l) commit(recordTabSwitch(l, today()));
  }, [commit]);

  const dev = useMemo(
    () => ({
      skipGracePeriod: () => {
        const l = ledgerRef.current ?? freshLedger(today());
        commit({ ...rollover(l, today()), installDay: addDays(today(), -2), lastShownAt: null });
      },
      reset: () => commit(freshLedger(today())),
    }),
    [commit],
  );

  const value = useMemo(
    () => ({ showRewarded, maybeShowInterstitial, noteTabSwitch, ledger, dev }),
    [showRewarded, maybeShowInterstitial, noteTabSwitch, ledger, dev],
  );

  return (
    <AdsContext.Provider value={value}>
      {children}
      {request && <MockAdOverlay key={`${request.kind}-${request.placement}`} request={request} onDone={onDone} />}
    </AdsContext.Provider>
  );
}

export function useAds(): AdsCtx {
  const ctx = useContext(AdsContext);
  if (!ctx) throw new Error('useAds, AdsProvider içinde kullanılmalı');
  return ctx;
}
