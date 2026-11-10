import { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { StoryProp } from '@/api/types';

/**
 * Hikâyede Soro'nun yanındaki eşya (Yapar mıydın?): maskotun 80×80 çizim alanında, Soro'nun çizgi diliyle
 * (koyu kontur, düz dolgu). Eşyalar gövdenin kenarlarında durur; yüz ve "?" kıvrımı açık kalır.
 */
const INK = '#19140E';
const STROKE = 1.1;
const GOLD = '#F5C542';

export function SoroProp({ id }: { id: StoryProp }) {
  switch (id) {
    case 'para':
      // Sağ elinde para kesesi.
      return (
        <G stroke={INK} strokeWidth={STROKE} strokeLinejoin="round">
          <Path d="M60 52 Q56 60 58 68 Q63 74 70 72 Q77 69 75 60 Q73 53 68 51 Z" fill="#E9B949" />
          <Path d="M61 51.5 Q64.5 49 68 51" fill="none" />
          <Path d="M62 49 L60 46 M66 49 L68 46" fill="none" strokeLinecap="round" />
          <SvgText x={63.4} y={66} fontSize={10} fontWeight="bold" fill={INK} stroke="none">
            ₺
          </SvgText>
        </G>
      );
    case 'gozluk':
      return (
        <G transform="rotate(-5.5 40 37.4)" stroke={INK} strokeWidth={STROKE} strokeLinejoin="round">
          <Path d="M21.6 35.6 L25.6 36.2 M58.4 35.6 L54.4 36.2" fill="none" strokeLinecap="round" />
          <Rect x={25.4} y={33.6} width={11.4} height={8.6} rx={3.4} fill="#1B1B22" />
          <Rect x={43.2} y={33.6} width={11.4} height={8.6} rx={3.4} fill="#1B1B22" />
          <Path d="M36.8 36.4 Q40 34.4 43.2 36.4" fill="none" />
        </G>
      );
    case 'telefon':
      // Sol elinde telefon, ekranı yanıyor.
      return (
        <G stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" transform="rotate(-12 13 52)">
          <Rect x={7} y={42} width={12} height={21} rx={2.4} fill="#23232B" />
          <Rect x={8.8} y={44.6} width={8.4} height={14} rx={1} fill="#7FC4FF" stroke="none" />
          <Path d="M10.4 49 H15.6 M10.4 52 H14" stroke="#FFFFFF" strokeWidth={1} strokeLinecap="round" />
        </G>
      );
    case 'bavul':
      return (
        <G stroke={INK} strokeWidth={STROKE} strokeLinejoin="round">
          <Path d="M8 58 V55 Q8 53 10 53 H14 Q16 53 16 55 V58" fill="none" />
          <Rect x={3} y={58} width={18} height={15} rx={2.4} fill="#D6336C" />
          <Path d="M9 58 V73 M15 58 V73" stroke="#9E1F4C" />
          <Rect x={3} y={64} width={18} height={2.6} fill={GOLD} stroke="none" />
        </G>
      );
    case 'ter':
      // Alnının sağında ter damlası (gerginlik).
      return (
        <G stroke={INK} strokeWidth={STROKE} strokeLinejoin="round">
          <Path d="M58.5 22 Q55 28 55.6 30.6 Q56.4 33.4 59 33.2 Q61.6 32.8 61.6 30 Q61.6 27.4 58.5 22 Z" fill="#7FC4FF" />
          <Path d="M57.4 29.6 Q57.6 31.2 59 31.6" stroke="#FFFFFF" strokeWidth={0.9} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'kalp':
      return (
        <G stroke={INK} strokeWidth={STROKE} strokeLinejoin="round">
          <Path d="M66 22 Q59 17 59 12.6 Q59 9 62.6 9 Q65 9 66 11.4 Q67 9 69.4 9 Q73 9 73 12.6 Q73 17 66 22 Z" fill="#F27DA6" />
          <Path d="M13 26 Q9 23 9 20.4 Q9 18.4 11 18.4 Q12.4 18.4 13 19.8 Q13.6 18.4 15 18.4 Q17 18.4 17 20.4 Q17 23 13 26 Z" fill="#F27DA6" />
        </G>
      );
    case 'buton':
      // Önünde kırmızı buton.
      return (
        <G stroke={INK} strokeWidth={STROKE} strokeLinejoin="round">
          <Rect x={58} y={66} width={20} height={8} rx={2} fill="#3A3A42" />
          <Ellipse cx={68} cy={66} rx={7} ry={2.6} fill="#9E1520" />
          <Path d="M61 66 Q61 58.4 68 58.4 Q75 58.4 75 66 Z" fill="#E5534B" />
          <Path d="M64 61.6 Q66 60.4 68 60.6" stroke="#FFFFFF" strokeWidth={1} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'mektup':
      return (
        <G stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" transform="rotate(-10 14 50)">
          <Rect x={4} y={43} width={20} height={14} rx={1.6} fill="#FFF4E0" />
          <Path d="M4.6 43.8 L14 51 L23.4 43.8" fill="none" />
          <Circle cx={14} cy={51.4} r={2.2} fill="#E5534B" />
        </G>
      );
    case 'yildiz':
      // Etrafında parıltılar (büyülü, harika bir şey).
      return (
        <G stroke={INK} strokeWidth={0.9} strokeLinejoin="round" fill={GOLD}>
          <Path d="M10 9 L11.6 13.4 L16 15 L11.6 16.6 L10 21 L8.4 16.6 L4 15 L8.4 13.4 Z" />
          <Path d="M70 24 L71.2 27.4 L74.6 28.6 L71.2 29.8 L70 33.2 L68.8 29.8 L65.4 28.6 L68.8 27.4 Z" />
          <Path d="M72 48 L72.9 50.6 L75.5 51.5 L72.9 52.4 L72 55 L71.1 52.4 L68.5 51.5 L71.1 50.6 Z" />
        </G>
      );
    case 'anahtar':
      // Sağ elinde altın anahtar.
      return (
        <G stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" transform="rotate(-24 66 54)">
          <Circle cx={60.5} cy={54} r={4.4} fill={GOLD} />
          <Circle cx={60.5} cy={54} r={1.6} fill="#FFF4E0" />
          <Path d="M64.8 52.8 H77 V55.2 H75 V58 H72.6 V55.2 H64.8 Z" fill={GOLD} />
        </G>
      );
  }
}
