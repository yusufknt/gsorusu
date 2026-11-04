import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useArchive, useCrowd } from '@/api/hooks';
import { Icon, PressableScale } from '@/components/ui';
import { addDays } from '@/lib/format';
import { yesterdaySummary } from '@/lib/yesterday';
import { font, fonts, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/**
 * Bugün ekranında, soru bitmeden önce tek satır: dünkü sonucun ya da kaçırılan gün için arşiv çağrısı.
 * Yeni uç nokta gerekmez: arşiv listesi ve geçmiş günün dağılımı kullanılır.
 */
export function YesterdayStrip({ today }: { today: string }) {
  const c = useColors();
  const day = addDays(today, -1);
  const archive = useArchive();
  const item = archive.data?.find((i) => i.day === day);
  const crowd = useCrowd(day, !!item && !item.cancelled);
  const s = yesterdaySummary(item, crowd.data);
  if (!s) return null;

  const accent = s.tone === 'good' ? c.correct : s.tone === 'call' ? c.accent : c.textMuted;
  const soft = s.tone === 'good' ? c.correctSoft : s.tone === 'call' ? c.accentSoft : c.surfaceMuted;
  const icon = s.tone === 'good' ? 'trending-up' : s.tone === 'call' ? 'time-outline' : 'stats-chart';

  return (
    <Animated.View entering={FadeInDown.delay(150).duration(350)}>
      <PressableScale
        haptic="select"
        accessibilityRole="button"
        accessibilityLabel={`${s.title}. ${s.subtitle}`}
        accessibilityHint="Dünün sorusunu arşivde açar"
        // Arşiv başka bir sekme: withAnchor ile altta arşiv listesi de kurulur.
        onPress={() => router.navigate(`/archive/${day}`, { withAnchor: true })}
        style={[styles.strip, { backgroundColor: soft }]}>
        <View style={[styles.icon, { backgroundColor: accent }]}>
          <Icon name={icon} size={16} color={c.textOnAccent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[font.bodyStrong, { color: c.text }]} numberOfLines={1}>
            {s.title}
          </Text>
          <Text style={[font.caption, { color: c.textMuted }]} numberOfLines={2}>
            {s.subtitle}
          </Text>
        </View>
        <Text style={[styles.action, { color: accent }]}>{s.actionLabel}</Text>
        <Icon name="chevron-forward" size={16} color={accent} />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: space.md },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  action: { fontFamily: fonts.extrabold, fontSize: 14 },
});
