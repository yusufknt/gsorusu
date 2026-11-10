import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import type { PlayAction } from '@/api/hooks';
import type { PlayState, PublicQuestion, Story, StoryBeat } from '@/api/types';
import { SoroFigure } from '@/components/mascot/SoroFigure';
import { Button, Card, Icon, InlineError, PressableScale, Row, T, useWide } from '@/components/ui';
import { pctOf } from '@/lib/format';
import { useHaptics } from '@/lib/haptics';
import { predictionPrompt, STORY_OPTIONS } from '@/lib/story';
import { font, fonts, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

import { useFormatStyle } from './formatStyle';

const ON_COLOR = '#FFFFFF';

/**
 * Yapar mıydın? — Soro'nun hikâyesi. Soro hikâyeyi adım adım anlatır; her adımda hâli ve elindeki eşya değişir
 * (oyuncu "Devam" ile ilerler). Hikâye bitince soru bir kez sorulur: Evet / Hayır. Ardından "Türkiye'nin yüzde
 * kaçı da öyle dedi?" tahmini; puan gece yarısı kesinleşir.
 */
export function StoryPlay({
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
  const story = question.story!;
  const finished = !!play?.finished && !!play.poll;
  const [beat, setBeat] = useState(finished ? story.beats.length : 0);
  const [choice, setChoice] = useState<number | null>(null);
  const reading = beat < story.beats.length;
  const answer = finished ? play.poll!.option : choice;

  return (
    <View style={{ gap: space.md }}>
      <Stage
        story={story}
        beat={beat}
        answer={answer}
        onNext={() => setBeat((b) => Math.min(story.beats.length, b + 1))}
        onBack={() => setBeat((b) => Math.max(0, b - 1))}
        onAnswer={finished ? undefined : setChoice}
      />

      {finished ? (
        <Card tone="muted" style={{ gap: space.xs }}>
          <T variant="caption" color="textMuted">
            Tahminin: Türkiye’nin {pctOf(play.poll!.predictedPct)} senin gibi “{STORY_OPTIONS[play.poll!.option]}” dedi.
          </T>
          {!reading && <Button title="Hikâyeyi yeniden oku" icon="refresh" kind="ghost" onPress={() => setBeat(0)} />}
        </Card>
      ) : (
        choice !== null && (
          <Prediction
            option={choice}
            busy={busy}
            onSubmit={(pct) => act({ kind: 'poll', option: choice, predictedPct: pct })}
            onChange={() => setChoice(null)}
          />
        )
      )}
      <InlineError error={error} />
    </View>
  );
}

/**
 * Sahne: büyük Soro (adımın hâli ve eşyası), altında konuşma balonu ve ilerleme. Son adımdan sonra soru ve
 * Evet / Hayır düğmeleri; cevap verilince Soro cevaba göre tepki verir.
 */
function Stage({
  story,
  beat,
  answer,
  onNext,
  onBack,
  onAnswer,
}: {
  story: Story;
  beat: number;
  answer: number | null;
  onNext: () => void;
  onBack: () => void;
  onAnswer?: (option: number) => void;
}) {
  const c = useColors();
  const f = useFormatStyle('poll');
  const wide = useWide();
  const total = story.beats.length;
  const reading = beat < total;
  const current: StoryBeat = reading
    ? story.beats[beat]
    : { text: story.question, mood: answer === null ? 'think' : answer === 0 ? 'cheer' : 'happy', prop: story.beats[total - 1]?.prop };
  const soroSize = wide ? 180 : 140;

  return (
    <Card style={[styles.stage, { backgroundColor: f.soft }]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Progress total={total} at={beat} color={f.color} />
        <T variant="caption" color="textMuted" style={{ fontFamily: fonts.bold }}>
          {reading ? `${beat + 1}/${total}` : 'Soru'}
        </T>
      </Row>

      <Animated.View key={`soro-${beat}-${answer}`} entering={ZoomIn.springify().damping(13)} style={styles.soro}>
        <SoroFigure size={soroSize} mood={current.mood} prop={current.prop} />
      </Animated.View>

      <Animated.View key={`text-${beat}`} entering={FadeInDown.duration(260)} style={[styles.bubble, { borderColor: c.text, backgroundColor: c.surface }]}>
        <View style={[styles.tail, { borderColor: c.text, backgroundColor: c.surface }]} />
        {!reading && (
          <T variant="label" style={{ color: f.color }}>
            Peki sen?
          </T>
        )}
        <Text style={[reading ? styles.beatText : styles.questionText, { color: c.text }]}>{current.text}</Text>
      </Animated.View>

      {reading ? (
        <Row style={{ gap: space.sm }}>
          {beat > 0 && (
            <PressableScale accessibilityRole="button" accessibilityLabel="Önceki" onPress={onBack} style={[styles.back, { borderColor: c.text }]}>
              <Icon name="arrow-back" size={20} color={c.text} />
            </PressableScale>
          )}
          <View style={{ flex: 1 }}>
            <Button title={beat === total - 1 ? 'Soruyu gör' : 'Devam'} icon="arrow-forward" size="lg" onPress={onNext} />
          </View>
        </Row>
      ) : (
        onAnswer && answer === null && <AnswerButtons onAnswer={onAnswer} />
      )}

      {!reading && answer !== null && (
        <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.reply, { backgroundColor: answer === 0 ? c.correct : c.close }]}>
          <Icon name={answer === 0 ? 'checkmark' : 'close'} size={18} color={ON_COLOR} />
          <Text style={[styles.replyText, { color: ON_COLOR }]}>{STORY_OPTIONS[answer]}</Text>
        </Animated.View>
      )}
    </Card>
  );
}

/** Hikâyenin adımları + soru: geçilenler dolu, şimdiki uzun. */
function Progress({ total, at, color }: { total: number; at: number; color: string }) {
  const c = useColors();
  return (
    <Row style={{ gap: 5 }} accessibilityLabel={`Hikâye ${Math.min(at + 1, total)}/${total}`}>
      {Array.from({ length: total + 1 }, (_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i <= at ? color : c.border }, i === at && styles.dotNow]} />
      ))}
    </Row>
  );
}

