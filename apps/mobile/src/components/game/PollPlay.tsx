import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { PlayAction } from '@/api/hooks';
import type { PlayState, PublicQuestion } from '@/api/types';
import { Button, Card, Choice, Icon, InlineError, Row, T } from '@/components/ui';
import { pctOf } from '@/lib/format';
import { useHaptics } from '@/lib/haptics';
import { font, fonts, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

import { useFormatStyle } from './formatStyle';

/**
 * Türkiye ne diyor?: önce oy, sonra "oyuncuların yüzde kaçı senin gibi dedi?" tahmini.
 * Puan gün bitince kesinleşir; seri oy anında sayılır.
 */
export function PollPlay({
  question,
  play,
  act,
  busy,
  error,
}: {
  question: PublicQuestion;
  play: PlayState | undefined;
  act: (a: PlayAction) => void;
  busy: boolean;
  error: unknown;
}) {
  const c = useColors();
  const f = useFormatStyle('poll');
  const buzz = useHaptics();
  const [option, setOption] = useState<number | null>(null);
  const [predicted, setPredicted] = useState(50);
  const options = question.options ?? [];

  if (play?.finished && play.poll) {
    return (
      <Card tone="muted" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={[styles.voteIcon, { backgroundColor: f.color }]}>
          <Icon name="checkmark" size={22} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="caption" color="textMuted">
            Senin cevabın
          </T>
          <T variant="bodyStrong">{options[play.poll.option]}</T>
          <T variant="caption" color="textMuted">
            Tahminin: oyuncuların {pctOf(play.poll.predictedPct)} senin gibi dedi
          </T>
        </View>
      </Card>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      <T variant="label" color="textMuted">
        1 · Senin cevabın
      </T>
      {options.map((o, i) => (
        <Animated.View key={i} entering={FadeInDown.delay(i * 60).springify().damping(16)}>
          <Choice
            label={o}
            selected={option === i}
            accent={f}
            disabled={busy}
            onPress={() => setOption(i)}
            leading={
              <View style={[styles.radio, { borderColor: option === i ? f.color : c.border }]}>
                {option === i && <View style={[styles.radioDot, { backgroundColor: f.color }]} />}
              </View>
            }
          />
        </Animated.View>
      ))}

      {option !== null && (
        <Animated.View entering={FadeInDown.springify().damping(16)}>
          <Card style={{ gap: space.md }}>
            <T variant="label" color="textMuted">
              2 · Tahminin
            </T>
            <T variant="bodyStrong">Oyuncuların yüzde kaçı “{options[option]}” dedi?</T>
            <Row style={{ justifyContent: 'center' }}>
              <Text style={[font.display, { fontFamily: fonts.black, color: f.color }]} accessibilityLiveRegion="polite">
                %{predicted}
              </Text>
            </Row>
            <Slider
              minimumValue={0}
              maximumValue={100}
              step={1}
              value={predicted}
              onValueChange={(v) => {
                if (v % 10 === 0) buzz('select');
                setPredicted(v);
              }}
              minimumTrackTintColor={f.color}
              maximumTrackTintColor={c.border}
              thumbTintColor={f.color}
              accessibilityLabel="Yüzde tahmini"
            />
            <Button title="Gönder" icon="send" size="lg" loading={busy} onPress={() => act({ kind: 'poll', option, predictedPct: predicted })} />
            <Row style={{ gap: space.sm, alignItems: 'flex-start' }}>
              <Icon name="information-circle-outline" size={18} color={c.textMuted} />
              <T variant="caption" color="textMuted" style={{ flex: 1 }}>
                Gerçeğe ne kadar yakınsan o kadar çok puan: 100 − 2 × fark. Sonuç gece yarısı kesinleşir; serin şimdiden sayılır.
              </T>
            </Row>
          </Card>
        </Animated.View>
      )}
      <InlineError error={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  voteIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
});
