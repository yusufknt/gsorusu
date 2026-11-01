import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { mulberry32 } from '@/mock/rules';

const COLORS = ['#F2621B', '#2F6BFF', '#169E5D', '#E5484D', '#F5B700', '#8B5CF6', '#0E9F9A'];
const COUNT = 42;

/** Bildiğinde ekranın üstünden dökülen konfeti (yalnızca bir kez oynar). */
export function Confetti() {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(() => {
    // Saf render için sabit tohumlu rastgelelik (her açılışta aynı, ama göze rastgele görünür).
    const random = mulberry32(42);
    return Array.from({ length: COUNT }, (_, i) => ({
        x: random() * width,
        drift: (random() - 0.5) * 160,
        size: 7 + random() * 7,
        delay: random() * 300,
        spin: (random() - 0.5) * 900,
        color: COLORS[i % COLORS.length],
        round: random() > 0.6,
      }));
  }, [width]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
      {pieces.map((p, i) => (
        <Piece key={i} {...p} fall={height * 0.9} />
      ))}
    </View>
  );
}

function Piece({ x, drift, size, delay, spin, color, round, fall }: { x: number; drift: number; size: number; delay: number; spin: number; color: string; round: boolean; fall: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withTiming(1, { duration: 1900, easing: Easing.out(Easing.quad) })));
  }, [t, delay]);
  const style = useAnimatedStyle(() => {
    const v = t.get();
    return {
      opacity: v < 0.8 ? 1 : (1 - v) * 5,
      transform: [{ translateX: x + drift * v }, { translateY: -40 + fall * v }, { rotate: `${spin * v}deg` }],
    };
  });
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: 0, top: 0, width: size, height: round ? size : size * 0.45, borderRadius: round ? size / 2 : 2, backgroundColor: color },
        style,
      ]}
    />
  );
}
