import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAds } from './AdsProvider';

const TABS = new Set(['index', 'stats', 'profile']);

/**
 * "/" → index, "/stats" → stats; sekme dışı ekranlar (oyun "/play/kac", arşiv "/archive",
 * "Nasıl oynanır?") → null. Oyun ekranları sekme değildir; oyunun ortasında reklam çıkmaz.
 */
function tabOf(path: string): string | null {
  const first = path.split('/')[1] || 'index';
  return TABS.has(first) ? first : null;
}

/**
 * Sekme geçişlerinde geçiş reklamı (plan A11):
 *  - Bugün'den başka sekmeye geçerken, günün seti bittiyse → `after_result` (günde 1).
 *  - Diğer sekme geçişlerinde, yeterince geçişten sonra → `tab_switch`.
 * Sıklık sınırları ve "bugünün seti bitti mi?" kontrolü AdsProvider'da; burada yalnızca
 * sekme değişimi ayıklanır.
 */
export function useInterstitialTriggers() {
  const pathname = usePathname();
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
    noteTabSwitch();
    void (async () => {
      // Kısa gecikme: yeni sekme çizilsin, reklam geçişin ortasında açılmasın.
      await new Promise((r) => setTimeout(r, 350));
      if (placement === 'after_result' && (await maybeShowInterstitial('after_result'))) return;
      await maybeShowInterstitial('tab_switch');
    })();
  }, [pathname, maybeShowInterstitial, noteTabSwitch]);
}
