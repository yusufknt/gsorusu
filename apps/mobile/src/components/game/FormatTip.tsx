import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import type { QuestionFormat } from '@/api/types';
import { Icon, Row } from '@/components/ui';
import { useSettings } from '@/settings/settings';
import { font, fonts, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

import { useFormatStyle } from './formatStyle';

/**
 * Formatla ilk karşılaşmada 1–2 cümlelik ipucu (ayrı tanıtım ekranı yok, plan A4/A5).
 * Bilgi formatının kuralları zaten "Başla" kartında yazdığı için orada yalnızca hoş geldin cümlesi çıkar.
 */
const TIPS: Record<QuestionFormat, string | null> = {
  price: '6 hakkın var. Her tahminden sonra “daha pahalı” ya da “daha ucuz” deriz; ±%5 içinde bulursan kazanırsın.',
  number: '6 hakkın var. Her tahminden sonra “daha fazla” ya da “daha az” deriz; ±%5 içinde bulursan kazanırsın.',
  poll: 'Yapar mıydın? Cevabını seç, sonra Türkiye’nin yüzde kaçının seninle aynı dediğini tahmin et. Sonuç gece yarısı belli olur.',
  trivia: null,
  compare: '5 hızlı tur: pahalı bulduğun tarafa dokun. Sağdaki kart sonraki turda sola geçer ve fiyatı bilinir. Her doğru tur 20 puan.',
  celeb: 'Bir ünlü yaz. 8 kutu yanar: yeşil aynı, turuncu yakın, kırmızı farklı. “Bildiklerin” kalan olasılıkları gösterir; 3. tahminden sonra ipucu açılır.',
};

const WELCOME = 'Hoş geldin! Her gün herkese aynı 4 oyun gelir.';

/** Gösterilecek mi? Oyuncu bu formatı daha önce görmediyse ve oyun bitmediyse. */
export function shouldShowTip(format: QuestionFormat, seen: QuestionFormat[], finished: boolean): boolean {
  if (finished || seen.includes(format)) return false;
  return TIPS[format] !== null || seen.length === 0;
}

export function FormatTip({ format }: { format: QuestionFormat }) {
  const c = useColors();
  const f = useFormatStyle(format);
  const { settings, update } = useSettings();
  const first = settings.seenFormats.length === 0;
  const tip = TIPS[format];
  const dismiss = () => update({ seenFormats: [...new Set([...settings.seenFormats, format])] });

  return (
    <Animated.View entering={FadeInDown.delay(120).duration(350)} exiting={FadeOut.duration(200)}>
      <View style={[styles.card, { backgroundColor: f.soft, borderColor: f.color }]}>
        <Row style={{ alignItems: 'flex-start', gap: space.md }}>
          <Icon name="bulb" size={20} color={f.color} />
          <View style={{ flex: 1, gap: space.xs }}>
            {first && <Text style={[font.bodyStrong, { color: c.text }]}>{WELCOME}</Text>}
            {tip && <Text style={[font.body, { color: c.text }]}>{tip}</Text>}
          </View>
        </Row>
        <Row style={{ justifyContent: 'flex-end', gap: space.lg }}>
          <Text
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/how-to-play', params: { format } })}
            style={[styles.link, { color: c.textMuted }]}>
            Tüm kurallar
          </Text>
          <Text accessibilityRole="button" onPress={dismiss} style={[styles.link, { color: f.color }]}>
            Anladım
          </Text>
        </Row>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1.5, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs, gap: space.xs },
  link: { fontFamily: fonts.extrabold, fontSize: 15, paddingVertical: space.sm, paddingHorizontal: space.xs },
});
