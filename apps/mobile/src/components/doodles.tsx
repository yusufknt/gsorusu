import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { useIsDark } from '@/theme/useTheme';

/**
 * Soro tarzı ikonlar: maskotla aynı dil — kalın koyu kontur, sıcak dolgular (turuncu, kehribar, sarı, krem).
 * 48 × 48 birimlik çizim alanı. Menü, mod kartları, bağlantılar ve "Hangi ünlü?" kutularında kullanılır;
 * ok, tik, kapat gibi küçük kontrol işaretleri çizgi ikon olarak kalır (components/icons.ts).
 */
const INK = '#1A1410';
const ORANGE = '#E85113';
const AMBER = '#F89F2A';
const YELLOW = '#FFD84A';
const CREAM = '#FFF4E0';
const WHITE = '#FFFFFF';
const PINK = '#F27DA6';
const BLUE = '#6FA8F5';
const RED = '#E5534B';
const GREY = '#C9C4BD';
/** Koyu temada çizimin dış hattı (çıkartma kenarı). */
const HALO = '#F3E9DC';

const STAR = 'M24 7 L28.7 18.5 L41.1 19.4 L31.6 27.5 L34.6 39.6 L24 33 L13.4 39.6 L16.4 27.5 L6.9 19.4 L19.3 18.5 Z';
const HEART = 'M24 40 Q8 29 8 18 Q8 10 16 10 Q21 10 24 15 Q27 10 32 10 Q40 10 40 18 Q40 29 24 40 Z';
const QUESTION = 'M19.5 26 Q19.5 21.5 24 21.5 Q28.5 21.5 28.5 25.3 Q28.5 28 24 29.5 V31.5';

/** Takvim yaprağı: üstte turuncu şerit ve halkalar; içi `children`. */
function Page({ children }: { children?: ReactNode }) {
  return (
    <G>
      <Rect x={7} y={10} width={34} height={32} rx={4} fill={CREAM} />
      <Path d="M7 19 V14 Q7 10 11 10 H37 Q41 10 41 14 V19 Z" fill={ORANGE} />
      <Rect x={7} y={10} width={34} height={32} rx={4} fill="none" />
      <Path d="M16 6 V13 M32 6 V13" />
      {children}
    </G>
  );
}

