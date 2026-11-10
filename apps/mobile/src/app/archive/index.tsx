import { router } from 'expo-router';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { useArchive } from '@/api/hooks';
import type { DaySet } from '@/api/types';
import { Card, ErrorView, Icon, LoadingScreen, PressableScale, Row, Screen, T } from '@/components/ui';
import { formatDay } from '@/lib/format';
import { modeStyle, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/** Son 7 günün setleri. Arşiv oyunları seriyi ve yapbozu etkilemez. */
export default function ArchiveScreen() {
  const c = useColors();
  const archive = useArchive();

  if (archive.isError) return <ErrorView error={archive.error} onRetry={() => void archive.refetch()} />;
  if (archive.isPending) return <LoadingScreen />;

  return (
    <Screen
      topInset={false}
      refreshControl={<RefreshControl refreshing={archive.isRefetching} onRefresh={() => void archive.refetch()} tintColor={c.accent} />}>
      <T color="textMuted">Son 7 günün soruları. Her gün bir günü ücretsiz açabilirsin; arşiv oyunları serini etkilemez.</T>
      {archive.data.length === 0 ? (
        <Card tone="muted" style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <T center color="textMuted">
            Henüz geçmiş gün yok.
          </T>
        </Card>
      ) : (
        archive.data.map((set) => <DayRow key={set.day} set={set} />)
      )}
    </Screen>
  );
}

function DayRow({ set }: { set: DaySet }) {
  const c = useColors();
  const status = set.locked ? 'Kilitli' : set.complete ? 'Tamam' : set.finishedCount > 0 ? `${set.finishedCount}/3` : 'Oynanmadı';
  return (
    <PressableScale
      haptic="select"
      accessibilityRole="button"
      accessibilityLabel={`#${set.no}, ${formatDay(set.day)}, ${status}`}
      onPress={() => router.push(`/archive/${set.day}`)}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="bodyStrong">{formatDay(set.day)}</T>
          <Row style={{ gap: 6 }}>
            {set.modes.map((m) => (
              <View key={m.mode} style={[styles.dot, { backgroundColor: m.finished ? modeStyle[m.mode].color : c.surfaceSunken }]} />
            ))}
            <T variant="caption" color="textMuted">
              #{set.no} · {status}
            </T>
          </Row>
        </View>
        <Icon name={set.locked ? 'lock-closed' : 'chevron-forward'} size={18} color={c.textSubtle} />
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({ dot: { width: 10, height: 10, borderRadius: radius.pill } });
