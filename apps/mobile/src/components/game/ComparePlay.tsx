import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import type { PlayAction } from '@/api/hooks';
import type { CompareResult, PlayState, PublicQuestion, PublicRound } from '@/api/types';
import { Icon, InlineError, PressableScale, Row, T } from '@/components/ui';
import { useHaptics } from '@/lib/haptics';
import { font, fonts, radius, shadow, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

import { useFormatStyle } from './formatStyle';

const REVEAL_MS = 1400;
const NO_ANSWERS: CompareResult[] = [];

/**
 * Hangisi daha…?: 5 hızlı ikili tur. Cevaptan sonra kartlarda değerler ve doğru cevap
 * kısa bir süre görünür, sonra sıradaki tura geçilir.
 */
export function ComparePlay({
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
  const f = useFormatStyle('compare');
  const buzz = useHaptics();
  const rounds = question.rounds ?? [];
  const answered = play?.compare?.answered ?? NO_ANSWERS;
  const [hold, setHold] = useState<number | null>(null);

  // Yeni cevap gelince o turu kısa süre "sonuç" hâlinde tut.
  const seen = useRef(answered.length);
  useEffect(() => {
    if (answered.length > seen.current) {
      const last = answered[answered.length - 1];
      buzz(last.correct ? 'success' : 'error');
      setHold(last.round);
      const id = setTimeout(() => setHold(null), REVEAL_MS);
      seen.current = answered.length;
      return () => clearTimeout(id);
    }
    seen.current = answered.length;
  }, [answered, buzz]);

  const index = hold ?? answered.length;
  const round = rounds[index];
  const result = hold !== null ? answered[hold] : undefined;
  const done = !!play?.finished && hold === null;

  return (
    <View style={{ gap: space.lg }}>
      <Row style={{ gap: 6 }} accessibilityLabel={`${answered.filter((a) => a.correct).length} doğru, ${answered.length}/${rounds.length} tur`}>
        {rounds.map((_, i) => {
          const a = answered[i];
          const bg = a ? (a.correct ? c.correct : c.close) : i === index ? f.color : c.surfaceMuted;
          return (
            <View key={i} style={[styles.progress, { backgroundColor: bg }]}>
              {a && <Icon name={a.correct ? 'checkmark' : 'close'} size={12} color="#FFFFFF" />}
            </View>
          );
        })}
      </Row>

      {round && !done && (
        <Animated.View key={index} entering={FadeIn.duration(250)} style={{ gap: space.md }}>
          <T variant="caption" color="textMuted" center>
            TUR {index + 1}/{rounds.length}
          </T>
          <T variant="title" center>
            {round.prompt ?? question.prompt}
          </T>
          <Duel round={round} result={result} disabled={busy || hold !== null} onChoose={(choice) => act({ kind: 'compare', round: index, choice })} />
        </Animated.View>
      )}

      {done && (
        <View style={{ gap: space.sm }}>
          {answered.map((a) => (
            <Animated.View key={a.round} entering={FadeInDown.delay(a.round * 60)}>
              <Recap round={rounds[a.round]} result={a} />
            </Animated.View>
          ))}
        </View>
      )}
      <InlineError error={error} />
    </View>
  );
}

function Duel({
  round,
  result,
  disabled,
  onChoose,
}: {
  round: PublicRound;
  result?: CompareResult;
  disabled: boolean;
  onChoose: (choice: number) => void;
}) {
  const c = useColors();
  return (
    <View style={styles.duel}>
      {[0, 1].map((side) => {
        const label = side === 0 ? round.optionA : round.optionB;
        const value = result ? (side === 0 ? result.valueA : result.valueB) : null;
        const isCorrect = result?.correctChoice === side;
        const isChosen = result?.choice === side;
        const tone = !result ? null : isCorrect ? 'correct' : isChosen ? 'wrong' : 'dim';
        const bg = tone === 'correct' ? c.correctSoft : tone === 'wrong' ? c.closeSoft : c.surface;
        const border = tone === 'correct' ? c.correct : tone === 'wrong' ? c.close : c.border;
        return (
          <PressableScale
            key={side}
            haptic="select"
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`${label}${value ? `, ${value}` : ''}`}
            onPress={() => onChoose(side)}
            containerStyle={{ flex: 1 }}
            dimWhenDisabled={false}
            style={[styles.side, { backgroundColor: bg, borderColor: border, opacity: tone === 'dim' ? 0.6 : 1 }, !result && shadow(c.shadow, 1)]}>
            <Text style={[font.title, { fontSize: 20, lineHeight: 26, color: c.text, textAlign: 'center' }]} numberOfLines={3} adjustsFontSizeToFit>
              {label}
            </Text>
            {value && (
              <Animated.Text entering={ZoomIn.springify().damping(14)} style={[font.bodyStrong, { color: tone === 'correct' ? c.correct : c.textMuted }]}>
                {value}
              </Animated.Text>
            )}
            {tone === 'correct' && <Icon name="checkmark-circle" size={26} color={c.correct} />}
            {tone === 'wrong' && <Icon name="close-circle" size={26} color={c.close} />}
          </PressableScale>
        );
      })}
      <View style={[styles.vs, { backgroundColor: c.text }]} pointerEvents="none">
        <Text style={[font.caption, { fontFamily: fonts.black, color: c.background }]}>VS</Text>
      </View>
    </View>
  );
}

function Recap({ round, result }: { round: PublicRound; result: CompareResult }) {
  const c = useColors();
  const winner = result.correctChoice === 0 ? round.optionA : round.optionB;
  const loser = result.correctChoice === 0 ? round.optionB : round.optionA;
  const winVal = result.correctChoice === 0 ? result.valueA : result.valueB;
  const loseVal = result.correctChoice === 0 ? result.valueB : result.valueA;
  return (
    <Row style={[styles.recap, { backgroundColor: result.correct ? c.correctSoft : c.closeSoft }]}>
      <Icon name={result.correct ? 'checkmark-circle' : 'close-circle'} size={22} color={result.correct ? c.correct : c.close} />
      <T variant="bodyStrong" style={{ flex: 1 }} numberOfLines={2}>
        {winner} <T color="textMuted">{winVal}</T> {'›'} {loser} <T color="textMuted">{loseVal}</T>
      </T>
    </Row>
  );
}

const styles = StyleSheet.create({
  progress: { flex: 1, height: 22, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  duel: { flexDirection: 'row', gap: space.md },
  side: {
    flex: 1,
    minHeight: 168,
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  vs: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recap: { borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.sm },
});
