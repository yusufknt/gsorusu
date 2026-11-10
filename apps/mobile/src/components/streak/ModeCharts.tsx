import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { DAILY_MODES, type DailyMode, type ModeStats } from '@/api/types';
import { Card, Icon, Row, Segmented, T } from '@/components/ui';
import { formatTrNumber } from '@/lib/format';
import { MODE_LABEL } from '@/lib/modes';
import { font, fonts, modeStyle, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/**
 * Seri sayfasındaki grafikler. Mod renkleri renk körlüğünde birbirinden ayrılmadığı için (mavi–mor)
 * modlar renkle değil adla ayrılır: her grafik tek seridir. Mod rengi yalnız o modun dağılımında,
 * Wordle'daki gibi son oyunun çubuğunu vurgular.
 */

const BAR_HEIGHT = 20;
/** En uzun çubuk satırın bu kadarı: yanındaki sayıya yer kalsın. */
const BAR_MAX_PCT = 85;
const SHORT: Record<DailyMode, string> = { pahali: 'Pahalı', kac: 'Kaç?', yapar: 'Yapar', unlu: 'Ünlü' };
const AXIS: Record<DailyMode, string> = {
  pahali: 'Kaç turu bildin',
  kac: 'Kaçıncı tahminde',
  yapar: 'Türkiye tahminin ne kadar isabetli',
  unlu: 'Kaçıncı tahminde',
};

/** Sonucu belli oyunlarda bilme oranı; puanı bekleyen anket sayılmaz. */
const successPct = (m: ModeStats) => {
  const decided = m.played - (m.pending ?? 0);
  return decided > 0 ? Math.round((m.solved / decided) * 100) : null;
};

/** Mod mod bilme oranı: dört satır, tek renk, değer çubuğun yanında yazılı. */
export function SuccessByMode({ stats }: { stats: ModeStats[] }) {
  const c = useColors();
  return (
    <Card style={{ gap: space.md }}>
      <View style={{ gap: 2 }}>
        <T variant="bodyStrong">Mod mod başarı</T>
        <T variant="caption" color="textMuted">
          Bildiğin oyunların oranı (Yapar mıydın?’da 80 puan ve üstü)
        </T>
      </View>
      {DAILY_MODES.map((mode, i) => {
        const m = stats.find((x) => x.mode === mode);
        const pct = m ? successPct(m) : null;
        return (
          <View key={mode} style={{ gap: 6 }} accessible accessibilityLabel={`${MODE_LABEL[mode]}: ${pct === null ? 'henüz oynanmadı' : `yüzde ${pct}, ${m!.played} oyun`}`}>
            <Row style={{ gap: space.sm }}>
              <Icon name={modeStyle[mode].icon} size={20} />
              <T style={{ flex: 1 }}>{MODE_LABEL[mode]}</T>
              <T variant="bodyStrong" color={pct === null ? 'textSubtle' : 'text'}>
                {pct === null ? '—' : `%${pct}`}
              </T>
            </Row>
            <Track value={pct ?? 0} color={c.accent} delay={i * 80} />
          </View>
        );
      })}
    </Card>
  );
}

/** Wordle tarzı dağılım: mod seçilir, kovalar yatay çubuk, en son oyunun çubuğu modun renginde. */
export function ModeDistribution({ stats }: { stats: ModeStats[] }) {
  const c = useColors();
  const [mode, setMode] = useState<DailyMode>('kac');
  const m = stats.find((x) => x.mode === mode);
  const max = Math.max(1, ...(m?.distribution.map((d) => d.count) ?? [0]));
  const pct = m ? successPct(m) : null;
  const labelWidth = mode === 'yapar' ? 92 : 28;

  return (
    <Card style={{ gap: space.md }}>
      <T variant="bodyStrong">Dağılım</T>
      <Segmented value={mode} options={DAILY_MODES.map((x) => ({ value: x, label: SHORT[x] }))} onChange={setMode} />

      <Row style={{ alignItems: 'stretch' }}>
        <Stat label="Oynanan" value={String(m?.played ?? 0)} />
        <Stat label="Başarı" value={pct === null ? '—' : `%${pct}`} />
        <Stat label="Ort. puan" value={m?.avgScore == null ? '—' : formatTrNumber(m.avgScore, 1)} />
      </Row>

      <T variant="label" color="textMuted">
        {AXIS[mode]}
      </T>
      {!m?.played ? (
        <T color="textMuted">Bu modu oynadıkça dağılımın burada görünür.</T>
      ) : (
        <View style={{ gap: 4 }} accessibilityRole="list">
          {m.distribution.map((d, i) => {
            const last = m.lastBucket === i;
            return (
              <Row key={d.label} style={{ gap: space.sm }} accessible accessibilityLabel={`${d.label}: ${d.count} oyun${last ? ', son oyunun' : ''}`}>
                <Text style={[styles.bucket, { width: labelWidth, color: c.textMuted }, mode === 'yapar' && { textAlign: 'left' }]} numberOfLines={1}>
                  {d.label}
                </Text>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  {d.count > 0 && <Track value={(d.count / max) * BAR_MAX_PCT} color={last ? modeStyle[mode].color : c.textSubtle} delay={i * 40} bare />}
                  <Text style={[styles.count, { color: last ? c.text : c.textMuted }]}>{d.count}</Text>
                </View>
              </Row>
            );
          })}
        </View>
      )}
      {m?.lastBucket != null && (
        <Row style={{ gap: space.xs }}>
          <View style={[styles.key, { backgroundColor: modeStyle[mode].color }]} />
          <T variant="caption" color="textMuted">
            Son oyunun
          </T>
        </Row>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[font.title, { fontFamily: fonts.black, color: c.text }]}>{value}</Text>
      <T variant="caption" color="textMuted">
        {label}
      </T>
    </View>
  );
}

/**
 * Soldan dolan çubuk. `bare`: arka iz yok, çubuk değer kadar (dağılım); yoksa 0–100 izinde dolar.
 * Uç yuvarlak, taban köşeli. Genişlik yüzdesi üst satıra göredir.
 */
function Track({ value, color, delay, bare = false }: { value: number; color: string; delay: number; bare?: boolean }) {
  const c = useColors();
  const width = useSharedValue(0);
  useEffect(() => {
    width.set(withDelay(delay, withTiming(Math.min(100, Math.max(0, value)), { duration: 650 })));
  }, [value, delay, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.get()}%` }));
  if (bare) return <Animated.View style={[styles.bar, { backgroundColor: color, height: BAR_HEIGHT, minWidth: 6 }, fill]} />;
  return (
    <View style={[styles.track, { backgroundColor: c.surfaceSunken }]}>
      <Animated.View style={[styles.bar, { backgroundColor: color, height: '100%' }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: radius.sm, overflow: 'hidden' },
  bar: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  bucket: { fontFamily: fonts.bold, fontSize: 13, textAlign: 'right' },
  count: { fontFamily: fonts.black, fontSize: 13, fontVariant: ['tabular-nums'] },
  key: { width: 12, height: 12, borderRadius: 3 },
});