export const DOODLES = {
  // --- Günün modları ---
  scale: (
    <G>
      <Path d="M24 12 V38" />
      <Path d="M14 41 Q24 35 34 41 Z" fill={ORANGE} />
      <Path d="M7 17 L41 11" />
      <Path d="M7 17 L3.5 27 M7 17 L11 27 M41 11 L37 21 M41 11 L45 21" strokeWidth={2} />
      <Path d="M2.5 27 Q7 34 12 27 Z" fill={YELLOW} />
      <Path d="M36 21 Q41 28 46 21 Z" fill={YELLOW} />
      <Circle cx={24} cy={12} r={3.5} fill={ORANGE} />
    </G>
  ),
  'arrow-down-up': (
    <G>
      <Path d="M6 20 L14 7 L22 20 H17.5 V41 H10.5 V20 Z" fill={ORANGE} />
      <Path d="M26 28 L34 41 L42 28 H37.5 V7 H30.5 V28 Z" fill={YELLOW} />
    </G>
  ),
  'hand-coins': (
    <G>
      <Path d="M17 15 Q11 10 16 6 Q20 8 24 6 Q28 8 32 6 Q37 10 31 15 Q43 22 41 33 Q39 42 24 42 Q9 42 7 33 Q5 22 17 15 Z" fill={YELLOW} />
      <Path d="M17 15 Q24 18 31 15" />
      <Path d="M29.5 24.5 Q28.5 21.5 24 21.5 Q19 21.5 19 25 Q19 28 24 29 Q29.5 30 29.5 33.5 Q29.5 37 24 37 Q19.5 37 18.5 34 M24 19 V39.5" strokeWidth={2.5} />
    </G>
  ),
  // Hangi ünlü?: spot ışığı altında kimliği gizli ünlü (yüzünde soru işareti).
  'user-search': (
    <G>
      <Path d="M17 4 H31 L40 42 H8 Z" fill={YELLOW} stroke="none" opacity={0.55} />
      <Path d="M8 43 Q8 31 24 31 Q40 31 40 43 Z" fill={PINK} />
      <Circle cx={24} cy={20} r={9} fill={PINK} />
      <Path d="M21.2 17.6 Q21.2 15 24 15 Q26.8 15 26.8 17.4 Q26.8 19.2 24 20.2 V21.6" stroke={WHITE} strokeWidth={2.4} fill="none" />
      <Circle cx={24} cy={25} r={1.4} fill={WHITE} stroke="none" />
      <Path d="M14 4 H34" strokeWidth={3} />
    </G>
  ),
  // --- Menü ve bağlantılar ---
  today: (
    <Page>
      <Path d={QUESTION} strokeWidth={2.8} />
      <Circle cx={24} cy={36} r={1.9} fill={INK} stroke="none" />
    </Page>
  ),
  'calendar-outline': (
    <Page>
      <Rect x={13} y={24} width={6} height={5} rx={1} fill={AMBER} strokeWidth={2} />
      <Rect x={21} y={24} width={6} height={5} rx={1} fill={WHITE} strokeWidth={2} />
      <Rect x={29} y={24} width={6} height={5} rx={1} fill={WHITE} strokeWidth={2} />
      <Rect x={13} y={32} width={6} height={5} rx={1} fill={WHITE} strokeWidth={2} />
      <Rect x={21} y={32} width={6} height={5} rx={1} fill={WHITE} strokeWidth={2} />
    </Page>
  ),
  flame: (
    <G>
      <Path d="M24 4 Q35 15 35 28 Q35 42 24 44 Q13 42 13 28 Q13 21 19 15 Q20 23 24.5 23.5 Q21.5 13 24 4 Z" fill={ORANGE} />
      <Path d="M24 27 Q30 32 28.5 38 Q27 42.5 24 42.5 Q19.5 41.5 19.5 36.5 Q19.5 31 24 27 Z" fill={YELLOW} />
    </G>
  ),
  trophy: (
    <G>
      <Path d="M14 12 H9 Q7.5 21 15.5 22 M34 12 H39 Q40.5 21 32.5 22" fill="none" />
      <Path d="M14 7 H34 V18 Q34 30 24 30 Q14 30 14 18 Z" fill={YELLOW} />
      <Path d="M24 30 V35" />
      <Path d="M15 42 Q15 35 24 35 Q33 35 33 42 Z" fill={ORANGE} />
      <Path d="M20 13 V20" stroke={WHITE} strokeWidth={2.5} />
    </G>
  ),
  person: (
    <G>
      <Path d="M9 42 Q9 27 24 27 Q39 27 39 42 Z" fill={ORANGE} />
      <Circle cx={24} cy={16} r={8} fill={AMBER} />
    </G>
  ),
  'extension-puzzle': (
    <G>
      <Path d="M9 14 H19 Q16.5 7.5 22.5 7.5 Q28.5 7.5 26 14 H36 V23 Q42 20.5 42 26.5 Q42 32.5 36 30 V41 H9 Z" fill={YELLOW} />
      <Path d="M14 35 H20" stroke={WHITE} strokeWidth={2.5} />
    </G>
  ),
  'albums-outline': (
    <G>
      <Rect x={13} y={7} width={26} height={31} rx={3} fill={AMBER} transform="rotate(9 26 22)" />
      <Rect x={8} y={11} width={26} height={31} rx={3} fill={CREAM} />
      <Path d="M14 21 H28 M14 27 H26 M14 33 H21" strokeWidth={2.5} />
    </G>
  ),
  images: (
    <G>
      <Rect x={5} y={9} width={38} height={30} rx={3} fill={CREAM} />
      <Path d="M5 35 L16 22 L25 31 L30 26 L43 36 V36 Q43 39 40 39 H8 Q5 39 5 36 Z" fill={ORANGE} strokeWidth={2.5} />
      <Circle cx={33} cy={17} r={4.5} fill={YELLOW} />
      <Rect x={5} y={9} width={38} height={30} rx={3} fill="none" />
    </G>
  ),
  'help-circle-outline': (
    <G>
      <Circle cx={24} cy={24} r={18} fill={ORANGE} />
      <Path d="M18.5 19 Q18.5 13 24 13 Q29.5 13 29.5 18.5 Q29.5 22 24 24 V27.5" stroke={WHITE} strokeWidth={4} />
      <Circle cx={24} cy={33.5} r={2.6} fill={WHITE} stroke="none" />
    </G>
  ),
  'lock-closed': (
    <G>
      <Path d="M16 22 V16 Q16 8 24 8 Q32 8 32 16 V22" fill="none" />
      <Rect x={10} y={21} width={28} height={21} rx={4} fill={YELLOW} />
      <Circle cx={24} cy={30} r={2.6} fill={INK} stroke="none" />
      <Path d="M24 31 V36" strokeWidth={2.5} />
    </G>
  ),
  bulb: (
    <G>
      <Path d="M24 6 Q36 6 36 18 Q36 25 30 29 V34 H18 V29 Q12 25 12 18 Q12 6 24 6 Z" fill={YELLOW} />
      <Rect x={18} y={34} width={12} height={7} rx={2} fill={AMBER} />
      <Path d="M19 15 Q20 11 24 10.5" stroke={WHITE} strokeWidth={2.5} />
    </G>
  ),
  star: <Path d={STAR} fill={YELLOW} />,
  // --- Hangi ünlü? kutuları ---
  music: (
    <G>
      <Path d="M18 34 V12 L36 8 V30" fill="none" />
      <Path d="M18 12 L36 8 V14 L18 18 Z" fill={INK} />
      <Ellipse cx={14} cy={34.5} rx={5} ry={4} fill={ORANGE} />
      <Ellipse cx={32} cy={30.5} rx={5} ry={4} fill={ORANGE} />
    </G>
  ),
  drama: (
    <G>
      <Path d="M22 18 Q32 14 42 18 V30 Q42 40 32 40 Q22 40 22 30 Z" fill={ORANGE} />
      <Path d="M27 35.5 Q32 31 37 35.5" />
      <Path d="M6 10 Q16 6 26 10 V22 Q26 32 16 32 Q6 32 6 22 Z" fill={YELLOW} />
      <Path d="M11 22.5 Q16 27.5 21 22.5" />
      <Circle cx={11.5} cy={16.5} r={1.6} fill={INK} stroke="none" />
      <Circle cx={20.5} cy={16.5} r={1.6} fill={INK} stroke="none" />
    </G>
  ),
  medal: (
    <G>
      <Path d="M13 5 H21 L26 18 H18 Z" fill={BLUE} />
      <Path d="M35 5 H27 L22 18 H30 Z" fill={RED} />
      <Circle cx={24} cy={30} r={11} fill={YELLOW} />
      <Circle cx={24} cy={30} r={5.5} fill="none" strokeWidth={2.5} />
    </G>
  ),
  'book-open': (
    <G>
      <Path d="M24 14 Q16 9 6 11 V38 Q16 36 24 40 Q32 36 42 38 V11 Q32 9 24 14 Z" fill={CREAM} />
      <Path d="M24 14 V40" />
      <Path d="M10 19 Q15 18 20 20 M28 20 Q33 18 38 19 M10 26 Q15 25 20 27 M28 27 Q33 25 38 26" strokeWidth={2} />
    </G>
  ),
  tv: (
    <G>
      <Path d="M18 6 L24 13 L30 6" fill="none" />
      <Rect x={6} y={13} width={36} height={25} rx={4} fill={ORANGE} />
      <Rect x={10} y={17} width={22} height={17} rx={2} fill={CREAM} />
      <Circle cx={37} cy={21} r={1.9} fill={INK} stroke="none" />
      <Circle cx={37} cy={28} r={1.9} fill={INK} stroke="none" />
      <Path d="M12 38 V42 M36 38 V42" />
    </G>
  ),
  globe: (
    <G>
      <Circle cx={24} cy={24} r={17} fill={BLUE} />
      <Ellipse cx={24} cy={24} rx={7} ry={17} fill="none" strokeWidth={2.5} />
      <Path d="M7 24 H41 M10 15 H38 M10 33 H38" strokeWidth={2.5} />
    </G>
  ),
  'map-pin': (
    <G>
      <Path d="M24 43 Q11 28 11 19 Q11 6 24 6 Q37 6 37 19 Q37 28 24 43 Z" fill={ORANGE} />
      <Circle cx={24} cy={19} r={5} fill={CREAM} />
    </G>
  ),
  heart: <Path d={HEART} fill={RED} />,
  'heart-off': (
    <G>
      <Path d={HEART} fill={GREY} />
      <Path d="M9 9 L39 39" />
    </G>
  ),
  venus: (
    <G>
      <Circle cx={24} cy={18} r={10} fill={PINK} />
      <Path d="M24 28 V43 M18 36 H30" />
    </G>
  ),
  mars: (
    <G>
      <Circle cx={20} cy={28} r={10} fill={BLUE} />
      <Path d="M27 21 L40 8 M31 8 H40 V17" />
    </G>
  ),
  pricetag: (
    <G>
      <Path d="M8 8 H24 L42 26 L26 42 L8 24 Z" fill={YELLOW} />
      <Circle cx={16} cy={16} r={3} fill={CREAM} />
    </G>
  ),
  type: (
    <G>
      <Rect x={7} y={7} width={34} height={34} rx={6} fill={CREAM} />
      <Path d="M15 36 L24 13 L33 36 M18.5 28 H29.5" strokeWidth={3.2} />
    </G>
  ),
} satisfies Record<string, ReactNode>;

