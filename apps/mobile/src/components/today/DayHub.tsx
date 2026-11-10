import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAds } from '@/ads/AdsProvider';
import { useDay, useStats, useUnlockDay } from '@/api/hooks';
import type { DailyMode, DaySet, Stats } from '@/api/types';
import { Columns } from '@/components/layout/Columns';
import { PageHero } from '@/components/layout/PageHero';
import { SoroFigure, type SoroMood } from '@/components/mascot/SoroFigure';
import { StreakPuzzle } from '@/components/streak/StreakPuzzle';
import { StreakRepairCard } from '@/components/StreakRepairCard';
import { Button, Card, ErrorView, Icon, InlineError, LinkRow, LoadingScreen, PressableScale, Row, Screen, T, useWide } from '@/components/ui';
import { addDays, formatDay } from '@/lib/format';
import { MODE_LABEL } from '@/lib/modes';
import { font, fonts, modeStyle, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

import { NextSetCountdown } from './NextSetCountdown';
import { DayRankCard } from './DayRankCard';
import { ModeCard } from './ModeCard';

/** Bu saatten sonra oynanmamış gün için Soro seriyi hatırlatır. */
const EVENING_HOUR = 18;
/** Geniş ekranda yan sütundaki yapbozun genişliği (yan sütun tokens.layout.side). */
const PUZZLE_SIDE_WIDTH = 330;

/**
 * Günün merkezi (Loldle'ın mod listesi gibi): dört mod kartı, ilerleme, seri yapbozu.
 * `day` verilmezse bugün (Bugün sekmesi); verilirse arşivdeki bir gün.
 */
export function DayHub({ day, topInset = true }: { day?: string; topInset?: boolean }) {
  const c = useColors();
  const set = useDay(day);
  const stats = useStats();
  const archive = !!day;
  const wide = useWide();

  if (set.isError) return <ErrorView error={set.error} onRetry={() => void set.refetch()} />;
  if (!set.data) return <LoadingScreen />;

  const s = set.data;
  const open = (mode: DailyMode) => router.push({ pathname: '/play/[mode]', params: archive ? { mode, day: s.day } : { mode } });
  const st = stats.data;
  const streak = st?.currentStreak ?? 0;
  const returning = (st?.played ?? 0) > 0;
  const count = s.modes.length;

  const soro = hubSoro(s, streak, archive);

  const main = (
    <>
      <PageHero
        eyebrow={`${formatDay(s.day)} · Sayı ${s.no}`}
        title={s.complete ? (archive ? 'Bu gün tamam' : 'Bugün tamam!') : archive ? 'O günün oyunları' : 'Bugünün oyunları'}
        subtitle={
          archive
            ? 'Arşiv oyunları serini ve yapbozunu etkilemez.'
            : s.complete
              ? 'Yapbozuna bugünün parçası eklendi. Yarın yenileri gelir.'
              : `${count} kısa oyun · hepsini bitir, yapbozuna bir parça ekle.`
        }
        mood={soro.mood}
        say={soro.say}>
        {/* Web'de seri üst menüde (dar ekranda marka şeridinde) duruyor; telefonda burada. */}
        <Progress set={s} streak={archive || Platform.OS === 'web' ? null : streak} />
      </PageHero>

      {!archive && !s.complete && st?.canRepairStreak && <StreakRepairCard />}

      {s.locked ? (
        <UnlockDayCard day={s.day} />
      ) : (
        <View style={styles.grid}>
          {s.modes.map((m, i) => (
            <Animated.View key={m.mode} entering={FadeInDown.delay(60 + i * 60).duration(300)} style={styles.gridCell}>
              <ModeCard summary={m} index={i} large={wide} onPress={() => open(m.mode)} />
            </Animated.View>
          ))}
        </View>
      )}

      {!archive && s.complete && <DayRankCard day={s.day} />}
      {!archive && s.complete && <NextSetCountdown day={s.day} />}
    </>
  );

  const side = archive ? null : (
    <>
      {st?.puzzle && <PuzzlePeek stats={st} complete={s.complete} large={wide} />}
      <View>
        {returning && <LinkRow icon="calendar-outline" title="Dünün soruları" onPress={() => router.push(`/archive/${addDays(s.day, -1)}`)} />}
        <LinkRow icon="albums-outline" title="Geçmiş günler" onPress={() => router.push('/archive')} />
        <LinkRow icon="scale" title="Sınırsız Hangisi pahalı? · Premium" onPress={() => router.push('/practice')} />
        <LinkRow icon="images" title="Koleksiyonum" onPress={() => router.push('/collection')} />
        <LinkRow icon="help-circle-outline" title="Nasıl oynanır?" onPress={() => router.push('/how-to-play')} />
      </View>
    </>
  );

  return (
    <Screen
      topInset={topInset}
      width={archive ? 'narrow' : 'wide'}
      refreshControl={
        <RefreshControl
          refreshing={set.isRefetching}
          onRefresh={() => {
            void set.refetch();
            void stats.refetch();
          }}
          tintColor={c.accent}
          colors={[c.accent]}
        />
      }>
      {/* Geniş ekran: solda başlık ve oyunlar, sağda yapboz ve bağlantılar. */}
      <Columns main={main} side={side} />
    </Screen>
  );
}

/** Soro'nun günün durumuna göre pozu ve sözü. */
function hubSoro(s: DaySet, streak: number, archive: boolean): { mood: SoroMood; say?: string } {
  if (archive) return { mood: 'happy' };
  if (s.complete) return { mood: 'cheer', say: 'Harikasın! Yarın yeni oyunlarla görüşürüz.' };
  const next = s.modes.find((m) => !m.finished);
  if (s.finishedCount > 0) return { mood: 'think', say: `${s.finishedCount}/${s.modes.length} bitti. Sırada ${next ? MODE_LABEL[next.mode] : 'son oyun'} var.` };
  const hour = new Date().getHours();
  if (streak > 0 && hour >= EVENING_HOUR) return { mood: 'sad', say: `${streak} günlük serin tehlikede! Gece yarısından önce bitir.` };
  const hello = hour < 12 ? 'Günaydın!' : hour < EVENING_HOUR ? 'Selam!' : 'İyi akşamlar!';
  return { mood: 'wave', say: `${hello} Bugün ${s.modes.length} oyun seni bekliyor.` };
}

/** Mod başına bir parça ilerleme; sağda seri (telefonda üst menü olmadığı için burada da görünür). */
function Progress({ set, streak }: { set: DaySet; streak: number | null }) {
  const c = useColors();
  return (
    <Row style={{ gap: 6 }} accessibilityLabel={`${set.finishedCount}/${set.modes.length} bitti`}>
      {set.modes.map((m) => (
        <View key={m.mode} style={[styles.segment, { backgroundColor: m.finished ? c.correct : m.started ? modeStyle[m.mode].color : c.surfaceSunken }]} />
      ))}
      <T variant="caption" color="textMuted" style={{ marginLeft: space.xs, fontFamily: fonts.bold }}>
        {set.finishedCount}/{set.modes.length}
      </T>
      {streak !== null && (
        <PressableScale
          haptic="select"
          accessibilityRole="button"
          accessibilityLabel={`${streak} günlük seri. Yapbozu gör`}
          onPress={() => router.navigate('/stats')}
          style={[styles.streak, { borderColor: streak > 0 ? c.flame : c.border }]}>
          <Icon name="flame" size={16} color={streak > 0 ? c.flame : c.textSubtle} />
          <Text style={[font.bodyStrong, { fontFamily: fonts.black, color: streak > 0 ? c.flame : c.textSubtle }]}>{streak}</Text>
        </PressableScale>
      )}
    </Row>
  );
}

/** Küçük yapboz önizlemesi: kaç parça var, bugünün parçası alındı mı. */
function PuzzlePeek({ stats, complete, large = false }: { stats: Stats; complete: boolean; large?: boolean }) {
  const c = useColors();
  const p = stats.puzzle!;
  const left = p.size - p.pieces;
  const title = p.pieces >= p.size ? 'Yapboz tamamlandı!' : `Yapboz ${p.pieces}/${p.size}`;
  const sub = complete
    ? left > 0
      ? `${left} gün daha gelirsen resim tamamlanıyor.`
      : 'Resim koleksiyonuna girdi! Yarın yeni yapboz başlar.'
    : stats.currentStreak > 0
      ? 'Bugünü bitirmezsen parçalar dağılır.'
      : 'Her gün bir parça. 15 günde resim tamamlanır.';
  return (
    <PressableScale haptic="select" accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} onPress={() => router.navigate('/stats')}>
      {large ? (
        // Geniş ekranın yan sütunu: yapboz büyük görünür.
        <Card style={{ alignItems: 'center', gap: space.md }}>
          <Row style={{ alignSelf: 'stretch', justifyContent: 'space-between' }}>
            <T variant="label" color="textMuted">
              Seri yapbozu
            </T>
            <Row style={{ gap: 4 }}>
              <Icon name="flame" size={16} color={stats.currentStreak > 0 ? c.flame : c.textSubtle} />
              <Text style={[font.bodyStrong, { fontFamily: fonts.black, color: stats.currentStreak > 0 ? c.flame : c.textSubtle }]}>
                {stats.currentStreak} gün
              </Text>
            </Row>
          </Row>
          <View style={[styles.peek, { borderColor: c.border, backgroundColor: c.background, padding: space.sm }]}>
            <StreakPuzzle pieces={p.pieces} width={PUZZLE_SIDE_WIDTH} art={p.art} highlightLast={p.earnedToday} />
            {/* Boş yapbozun üstünde Soro uyur: ilk parça onu uyandırır. */}
            {p.pieces === 0 && (
              <View style={styles.sleeper} pointerEvents="none">
                <SoroFigure size={Math.round(PUZZLE_SIDE_WIDTH * 0.6)} mood="sleep" />
              </View>
            )}
          </View>
          <View style={{ alignItems: 'center', gap: 2 }}>
            <T variant="title" center>
              {title}
            </T>
            <T center color={complete || stats.currentStreak === 0 ? 'textMuted' : 'danger'}>
              {sub}
            </T>
          </View>
        </Card>
      ) : (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <View style={[styles.peek, { borderColor: c.border }]}>
            <StreakPuzzle pieces={p.pieces} width={64} art={p.art} highlightLast={p.earnedToday} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="bodyStrong">{title}</T>
            <T variant="caption" color={complete || stats.currentStreak === 0 ? 'textMuted' : 'danger'}>
              {sub}
            </T>
          </View>
          <Icon name="chevron-forward" size={18} color={c.textSubtle} />
        </Card>
      )}
    </PressableScale>
  );
}

