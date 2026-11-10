import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInDown, SlideInRight, ZoomIn } from 'react-native-reanimated';

import type { PlayAction } from '@/api/hooks';
import type { CompareResult, Media, PlayState, PublicQuestion, PublicRound } from '@/api/types';
import { Icon, InlineError, PressableScale, Row, T } from '@/components/ui';
import { formatApprox, parseApprox } from '@/lib/approx';
import { useHaptics } from '@/lib/haptics';
import { fonts, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/** Sonuç ekranda kalma süresi: fiyatlar sayılır, doğru taraf yanar, sonra sağdaki kart sola kayar. */
const REVEAL_MS = 1900;
const COUNT_MS = 750;
/** Bu genişlikten itibaren iki taraf yan yana; dar ekranda üst üste (Higher-Lower oyunu gibi). */
const SIDE_BY_SIDE_MIN = 600;
const NO_ANSWERS: CompareResult[] = [];
const ON_PHOTO = '#FFFFFF';
const SCRIM = 'rgba(0, 0, 0, 0.48)';
/** Seçilmeyen ve doğru olmayan taraf biraz daha kararır. */
const SCRIM_DIM = 'rgba(0, 0, 0, 0.68)';
/** Fotoğraf üstünde fiyat (her iki temada da koyu zeminde okunur). */
const PRICE_ON_PHOTO = '#FFD84D';

/**
 * Hangisi pahalı? (Higher-Lower sahnesi): iki tam görselli yarı, ortada VS. Bir tarafa dokununca iki
 * fiyat sayarak açılır; doğru taraf yeşil yanar. Turlar zincirliyse sağdaki kart sonraki turda sola
 * geçer ve fiyatı bilinir; oyuncu yalnız yeni gelenin pahalı olup olmadığına karar verir.
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
  return (
    <CompareBoard
      rounds={question.rounds ?? []}
      answered={play?.compare?.answered ?? NO_ANSWERS}
      finished={!!play?.finished}
      busy={busy}
      error={error}
      onChoose={(round, choice) => act({ kind: 'compare', round, choice })}
    />
  );
}

/** Sahne ve özet; günlük oyun da sınırsız mod da kullanır (cevabı kimin değerlendirdiğinden bağımsız). */
export function CompareBoard({
  rounds,
  answered,
  finished,
  busy,
  error,
  onChoose,
}: {
  rounds: PublicRound[];
  answered: CompareResult[];
  finished: boolean;
  busy: boolean;
  error: unknown;
  onChoose: (round: number, choice: number) => void;
}) {
  const buzz = useHaptics();
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
  const done = finished && hold === null;
  // Zincirde soldaki önceki turun sağıydı: fiyatı zaten açıldı.
  const prev = index > 0 ? answered[index - 1] : undefined;
  const knownA = prev && rounds[index - 1]?.optionB === round?.optionA ? prev.valueB : null;

  return (
    <View style={{ gap: space.md }}>
      <Progress rounds={rounds.length} answered={answered} index={index} />

      {round && !done && (
        <View style={{ gap: space.sm }}>
          <Stage
            key={index}
            round={round}
            result={result}
            knownA={knownA}
            chained={!!knownA}
            disabled={busy || hold !== null}
            onChoose={(choice) => onChoose(index, choice)}
          />
          {round.mediaA && round.mediaB && (
            <T variant="caption" color="textSubtle" center style={{ fontSize: 11, lineHeight: 14 }}>
              Fotoğraflar: {round.mediaA.credit} / {round.mediaB.credit}
            </T>
          )}
        </View>
      )}

      {done && (
        <View>
          {answered.map((a) => (
            <Animated.View key={a.round} entering={FadeInDown.delay(a.round * 60)}>
              <Recap round={rounds[a.round]} result={a} last={a.round === answered.length - 1} />
            </Animated.View>
          ))}
        </View>
      )}
      <InlineError error={error} />
    </View>
  );
}

/** Üstte tur kareleri: doğru yeşil, yanlış kırmızı, sıradaki koyu çerçeve. */
function Progress({ rounds, answered, index }: { rounds: number; answered: CompareResult[]; index: number }) {
  const c = useColors();
  const correct = answered.filter((a) => a.correct).length;
  return (
    <Row style={{ justifyContent: 'space-between' }} accessibilityLabel={`${correct} doğru, ${answered.length}/${rounds} tur`}>
      <T variant="label" color="textMuted">
        {`Tur ${Math.min(index + 1, rounds)}/${rounds}`}
      </T>
      <Row style={{ gap: 5 }}>
        {Array.from({ length: rounds }, (_, i) => {
          const a = answered[i];
          const bg = a ? (a.correct ? c.correct : c.close) : c.surfaceSunken;
          return (
            <View key={i} style={[styles.square, { backgroundColor: bg }, !a && i === index && { borderWidth: 2, borderColor: c.text }]}>
              {a && <Icon name={a.correct ? 'checkmark' : 'close'} size={13} color={ON_PHOTO} />}
            </View>
          );
        })}
      </Row>
    </Row>
  );
}

function Stage({
  round,
  result,
  knownA,
  chained,
  disabled,
  onChoose,
}: {
  round: PublicRound;
  result?: CompareResult;
  knownA: string | null;
  chained: boolean;
  disabled: boolean;
  onChoose: (choice: number) => void;
}) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const row = width >= SIDE_BY_SIDE_MIN;
  const verdict = result ? (result.correct ? c.correct : c.close) : c.text;

  return (
    <View style={[styles.stage, row ? styles.stageRow : styles.stageColumn, { backgroundColor: c.text }]}>
      {[0, 1].map((side) => {
        const isB = side === 1;
        const label = isB ? round.optionB : round.optionA;
        const media = isB ? round.mediaB : round.mediaA;
        const revealed = result ? (isB ? result.valueB : result.valueA) : null;
        const value = revealed ?? (!isB ? knownA : null);
        // Yeni gelen kart (zincirde sağdaki) kayarak girer; soldaki önceki turdan yerinde kalır.
        const entering = isB ? (row ? SlideInRight : SlideInDown).duration(380) : chained ? undefined : FadeIn.duration(250);
        return (
          <Animated.View key={side} entering={entering} style={styles.half}>
            <Side
              label={label}
              media={media ?? null}
              value={value}
              countUp={!!revealed && !(knownA && !isB)}
              tone={!result ? null : result.correctChoice === side ? 'correct' : result.choice === side ? 'wrong' : 'other'}
              disabled={disabled}
              onPress={() => onChoose(side)}
            />
          </Animated.View>
        );
      })}

      <View style={styles.vsWrap} pointerEvents="none">
        <Animated.View key={result ? 'r' : 'q'} entering={result ? ZoomIn.springify().damping(12) : undefined} style={[styles.vs, { backgroundColor: result ? verdict : c.background, borderColor: c.text }]}>
          {result ? (
            <Icon name={result.correct ? 'checkmark' : 'close'} size={26} color={ON_PHOTO} />
          ) : (
            <Text style={[styles.vsText, { color: c.text }]}>VS</Text>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

function Side({
  label,
  media,
  value,
  countUp,
  tone,
  disabled,
  onPress,
}: {
  label: string;
  media: Media | null;
  value: string | null;
  countUp: boolean;
  tone: 'correct' | 'wrong' | 'other' | null;
  disabled: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const shown = useCountUp(value, countUp);
  const ring = tone === 'correct' ? c.correct : tone === 'wrong' ? c.close : null;

  return (
    <PressableScale
      haptic="select"
      disabled={disabled}
      dimWhenDisabled={false}
      accessibilityRole="button"
      accessibilityLabel={`${label}${value ? `, ${value}` : ''}. Bu daha pahalı`}
      onPress={onPress}
      containerStyle={{ flex: 1 }}
      style={styles.side}>
      {media ? (
        <Image
          source={typeof media.src === 'string' ? { uri: media.src } : media.src}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          accessibilityLabel={label}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.textMuted }]} />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tone === 'other' ? SCRIM_DIM : SCRIM }]} />
      {ring && <Animated.View entering={FadeIn.duration(200)} style={[StyleSheet.absoluteFill, styles.ring, { borderColor: ring }]} />}

      <View style={styles.sideContent}>
        <Text style={styles.label} numberOfLines={3}>
          {`“${label}”`}
        </Text>
        {shown && (
          <Animated.Text entering={FadeIn.duration(150)} style={[styles.price, tone === 'wrong' && { color: ON_PHOTO }]}>
            {shown}
          </Animated.Text>
        )}
        {!tone && (
          <View style={styles.pick}>
            <Text style={styles.pickText}>Bu daha pahalı</Text>
          </View>
        )}
        {tone === 'correct' && (
          <Animated.View entering={ZoomIn.delay(COUNT_MS).springify()} style={[styles.badge, { backgroundColor: c.correct }]}>
            <Text style={styles.badgeText}>DAHA PAHALI</Text>
          </Animated.View>
        )}
      </View>
    </PressableScale>
  );
}

/** Değeri sıfırdan sayarak gösterir (açılış anı); `run` false ise doğrudan son hâli. */
function useCountUp(value: string | null, run: boolean): string | null {
  // Yalnız sayım sırasında değişir; run false iken kullanılmaz (açılışta tam değer bir an görünmesin).
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!value || !run) return;
    let frame = 0;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / COUNT_MS);
      setT(1 - (1 - p) ** 3);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, run]);
  if (!value) return null;
  const a = parseApprox(value);
  return a && run ? formatApprox(a, t) : value;
}

