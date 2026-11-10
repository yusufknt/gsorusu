import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SoroSays } from '@/components/mascot/SoroSays';
import type { SoroMood } from '@/components/mascot/SoroFigure';
import { T, useWide } from '@/components/ui';
import { font, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/**
 * Her sekmenin açılış kalıbı (gazete manşeti): üstte büyük harfli etiket, serif başlık, kısa açıklama;
 * sağda (dar ekranda altta) konuşan Soro; en altta kalın çizgi. `children` başlığın altına (ör. ilerleme).
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  mood,
  say,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  mood?: SoroMood;
  say?: string;
  children?: ReactNode;
}) {
  const c = useColors();
  const wide = useWide();
  const soro = mood ? <SoroSays mood={mood} text={say} size={wide ? 120 : 72} /> : null;

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={[styles.hero, { borderBottomColor: c.text }]}>
      <View style={[styles.top, wide && styles.topWide]}>
        <View style={[styles.text, wide && { flex: 1 }]}>
          {eyebrow && (
            <T variant="label" color="textMuted">
              {eyebrow}
            </T>
          )}
          <Text style={[font.display, styles.title, { color: c.text }, !wide && styles.titleNarrow]} accessibilityRole="header">
            {title}
          </Text>
          {subtitle && <T color="textMuted">{subtitle}</T>}
        </View>
        {soro && <View style={wide ? styles.soroWide : undefined}>{soro}</View>}
      </View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.md, borderBottomWidth: 3, paddingBottom: space.lg },
  top: { gap: space.md },
  topWide: { flexDirection: 'row', alignItems: 'flex-end', gap: space.xl },
  text: { gap: space.xs, minWidth: 300 },
  title: { fontSize: 56, lineHeight: 60 },
  titleNarrow: { fontSize: 36, lineHeight: 40 },
  soroWide: { flexShrink: 1, maxWidth: 360 },
});
