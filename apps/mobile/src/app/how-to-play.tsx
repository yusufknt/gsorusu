import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { QuestionFormat } from '@/api/types';
import { useFormatStyle } from '@/components/game/formatStyle';
import { Card, Icon, Row, Screen, T, type IconName } from '@/components/ui';
import { FORMAT_LABEL } from '@/lib/format';
import { radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

const FORMATS: { format: QuestionFormat; day: string; rules: string[] }[] = [
  {
    format: 'price',
    day: 'Pazartesi ve Cuma',
    rules: [
      'Ürünün fiyatını tahmin et; 6 hakkın var.',
      'Her tahminden sonra “daha pahalı” ya da “daha ucuz” ipucu gelir. %10 yakınsan “çok yakın!” dersin.',
      '±%5 içinde bulursan kazanırsın: 1. hakta 100 puan, sonraki her hakta −15.',
      '3. tahminden sonra “aralığı daralt” ipucunu alabilirsin (−10 puan).',
    ],
  },
  {
    format: 'number',
    day: 'Salı',
    rules: ['Fiyatla aynı oyun, bu kez bir sayı: “Galata Kulesi kaç metre?”', 'Bulamazsan son tahminin ne kadar yakınsa o kadar puan (en fazla 20).'],
  },
  {
    format: 'poll',
    day: 'Çarşamba ve Pazar',
    rules: [
      'Önce kendi cevabını ver, sonra oyuncuların yüzde kaçının senin gibi dediğini tahmin et.',
      'Puan: 100 − 2 × fark. Sonuç gece yarısı kesinleşir, serin hemen sayılır.',
    ],
  },
  {
    format: 'trivia',
    day: 'Perşembe',
    rules: ['4 şık, tek hak, 30 saniye. Şıklar “Başla”ya bastığında açılır.', 'Doğru cevap 60 puan, hızlı cevap +40’a kadar bonus.'],
  },
  {
    format: 'compare',
    day: 'Cumartesi',
    rules: ['5 hızlı tur: iki seçenekten hangisi daha kalabalık, uzun, pahalı…?', 'Her doğru tur 20 puan.'],
  },
];

const GENERAL: { icon: IconName; text: string }[] = [
  { icon: 'today-outline', text: 'Her gün 00:00’da (İstanbul) herkese aynı soru gelir.' },
  { icon: 'flame-outline', text: 'Her gün oynarsan serin uzar. Bir günü kaçırırsan haftada bir kez kurtarabilirsin.' },
  { icon: 'time-outline', text: 'Son 7 günün soruları arşivde; serini etkilemez.' },
  { icon: 'share-social-outline', text: 'Sonucunu cevabı ele vermeden paylaş: renkli kareler ya da hikâye görseli.' },
];

/** Tanıtım ekranı yok (plan A4); kurallar soru ekranındaki "?" düğmesiyle açılır. */
export default function HowToPlay() {
  const { format } = useLocalSearchParams<{ format?: QuestionFormat }>();
  const ordered = format ? [...FORMATS.filter((f) => f.format === format), ...FORMATS.filter((f) => f.format !== format)] : FORMATS;
  return (
    <Screen topInset={false}>
      <Card>
        {GENERAL.map((g) => (
          <Rule key={g.text} icon={g.icon} text={g.text} />
        ))}
      </Card>
      {ordered.map((f) => (
        <FormatCard key={f.format} {...f} highlighted={f.format === format} />
      ))}
    </Screen>
  );
}

function FormatCard({ format, day, rules, highlighted }: { format: QuestionFormat; day: string; rules: string[]; highlighted: boolean }) {
  const c = useColors();
  const f = useFormatStyle(format);
  return (
    <Card style={highlighted ? { borderWidth: 2, borderColor: f.color } : undefined}>
      <Row style={{ gap: space.md }}>
        <View style={[styles.icon, { backgroundColor: f.soft }]}>
          <Icon name={f.icon} size={22} color={f.color} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="title" style={{ fontSize: 20 }}>
            {FORMAT_LABEL[format]}
          </T>
          <T variant="caption" color="textMuted">
            {day}
            {highlighted ? ' · bugünün formatı' : ''}
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
