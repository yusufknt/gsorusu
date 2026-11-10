import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { CollectionItem, Puzzle } from '@/api/types';
import { Icon, Row, T, useWide } from '@/components/ui';
import { formatDay } from '@/lib/format';
import { artById, artFor, PUZZLE_ART } from '@/lib/puzzleArt';
import { font, fonts, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

import { puzzleImage } from './puzzleImages';

const GUTTER = space.md;

/**
 * Koleksiyon: tamamlanan yapbozlar bütün resim olarak, tamamlandığı günle. Ardından üzerinde çalışılan
 * yapboz (ilerlemesiyle) ve henüz açılmamış resimler (kilitli). Üstteki sayılar hesabın emeğini gösterir:
 * her resim 15 günlük kesintisiz seri demek.
 */
export function Collection({ items, puzzle }: { items: CollectionItem[]; puzzle: Puzzle }) {
  const c = useColors();
  const wide = useWide();
  const days = items.length * puzzle.size;
  // Üzerinde çalışılan resim tamamlanmadıysa sıradaki kart odur; kalan resimler kilitli.
  const currentDone = puzzle.pieces >= puzzle.size;
  const nextIndex = items.length;
  const locked = Math.max(0, PUZZLE_ART.length - items.length - (currentDone ? 0 : 1));
  // Sabit sütun: resimler hep aynı boyda kalır, son satır yayılmaz.
  const columns = wide ? 6 : 3;
  const cell = { width: `${100 / columns}%` as const, paddingHorizontal: GUTTER / 2, paddingBottom: GUTTER };

  return (
    <View style={{ gap: space.md }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ gap: 2 }}>
          <T variant="label" color="textMuted">
            Koleksiyon
          </T>
          <Text style={[font.title, { color: c.text }]}>
            {items.length ? `${items.length} resim tamamlandı` : 'Henüz resim yok'}
          </Text>
        </View>
        <View style={[styles.total, { borderColor: c.text }]}>
          <Icon name="flame" size={16} color={c.flame} />
          <Text style={[font.bodyStrong, { fontFamily: fonts.black, color: c.text }]}>{days} gün</Text>
        </View>
      </Row>
      <T variant="caption" color="textMuted">
        Her resim {puzzle.size} günlük kesintisiz serinin ödülü. Tamamladıkların burada bütün hâliyle kalır.
      </T>

      <View style={styles.grid}>
        {items.map((it, i) => (
          <Animated.View key={`${it.art}-${it.day}-${i}`} entering={FadeInDown.delay(i * 50).duration(300)} style={cell}>
            <Done item={it} />
          </Animated.View>
        ))}
        {!currentDone && (
          <View style={cell}>
            <InProgress art={artFor(nextIndex).id} pieces={puzzle.pieces} size={puzzle.size} />
          </View>
        )}
        {Array.from({ length: locked }, (_, i) => (
          <View key={`locked-${i}`} style={cell}>
            <Locked days={puzzle.size} />
          </View>
        ))}
      </View>
    </View>
  );
}

function Done({ item }: { item: CollectionItem }) {
  const c = useColors();
  const art = artById(item.art);
  return (
    <View style={[styles.card, { borderColor: c.text, backgroundColor: c.surface }]} accessible accessibilityLabel={`${art.title}, ${formatDay(item.day)} tamamlandı`}>
      <Image source={puzzleImage(art.id)} style={styles.image} contentFit="cover" transition={200} />
      <View style={styles.caption}>
        <Text style={[font.bodyStrong, { color: c.text }]} numberOfLines={1}>
          {art.title}
        </Text>
        <T variant="caption" color="textMuted" numberOfLines={1}>
          {formatDay(item.day)}
        </T>
        <Text style={[styles.credit, { color: c.textSubtle }]} numberOfLines={1}>
          {art.credit}
        </Text>
      </View>
    </View>
  );
}

/** Üzerinde çalışılan resim: soluk ve kırpılmış önizleme, kaç parça kaldığı. */
function InProgress({ art, pieces, size }: { art: string; pieces: number; size: number }) {
  const c = useColors();
  return (
    <View style={[styles.card, { borderColor: c.border, backgroundColor: c.surface }]} accessible accessibilityLabel={`Sıradaki resim, ${pieces}/${size} parça`}>
      <View>
        <Image source={puzzleImage(art)} style={[styles.image, { opacity: 0.25 }]} contentFit="cover" blurRadius={18} />
        <View style={styles.overlay}>
          <Icon name="extension-puzzle" size={28} color={c.text} />
          <Text style={[font.title, { color: c.text }]}>
            {pieces}/{size}
          </Text>
        </View>
      </View>
      <View style={styles.caption}>
        <Text style={[font.bodyStrong, { color: c.text }]}>Sıradaki resim</Text>
        <T variant="caption" color="textMuted">
          {size - pieces} gün daha
        </T>
      </View>
    </View>
  );
}

function Locked({ days }: { days: number }) {
  const c = useColors();
  return (
    <View style={[styles.card, { borderColor: c.border, backgroundColor: c.surfaceMuted }]} accessible accessibilityLabel="Kilitli resim">
      <View style={[styles.image, styles.overlay, { position: 'relative' }]}>
        <Icon name="lock-closed" size={26} color={c.textSubtle} />
      </View>
      <View style={styles.caption}>
        <Text style={[font.bodyStrong, { color: c.textSubtle }]}>Gizli resim</Text>
        <T variant="caption" color="textSubtle">
          {days} günlük seriyle açılır
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  total: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -GUTTER / 2 },
  card: { borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  // Yapboz resimleri 3:5.
  image: { width: '100%', aspectRatio: 3 / 5 },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: space.xs },
  caption: { padding: space.sm, gap: 2 },
  credit: { fontFamily: fonts.regular, fontSize: 10 },
});
