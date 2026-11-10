import { RefreshControl, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { useStats } from '@/api/hooks';
import type { Stats } from '@/api/types';
import { PageHero } from '@/components/layout/PageHero';
import { Collection } from '@/components/streak/Collection';
import { ModeDistribution, SuccessByMode } from '@/components/streak/ModeCharts';
import { SoroFigure, type SoroMood } from '@/components/mascot/SoroFigure';
import { StreakPuzzle } from '@/components/streak/StreakPuzzle';
import { StreakRepairCard } from '@/components/StreakRepairCard';
import { Card, ErrorView, Icon, LoadingScreen, Row, Screen, T, useWide, type IconName } from '@/components/ui';
import { formatTrNumber } from '@/lib/format';
import { artById } from '@/lib/puzzleArt';
import { PUZZLE_SIZE } from '@/mock/rules';
import { font, fonts, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

const PUZZLE_MAX = 300;

/** Seri sekmesi: 15 parçalık yapboz, seri sayıları, kurallar ve koleksiyon. */
export default function StreakScreen() {
  const c = useColors();
  const stats = useStats();
  const { width } = useWindowDimensions();
  const wide = useWide();

  if (stats.isError) return <ErrorView error={stats.error} onRetry={() => void stats.refetch()} />;
  if (stats.isPending) return <LoadingScreen />;

  const s = stats.data;
  const p = s.puzzle ?? { size: PUZZLE_SIZE, pieces: 0, earnedToday: false, completed: 0 };
  const art = artById(p.art ?? 'istanbul');
  // Puanı henüz kesinleşmemiş anketler "bilinen" oranına katılmaz.
  const scored = s.played - s.pendingScores;
  const solvedPct = scored > 0 ? `%${Math.round((s.solved / scored) * 100)}` : '—';
  const puzzleWidth = wide ? 420 : Math.min(PUZZLE_MAX, width - space.xl * 2 - space.lg * 2);

  const puzzle = (
    <Animated.View entering={FadeInDown.duration(350)}>
      <Card style={{ alignItems: 'center', gap: space.lg, paddingVertical: space.xl }}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.frame, { borderColor: c.border, backgroundColor: c.background }]}>
          <StreakPuzzle pieces={p.pieces} width={puzzleWidth} art={p.art} highlightLast={p.earnedToday} />
          {/* Boş yapbozda Soro uyur; ilk parça onu uyandırır. */}
          {p.pieces === 0 && (
            <View style={styles.sleeper} pointerEvents="none">
              <SoroFigure size={Math.round(puzzleWidth * 0.55)} mood="sleep" />
            </View>
          )}
        </Animated.View>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <T variant="title" center>
            {p.pieces >= p.size ? `${art.title} tamamlandı!` : `${p.pieces}/${p.size} parça`}
          </T>
          {p.pieces < p.size && (
            <T variant="caption" color="textMuted" center>
              Bu yapbozun resmi: {p.pieces > 0 ? art.title : 'ilk parçayla belli olur'}
            </T>
          )}
          <T color="textMuted" center>
            {message(s)}
          </T>
        </View>
      </Card>
    </Animated.View>
  );

  const details = (
    <>
      {s.canRepairStreak && <StreakRepairCard />}

      <Row style={{ alignItems: 'stretch' }}>
        <Big icon="flame" color={c.flame} value={s.currentStreak} label="Günlük seri" />
        <Big icon="trophy" color={c.warning} value={s.maxStreak} label="En uzun" />
        <Big icon="extension-puzzle" color={c.accent} value={p.completed} label="Biten yapboz" />
      </Row>

      <Card tone="muted" style={{ gap: space.sm }}>
        <T variant="bodyStrong">Nasıl işler?</T>
        <Rule icon="checkmark-circle" text="Günün 4 oyununu bitir → yapboza 1 parça." />
        <Rule icon="alert-circle" text="Bir gün kaçırırsan seri sıfırlanır, parçalar dağılır." />
        <Rule icon="bandage" text="Haftada bir kez kısa bir videoyla kaçırdığın günü kurtarabilirsin." />
        <Rule icon="sunny" text="15 parça tamamlanınca resim koleksiyonuna girer; ertesi gün yeni resimle yeni yapboz başlar." />
      </Card>

      <Row style={{ alignItems: 'stretch' }}>
        <Small label="Oynanan oyun" value={String(s.played)} />
        <Small label="Bilinen" value={solvedPct} />
        <Small label="Ortalama puan" value={s.avgScore == null ? '—' : formatTrNumber(s.avgScore, 1)} />
      </Row>
      {s.pendingScores > 0 && (
        <T variant="caption" color="textMuted">
          {s.pendingScores} anket puanı gece yarısı kesinleşecek.
        </T>
      )}
    </>
  );

  return (
    <Screen
      width={wide ? 'wide' : 'narrow'}
      refreshControl={<RefreshControl refreshing={stats.isRefetching} onRefresh={() => void stats.refetch()} tintColor={c.accent} />}>
      <PageHero eyebrow="Seri" title="Serin" subtitle="Her tamamlanan gün yapboza bir parça ekler; 15 parçada resim tamamlanır ve koleksiyonuna girer." mood={streakSoro(s).mood} say={streakSoro(s).say} />
      {wide ? (
        // Geniş ekran: solda yapboz, sağda sayılar ve kurallar.
        <View style={styles.columns}>
          <View style={{ width: 480 }}>{puzzle}</View>
          <View style={styles.details}>{details}</View>
        </View>
      ) : (
        <>
          {puzzle}
          {details}
        </>
      )}
      {s.byMode && (
        // Geniş ekranda iki grafik yan yana.
        <View style={wide ? styles.columns : { gap: space.lg }}>
          <View style={wide ? styles.chart : undefined}>
            <ModeDistribution stats={s.byMode} />
          </View>
          <View style={wide ? styles.chart : undefined}>
            <SuccessByMode stats={s.byMode} />
          </View>
        </View>
      )}
      <Collection items={s.collection ?? []} puzzle={p} />
    </Screen>
  );
}

