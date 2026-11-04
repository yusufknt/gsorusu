import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { serverNow } from '@/api/client';
import { useLeague, useLeaveLeague, useMe, useRemoveMember } from '@/api/hooks';
import type { League, LeagueCell, LeagueDay, LeagueStanding } from '@/api/types';
import { Button, Card, ErrorView, Icon, InlineError, LoadingScreen, PressableScale, Row, Screen, T, useToast } from '@/components/ui';
import { addDays, formatWeekRange, istanbulDay, shortWeekday } from '@/lib/format';
import { weekStart } from '@/lib/league';
import { useHaptics } from '@/lib/haptics';
import { formatLeagueCode, leagueInviteText } from '@/lib/share';
import { font, fonts, radius, space, type ThemeColors } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

const RANK_W = 34;
const CELL = 20;
const CELL_GAP = 5;
const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeagueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [week, setWeek] = useState<string | null>(null);
  const league = useLeague(id, week);
  const me = useMe();

  if (league.isError) return <ErrorView error={league.error} onRetry={() => void league.refetch()} />;
  if (league.isPending) return <LoadingScreen />;

  const l = league.data;
  return (
    <Screen
      topInset={false}
      refreshControl={<RefreshControl refreshing={league.isRefetching && !league.isPlaceholderData} onRefresh={() => void league.refetch()} />}>
      <Stack.Screen options={{ title: l.name }} />

      <InviteCard league={l} />

      <WeekSwitcher league={l} loading={league.isPlaceholderData} onChange={setWeek} />
      {!l.week.isCurrent && <WinnerBanner league={l} />}

      <Card padded={false} style={{ paddingTop: space.sm, overflow: 'hidden' }}>
        <DayHeader days={l.week.days} isCurrent={l.week.isCurrent} />
        {l.standings.map((s, i) => (
          <Animated.View key={s.playerId} entering={FadeInDown.delay(i * 40).springify().damping(18)}>
            <StandingRow league={l} standing={s} days={l.week.days} last={i === l.standings.length - 1} />
          </Animated.View>
        ))}
      </Card>
      <Legend />

      {me.data && <LeaveButton league={l} myId={me.data.playerId} />}
    </Screen>
  );
}

