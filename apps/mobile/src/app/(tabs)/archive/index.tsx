import { router } from 'expo-router';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useArchive } from '@/api/hooks';
import type { ArchiveItem } from '@/api/types';
import { useFormatStyle } from '@/components/game/formatStyle';
import { Card, ErrorView, Icon, LoadingScreen, PressableScale, Screen, T, type IconName } from '@/components/ui';
import { FORMAT_LABEL, formatDay } from '@/lib/format';
import { font, fonts, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/** Son 7 günün soruları. Günde 1 tanesi ücretsiz, sonrakiler ödüllü reklamla açılır. Arşiv seriyi etkilemez. */
export default function ArchiveScreen() {
  const archive = useArchive();

  if (archive.isError) return <ErrorView error={archive.error} onRetry={() => void archive.refetch()} />;
  if (archive.isPending) return <LoadingScreen />;

  const played = archive.data.filter((i) => i.finished).length;
  // Kilitli satır varsa bugünkü ücretsiz hak kullanılmıştır.
  const freeUsed = archive.data.some((i) => i.locked);
  return (
    <Screen topInset={false} refreshControl={<RefreshControl refreshing={archive.isRefetching} onRefresh={() => void archive.refetch()} />}>
      <Card tone="muted" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Icon name="time-outline" size={22} />
        <T style={{ flex: 1 }} color="textMuted">
          {freeUsed
            ? 'Bugünkü ücretsiz arşiv hakkını kullandın. Diğer soruları kısa bir videoyla açabilirsin.'
            : 'Son 7 günden her gün 1 soru ücretsiz; sonrakiler kısa bir videoyla açılır. Arşiv oyunları serini etkilemez.'}
        </T>
        <T variant="bodyStrong">
          {played}/{archive.data.length}
        </T>
      </Card>
      {archive.data.length === 0 && <T color="textMuted">Henüz arşivde soru yok.</T>}
      {archive.data.map((item, i) => (
        <Animated.View key={item.day} entering={FadeInDown.delay(i * 50).springify().damping(16)}>
          <ArchiveRow item={item} />
        </Animated.View>
      ))}
    </Screen>
  );
}

function ArchiveRow({ item }: { item: ArchiveItem }) {
  const c = useColors();
  const f = useFormatStyle(item.format);
  const status: { label: string; bg: string; fg: string; icon?: IconName; a11y?: string } = item.cancelled
    ? { label: 'İptal', bg: c.surfaceMuted, fg: c.textMuted }
    : item.finished
      ? { label: item.score == null ? 'Bekliyor' : `${item.score}`, bg: item.score == null ? c.surfaceMuted : c.correctSoft, fg: item.score == null ? c.textMuted : c.correct }
      : item.started
        ? { label: 'Devam et', bg: c.higherSoft, fg: c.higher }
        : item.locked
          ? { label: 'Video', icon: 'play-circle', bg: c.surfaceMuted, fg: c.text, a11y: 'kilitli, video izleyerek açılır' }
          : { label: 'Oyna', bg: c.accent, fg: c.textOnAccent };

  return (
    <PressableScale
      haptic="select"
      accessibilityRole="button"
      accessibilityLabel={`#${item.no}, ${formatDay(item.day)}, ${FORMAT_LABEL[item.format]}, ${status.a11y ?? status.label}`}
      onPress={() => router.push(`/archive/${item.day}`)}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={[styles.icon, { backgroundColor: f.soft }]}>
          <Icon name={f.icon} size={22} color={f.color} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="caption" color="textMuted">
            #{item.no} · {formatDay(item.day)}
          </T>
          <T variant="bodyStrong" numberOfLines={2}>
            {item.prompt}
          </T>
        </View>
        <View style={[styles.status, { backgroundColor: status.bg }]}>
          {status.icon && <Icon name={status.icon} size={15} color={status.fg} />}
          <Text style={[font.caption, { fontFamily: fonts.black, color: status.fg }]}>{status.label}</Text>
        </View>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  icon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  status: { borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6, minWidth: 48, alignItems: 'center', flexDirection: 'row', gap: 4 },
});
