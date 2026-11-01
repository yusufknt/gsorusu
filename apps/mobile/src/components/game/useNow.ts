import { useEffect, useState } from 'react';

import { serverNow } from '@/api/client';

/** Sunucu saatine göre şu an (ms); `intervalMs` aralıkla yenilenir. */
export function useNow(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}
