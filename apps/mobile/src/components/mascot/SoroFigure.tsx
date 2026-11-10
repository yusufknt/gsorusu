import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Ellipse, G, Path, Text as SvgText } from 'react-native-svg';

import type { StoryProp } from '@/api/types';
import { BELLY, BODY_PARTS, CHEEKS, CURL, EYES, FACE_LINES, HIP_HAND, LIMBS, SORO_VIEWBOX, TAIL, WAVE_ARM, WAVE_PIVOT, type SoroOval, type SoroPath } from '@/components/onboarding/soroShape';

import { SoroProp } from './SoroProp';

/**
 * Arayüzdeki Soro: marka/maskot.svg geometrisiyle react-native-svg çizimi (Skia gerektirmez, web'de de hafif).
 * Tanıtımdaki canlı Soro (Skia) ayrı; bu sürüm başlıklarda, sonuçlarda ve boş durumlarda duruma göre poz verir.
 *
 * - wave: el sallar (karşılama)  · think: yukarı bakar, ağzı "o" (devam eden oyun)
 * - cheer: iki kol havada, gözler "^ ^" (bitti, bildin) · sad: ağzı ters, kaşları düşük (kaçırdın, hata)
 * - sleep: gözler kapalı, "z" (boş yapboz, bekleme)  · happy: duruş (varsayılan)
 */
export type SoroMood = 'happy' | 'wave' | 'think' | 'cheer' | 'sad' | 'sleep';

const EYE_INK = '#19140E';
/** Sol üst kol (LIMBS[4]) omuz noktası; sevinirken buradan kalkar. */
const LEFT_ARM_PIVOT = { x: 19.2, y: 36.5 };
const LEFT_ARM_INDEX = 4;
const MOUTH = FACE_LINES[1];
const TONGUE = FACE_LINES[2];
const BROW = FACE_LINES[3];
const MOUTH_CENTER = { x: 40.4, y: 42.3 };
const BOB_MS = 1400;

