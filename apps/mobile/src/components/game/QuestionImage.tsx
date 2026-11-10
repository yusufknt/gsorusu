import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { Media } from '@/api/types';
import { T } from '@/components/ui';
import { radius } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/** Soru görseli ve altında kaynak yazısı (CC0 / kamu malı; atıf gerekmese de gösterilir). */
export function QuestionImage({ media, aspectRatio = 16 / 9, alt }: { media: Media; aspectRatio?: number; alt: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      <Image
        source={typeof media.src === 'string' ? { uri: media.src } : media.src}
        style={[styles.image, { aspectRatio, backgroundColor: c.surfaceMuted }]}
        contentFit="cover"
        transition={200}
        accessibilityLabel={alt}
      />
      <T variant="caption" color="textSubtle" style={{ fontSize: 11, lineHeight: 14 }} numberOfLines={1}>
        Fotoğraf: {media.credit}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', borderRadius: radius.lg },
});
