import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useDayRank } from '@/api/hooks';
import type { DailyMode, DayRank } from '@/api/types';
import { SoroFigure } from '@/components/mascot/SoroFigure';
import { Card, Icon, Row, Skeleton, T } from '@/components/ui';
import { formatTrNumber, pctFrom } from '@/lib/format';
import { MODE_LABEL } from '@/lib/modes';
import { font, fonts, modeStyle, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/** Bu yüzdelikten itibaren Soro sevinir. */
const CHEER_FROM = 60;

/**
 * Gün bitince: "Bugün oyuncuların %72'sinden iyisin". Altında mod mod yüzdelik (tek renk çubuk, değer
 * yazıyla; anket puanı gece yarısı belli olur). Lig yerine, arkadaş gerektirmeyen rekabet hissi.
 */
export function DayRankCard({ day }: { day: string }) {
  const rank = useDayRank(day, true);
  if (rank.isError) return null;
  if (!rank.data) return <Skeleton height={220} />;
  return <RankBody rank={rank.data} />;
}

function RankBody({ rank }: { rank: DayRank }) {
  const c = useColors();
  const overall = rank.overall;
  return (
    <Animated.View entering={FadeInDown.springify().damping(16)}>
      <Card style={{ gap: space.lg }}>
        <Row style={{ gap: space.lg, alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="label" color="textMuted">
              Bugün nasıl geçti?
            </T>
            {overall !== null ? (
              <>
                <Text style={[font.display, styles.hero, { color: c.text }]} accessibilityLabel={`Bugün oyuncuların ${pctFrom(overall)} iyisin`}>
                  %{overall}
                </Text>
                <T variant="bodyStrong">Bugün oyuncuların {pctFrom(overall)} iyisin</T>
              </>
            ) : (
              <T variant="bodyStrong">Sıran gece yarısı belli olur</T>
            )}
            <T variant="caption" color="textMuted">
              {formatTrNumber(rank.players)} oyuncu arasında · mod ortalaması
            </T>
          </View>
          <SoroFigure size={84} mood={overall !== null && overall >= CHEER_FROM ? 'cheer' : 'happy'} />
        </Row>

        <View style={{ gap: space.md }} accessibilityRole="list">
          {rank.modes.map((m, i) => (
            <ModeRow key={m.mode} mode={m.mode} percentile={m.percentile} pending={m.pending} delay={i * 90} />
          ))}
        </View>
      </Card>
    </Animated.View>
  );
}

function ModeRow({ mode, percentile, pending, delay }: { mode: DailyMode; percentile: number | null; pending: boolean; delay: number }) {
  const c = useColors();
  const width = useSharedValue(0);
  useEffect(() => {
    width.set(withDelay(delay, withTiming(percentile ?? 0, { duration: 700 })));
  }, [percentile, delay, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.get()}%` }));
  const value = percentile !== null ? `%${percentile}` : pending ? 'Gece yarısı' : '—';

  return (
    <View
      style={{ gap: 6 }}
      accessible
      accessibilityLabel={`${MODE_LABEL[mode]}: ${percentile !== null ? `oyuncuların ${pctFrom(percentile)} iyi` : 'puan gece yarısı belli olur'}`}>
      <Row style={{ gap: space.sm }}>
        <Icon name={modeStyle[mode].icon} size={22} />
        <T variant="bodyStrong" style={{ flex: 1 }}>
          {MODE_LABEL[mode]}
        </T>
        <T variant={percentile !== null ? 'bodyStrong' : 'caption'} color={percentile !== null ? 'text' : 'textMuted'}>
          {value}
        </T>
      </Row>
      {/* Tek seri: bütün modlar aynı renkte; mod adı ve simgesi kimliği taşır. */}
      <View style={[styles.track, { backgroundColor: c.surfaceSunken }]}>
        <Animated.View style={[styles.fill, { backgroundColor: c.accent }, fill]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { fontFamily: fonts.black, lineHeight: 62 },
  track: { height: 10, borderRadius: radius.sm, overflow: 'hidden' },
  fill: { height: '100%', borderTopRightRadius: radius.sm, borderBottomRightRadius: radius.sm },
});
