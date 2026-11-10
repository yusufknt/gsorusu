import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { font, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

import { SoroFigure, type SoroMood } from './SoroFigure';

/**
 * Soro ve konuşma balonu (çizgi roman gibi ince siyah çerçeve). Başlıklarda, sonuçta ve boş durumlarda
 * aynı kalıp: solda Soro, sağda balon. `bubble` false ise yalnız Soro.
 */
export function SoroSays({ mood, text, size = 88, align = 'center' }: { mood: SoroMood; text?: string; size?: number; align?: 'center' | 'end' }) {
  const c = useColors();
  return (
    <View style={[styles.row, { alignItems: align === 'end' ? 'flex-end' : 'center' }]} accessibilityRole="text" accessibilityLabel={text ? `Soro: ${text}` : undefined}>
      <SoroFigure size={size} mood={mood} />
      {text ? (
        <Animated.View entering={FadeIn.delay(150).duration(250)} style={[styles.bubble, { borderColor: c.text, backgroundColor: c.surface }]}>
          {/* Balonun Soro'ya bakan kuyruğu: döndürülmüş kare, iki kenarı çerçeveli. */}
          <View style={[styles.tail, { borderColor: c.text, backgroundColor: c.surface }]} />
          <Text style={[font.bodyStrong, { color: c.text }]}>{text}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md },
  bubble: { flexShrink: 1, borderWidth: 1.5, borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: space.sm, marginLeft: 4 },
  tail: {
    position: 'absolute',
    left: -7,
    top: '50%',
    marginTop: -6,
    width: 12,
    height: 12,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    transform: [{ rotate: '45deg' }],
  },
});
