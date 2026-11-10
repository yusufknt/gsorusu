/**
 * Tek tema kaynağı. Renkler, boşluklar, köşe yarıçapları, gölgeler ve yazı ölçüleri yalnızca buradan
 * gelir; ekranlarda sabit renk ya da sayı yazılmaz.
 *
 * Oyun renkleri paylaşım kartıyla aynı anlamı taşır (plan A6):
 *   turuncu = daha pahalı / daha fazla · mavi = daha ucuz / daha az · kırmızı = çok yakın · yeşil = bulundu
 */
import type { DailyMode, QuestionFormat } from '@/api/types';
import type { IconName } from '@/components/icons';

export const lightColors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F4F4F2',
  surfaceSunken: '#E7E7E4',
  border: '#D9D9D6',
  text: '#121212',
  textMuted: '#5C5C5C',
  textSubtle: '#8C8C8C',
  textOnAccent: '#FFFFFF',
  accent: '#E2561B',
  accentPressed: '#C8470F',
  accentSoft: '#FCE9DF',
  heroFrom: '#FF7A2F',
  heroTo: '#F0442E',
  /** Premium kartının degradesi (üstünde beyaz yazı okunur). */
  premiumFrom: '#D9461A',
  premiumTo: '#A9300E',
  higher: '#E2561B',
  higherSoft: '#FCE9DF',
  lower: '#2F6BFF',
  lowerSoft: '#DFE8FF',
  close: '#D64545',
  closeSoft: '#FBE3E3',
  correct: '#3E9A4F',
  correctSoft: '#DFF2E2',
  /** Loldle'daki turuncu: kısmen doğru. */
  partial: '#E39A2D',
  partialSoft: '#FCEFD9',
  wrong: '#8A8F98',
  wrongSoft: '#ECEDEF',
  warning: '#E0A800',
  danger: '#D64545',
  flame: '#F07A10',
  shadow: '#000000',
  overlay: 'rgba(18, 18, 18, 0.45)',
  /** Tam ekran reklamın zemini; temadan bağımsız koyu (video oynatıcı gibi). */
  adBackdrop: '#0B0B0F',
};

export type ThemeColors = typeof lightColors;

export const darkColors: ThemeColors = {
  background: '#121213',
  surface: '#121213',
  surfaceMuted: '#1D1D1F',
  surfaceSunken: '#2A2A2D',
  border: '#3A3A3C',
  text: '#F5F5F5',
  textMuted: '#A3A3A6',
  textSubtle: '#6E6E73',
  textOnAccent: '#FFFFFF',
  accent: '#F26A2E',
  accentPressed: '#FF7A3D',
  accentSoft: '#3A2216',
  heroFrom: '#E8641F',
  heroTo: '#C93524',
  premiumFrom: '#C8401A',
  premiumTo: '#8E2A0E',
  higher: '#F26A2E',
  higherSoft: '#3A2216',
  lower: '#5B8BFF',
  lowerSoft: '#18264A',
  close: '#E5534B',
  closeSoft: '#44181B',
  correct: '#4CAF5E',
  correctSoft: '#14331C',
  partial: '#E8A33D',
  partialSoft: '#3D2C10',
  wrong: '#8A8F98',
  wrongSoft: '#2A2D34',
  warning: '#F5B700',
  danger: '#E5534B',
  flame: '#FF8A1F',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',
  /** Tam ekran reklamın zemini; temadan bağımsız koyu (video oynatıcı gibi). */
  adBackdrop: '#0B0B0F',
};

/**
 * Her formatın rengi ve simgesi (Ionicons adı). Renkler günün modlarıyla aynı: compare = "Hangisi pahalı?"
 * (turuncu), price/number = "Kaç?" (mavi), poll = "Yapar mıydın?" (mor), celeb = "Hangi ünlü?" (pembe);
 * oyun içi renk kartla tutarlı kalır.
 */
export const formatStyle: Record<QuestionFormat, { color: string; soft: string; darkSoft: string; icon: IconName }> = {
  price: { color: '#2F6BFF', soft: '#DFE8FF', darkSoft: '#18264A', icon: 'pricetag' },
  number: { color: '#2F6BFF', soft: '#DFE8FF', darkSoft: '#18264A', icon: 'calculator' },
  poll: { color: '#8B5CF6', soft: '#EDE5FF', darkSoft: '#2A1F47', icon: 'people' },
  trivia: { color: '#D99A00', soft: '#FFF2CC', darkSoft: '#3A2E0D', icon: 'bulb' },
  compare: { color: '#F2621B', soft: '#FFE7D9', darkSoft: '#3A2216', icon: 'scale' },
  celeb: { color: '#D6336C', soft: '#FCE4EC', darkSoft: '#3D1424', icon: 'user-search' },
};

/** Günün dört modunun rengi ve simgesi (hub kartları, oyun başlığı, paylaşım kartı). */
export const modeStyle: Record<DailyMode, { color: string; soft: string; darkSoft: string; icon: IconName }> = {
  pahali: { color: '#F2621B', soft: '#FFE7D9', darkSoft: '#3A2216', icon: 'scale' },
  kac: { color: '#2F6BFF', soft: '#DFE8FF', darkSoft: '#18264A', icon: 'arrow-down-up' },
  yapar: { color: '#8B5CF6', soft: '#EDE5FF', darkSoft: '#2A1F47', icon: 'hand-coins' },
  unlu: { color: '#D6336C', soft: '#FCE4EC', darkSoft: '#3D1424', icon: 'user-search' },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

/**
 * Sayfa genişlikleri (web ve tablet). narrow: tek sütunlu yığın sayfaları · game: oyun ekranı ·
 * wide: sekmeler ve üst menü (büyük masaüstü ekranı doldursun diye geniş) · side: yan sütun.
 */
export const layout = { narrow: 680, game: 1320, wide: 1760, side: 420 } as const;

/** Gazete bulmacası dili: küçük köşe yuvarlaklıkları, ince çizgiler, gölge yok. */
export const radius = { sm: 4, md: 8, lg: 12, xl: 16, pill: 999 } as const;

/**
 * Modern gazete dili: başlıklar Fraunces (yumuşak, karakterli serif), arayüz DM Sans.
 * İkisi de Türkçe karakterleri tam destekler. Özel yazı tipinde fontWeight verilmez (Android).
 */
export const fonts = {
  regular: 'DMSans_400Regular',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  extrabold: 'DMSans_800ExtraBold',
  black: 'DMSans_900Black',
  serif: 'Fraunces_700Bold',
  serifSemi: 'Fraunces_600SemiBold',
} as const;

export const font = {
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 23 },
  // Büyük harf T bileşeninde Türkçe kurallarla yapılır (textTransform "i"yi "I" yapar, "İ" değil).
  label: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1.2 },
  title: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 29 },
  headline: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 38 },
  display: { fontFamily: fonts.serif, fontSize: 56, lineHeight: 60 },
};

/** Yumuşak, sıcak gölge (iOS shadow* + Android elevation). */
export function shadow(color: string, level: 1 | 2 | 3 = 1) {
  const map = { 1: [2, 8, 0.08, 2], 2: [6, 16, 0.12, 5], 3: [12, 28, 0.18, 10] } as const;
  const [y, blur, opacity, elevation] = map[level];
  return { shadowColor: color, shadowOffset: { width: 0, height: y }, shadowRadius: blur, shadowOpacity: opacity, elevation };
}

/** Dokunma hedefi en az 48 dp (Android erişilebilirlik önerisi). */
export const minTouch = 48;