/** Ücretsiz arşiv hakkı bitti: gün ödüllü reklamla açılır. */
function UnlockDayCard({ day }: { day: string }) {
  const c = useColors();
  const ads = useAds();
  const unlock = useUnlockDay(day);
  const [watching, setWatching] = useState(false);
  const watch = async () => {
    setWatching(true);
    try {
      if (await ads.showRewarded('archive_unlock')) unlock.mutate();
    } finally {
      setWatching(false);
    }
  };
  return (
    <Card style={{ gap: space.md, alignItems: 'center', paddingVertical: space.xl }}>
      <View style={[styles.lock, { backgroundColor: c.accentSoft }]}>
        <Icon name="lock-closed" size={26} color={c.accent} />
      </View>
      <T variant="bodyStrong" center>
        Bugünkü ücretsiz arşiv hakkını kullandın
      </T>
      <T color="textMuted" center>
        Bu günün oyunlarını kısa bir video izleyerek açabilirsin. Yarın yeni bir ücretsiz hakkın olacak.
      </T>
      <View style={{ alignSelf: 'stretch' }}>
        <Button title="Video izle · günü aç" icon="play-circle" size="lg" onPress={() => void watch()} loading={watching || unlock.isPending} />
      </View>
      <InlineError error={unlock.error} />
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  gridCell: { flexBasis: '46%', flexGrow: 1 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: space.md, paddingVertical: 6 },
  segment: { flex: 1, height: 6, borderRadius: 3 },
  peek: { borderRadius: radius.sm, overflow: 'hidden', borderWidth: 1 },
  sleeper: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  lock: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, gap: space.lg, minWidth: 0 },
});
