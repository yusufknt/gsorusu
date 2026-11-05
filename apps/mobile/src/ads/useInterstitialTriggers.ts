import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { keys } from '@/api/hooks';
import type { PlayState } from '@/api/types';

import { useAds } from './AdsProvider';
import { logAdEvent } from './events';

const TABS = new Set(['index', 'stats', 'leagues', 'archive', 'profile']);

/** "/" → index, "/archive/2026-11-04" → archive; sekme dışı ekranlar (ör. "/how-to-play") → null. */
function tabOf(path: string): string | null {
  const first = path.split('/')[1] || 'index';
  return TABS.has(first) ? first : null;
}

/** Arşivde yarım kalmış bir oyundan çıkılıyorsa (bitmemiş soru ekranı) reklam yok. */
function leavingUnfinishedGame(qc: QueryClient, path: string): boolean {
  const m = path.match(/^\/archive\/(\d{4}-\d{2}-\d{2})$/);
  if (!m) return false;
  return !qc.getQueryData<PlayState>(keys.play(m[1]))?.finished;
}

/**
 * Sekme geçişlerinde geçiş reklamı (plan A11):
 *  - Bugün'den başka sekmeye geçerken, günün sorusu bittiyse → `after_result` (günde 1).
 *  - Diğer sekme geçişlerinde, yeterince geçişten sonra → `tab_switch`.
 * Sıklık sınırları ve "bugünün sorusu bitti mi?" kontrolü AdsProvider'da; burada yalnızca
 * sekme değişimi ve yarım kalan arşiv oyunu ayıklanır.
 */
export function useInterstitialTriggers() {
  const pathname = usePathname();
  const qc = useQueryClient();
  const { maybeShowInterstitial, noteTabSwitch } = useAds();
  const prev = useRef(pathname);

  useEffect(() => {
    const to = tabOf(pathname);
    // Modal ekranlar (Nasıl oynanır?) sekme değişimi sayılmaz.
    if (!to) return;
    const from = prev.current;
    prev.current = pathname;
    const fromTab = tabOf(from);
    if (!fromTab || fromTab === to) return;

    const placement = fromTab === 'index' ? 'after_result' : 'tab_switch';
    if (leavingUnfinishedGame(qc, from)) {
      logAdEvent({ type: 'ad_blocked', placement, at: Date.now(), reason: 'game_in_progress' });
      return;
    }
    noteTabSwitch();
    void (async () => {
      // Kısa gecikme: yeni sekme çizilsin, reklam geçişin ortasında açılmasın.
      await new Promise((r) => setTimeout(r, 350));
      if (placement === 'after_result' && (await maybeShowInterstitial('after_result'))) return;
      await maybeShowInterstitial('tab_switch');
    })();
  }, [pathname, qc, maybeShowInterstitial, noteTabSwitch]);
}