function InviteCard({ league: l }: { league: League }) {
  const c = useColors();
  const toast = useToast();
  const alone = l.memberCount === 1;
  return (
    <Card style={{ gap: space.md }}>
      {alone && (
        <View style={{ gap: 2 }}>
          <T variant="bodyStrong">Lig hazır! 🎉</T>
          <T color="textMuted">Kodu paylaş; arkadaşların katıldıkça sıralama burada görünecek.</T>
        </View>
      )}
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <T variant="label" color="textMuted">
            Davet kodu
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Davet kodu ${l.code.split('').join(' ')}. Kopyalamak için dokun.`}
            onPress={async () => {
              await Clipboard.setStringAsync(l.code);
              toast('Kod kopyalandı');
            }}>
            <Text style={[styles.code, { color: c.text }]}>{formatLeagueCode(l.code)}</Text>
          </Pressable>
        </View>
        <T variant="caption" color="textMuted">
          {l.memberCount}/{l.maxMembers} kişi
        </T>
      </Row>
      <Button
        title="Davet et"
        icon="share-social"
        kind={alone ? 'primary' : 'secondary'}
        onPress={() => void Share.share({ message: leagueInviteText(l.name, l.code) })}
      />
    </Card>
  );
}

function WeekSwitcher({ league: l, loading, onChange }: { league: League; loading: boolean; onChange: (week: string | null) => void }) {
  const c = useColors();
  const w = l.week;
  const current = weekStart(istanbulDay(serverNow()));
  const title = w.isCurrent ? 'Bu hafta' : addDays(w.start, 7) === current ? 'Geçen hafta' : 'Önceki haftalar';
  const arrow = (target: string | null, icon: 'chevron-back' | 'chevron-forward', label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !target }}
      disabled={!target}
      hitSlop={8}
      // Bu haftaya dönüş week=null ile: önbellekteki güncel tablo (ve oyun bitince tazelenen) kullanılır.
      onPress={() => onChange(target === current ? null : target)}
      style={[styles.arrow, { backgroundColor: c.surface, opacity: target ? 1 : 0.3 }]}>
      <Icon name={icon} size={20} />
    </Pressable>
  );
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
      {arrow(w.previous, 'chevron-back', 'Önceki hafta')}
      <View style={{ alignItems: 'center', opacity: loading ? 0.5 : 1 }}>
        <T variant="bodyStrong">{title}</T>
        <T variant="caption" color="textMuted">
          {formatWeekRange(w.start, w.end)}
        </T>
      </View>
      {arrow(w.next, 'chevron-forward', 'Sonraki hafta')}
    </Row>
  );
}

function WinnerBanner({ league: l }: { league: League }) {
  const c = useColors();
  const top = l.standings.filter((s) => s.rank === 1 && s.total > 0);
  if (top.length === 0) return null;
  return (
    <Animated.View entering={FadeIn}>
      <Card tone="muted" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Text style={{ fontSize: 30 }} accessible={false}>
          🏆
        </Text>
        <View style={{ flex: 1 }}>
          <T variant="label" color="textMuted">
            {top.length > 1 ? 'Haftanın birincileri' : 'Haftanın birincisi'}
          </T>
          <T variant="bodyStrong">{top.map((s) => s.displayName).join(', ')}</T>
        </View>
        <Text style={[font.title, { color: c.accent }]}>{top[0].total}</Text>
      </Card>
    </Animated.View>
  );
}

function DayHeader({ days, isCurrent }: { days: LeagueDay[]; isCurrent: boolean }) {
  const c = useColors();
  const todayIndex = isCurrent ? lastPlayableIndex(days) : -1;
  return (
    <Row style={[styles.row, { paddingBottom: space.xs }]}>
      <View style={{ width: RANK_W }} />
      <View style={{ flex: 1 }}>
        <Row style={{ gap: CELL_GAP }}>
          {days.map((d, i) => (
            <Text
              key={d.day}
              style={[styles.dayLabel, { color: i === todayIndex ? c.accent : c.textSubtle }]}
              accessible={false}>
              {shortWeekday(d.day)}
            </Text>
          ))}
        </Row>
      </View>
      <T variant="caption" color="textSubtle">
        Puan
      </T>
    </Row>
  );
}

function StandingRow({ league: l, standing: s, days, last }: { league: League; standing: LeagueStanding; days: LeagueDay[]; last: boolean }) {
  const c = useColors();
  const remove = useRemoveMember(l.id);
  const toast = useToast();
  const buzz = useHaptics();
  const canRemove = l.isOwner && !s.isMe;
  // Tek başınayken madalya anlamsız; puan almamış olana da verilmez.
  const medal = l.memberCount > 1 && s.total > 0 && s.rank <= 3 ? MEDAL[s.rank - 1] : null;
  const pending = s.days.some((d) => d.played && d.score === null);

  const confirmRemove = () => {
    buzz('warning');
    Alert.alert(s.displayName, 'Bu oyuncuyu ligden çıkarmak istiyor musun? Kodla yeniden katılabilir.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Ligden çıkar',
        style: 'destructive',
        onPress: () => remove.mutate(s.playerId, { onSuccess: () => toast('Oyuncu ligden çıkarıldı'), onError: () => toast('Oyuncu çıkarılamadı') }),
      },
    ]);
  };

  const body = (
    <View
      style={[
        styles.row,
        { paddingVertical: space.md },
        s.isMe && { backgroundColor: c.accentSoft },
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
      ]}>
      <Row>
        <View style={{ width: RANK_W, alignItems: 'center' }}>
          {medal ? <Text style={styles.medal}>{medal}</Text> : <Text style={[styles.rank, { color: c.textMuted }]}>{s.rank}</Text>}
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Row style={{ gap: space.xs }}>
            <Text style={[font.bodyStrong, { color: c.text, flexShrink: 1 }]} numberOfLines={1}>
              {s.displayName}
            </Text>
            {s.isMe && <Tag label="sen" color={c.accent} />}
            {s.isOwner && <Icon name="star" size={13} color={c.warning} />}
          </Row>
          <Row style={{ gap: CELL_GAP }}>
            {s.days.map((cell, i) => (
              <View key={days[i].day} style={[styles.cell, cellStyle(cell, days[i], c, s.isMe)]} />
            ))}
          </Row>
        </View>
        <View style={{ alignItems: 'flex-end', minWidth: 44 }}>
          <Text style={[font.title, { color: c.text }]}>{s.total}</Text>
          {pending && <Icon name="hourglass-outline" size={12} color={c.textMuted} />}
        </View>
      </Row>
    </View>
  );

  const label = `${s.rank}. ${s.displayName}${s.isMe ? ' (sen)' : ''}, ${s.total} puan, ${s.played} gün oynadı`;
  return canRemove ? (
    <PressableScale haptic={null} accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Ligden çıkarmak için dokun" onPress={confirmRemove}>
      {body}
    </PressableScale>
  ) : (
    <View accessible accessibilityLabel={label}>
      {body}
    </View>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

/** Kare rengi: puan arttıkça koyulaşan yeşil; oynanmayan, bekleyen, iptal ve gelecek günler ayrı. */
function cellStyle(cell: LeagueCell, day: LeagueDay, c: ThemeColors, onAccent = false) {
  if (day.future) return { borderWidth: 1.5, borderColor: onAccent ? c.accent : c.border, borderStyle: 'dashed' as const, opacity: onAccent ? 0.4 : 1 };
  if (day.cancelled) return { backgroundColor: c.wrongSoft };
  // Kendi satırın turuncu zeminde; boş kare orada beyaz görünür.
  if (!cell.played) return { backgroundColor: onAccent ? c.surface : c.surfaceMuted };
  if (cell.score === null) return { backgroundColor: c.lowerSoft, borderWidth: 1.5, borderColor: c.lower };
  const alpha = cell.score >= 80 ? 'FF' : cell.score >= 50 ? 'B3' : cell.score >= 20 ? '73' : '40';
  return { backgroundColor: `${c.correct}${alpha}` };
}

function lastPlayableIndex(days: LeagueDay[]): number {
  for (let i = days.length - 1; i >= 0; i--) if (!days[i].future) return i;
  return -1;
}

function Legend() {
  const c = useColors();
  const item = (style: object, label: string) => (
    <Row style={{ gap: 6 }}>
      <View style={[styles.cell, style]} />
      <T variant="caption" color="textMuted">
        {label}
      </T>
    </Row>
  );
  return (
    <View style={styles.legend}>
      {item({ backgroundColor: c.correct }, '80+ puan')}
      {item({ backgroundColor: `${c.correct}73` }, 'düşük puan')}
      {item({ backgroundColor: c.surfaceMuted }, 'oynamadı')}
      {item({ backgroundColor: c.lowerSoft, borderWidth: 1.5, borderColor: c.lower }, 'anket, puan yarın')}
    </View>
  );
}

function LeaveButton({ league: l, myId }: { league: League; myId: string }) {
  const leave = useLeaveLeague(l.id);
  const toast = useToast();
  const message =
    l.memberCount === 1
      ? 'Ligde başka kimse olmadığı için lig silinecek.'
      : l.isOwner
        ? 'Ligin sahipliği en eski üyeye geçecek. Kodla istediğin zaman geri katılabilirsin.'
        : 'Kodla istediğin zaman geri katılabilirsin; puanların kaybolmaz.';
  return (
    <>
      <Button
        title="Ligden ayrıl"
        icon="exit-outline"
        kind="ghost"
        loading={leave.isPending}
        onPress={() =>
          Alert.alert('Ligden ayrıl', message, [
            { text: 'Vazgeç', style: 'cancel' },
            {
              text: 'Ayrıl',
              style: 'destructive',
              onPress: () =>
                leave.mutate(myId, {
                  onSuccess: () => {
                    toast('Ligden ayrıldın');
                    router.back();
                  },
                }),
            },
          ])
        }
      />
      <InlineError error={leave.error} />
    </>
  );
}

const styles = StyleSheet.create({
  code: { fontFamily: fonts.black, fontSize: 30, lineHeight: 38, letterSpacing: 3 },
  arrow: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  row: { paddingHorizontal: space.md },
  rank: { fontFamily: fonts.black, fontSize: 17 },
  medal: { fontSize: 22 },
  cell: { width: CELL, height: CELL, borderRadius: 6 },
  dayLabel: { width: CELL, fontFamily: fonts.extrabold, fontSize: 10, textAlign: 'center' },
  tag: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 6 },
  tagText: { fontFamily: fonts.extrabold, fontSize: 10, lineHeight: 15 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' },
});
