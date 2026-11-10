import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/** Adım göstergesi: etkin nokta uzar ve koyulaşır; kaydırırken parmağı izler. */
export function StepDots({ count, step, current }: { count: number; step: SharedValue<number>; current: number }) {
  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: count, now: current + 1 }}>
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} i={i} step={step} />
      ))}
    </View>
  );
}

function Dot({ i, step }: { i: number; step: SharedValue<number> }) {
  const c = useColors();
  const style = useAnimatedStyle(() => {
    const on = interpolate(step.get(), [i - 1, i, i + 1], [0, 1, 0], 'clamp');
    return { opacity: 0.25 + 0.75 * on, transform: [{ scaleX: 1 + 1.6 * on }] };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: c.accent }, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: space.lg },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
});
