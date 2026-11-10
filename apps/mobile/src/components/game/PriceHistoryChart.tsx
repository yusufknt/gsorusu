import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import type { PricePoint } from '@/api/types';
import { T } from '@/components/ui';
import { formatAmount } from '@/lib/format';
import { fonts, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

const PLOT_HEIGHT = 110;
const BAR_WIDTH = 24;

/**
 * Kaç? cevabından sonra: fiyatın yıllar içindeki değişimi. Tek seri sütun grafik, eskiden yeniye; en sağda
 * bugünkü cevap vurgulu. Her sütunun değeri üstünde, yılı altında yazar (az sütun var, hepsi okunur).
 */
export function PriceHistoryChart({ history, today, unit }: { history: PricePoint[]; today: number | null; unit: string | null }) {
  const c = useColors();
  const points = [
    ...[...history].sort((a, b) => a.date.localeCompare(b.date)).map((p) => ({ label: p.date.slice(0, 4), value: p.price, now: false })),
    ...(today !== null ? [{ label: 'Bugün', value: today, now: true }] : []),
  ];
  const max = Math.max(...points.map((p) => p.value), 1);
  const first = points[0]?.value;
  const growth = first && today !== null && first > 0 ? Math.round(today / first) : null;

  return (
    <View style={{ gap: space.sm }}>
      <T variant="label" color="textMuted">
        Yıllar içinde
      </T>
      <View style={styles.plot} accessible accessibilityLabel={points.map((p) => `${p.label}: ${formatAmount(p.value, unit)}`).join(', ')}>
        {points.map((p, i) => (
          <Column key={p.label} value={formatAmount(p.value, unit)} height={(p.value / max) * PLOT_HEIGHT} label={p.label} color={p.now ? c.accent : c.textSubtle} strong={p.now} delay={i * 120} />
        ))}
      </View>
      {growth !== null && growth >= 2 && (
        <T variant="caption" color="textMuted">
          {points[0].label}’den bu yana yaklaşık {growth} kat.
        </T>
      )}
    </View>
  );
}

function Column({ value, height, label, color, strong, delay }: { value: string; height: number; label: string; color: string; strong: boolean; delay: number }) {
  const c = useColors();
  const h = useSharedValue(0);
  useEffect(() => {
    h.set(withDelay(delay, withTiming(Math.max(4, height), { duration: 600 })));
  }, [height, delay, h]);
  const bar = useAnimatedStyle(() => ({ height: h.get() }));
  return (
    <View style={styles.col}>
      <Text style={[styles.value, { color: strong ? c.text : c.textMuted, fontFamily: strong ? fonts.black : fonts.bold }]} numberOfLines={1}>
        {value}
      </Text>
      <Animated.View style={[styles.bar, { backgroundColor: color }, bar]} />
      {/* Sütunlar bitişik: her sütunun taban çizgisi birleşip tek çizgi olur. */}
      <View style={[styles.baseline, { backgroundColor: c.border }]} />
      <Text style={[styles.label, { color: strong ? c.text : c.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end', minHeight: PLOT_HEIGHT + 48 },
  col: { alignItems: 'center', gap: 4, flex: 1 },
  value: { fontSize: 12 },
  bar: { width: BAR_WIDTH, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  label: { fontFamily: fonts.bold, fontSize: 12 },
  baseline: { height: 1, alignSelf: 'stretch', marginTop: -4 },
});
