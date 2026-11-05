/**
 * Reklam yerleşimleri ve sıklık sınırları — tek kaynak (plan A11, docs/kararlar.md #51).
 *
 * Ödüllü (rewarded): her zaman oyuncunun seçimi, karşılığı nettir.
 * Geçiş (interstitial): yalnızca doğal molalarda, soru bitmeden asla.
 *
 * Şu an Expo Go'da çalıştığımız için reklamlar uygulama içi "test reklamı" ekranıyla gösterilir
 * (MockAdOverlay). Development build'e geçince aynı yerleşim adlarıyla AdMob'a bağlanır.
 */

export type RewardedPlacement = 'extra_guess' | 'hint' | 'streak_repair' | 'archive_unlock';
export type InterstitialPlacement = 'after_result' | 'after_archive' | 'tab_switch';
export type AdPlacement = RewardedPlacement | InterstitialPlacement;

/** Ödüllü reklam ekranında "Ödül: …" satırı. */
export const REWARD_LABEL: Record<RewardedPlacement, string> = {
  extra_guess: '1 tahmin hakkı daha',
  hint: 'Aralığı daralt ipucu',
  streak_repair: 'Serin kurtulur',
  archive_unlock: 'Arşiv sorusu açılır',
};

export const AD_RULES = {
  /** Kurulumdan sonraki ilk N gün hiç geçiş reklamı yok (1. ve 2. gün). */
  graceDays: 2,
  /** Kullanıcı başına günde en fazla geçiş reklamı (tüm yerleşimler toplamı). */
  interstitialDailyCap: 2,
  /** Yerleşim başına günlük üst sınır; toplam sınır yine geçerlidir. */
  perPlacementDaily: { after_result: 1, after_archive: 2, tab_switch: 1 } satisfies Record<InterstitialPlacement, number>,
  /** İki geçiş reklamı arasında en az bu kadar süre. */
  minGapMs: 3 * 60_000,
  /** Genel sekme geçişinde: son reklamdan bu yana en az bu kadar sekme değişimi. */
  tabSwitchEvery: 4,
} as const;

/** Test reklamı süreleri (Expo Go). Gerçek ödüllü videolar 15–30 sn sürer. */
export const MOCK_AD = {
  rewardedMs: 5_000,
  /** Geçiş reklamında "Kapat" bu süreden sonra çıkar. */
  interstitialSkipMs: 3_000,
} as const;

/**
 * Google'ın herkese açık test reklam birimleri: development build'de gerçek kimlikler gelene kadar
 * bunlar kullanılır (gerçek kimlikle test etmek AdMob hesabını riske atar).
 */
export const ADMOB_TEST_UNITS = {
  android: { rewarded: 'ca-app-pub-3940256099942544/5224354917', interstitial: 'ca-app-pub-3940256099942544/1033173712' },
  ios: { rewarded: 'ca-app-pub-3940256099942544/1712485313', interstitial: 'ca-app-pub-3940256099942544/4411468910' },
} as const;