/** Seri sayfasında Soro: boş yapbozda uyur, bugün parça alındıysa sevinir, gün bekliyorsa hatırlatır. */
function streakSoro(s: Stats): { mood: SoroMood; say: string } {
  const pieces = s.puzzle?.pieces ?? 0;
  const left = (s.puzzle?.size ?? PUZZLE_SIZE) - pieces;
  if (s.playedToday) return { mood: 'cheer', say: left > 0 ? `${left} parça kaldı, resim tamamlanıyor!` : 'Resim koleksiyonunda! Yarın yenisi.' };
  if (s.currentStreak > 0) return { mood: 'think', say: 'Bugünü bitir, yoksa parçalar dağılır.' };
  // Yapbozun üstünde zaten uyuyan bir Soro var; başlıktaki el sallayıp çağırır.
  return { mood: 'wave', say: 'Bir günü bitir, ilk parçayı al!' };
}

function message(s: Stats): string {
  const left = (s.puzzle?.size ?? PUZZLE_SIZE) - (s.puzzle?.pieces ?? 0);
  if (s.playedToday) return left > 0 ? `Bugünün parçası alındı. ${left} gün daha!` : 'Yarın yeni bir yapboz başlıyor.';
  if (s.currentStreak > 0) return 'Bugünün 4 oyununu bitir, yoksa parçalar dağılır.';
  return 'Bugün başla: her tamamlanan gün bir parça.';
}

function Big({ icon, color, value, label }: { icon: IconName; color: string; value: number; label: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Card style={{ alignItems: 'center', flex: 1, gap: 2, paddingHorizontal: space.sm }}>
        <Icon name={icon} size={20} color={color} />
        <Text style={[font.title, { fontFamily: fonts.black, color: c.text }]} accessibilityLabel={`${label}: ${value}`}>
          {value}
        </Text>
        <T variant="caption" color="textMuted" center>
          {label}
        </T>
      </Card>
    </View>
  );
}

function Small({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <T variant="bodyStrong">{value}</T>
      <T variant="caption" color="textMuted" center>
        {label}
      </T>
    </View>
  );
}

function Rule({ icon, text }: { icon: IconName; text: string }) {
  const c = useColors();
  return (
    <Row style={{ alignItems: 'flex-start' }}>
      <Icon name={icon} size={18} color={c.textMuted} />
      <T style={{ flex: 1 }}>{text}</T>
    </Row>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden', padding: space.sm },
  sleeper: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xl },
  details: { flex: 1, gap: space.lg, minWidth: 0 },
  chart: { flex: 1, minWidth: 0 },
});
