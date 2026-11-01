import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import type { PlayAction } from '@/api/hooks';
import type { Guess, PlayState, PublicQuestion } from '@/api/types';
import { Button, Card, Icon, InlineError, PressableScale, Row, T } from '@/components/ui';
import { directionLabel, formatAmount } from '@/lib/format';
import { useHaptics } from '@/lib/haptics';
import { displayInput, inputValue } from '@/lib/keypad';
import { font, fonts, radius, shadow, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

import { Keypad } from './Keypad';

const NO_GUESSES: Guess[] = [];

/** Fiyatı Ne? ve Sayı tahmini: 6 hak, her tahminde yön, %10 içinde "çok yakın". */
export function NumericPlay({
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
  const buzz = useHaptics();
  const [text, setText] = useState('');
  const shake = useSharedValue(0);
  const n = play?.numeric;
  const guesses = n?.guesses ?? NO_GUESSES;
  const max = n?.maxAttempts ?? question.maxAttempts ?? 6;

  // Yeni tahmin geldiğinde sonucu titreşimle hissettir (uygulama yeniden açılınca değil).
  const seen = useRef(guesses.length);
  useEffect(() => {
    if (guesses.length > seen.current) {
      const last = guesses[guesses.length - 1];
      buzz(last.direction === 'correct' ? 'success' : last.close ? 'warning' : 'tap');
      if (last.direction !== 'correct') shake.set(withSequence(...[8, -8, 6, -6, 0].map((x) => withTiming(x, { duration: 50 }))));
    }
    seen.current = guesses.length;
  }, [guesses, buzz, shake]);

  const displayStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  const submit = () => {
    const value = inputValue(text);
    if (value === null) {
      buzz('error');
      shake.set(withSequence(...[10, -10, 6, -6, 0].map((x) => withTiming(x, { duration: 45 }))));
      return;
    }
    setText('');
    act({ kind: 'guess', value });
  };

  return (
    <View style={{ gap: space.md }}>
      <AttemptDots guesses={guesses} max={max} />

      {guesses.map((g, i) => (
        <GuessRow key={i} index={i} guess={g} question={question} />
      ))}

      {n?.hint && (
        <Animated.View entering={ZoomIn.springify().damping(14)}>
          <Card tone="muted" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={[styles.hintIcon, { backgroundColor: c.warning }]}>
              <Icon name="bulb" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <T variant="caption" color="textMuted">
                İpucu
              </T>
              <T variant="bodyStrong">
                {formatAmount(n.hint.min, question.unit)} – {formatAmount(n.hint.max, question.unit)} arasında
              </T>
            </View>
          </Card>
        </Animated.View>
      )}

      {!play?.finished && (
        <>
          <Row style={{ gap: space.sm }}>
            <Animated.View
              style={[styles.display, { backgroundColor: c.surface, borderColor: text ? c.accent : c.border }, displayStyle]}
              accessibilityLabel={text ? `Tahmin: ${displayInput(text)}` : 'Tahmin girilmedi'}
              accessibilityLiveRegion="polite">
              <Text
                style={[font.headline, { color: text ? c.text : c.textSubtle, flexShrink: 1 }]}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {text ? displayInput(text) : 'Tahminin'}
              </Text>
              {text && question.unit ? <Text style={[font.title, { color: c.textMuted }]}>{question.unit}</Text> : null}
            </Animated.View>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Tahmin et"
              disabled={!text || busy}
              onPress={submit}
              style={[styles.submit, { backgroundColor: c.accent }, shadow(c.accent, 2)]}>
              {busy ? <ActivityIndicator color={c.textOnAccent} /> : <Icon name="arrow-forward" size={30} color={c.textOnAccent} />}
            </PressableScale>
          </Row>

          <Keypad value={text} onChange={setText} disabled={busy} />
          <InlineError error={error} />

          {n?.canUseHint ? (
            <Button title="Aralığı daralt  · −10 puan" icon="bulb-outline" kind="secondary" onPress={() => act({ kind: 'hint' })} disabled={busy} />
          ) : (
            !n?.hintUsed && (
              <T variant="caption" color="textMuted" center>
                {question.hintAfterAttempts ?? 3}. tahminden sonra ipucu açılır
              </T>
            )
          )}
        </>
      )}
    </View>
  );
}

function AttemptDots({ guesses, max }: { guesses: Guess[]; max: number }) {
  const c = useColors();
  return (
    <Row style={{ justifyContent: 'space-between' }} accessibilityLabel={`${guesses.length}/${max} hak kullanıldı`}>
      <Row style={{ gap: 6 }}>
        {Array.from({ length: max }, (_, i) => {
          const g = guesses[i];
          const bg = !g ? 'transparent' : g.direction === 'correct' ? c.correct : g.close ? c.close : g.direction === 'higher' ? c.higher : c.lower;
          return <View key={i} style={[styles.dot, { backgroundColor: bg, borderColor: g ? bg : c.border }]} />;
        })}
      </Row>
      <T variant="caption" color="textMuted">
        {guesses.length}/{max} hak
      </T>
    </Row>
  );
}

function GuessRow({ index, guess, question }: { index: number; guess: Guess; question: PublicQuestion }) {
  const c = useColors();
  const correct = guess.direction === 'correct';
  const tone = correct
    ? { bg: c.correctSoft, fg: c.correct }
    : guess.close
      ? { bg: c.closeSoft, fg: c.close }
      : guess.direction === 'higher'
        ? { bg: c.higherSoft, fg: c.higher }
        : { bg: c.lowerSoft, fg: c.lower };
  const icon = correct ? 'checkmark-circle' : guess.direction === 'higher' ? 'arrow-up-circle' : 'arrow-down-circle';
  const label = directionLabel(guess.direction, question.format);

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(15)}
      style={[styles.guess, { backgroundColor: tone.bg, borderColor: tone.fg }]}
      accessible
      accessibilityLabel={`${index + 1}. tahmin ${formatAmount(guess.value, question.unit)}, ${label}${guess.close && !correct ? ', çok yakın' : ''}`}>
      <View style={[styles.index, { backgroundColor: tone.fg }]}>
        <Text style={[font.caption, { fontFamily: fonts.black, color: '#FFFFFF' }]}>{index + 1}</Text>
      </View>
      <Text style={[font.bodyStrong, { fontSize: 18, color: c.text, flex: 1 }]}>{formatAmount(guess.value, question.unit)}</Text>
      {guess.close && !correct && (
        <View style={[styles.closeBadge, { backgroundColor: c.close }]}>
          <Text style={[font.caption, { fontFamily: fonts.black, color: '#FFFFFF' }]}>Çok yakın!</Text>
        </View>
      )}
      <Row style={{ gap: 4 }}>
        <Icon name={icon} size={22} color={tone.fg} />
        <Text style={[font.bodyStrong, { color: tone.fg }]}>{label}</Text>
      </Row>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  guess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: 56,
  },
  index: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  closeBadge: { borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 },
  hintIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  submit: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  display: {
    flex: 1,
    minHeight: 72,
    borderRadius: radius.lg,
    borderWidth: 2,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
});