/** `prop`: yanındaki eşya (Yapar mıydın? hikâyesinde her adımda değişir). */
export function SoroFigure({ size, mood = 'happy', animate = true, prop }: { size: number; mood?: SoroMood; animate?: boolean; prop?: StoryProp }) {
  const bob = useSharedValue(0);
  const reduced = useReducedMotion();
  const moving = animate && !reduced;

  useEffect(() => {
    if (!moving) return;
    // Hafif nefes/zıplama: yalnız transform (kompozitörde).
    const lift = mood === 'cheer' ? -0.08 : mood === 'sleep' ? -0.015 : -0.035;
    bob.set(
      withRepeat(
        withSequence(
          withTiming(lift * size, { duration: BOB_MS / 2, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: BOB_MS / 2, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [moving, mood, size, bob]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: bob.get() }] }));

  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Animated.View style={style}>
        <Svg width={size} height={size} viewBox={`0 0 ${SORO_VIEWBOX} ${SORO_VIEWBOX}`}>
          <Pose mood={mood} />
          {prop && <SoroProp id={prop} />}
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Kalkan kolun açısı ve omuzdan dışarı kayması: kol yukarı-dışarı bakar, gövdenin önünde çizilir. */
const RAISE_DEG = 62;
const RAISE_SHIFT = 2.4;

function Pose({ mood }: { mood: SoroMood }) {
  const rightUp = mood === 'wave' || mood === 'cheer';
  const leftUp = mood === 'cheer';
  return (
    <G>
      {LIMBS.map((p, i) => (i === LEFT_ARM_INDEX && leftUp ? null : <Part key={i} p={p} />))}
      {!rightUp && <Part p={WAVE_ARM} />}
      <Part p={HIP_HAND} />
      {BODY_PARTS.map((p, i) => (
        <Part key={i} p={p} />
      ))}
      {rightUp && <Part p={WAVE_ARM} transform={`translate(${RAISE_SHIFT} ${-RAISE_SHIFT}) rotate(${-RAISE_DEG} ${WAVE_PIVOT.x} ${WAVE_PIVOT.y})`} />}
      {leftUp && (
        <Part p={LIMBS[LEFT_ARM_INDEX]} transform={`translate(${-RAISE_SHIFT} ${-RAISE_SHIFT}) rotate(${RAISE_DEG} ${LEFT_ARM_PIVOT.x} ${LEFT_ARM_PIVOT.y})`} />
      )}
      <Oval o={BELLY} />
      <Part p={TAIL} />
      <Part p={FACE_LINES[0]} />
      <Eyes mood={mood} />
      {CHEEKS.map((o, i) => (
        <Oval key={i} o={o} />
      ))}
      <Mouth mood={mood} />
      <Part p={BROW} transform={mood === 'think' ? 'translate(0 -1.6)' : mood === 'sad' ? `rotate(14 47 30)` : undefined} />
      <Part p={CURL} transform={mood === 'think' ? 'rotate(-8 38.8 24.5)' : undefined} />
      {mood === 'sleep' && (
        <G fill={EYE_INK}>
          <SvgText x={56} y={24} fontSize={9} fontWeight="bold">
            z
          </SvgText>
          <SvgText x={63} y={16} fontSize={7} fontWeight="bold">
            z
          </SvgText>
        </G>
      )}
    </G>
  );
}

function Eyes({ mood }: { mood: SoroMood }) {
  if (mood === 'cheer') {
    // "^ ^": mutlu kapalı gözler.
    return (
      <G fill="none" stroke={EYE_INK} strokeWidth={2} strokeLinecap="round">
        <Path d="M27.4 39.4 Q31.2 34.2 35 39.4" />
        <Path d="M45.2 37.6 Q48.9 32.4 52.7 37.6" />
      </G>
    );
  }
  if (mood === 'sleep') {
    return (
      <G fill="none" stroke={EYE_INK} strokeWidth={1.8} strokeLinecap="round">
        <Path d="M27.4 38 Q31.2 41.4 35 38" />
        <Path d="M45.2 36.2 Q48.9 39.6 52.7 36.2" />
      </G>
    );
  }
  // think: yukarı-sola bakar; sad: göz kapakları hafif iner.
  const dx = mood === 'think' ? -0.9 : 0;
  const dy = mood === 'think' ? -1.3 : mood === 'sad' ? 0.6 : 0;
  const squash = mood === 'sad' ? 0.82 : 1;
  return (
    <G>
      {EYES.map(({ ball, shine }, i) => (
        <G key={i}>
          <Ellipse
            cx={ball.cx}
            cy={ball.cy + dy}
            rx={ball.rx}
            ry={ball.ry * squash}
            fill={ball.fill}
            transform={ball.rotate ? `rotate(${ball.rotate} ${ball.cx} ${ball.cy})` : undefined}
          />
          <Ellipse cx={shine.cx + dx} cy={shine.cy + dy * 1.4} rx={shine.r} ry={shine.r} fill="#FFFFFF" />
        </G>
      ))}
    </G>
  );
}

function Mouth({ mood }: { mood: SoroMood }) {
  const { x, y } = MOUTH_CENTER;
  if (mood === 'think' || mood === 'sleep') {
    return <Ellipse cx={x} cy={y} rx={mood === 'sleep' ? 1 : 1.5} ry={mood === 'sleep' ? 0.8 : 1.8} fill={EYE_INK} />;
  }
  if (mood === 'sad') {
    // Gülümsemenin ters çevrilmişi, dil yok.
    return <Part p={MOUTH} transform={`translate(0 ${2 * y + 0.6}) scale(1 -1) translate(0 0)`} />;
  }
  const grow = mood === 'cheer' ? `translate(${x} ${y}) scale(1.3) translate(${-x} ${-y})` : undefined;
  return (
    <G transform={grow}>
      <Part p={MOUTH} />
      <Part p={TONGUE} />
    </G>
  );
}

function Part({ p, transform }: { p: SoroPath; transform?: string }) {
  return <Path d={p.d} fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} strokeLinejoin="round" transform={transform} />;
}

function Oval({ o }: { o: SoroOval }) {
  return <Ellipse cx={o.cx} cy={o.cy} rx={o.rx} ry={o.ry} fill={o.fill} transform={o.rotate ? `rotate(${o.rotate} ${o.cx} ${o.cy})` : undefined} />;
}