function Recap({ round, result, last }: { round: PublicRound; result: CompareResult; last: boolean }) {
  const c = useColors();
  const sides = [
    { label: round.optionA, value: result.valueA, media: round.mediaA },
    { label: round.optionB, value: result.valueB, media: round.mediaB },
  ];
  return (
    <Row style={[styles.recap, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
      <Icon name={result.correct ? 'checkmark-circle' : 'close-circle'} size={22} color={result.correct ? c.correct : c.close} />
      {sides.map((s, i) => (
        <Row key={i} style={{ flex: 1, gap: space.sm, opacity: result.correctChoice === i ? 1 : 0.6 }}>
          {s.media && <Image source={typeof s.media.src === 'string' ? { uri: s.media.src } : s.media.src} style={styles.thumb} contentFit="cover" />}
          <View style={{ flex: 1 }}>
            <T variant="caption" numberOfLines={2} style={{ fontFamily: result.correctChoice === i ? fonts.bold : fonts.regular }}>
              {s.label}
            </T>
            <T variant="caption" color="textMuted">
              {s.value ?? ''}
            </T>
          </View>
        </Row>
      ))}
    </Row>
  );
}

const styles = StyleSheet.create({
  square: { width: 22, height: 22, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  stage: { borderRadius: radius.lg, overflow: 'hidden', gap: 2 },
  stageRow: { flexDirection: 'row', height: 520 },
  stageColumn: { flexDirection: 'column', height: 520 },
  half: { flex: 1 },
  side: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ring: { borderWidth: 5 },
  sideContent: { alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, maxWidth: 320 },
  label: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 31, color: ON_PHOTO, textAlign: 'center' },
  price: { fontFamily: fonts.black, fontSize: 38, lineHeight: 44, color: PRICE_ON_PHOTO },
  pick: { borderWidth: 2, borderColor: ON_PHOTO, borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: space.sm },
  pickText: { fontFamily: fonts.bold, fontSize: 15, color: ON_PHOTO },
  badge: { borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.black, fontSize: 11, letterSpacing: 1.2, color: ON_PHOTO },
  vsWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  vs: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  vsText: { fontFamily: fonts.black, fontSize: 18 },
  recap: { gap: space.md, paddingVertical: space.md },
  thumb: { width: 44, height: 44, borderRadius: radius.sm },
});
