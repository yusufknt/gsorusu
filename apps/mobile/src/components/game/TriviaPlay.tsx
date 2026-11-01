import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import type { PlayAction } from '@/api/hooks';
import type { PlayState, PublicQuestion } from '@/api/types';
import { Button, Card, Choice, Icon, InlineError, Row, T } from '@/components/ui';
import { useHaptics } from '@/lib/haptics';
import { font, fonts, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

import { useFormatStyle } from './formatStyle';
import { useNow } from './useNow';

const LETTERS = 'ABCD';

/**
 * Bilgi: 4 şık, tek hak, 30 saniye. Şıklar yalnızca "Başla" ile sunucudan gelir ve süre o anda başlar.
 * Süre dolunca durum sunucudan yeniden istenir; sunucu oyunu 0 puanla kapatır.
 */
export function TriviaPlay({
  question,
  play,
  act,
  busy,
  error,
  onTimeUp,
}: {
  question: PublicQuestion;
  play: PlayState | undefined;
  act: (a: PlayAction) => void;
  busy: boolean;
  error: unknown;
  onTimeUp: () => void;
}) {
  const c = useColors();
  const f = useFormatStyle('trivia');
  const buzz = useHaptics();
  const t = play?.trivia;
  const running = !!t && !play?.finished;
  const now = useNow(100, running);
  const limitMs = (t?.timeLimitSec ?? question.timeLimitSec ?? 30) * 1000;
  const remainingMs = t ? Math.max(0, Date.parse(t.deadline) - now) : limitMs;
  const timeUpSent = useRef(false);

  useEffect(() => {
    if (running && remainingMs === 0 && !timeUpSent.current) {
      timeUpSent.current = true;
      buzz('error');
      // Sunucu 1 sn ağ payı tanıyor; o pay bitince durumu iste.
      const id = setTimeout(onTimeUp, 1500);
      return () => clearTimeout(id);
    }
  }, [running, remainingMs, onTimeUp, buzz]);

  const wasFinished = useRef(!!play?.finished);
  useEffect(() => {
    if (play?.finished && !wasFinished.current) buzz(play.solved ? 'success' : 'error');
    wasFinished.current = !!play?.finished;
  }, [play?.finished, play?.solved, buzz]);

  if (!t) {
    return (
      <Card style={{ alignItems: 'center', gap: space.lg, paddingVertical: space.xl }}>
        <View style={[styles.bigIcon, { backgroundColor: f.soft }]}>
          <Icon name="stopwatch" size={40} color={f.color} />
        </View>
        <T variant="title" center>
          {question.timeLimitSec ?? 30} saniye · tek hak
        </T>
        <View style={{ gap: space.sm, alignSelf: 'stretch' }}>
          <Rule icon="eye-off-outline" text="Şıklar Başla’ya bastığında açılır." />
          <Rule icon="flash-outline" text="Hızlı cevap +40 puana kadar bonus getirir." />
          <Rule icon="close-circle-outline" text="Yanlış cevap ya da süre biterse 0 puan." />
        </View>
        <View style={{ alignSelf: 'stretch' }}>
          <Button title="Başla" icon="play" size="lg" onPress={() => act({ kind: 'start' })} loading={busy} />
        </View>
        <InlineError error={error} />
      </Card>
    );
  }

  const correct = play?.reveal?.correctOption;
  const seconds = Math.ceil(remainingMs / 1000);
  return (
    <View style={{ gap: space.md }}>
      {running && <TimerRing remainingMs={remainingMs} limitMs={limitMs} seconds={seconds} />}
      {t.options.map((option, i) => {
        const tone =
          correct == null ? undefined : i === correct ? 'correct' : i === t.chosenOption ? 'wrong' : ('dim' as const);
        return (
          <Animated.View key={i} entering={FadeInDown.delay(i * 70).springify().damping(16)}>
            <Choice
              label={option}
              selected={t.chosenOption === i}
              tone={tone}
              disabled={!running || busy}
              onPress={() => act({ kind: 'answer', option: i })}
              leading={<LetterBadge letter={LETTERS[i]} tone={tone} />}
              trailing={
                tone === 'correct' ? (
                  <Icon name="checkmark-circle" size={24} color={c.correct} />
                ) : tone === 'wrong' ? (
                  <Icon name="close-circle" size={24} color={c.close} />
                ) : undefined
              }
            />
          </Animated.View>
        );
      })}
      {t.timedOut && (
        <Row style={{ justifyContent: 'center' }}>
          <Icon name="alarm-outline" size={18} color={c.close} />
          <T variant="bodyStrong" color="close">
            Süre doldu
          </T>
        </Row>
      )}
      <InlineError error={error} />
    </View>
  );
}

function Rule({ icon, text }: { icon: 'eye-off-outline' | 'flash-outline' | 'close-circle-outline'; text: string }) {
  const c = useColors();
  return (
    <Row style={{ gap: space.md }}>
      <Icon name={icon} size={20} color={c.textMuted} />
      <T style={{ flex: 1 }}>{text}</T>
    </Row>
  );
}

function LetterBadge({ letter, tone }: { letter: string; tone?: 'correct' | 'wrong' | 'dim' }) {
  const c = useColors();
  const bg = tone === 'correct' ? c.correct : tone === 'wrong' ? c.close : c.surfaceMuted;
  return (
    <View style={[styles.letter, { backgroundColor: bg }]}>
      <Text style={[font.bodyStrong, { color: tone === 'correct' || tone === 'wrong' ? '#FFFFFF' : c.text }]}>{letter}</Text>
    </View>
  );
}

const RING = 112;
const STROKE = 10;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

function TimerRing({ remainingMs, limitMs, seconds }: { remainingMs: number; limitMs: number; seconds: number }) {
  const c = useColors();
  const urgent = seconds <= 5;
  const color = urgent ? c.close : c.accent;
  return (
    <View style={styles.ringWrap} accessible accessibilityLabel={`Kalan süre ${seconds} saniye`} accessibilityLiveRegion="polite">
      <Svg width={RING} height={RING}>
        <Circle cx={RING / 2} cy={RING / 2} r={R} stroke={c.surfaceMuted} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={R}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - remainingMs / limitMs)}
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.ringCenter}>
          <Text style={[font.headline, { fontFamily: fonts.black, color }]}>{seconds}</Text>
          <Text style={[font.caption, { color: c.textMuted, marginTop: -4 }]}>saniye</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bigIcon: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  letter: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ringWrap: { alignSelf: 'center', width: RING, height: RING },
  ringCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