function AnswerButtons({ onAnswer }: { onAnswer: (option: number) => void }) {
  const c = useColors();
  const buzz = useHaptics();
  return (
    <Animated.View entering={FadeIn.delay(200).duration(250)}>
      <Row style={{ gap: space.sm }}>
        {[0, 1].map((option) => (
          <PressableScale
            key={option}
            haptic={null}
            accessibilityRole="button"
            accessibilityLabel={STORY_OPTIONS[option]}
            onPress={() => {
              buzz(option === 0 ? 'success' : 'warning');
              onAnswer(option);
            }}
            containerStyle={{ flex: 1 }}
            style={[styles.choice, { backgroundColor: option === 0 ? c.correct : c.close }]}>
            <Icon name={option === 0 ? 'checkmark' : 'close'} size={24} color={ON_COLOR} />
            <Text style={[styles.choiceText, { color: ON_COLOR }]}>{option === 0 ? 'Evet' : 'Hayır'}</Text>
          </PressableScale>
        ))}
      </Row>
    </Animated.View>
  );
}

function Prediction({ option, busy, onSubmit, onChange }: { option: number; busy: boolean; onSubmit: (pct: number) => void; onChange: () => void }) {
  const c = useColors();
  const f = useFormatStyle('poll');
  const buzz = useHaptics();
  const [predicted, setPredicted] = useState(50);
  return (
    <Animated.View entering={FadeInDown.springify().damping(16)}>
      <Card style={{ gap: space.md }}>
        <T variant="label" color="textMuted">
          Şimdi Türkiye’yi tahmin et
        </T>
        <T variant="bodyStrong">{predictionPrompt(option)}</T>
        <Row style={{ justifyContent: 'center' }}>
          <Text style={[font.display, { fontFamily: fonts.black, color: c.text }]} accessibilityLiveRegion="polite">
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
        <Button title="Gönder" icon="send" size="lg" loading={busy} onPress={() => onSubmit(predicted)} />
        <Button title="Cevabımı değiştir" kind="ghost" disabled={busy} onPress={onChange} />
        <T variant="caption" color="textMuted" center>
          Gerçeğe ne kadar yakınsan o kadar çok puan. Sonuç gece yarısı kesinleşir.
        </T>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { gap: space.md, alignItems: 'stretch', borderWidth: 0 },
  soro: { alignSelf: 'center' },
  bubble: { borderWidth: 1.5, borderRadius: radius.lg, padding: space.lg, gap: space.xs },
  tail: { position: 'absolute', top: -8, alignSelf: 'center', width: 14, height: 14, borderLeftWidth: 1.5, borderTopWidth: 1.5, transform: [{ rotate: '45deg' }] },
  beatText: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 26, textAlign: 'center' },
  questionText: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 34, textAlign: 'center' },
  back: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  choice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, borderRadius: radius.pill, minHeight: 60 },
  choiceText: { fontFamily: fonts.black, fontSize: 20 },
  reply: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: space.sm },
  replyText: { fontFamily: fonts.bold, fontSize: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotNow: { width: 22 },
});
