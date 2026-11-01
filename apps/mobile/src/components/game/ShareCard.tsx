import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import type { Ref } from 'react';
import { PixelRatio, StyleSheet, Text, View } from 'react-native';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import type { PlayState } from '@/api/types';
import { Icon, type IconName } from '@/components/ui';
import { FORMAT_LABEL, formatDay } from '@/lib/format';
import { SHARE_HOST, shareParts } from '@/lib/share';
import { fonts, formatStyle, type ThemeColors } from '@/theme/tokens';

const W = 360;
const H = 640;

/**
 * Instagram/TikTok hikâyesi boyutunda (1080×1920) sonuç kartı (plan A6). Cevabı göstermez.
 * Ekran dışında çizilir ve yalnızca paylaşırken görüntüye çevrilir.
 */
export function ShareCard({ play, streak, colors, ref }: { play: PlayState; streak: number; colors: ThemeColors; ref: Ref<ViewShotRef> }) {
  const { summary, squares } = shareParts(play);
  const f = formatStyle[play.format];
  const ratio = PixelRatio.get();
  return (
    <View style={styles.offscreen} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <ViewShot ref={ref} options={{ format: 'png', quality: 1, result: 'tmpfile', width: 1080 / ratio, height: 1920 / ratio }}>
        <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <Text style={styles.bigMark}>?</Text>
          <View style={{ gap: 6 }}>
            <Text style={styles.brand}>Günün Sorusu ?</Text>
            <Text style={styles.meta}>
              #{play.no} · {formatDay(play.day)}
            </Text>
          </View>

          <View style={styles.panel}>
            <View style={[styles.formatPill, { backgroundColor: f.soft }]}>
              <Icon name={f.icon as IconName} size={16} color={f.color} />
              <Text style={[styles.formatText, { color: f.color }]}>{FORMAT_LABEL[play.format]}</Text>
            </View>
            {squares ? <Text style={styles.squares}>{squares}</Text> : null}
            <Text style={styles.summary}>{summary}</Text>
            {!play.archive && streak > 0 && <Text style={styles.streak}>🔥 {streak} günlük seri</Text>}
          </View>

          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={styles.cta}>Sen de dene!</Text>
            <Text style={styles.link}>
              {SHARE_HOST}/{play.no}
            </Text>
          </View>
        </LinearGradient>
      </ViewShot>
    </View>
  );
}

/** Kartı 1080×1920 PNG'ye çevirip paylaşım menüsünü açar. */
export async function shareCardImage(shot: ViewShotRef | null): Promise<void> {
  const uri = await shot?.capture?.();
  if (!uri) throw new Error('Görsel oluşturulamadı');
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Sonucunu paylaş', UTI: 'public.png' });
  }
}

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', left: -10_000, top: 0, width: W, height: H },
  card: { width: W, height: H, padding: 32, justifyContent: 'space-between', overflow: 'hidden' },
  bigMark: { position: 'absolute', right: -30, top: 40, fontFamily: fonts.black, fontSize: 380, color: '#FFFFFF', opacity: 0.1 },
  brand: { fontFamily: fonts.black, fontSize: 34, color: '#FFFFFF' },
  meta: { fontFamily: fonts.bold, fontSize: 17, color: '#FFFFFF', opacity: 0.9 },
  panel: { backgroundColor: '#FFFFFF', borderRadius: 28, paddingVertical: 28, paddingHorizontal: 18, alignItems: 'center', gap: 16 },
  formatPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  formatText: { fontFamily: fonts.extrabold, fontSize: 15 },
  squares: { fontSize: 28, letterSpacing: 2, textAlign: 'center' },
  summary: { fontFamily: fonts.black, fontSize: 30, color: '#1A1C22', textAlign: 'center' },
  streak: { fontFamily: fonts.extrabold, fontSize: 18, color: '#6B6F78' },
  cta: { fontFamily: fonts.extrabold, fontSize: 20, color: '#FFFFFF' },
  link: { fontFamily: fonts.black, fontSize: 22, color: '#FFFFFF' },
});
