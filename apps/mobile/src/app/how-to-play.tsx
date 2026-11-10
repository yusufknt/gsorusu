import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { DailyMode, QuestionFormat } from '@/api/types';
import { Card, Icon, Row, Screen, T, type IconName } from '@/components/ui';
import { MODE_LABEL, MODE_RULE } from '@/lib/modes';
import { modeStyle, radius, space } from '@/theme/tokens';
import { useColors, useIsDark } from '@/theme/useTheme';

const MODES: { mode: DailyMode; rules: string[] }[] = [
  {
    mode: 'pahali',
    rules: [
      '5 hızlı tur: iki şeyden hangisi daha pahalı? Pahalı bulduğun tarafa dokun.',
      'Seçince iki fiyat da açılır. Sağdaki kart sonraki turda sola geçer; fiyatı artık bilinir, yeni geleni tahmin edersin.',
      'Her doğru tur 20 puan.',
    ],
  },
  {
    mode: 'kac',
    rules: [
      'Bir fiyatı ya da sayıyı tahmin et; 6 hakkın var.',
      'Her tahminden sonra yukarı/aşağı ipucu gelir. %10 yakınsan “çok yakın!” dersin.',
      '±%5 içinde bulursan kazanırsın: 1. hakta 100 puan, sonraki her hakta −15.',
      '3. tahminden sonra “aralığı daralt” ipucunu alabilirsin (−10 puan).',
    ],
  },
  {
    mode: 'yapar',
    rules: [
      '“50 bin dolar için şunu yapar mıydın?” Önce kendi cevabını ver.',
      'Sonra Türkiye’nin yüzde kaçının seninle aynı dediğini tahmin et. Puan: 100 − 2 × fark; gece yarısı kesinleşir.',
    ],
  },
  {
    mode: 'unlu',
    rules: [
      'Günün ünlüsünü 10 tahminde bul: şarkıcı, oyuncu, sporcu, yazar, sunucu ya da YouTuber. Yazmaya başla, listeden seç.',
      'Her tahminde 8 kutu yanar: alan, tür (pop, dizi, futbol…), cinsiyet, doğum yılı, doğum yeri, ünlendiği yıllar, hayatta mı, baş harf.',
      'Yeşil aynı, turuncu yakın (aynı alanda başka tür, ±5 yıl, aynı bölge…), kırmızı farklı. Oklar doğru yönü gösterir.',
      '“Bildiklerin” kesinleşen bilgileri ve kalan olası ünlü sayısını gösterir. 3. tahminden sonra bilinen işi, 6. tahminden sonra adının kalıbı açılır.',
      '1. tahminde 100 puan, sonraki her tahminde −10.',
    ],
  },
];

const GENERAL: { icon: IconName; text: string }[] = [
  { icon: 'today-outline', text: 'Her gün 00:00’da (İstanbul) herkese aynı 4 oyun gelir.' },
  { icon: 'extension-puzzle-outline', text: 'Dördünü de bitirince yapbozuna bir parça eklenir; 15 parçada resim tamamlanır ve koleksiyonuna girer.' },
  { icon: 'flame-outline', text: 'Bir gün kaçırırsan seri sıfırlanır, parçalar dağılır. Haftada bir kez videoyla kurtarabilirsin.' },
  { icon: 'albums-outline', text: 'Son 7 günün soruları arşivde; serini etkilemez.' },
  { icon: 'share-social-outline', text: 'Sonucunu cevabı ele vermeden paylaş: renkli kareler ya da hikâye görseli.' },
];

/** Soru formatından günün moduna (format ipucundaki "Tüm kurallar" bağlantısı formatla gelir). */
const MODE_OF: Partial<Record<QuestionFormat, DailyMode>> = { compare: 'pahali', price: 'kac', number: 'kac', poll: 'yapar', celeb: 'unlu' };

/** Kurallar: günün merkezinden, profilden ve format ipucundan açılır. */
export default function HowToPlay() {
  const { format } = useLocalSearchParams<{ format?: QuestionFormat }>();
  const focus = format ? MODE_OF[format] : undefined;
  const ordered = focus ? [...MODES.filter((m) => m.mode === focus), ...MODES.filter((m) => m.mode !== focus)] : MODES;
  return (
    <Screen topInset={false}>
      <Card>
        {GENERAL.map((g) => (
          <Rule key={g.text} icon={g.icon} text={g.text} />
        ))}
      </Card>
      {ordered.map((m) => (
        <ModeRules key={m.mode} {...m} highlighted={m.mode === focus} />
      ))}
    </Screen>
  );
}

function ModeRules({ mode, rules, highlighted }: { mode: DailyMode; rules: string[]; highlighted: boolean }) {
  const c = useColors();
  const dark = useIsDark();
  const m = modeStyle[mode];
  return (
    <Card style={highlighted ? { borderWidth: 2, borderColor: m.color } : undefined}>
      <Row style={{ gap: space.md }}>
        <View style={[styles.icon, { backgroundColor: dark ? m.darkSoft : m.soft }]}>
          <Icon name={m.icon} size={22} color={m.color} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="title" style={{ fontSize: 20 }}>
            {MODE_LABEL[mode]}
          </T>
          <T variant="caption" color="textMuted">
            {MODE_RULE[mode]}
          </T>
        </View>
      </Row>
      {rules.map((r) => (
        <Row key={r} style={{ alignItems: 'flex-start', gap: space.sm }}>
          <View style={[styles.bullet, { backgroundColor: c.textSubtle }]} />
          <T style={{ flex: 1 }}>{r}</T>
        </Row>
      ))}
    </Card>
  );
}

function Rule({ icon, text }: { icon: IconName; text: string }) {
  const c = useColors();
  return (
    <Row style={{ alignItems: 'flex-start', gap: space.md }}>
      <Icon name={icon} size={20} color={c.accent} />
      <T style={{ flex: 1 }}>{text}</T>
    </Row>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
});
