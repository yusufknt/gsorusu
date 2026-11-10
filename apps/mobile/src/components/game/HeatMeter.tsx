import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import type { Guess, PublicQuestion } from '@/api/types';
import { SoroSays } from '@/components/mascot/SoroSays';
import type { SoroMood } from '@/components/mascot/SoroFigure';
import { Card, Icon, Row, T } from '@/components/ui';
import { formatAmount } from '@/lib/format';
import { bounds, HEAT, heatOf, type Heat } from '@/lib/heat';
import { fonts, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

const TUBE_HEIGHT = 150;
const TUBE_WIDTH = 26;
const BULB = 46;

const LABEL: Record<Heat, string> = { none: 'Hazır', cold: 'Soğuk', warm: 'Ilık', hot: 'Sıcak', burning: 'Yanıyor', found: 'Buldun' };
const MOOD: Record<Heat, SoroMood> = { none: 'wave', cold: 'sad', warm: 'think', hot: 'think', burning: 'cheer', found: 'cheer' };

/**
 * Kaç? sahnesi: sıcak–soğuk termometresi. Tahmin yaklaştıkça termometre dolar ve rengi maviden kırmızıya
 * ısınır, Soro tepki verir; altında cevabın kesin olarak bulunduğu aralık yazar. Isının adı da yazılır
 * (renk tek başına anlam taşımaz).
 */
export function HeatMeter({ guesses, question }: { guesses: readonly Guess[]; question: PublicQuestion }) {
  const c = useColors();
  const heat = heatOf(guesses);
  const color: Record<Heat, string> = { none: c.border, cold: c.lower, warm: c.partial, hot: c.higher, burning: c.close, found: c.correct };
  const level = useSharedValue(0);
  useEffect(() => {
    level.set(withSpring(HEAT[heat].level, { damping: 14, stiffness: 90 }));
  }, [heat, level]);
  const fill = useAnimatedStyle(() => ({ height: `${level.get() * 100}%` }));

  const { low, high } = bounds(guesses);
  const range =
    heat === 'found' || (low === null && high === null)
      ? null
      : low !== null && high !== null
        ? `${formatAmount(low, question.unit)} ile ${formatAmount(high, question.unit)} arasında`
        : low !== null
          ? `${formatAmount(low, question.unit)}’den fazla`
          : `${formatAmount(high!, question.unit)}’den az`;

  return (
    <Card style={styles.card}>
      <View style={styles.meter} accessible accessibilityLabel={`Isı: ${LABEL[heat]}. ${range ? `Cevap ${range}.` : ''}`}>
        <View style={[styles.tube, { borderColor: c.text, backgroundColor: c.surfaceMuted }]}>
          <Animated.View style={[styles.mercury, { backgroundColor: color[heat] }, fill]} />
          {[0.25, 0.5, 0.75].map((t) => (
            <View key={t} style={[styles.tick, { bottom: `${t * 100}%`, backgroundColor: c.text }]} />
          ))}
        </View>
        <View style={[styles.bulb, { borderColor: c.text, backgroundColor: heat === 'none' ? c.surfaceMuted : color[heat] }]} />
        <Text style={[styles.heatLabel, { color: c.text }]}>{LABEL[heat]}</Text>
      </View>

      <View style={styles.side}>
        <SoroSays mood={MOOD[heat]} text={HEAT[heat].say} size={84} />
        {range && (
          <Row style={[styles.range, { backgroundColor: c.surfaceMuted }]}>
            <Icon name="arrow-down-up" size={18} />
            <View style={{ flex: 1 }}>
              <T variant="caption" color="textMuted">
                Cevap
              </T>
              <T variant="bodyStrong">{range}</T>
            </View>
          </Row>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  meter: { alignItems: 'center', width: 64 },
  tube: { width: TUBE_WIDTH, height: TUBE_HEIGHT, borderWidth: 2, borderBottomWidth: 0, borderTopLeftRadius: TUBE_WIDTH / 2, borderTopRightRadius: TUBE_WIDTH / 2, overflow: 'hidden', justifyContent: 'flex-end' },
  mercury: { width: '100%' },
  tick: { position: 'absolute', right: 0, width: 8, height: 2 },
  bulb: { width: BULB, height: BULB, borderRadius: BULB / 2, borderWidth: 2, marginTop: -6 },
  heatLabel: { fontFamily: fonts.black, fontSize: 14, marginTop: space.xs },
  side: { flex: 1, gap: space.md, minWidth: 0 },
  range: { gap: space.sm, borderRadius: radius.md, padding: space.sm },
});
