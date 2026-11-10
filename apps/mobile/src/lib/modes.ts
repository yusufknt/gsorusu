/** Günün dört modunun metinleri (saf; testte de kullanılır). */
import type { DailyMode } from '../api/types';

export const MODE_LABEL: Record<DailyMode, string> = { pahali: 'Hangisi pahalı?', kac: 'Kaç?', yapar: 'Yapar mıydın?', unlu: 'Hangi ünlü?' };

/** Kartın altındaki tek satırlık kural. */
export const MODE_RULE: Record<DailyMode, string> = {
  pahali: '5 tur · ikisinden pahalı olanı seç',
  kac: '6 hak · oklarla doğru sayıya yaklaş',
  yapar: 'Cevabını ver, Türkiye’yi tahmin et',
  unlu: '10 hak · ipuçlu · yeşil aynı, turuncu yakın',
};

