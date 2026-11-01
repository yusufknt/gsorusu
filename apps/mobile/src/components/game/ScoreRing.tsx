import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { font, fonts } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 168;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
const DURATION = 1100;

/** 0'dan sayarak dolan puan halkası. */
export function ScoreRing({ score }: { score: number }) {
  const c = useColors();
  const progress = useSharedValue(0);
  const shown = useCountUp(score, DURATION);
  const color = score >= 70 ? c.correct : score >= 40 ? c.accent : c.close;

  useEffect(() => {
    progress.set(withTiming(score / 100, { duration: DURATION, easing: Easing.out(Easing.cubic) }));
  }, [score, progress]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: CIRC * (1 - progress.get()) }));

  return (
    <View style={styles.wrap} accessible accessibilityLabel={`${score} puan`}>
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={c.surfaceMuted} strokeWidth={STROKE} fill="none" />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[font.display, { fontFamily: fonts.black, color: c.text }]}>{shown}</Text>
        <Text style={[font.bodyStrong, { color: c.textMuted, marginTop: -8 }]}>puan</Text>
      </View>
    </View>
  );
}

function useCountUp(target: number, duration: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignSelf: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
