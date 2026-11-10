import { StyleSheet, Text, View } from 'react-native';

import type { ModeSummary } from '@/api/types';
import { Icon, PressableScale, T } from '@/components/ui';
import { ModeCover } from '@/components/today/ModeCover';
import { MODE_LABEL, MODE_RULE } from '@/lib/modes';
import { font, fonts, modeStyle, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/**
 * Günün bir modu (gazete bulmacası sitesindeki oyun kartları gibi): üstte modu anlatan fotoğraflı kapak
 * (ModeCover), altta serif ad, tek satır kural ve düğme. Bitince kapakta sonuç rozeti çıkar.
 */
export function ModeCard({ summary, index, large = false, onPress }: { summary: ModeSummary; index: number; large?: boolean; onPress: () => void }) {
  const c = useColors();
  const m = modeStyle[summary.mode];
  const { finished, started } = summary;
  const status = finished ? 'Bitti' : started ? 'Devam ediyor' : 'Oynanmadı';
  const ok = summary.solved || summary.scorePending;
  const cta = finished ? 'Sonuca bak' : started ? 'Devam et' : 'Oyna';

  return (
    <PressableScale
      haptic="select"
      accessibilityRole="button"
      accessibilityLabel={`${index + 1}. ${MODE_LABEL[summary.mode]}. ${status}${summary.result ? `, ${summary.result}` : ''}`}
      onPress={onPress}
      containerStyle={styles.cell}
      style={[styles.card, { borderColor: c.border, backgroundColor: c.surface }]}>
      {/* Geniş ekranda bant kartla birlikte büyür (masaüstünde ekranı doldursun). */}
      <View style={[styles.band, large ? styles.bandLarge : styles.bandSmall, { backgroundColor: m.color }]}>
        <ModeCover mode={summary.mode} large={large} />
        <View style={[styles.numberPill, { backgroundColor: m.color }, large && styles.numberPillLarge]}>
          <Text style={[styles.number, large && { fontSize: 18 }]}>{index + 1}</Text>
        </View>
        {finished && (
          <View style={[styles.badge, { backgroundColor: c.surface }]}>
            <Icon name={ok ? 'checkmark-circle' : 'close-circle'} size={16} color={ok ? c.correct : c.close} />
            {summary.result && <Text style={[styles.badgeText, { color: c.text }]}>{summary.result}</Text>}
          </View>
        )}
      </View>

      <View style={[styles.body, large && styles.bodyLarge]}>
        <Text style={[font.title, styles.title, large && styles.titleLarge, { color: c.text }]} numberOfLines={1}>
          {MODE_LABEL[summary.mode]}
        </Text>
        <T variant={large ? 'body' : 'caption'} color="textMuted" numberOfLines={2} style={styles.rule}>
          {started && !finished ? summary.teaser : MODE_RULE[summary.mode]}
        </T>
        <View style={[styles.cta, finished ? { borderWidth: 1, borderColor: c.text } : { backgroundColor: c.text }]}>
          <Text style={[styles.ctaText, { color: finished ? c.text : c.background }]}>{cta}</Text>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  cell: { flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden', flexGrow: 1 },
  band: { alignItems: 'center', justifyContent: 'center' },
  bandSmall: { height: 104 },
  bandLarge: { aspectRatio: 3 },
  numberPill: {
    position: 'absolute',
    left: space.sm,
    top: space.sm,
    minWidth: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberPillLarge: { minWidth: 34, height: 34, left: space.md, top: space.md },
  number: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 18, color: '#FFFFFF' },
  badge: { position: 'absolute', right: space.sm, top: space.sm, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.black, fontSize: 12 },
  body: { padding: space.md, gap: space.xs, flexGrow: 1 },
  bodyLarge: { padding: space.lg },
  title: { fontSize: 21, lineHeight: 25 },
  titleLarge: { fontSize: 28, lineHeight: 32 },
  rule: { minHeight: 36 },
  cta: { marginTop: space.sm, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: 8 },
  ctaText: { fontFamily: fonts.bold, fontSize: 14 },
});
