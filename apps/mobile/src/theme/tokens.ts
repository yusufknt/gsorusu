/**
 * Tek tema kaynağı. Renkler, boşluklar, köşe yarıçapları, gölgeler ve yazı ölçüleri yalnızca buradan
 * gelir; ekranlarda sabit renk ya da sayı yazılmaz.
 *
 * Oyun renkleri paylaşım kartıyla aynı anlamı taşır (plan A6):
 *   turuncu = daha pahalı / daha fazla · mavi = daha ucuz / daha az · kırmızı = çok yakın · yeşil = bulundu
 */
import type { QuestionFormat } from '@/api/types';

export const lightColors = {
  background: '#FBF7F1',
  surface: '#FFFFFF',
  surfaceMuted: '#F3EDE4',
  surfaceSunken: '#EDE5D9',
  border: '#E8E0D4',
  text: '#1A1C22',
  textMuted: '#6B6F78',
  textSubtle: '#9A9EA6',
  textOnAccent: '#FFFFFF',
  accent: '#F2621B',
  accentPressed: '#D9530F',
  accentSoft: '#FFE7D9',
  heroFrom: '#FF7A2F',
  heroTo: '#F0442E',
  higher: '#F2621B',
  higherSoft: '#FFE7D9',
  lower: '#2F6BFF',
  lowerSoft: '#DFE8FF',
  close: '#E5484D',
  closeSoft: '#FFE1E2',
  correct: '#169E5D',
  correctSoft: '#D4F3E3',
  wrong: '#8A8F98',
  wrongSoft: '#ECEDEF',
  warning: '#F5B700',
  danger: '#E5484D',
  flame: '#FF8A00',
  shadow: '#5A3A1A',
  overlay: 'rgba(20, 14, 8, 0.45)',
};

export type ThemeColors = typeof lightColors;

export const darkColors: ThemeColors = {
  background: '#111216',
  surface: '#1B1D23',
  surfaceMuted: '#24272F',
  surfaceSunken: '#0C0D10',
  border: '#2E313A',
  text: '#F5F2EC',
  textMuted: '#A5A9B2',
  textSubtle: '#6F737C',
  textOnAccent: '#FFFFFF',
  accent: '#FF7A33',
  accentPressed: '#FF6516',
  accentSoft: '#3A2216',
  heroFrom: '#E8641F',
  heroTo: '#C93524',
  higher: '#FF7A33',
  higherSoft: '#3A2216',
  lower: '#5B8BFF',
  lowerSoft: '#18264A',
  close: '#FF6369',
  closeSoft: '#44181B',
  correct: '#3CC27E',
  correctSoft: '#133625',
  wrong: '#8A8F98',
  wrongSoft: '#2A2D34',
  warning: '#F5B700',
  danger: '#FF6369',
  flame: '#FF9A1F',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

/** Her formatın kendi rengi ve simgesi (Ionicons adı). */
export const formatStyle: Record<QuestionFormat, { color: string; soft: string; darkSoft: string; icon: string }> = {
  price: { color: '#F2621B', soft: '#FFE7D9', darkSoft: '#3A2216', icon: 'pricetag' },
  number: { color: '#2F6BFF', soft: '#DFE8FF', darkSoft: '#18264A', icon: 'calculator' },
  poll: { color: '#8B5CF6', soft: '#EDE5FF', darkSoft: '#2A1F47', icon: 'people' },
  trivia: { color: '#D99A00', soft: '#FFF2CC', darkSoft: '#3A2E0D', icon: 'bulb' },
  compare: { color: '#0E9F9A', soft: '#D2F4F2', darkSoft: '#0F3534', icon: 'git-compare' },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/** Nunito: yuvarlak, sıcak, Türkçe karakterleri tam. Özel yazı tipinde fontWeight verilmez (Android). */
export const fonts = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

export const font = {
  caption: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  body: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.extrabold, fontSize: 16, lineHeight: 23 },
  // Büyük harf T bileşeninde Türkçe kurallarla yapılır (textTransform "i"yi "I" yapar, "İ" değil).
  label: { fontFamily: fonts.extrabold, fontSize: 12, lineHeight: 16, letterSpacing: 0.8 },
  title: { fontFamily: fonts.black, fontSize: 24, lineHeight: 30 },
  headline: { fontFamily: fonts.black, fontSize: 30, lineHeight: 36 },
  display: { fontFamily: fonts.black, fontSize: 56, lineHeight: 62 },
};

/** Yumuşak, sıcak gölge (iOS shadow* + Android elevation). */
export function shadow(color: string, level: 1 | 2 | 3 = 1) {
  const map = { 1: [2, 8, 0.08, 2], 2: [6, 16, 0.12, 5], 3: [12, 28, 0.18, 10] } as const;
  const [y, blur, opacity, elevation] = map[level];
  return { shadowColor: color, shadowOffset: { width: 0, height: y }, shadowRadius: blur, shadowOpacity: opacity, elevation };
}

/** Dokunma hedefi en az 48 dp (Android erişilebilirlik önerisi). */
export const minTouch = 48;
