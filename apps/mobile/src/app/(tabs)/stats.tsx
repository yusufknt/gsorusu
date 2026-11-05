import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { serverNow } from '@/api/client';
import { useStats } from '@/api/hooks';
import type { Stats } from '@/api/types';
import { useFormatStyle } from '@/components/game/formatStyle';
import { StreakRepairCard } from '@/components/StreakRepairCard';
import { Bar, Card, ErrorView, Icon, LoadingScreen, Row, Screen, SectionTitle, T } from '@/components/ui';
import { addDays, FORMAT_LABEL, formatTrNumber, istanbulDay, shortWeekday } from '@/lib/format';
import { font, fonts, radius, shadow, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

const CAL_GAP = 6;

export default function StatsScreen() {
  const c = useColors();
  const stats = useStats();

  if (stats.isError) return <ErrorView error={stats.error} onRetry={() => void stats.refetch()} />;
  if (stats.isPending) return <LoadingScreen />;

  const s = stats.data;
  // Puanı henüz kesinleşmemiş anketler "bilinen" oranına katılmaz.
  const scored = s.played - s.pendingScores;
  const solvedPct = scored > 0 ? `%${Math.round((s.solved / scored) * 100)}` : '—';

  return (
    <Screen refreshControl={<RefreshControl refreshing={stats.isRefetching} onRefresh={() => void stats.refetch()} />}>
      <T variant="headline" accessibilityRole="header">
        İstatistik
      </T>

      <StreakHero stats={s} />

      {s.canRepairStreak && <StreakRepairCard />}

      <Row style={{ alignItems: 'stretch' }}>
        <Tile icon="calendar" label="Oynanan gün" value={String(s.played)} />
        <Tile icon="checkmark-done" label="Bilinen" value={solvedPct} />
        <Tile icon="star" label="Ortalama" value={s.avgScore == null ? '—' : formatTrNumber(s.avgScore, 1)} />
      </Row>
      {s.pendingScores > 0 && (
        <Row style={{ gap: space.xs }}>
          <Icon name="hourglass-outline" size={14} color={c.textMuted} />
          <T variant="caption" color="textMuted">
            {s.pendingScores} anket puanı gece yarısı kesinleşecek
          </T>
        </Row>
      )}

      <SectionTitle>Son 4 hafta</SectionTitle>
      <Calendar recent={s.recent} />

      {s.byFormat.length > 0 && (
        <>
          <SectionTitle>Format bazında</SectionTitle>
          <Card>
            {s.byFormat.map((f, i) => (
              <FormatRow key={f.format} {...f} delay={i * 80} />
            ))}
          </Card>
        </>
      )}

      {s.played === 0 && (
        <Card tone="muted" style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <Icon name="sparkles-outline" size={32} color={c.textMuted} />
          <T center color="textMuted">
            İlk sorunu çözünce istatistiklerin burada görünecek.
          </T>
        </Card>
      )}
    </Screen>
  );
}

function StreakHero({ stats: s }: { stats: Stats }) {
  const c = useColors();
  const message = s.playedToday
    ? 'Bugünü tamamladın, yarın görüşürüz!'
    : s.currentStreak > 0
      ? 'Bugünün sorusunu çöz, seri devam etsin.'
      : 'Bugün başla, serini büyüt.';
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={[{ borderRadius: radius.xl }, shadow(c.heroTo, 2)]}>
      <LinearGradient colors={[c.heroFrom, c.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={styles.heroLabel}>GÜNLÜK SERİ</Text>
            <Row style={{ alignItems: 'baseline', gap: space.xs }}>
              <Text style={styles.heroValue} accessibilityLabel={`${s.currentStreak} günlük seri`}>
                {s.currentStreak}
              </Text>
              <Text style={styles.heroUnit}>gün</Text>
            </Row>
          </View>
          <Text style={styles.flame} accessible={false}>
            🔥
          </Text>
        </Row>
        <Text style={styles.heroText}>{message}</Text>
        <View style={styles.heroDivider} />
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={styles.heroText}>En uzun seri</Text>
          <Text style={[styles.heroText, { fontFamily: fonts.black }]}>{s.maxStreak} gün</Text>
        </Row>
      </LinearGradient>
    </Animated.View>
  );
}

function Tile({ icon, label, value }: { icon: 'calendar' | 'checkmark-done' | 'star'; label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Card style={{ alignItems: 'center', flex: 1, gap: space.xs, paddingHorizontal: space.sm }}>
        <Icon name={icon} size={20} color={c.accent} />
        <Text style={[font.title, { color: c.text }]}>{value}</Text>
        <T variant="caption" color="textMuted" center>
          {label}
        </T>
      </Card>
    </View>
  );
}

/** 28 günlük takvim: oynanan günler puana göre renklenir, bugün çerçevelidir. */
function Calendar({ recent }: { recent: Stats['recent'] }) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const cell = width > 0 ? Math.floor((width - CAL_GAP * 6) / 7) : 0;
  const today = istanbulDay(serverNow());
  const byDay = new Map(recent.map((r) => [r.day, r]));
  const days = Array.from({ length: 28 }, (_, i) => addDays(today, i - 27));

  const colorFor = (score: number | null | undefined, played: boolean) => {
    if (!played) return c.surfaceMuted;
    if (score == null) return c.textSubtle;
    if (score >= 70) return c.correct;
    if (score >= 40) return c.accent;
    return c.close;
  };

  return (
    <Card>
      <View style={styles.calendar} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {days.slice(0, 7).map((d) => (
          <Text key={`h${d}`} style={[styles.calHead, { width: cell, color: c.textSubtle }]}>
            {shortWeekday(d)}
          </Text>
        ))}
        {days.map((d) => {
          const r = byDay.get(d);
          const isToday = d === today;
          return (
            <View
              key={d}
              accessible
              accessibilityLabel={`${d}: ${r ? (r.score == null ? 'puan bekleniyor' : `${r.score} puan`) : 'oynanmadı'}`}
              style={[styles.calCell, { width: cell, height: cell, backgroundColor: colorFor(r?.score, !!r) }, isToday && { borderWidth: 2, borderColor: c.text }]}>
              <Text style={[font.caption, { fontFamily: fonts.extrabold, color: r ? '#FFFFFF' : c.textSubtle }]}>{Number(d.slice(8))}</Text>
            </View>
          );
        })}
      </View>
      <Row style={{ justifyContent: 'center', gap: space.md, flexWrap: 'wrap' }}>
        <Legend color={c.correct} label="70+" />
        <Legend color={c.accent} label="40–69" />
        <Legend color={c.close} label="0–39" />
        <Legend color={c.textSubtle} label="bekliyor" />
      </Row>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Row style={{ gap: 4 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <T variant="caption" color="textMuted">
        {label}
      </T>
    </Row>
  );
}

function FormatRow({ format, played, avgScore, delay }: Stats['byFormat'][number] & { delay: number }) {
  const f = useFormatStyle(format);
  return (
    <Row style={{ gap: space.md }}>
      <View style={[styles.formatIcon, { backgroundColor: f.soft }]}>
        <Icon name={f.icon} size={18} color={f.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Bar label={`${FORMAT_LABEL[format]} · ${played} oyun`} value={avgScore ?? 0} color={f.color} delay={delay} />
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: space.xl, gap: space.sm },
  heroLabel: { ...font.label, color: '#FFFFFF', opacity: 0.85 },
  heroValue: { fontFamily: fonts.black, fontSize: 64, lineHeight: 70, color: '#FFFFFF' },
  heroUnit: { fontFamily: fonts.extrabold, fontSize: 22, color: '#FFFFFF', opacity: 0.9 },
  heroText: { ...font.body, color: '#FFFFFF' },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: space.xs },
  flame: { fontSize: 64 },
  calendar: { flexDirection: 'row', flexWrap: 'wrap', gap: CAL_GAP },
  calHead: { textAlign: 'center', fontFamily: fonts.extrabold, fontSize: 11 },
  calCell: { borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  formatIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