export type DoodleName = keyof typeof DOODLES;

/** Aynı anlamdaki eski adlar ("-outline" vb.) aynı çizime gider. */
export const DOODLE_ALIAS: Record<string, DoodleName> = {
  'today-outline': 'today',
  'flame-outline': 'flame',
  'trophy-outline': 'trophy',
  'person-outline': 'person',
  'extension-puzzle-outline': 'extension-puzzle',
  'lock-closed': 'lock-closed',
};

export function doodleFor(name: string): DoodleName | null {
  if (name in DOODLES) return name as DoodleName;
  return DOODLE_ALIAS[name] ?? null;
}

/**
 * Çizim ikon; `dim` ile pasif hâl (menüde seçili olmayan sekme gibi). Koyu temada koyu kontur zemine
 * karışmasın diye altına çıkartma gibi açık bir dış hat çizilir.
 */
export function Doodle({ name, size, dim = false }: { name: DoodleName; size: number; dim?: boolean }) {
  const dark = useIsDark();
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, opacity: dim ? 0.5 : 1 }}>
      <Svg width={size} height={size} viewBox="-2 -2 52 52">
        {dark && (
          <G fill={HALO} stroke={HALO} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round">
            {DOODLES[name]}
          </G>
        )}
        <G fill="none" stroke={INK} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round">
          {DOODLES[name]}
        </G>
      </Svg>
    </View>
  );
}
