import { StyleSheet } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { Icon, T, type IconName } from '@/components/ui';
import { fonts, radius, shadow, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/** Sahnenin üstünde, ne yapılabileceğini söyleyen küçük ipucu; biraz bekleyip belirir, dokunuşu engellemez. */
export function SceneHint({ icon, text }: { icon: IconName; text: string }) {
  const c = useColors();
  return (
    <Animated.View
      entering={FadeIn.delay(900).duration(300).reduceMotion(ReduceMotion.System)}
      pointerEvents="none"
      style={[styles.pill, { backgroundColor: c.surface, borderColor: c.border, ...shadow(c.shadow, 1) }]}>
      <Icon name={icon} size={15} color={c.textMuted} />
      <T variant="caption" color="textMuted" style={styles.text}>
        {text}
      </T>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    top: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { fontFamily: fonts.bold },
});
