import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import type { DailyMode } from '@/api/types';
import { Icon } from '@/components/ui';
import { fonts, modeStyle, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/**
 * Oyun kartının fotoğraflı kapağı: her mod, oyunun ne sorduğunu anlatan gerçek bir fotoğraf ve
 * üstünde küçük bir ipucu (VS, ???, Evet/Hayır, ?). Fotoğraflar CC0 / kamu malı (mock/mediaCredits.ts);
 * sahne: "Concert Show" (4LZRZTD1MC), CC0, StockSnap.
 */
const PHOTOS = {
  somon: require('../../../assets/questions/somon.jpg'),
  avokado: require('../../../assets/questions/avokado.jpg'),
  galata: require('../../../assets/questions/galata.jpg'),
  balon: require('../../../assets/questions/balon.jpg'),
  sahne: require('../../../assets/modes/sahne.jpg'),
} as const;

/** Fotoğraf üstündeki yazıların her temada okunması için koyu perde. */
const SCRIM = ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.45)'] as const;
const WHITE = '#FFFFFF';

export function ModeCover({ mode, large }: { mode: DailyMode; large: boolean }) {
  const color = modeStyle[mode].color;
  const scale = large ? 1.4 : 1;
  return (
    <View style={StyleSheet.absoluteFill}>
      {mode === 'pahali' ? (
        <View style={styles.split}>
          <Photo source={PHOTOS.somon} />
          <View style={styles.divider} />
          <Photo source={PHOTOS.avokado} />
        </View>
      ) : (
        <Photo source={mode === 'kac' ? PHOTOS.galata : mode === 'yapar' ? PHOTOS.balon : PHOTOS.sahne} />
      )}
      <LinearGradient colors={SCRIM} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.center} pointerEvents="none">
        <Hint mode={mode} color={color} scale={scale} />
      </View>
      {/* Modun rengi alt kenarda kalır; kartlar fotoğrafla da birbirinden ayrılsın. */}
      <View style={[styles.edge, { backgroundColor: color }]} />
    </View>
  );
}

function Photo({ source }: { source: number }) {
  const c = useColors();
  return <Image source={source} style={[styles.photo, { backgroundColor: c.surfaceMuted }]} contentFit="cover" transition={200} accessible={false} />;
}

function Hint({ mode, color, scale }: { mode: DailyMode; color: string; scale: number }) {
  const c = useColors();
  if (mode === 'pahali') {
    return (
      <View style={[styles.vs, { backgroundColor: color, width: 52 * scale, height: 52 * scale }]}>
        <Text style={[styles.vsText, { fontSize: 18 * scale }]}>VS</Text>
      </View>
    );
  }
  if (mode === 'kac') {
    return (
      <View style={[styles.chip, { backgroundColor: color, paddingVertical: 6 * scale, paddingHorizontal: 14 * scale }]}>
        <Icon name="arrow-down-up" size={18 * scale} color={WHITE} />
        <Text style={[styles.chipText, { fontSize: 20 * scale, letterSpacing: 3 }]}>???</Text>
      </View>
    );
  }
  if (mode === 'yapar') {
    return (
      <View style={styles.row}>
        <View style={[styles.chip, { backgroundColor: c.correct, paddingVertical: 5 * scale, paddingHorizontal: 14 * scale }]}>
          <Text style={[styles.chipText, { fontSize: 15 * scale }]}>Evet</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: c.close, paddingVertical: 5 * scale, paddingHorizontal: 14 * scale }]}>
          <Text style={[styles.chipText, { fontSize: 15 * scale }]}>Hayır</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.mystery, { backgroundColor: color, width: 56 * scale, height: 56 * scale }]}>
      <Text style={[styles.mysteryText, { fontSize: 32 * scale, lineHeight: 38 * scale }]}>?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  split: { flex: 1, flexDirection: 'row' },
  divider: { width: 3, backgroundColor: WHITE },
  photo: { flex: 1, width: '100%', height: '100%' },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  edge: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 5 },
  row: { flexDirection: 'row', gap: space.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, borderWidth: 2, borderColor: WHITE },
  chipText: { fontFamily: fonts.black, color: WHITE },
  vs: { borderRadius: radius.pill, borderWidth: 3, borderColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  vsText: { fontFamily: fonts.black, color: WHITE },
  mystery: { borderRadius: radius.pill, borderWidth: 3, borderColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  mysteryText: { fontFamily: fonts.serif, color: WHITE },
});
