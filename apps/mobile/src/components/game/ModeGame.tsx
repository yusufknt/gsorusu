import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAds } from '@/ads/AdsProvider';
import { useDay, usePlay, usePlayAction, useQuestion, useStats, type PlayAction } from '@/api/hooks';
import type { DailyMode } from '@/api/types';
import { Button, ErrorView, Icon, LoadingScreen, Row, Screen, T, useWide } from '@/components/ui';
import { MODE_LABEL, MODE_RULE } from '@/lib/modes';
import { useSettings } from '@/settings/settings';
import { modeStyle, space } from '@/theme/tokens';

import { CelebPlay } from './CelebPlay';
import { ComparePlay } from './ComparePlay';
import { Confetti } from './Confetti';
import { FormatTip, shouldShowTip } from './FormatTip';
import { NumericPlay } from './NumericPlay';
import { PollPlay } from './PollPlay';
import { QuestionImage } from './QuestionImage';
import { ResultPanel } from './ResultPanel';
import { StoryPlay } from './StoryPlay';

/**
 * Günün bir modu. `day` verilmezse bugün; verilirse arşiv günü (serini etkilemez).
 * Oyun bitince sıradaki bitmemiş moda tek dokunuşla geçilir; hepsi bittiyse merkeze dönülür.
 */
export function ModeGame({ mode, day: dayParam }: { mode: DailyMode; day?: string }) {
  const set = useDay(dayParam);
  const day = dayParam ?? set.data?.day;
  const question = useQuestion(day, mode);
  const q = question.data;
  const play = usePlay(day, mode);
  const stats = useStats();
  const action = usePlayAction(day ?? '', mode);
  const confetti = useConfettiOnSolve(play.data?.finished, play.data?.solved);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const resultY = useRef(0);
  const steps = (play.data?.numeric?.attemptsUsed ?? 0) + (play.data?.compare?.answered.length ?? 0) + (play.data?.celeb?.guesses.length ?? 0);
  const finished = !!play.data?.finished;
  const { settings, update: updateSettings } = useSettings();
  const m = modeStyle[mode];
  const wide = useWide();

  // Formatı bir kez oynayan ipucunu bir daha görmez.
  const format = q?.format;
  const playedFormatBefore = !!stats.data?.byFormat.some((f) => f.format === format && f.played > 0);
  useEffect(() => {
    if (format && (finished || playedFormatBefore) && !settings.seenFormats.includes(format)) {
      updateSettings({ seenFormats: [...settings.seenFormats, format] });
    }
  }, [format, finished, playedFormatBefore, settings.seenFormats, updateSettings]);

  // Her tahminden sonra giriş alanı görünür kalsın; oyun bitince sonuca in.
  const lastSteps = useRef<number | null>(null);
  const lastFinished = useRef<boolean | null>(null);
  useEffect(() => {
    const first = lastSteps.current === null;
    const justFinished = lastFinished.current === false && finished;
    const advanced = !first && steps > (lastSteps.current ?? 0);
    lastSteps.current = steps;
    lastFinished.current = finished;
    if (justFinished) {
      const id = setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, resultY.current - space.lg), animated: true }), 350);
      return () => clearTimeout(id);
    }
    // Hangi ünlü?'de yeni tahmin en üstte; arama kutusu da üstte kalır, kaydırma gerekmez.
    if (advanced && !finished && mode !== 'unlu') {
      const id = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 120);
      return () => clearTimeout(id);
    }
  }, [steps, finished, mode]);

  useInterstitialAfterArchive(dayParam, play.data?.finished);

  const act = useCallback((a: PlayAction) => action.mutate(a), [action]);
  const refetch = useCallback(() => {
    void question.refetch();
    void play.refetch();
  }, [question, play]);

  if (set.isError && !dayParam) return <ErrorView error={set.error} onRetry={() => void set.refetch()} />;
  if (question.isError) return <ErrorView error={question.error} onRetry={refetch} />;
  if (play.isError) return <ErrorView error={play.error} onRetry={refetch} />;
  if (!q || play.isPending) return <LoadingScreen />;

  const state = play.data;
  const props = { question: q, play: state, act, busy: action.isPending, error: action.error };
  const streak = stats.data?.currentStreak ?? 0;
  const archive = !!dayParam || !!state?.archive;
  const next = set.data?.modes.find((x) => x.mode !== mode && !x.finished);

  // Sahnesi kendi geniş olan modlar (pahalı, ünlü) tek sütun; diğerleri geniş ekranda ikiye bölünür.
  const story = !!q.story?.beats.length;
  const split = wide && q.format !== 'compare' && q.format !== 'celeb' && !story;

  const header = (
    <Animated.View entering={FadeInDown.duration(300)} style={{ gap: space.sm }}>
      <Row style={{ gap: space.xs }}>
        <Icon name={m.icon} size={16} color={m.color} />
        <T variant="label" style={{ color: m.color }}>
          {MODE_LABEL[mode]}
        </T>
        <T variant="caption" color="textSubtle">
          · {MODE_RULE[mode]}
        </T>
      </Row>
      {q.media && q.format !== 'compare' && (
        <QuestionImage media={q.media} alt={q.prompt} aspectRatio={split ? 4 / 3 : q.format === 'poll' ? 21 / 9 : 16 / 9} />
      )}
      {/* Pahalı sahnesi, ünlü ve hikâye (Yapar mıydın?) soruyu kendileri gösterir. */}
      {q.format !== 'compare' && q.format !== 'celeb' && !story && (
        <T variant="headline" style={split ? styles.splitPrompt : undefined}>
          {q.prompt}
        </T>
      )}
    </Animated.View>
  );

  const playArea = (
    <>
      {shouldShowTip(q.format, settings.seenFormats, !!state?.finished) && <FormatTip format={q.format} />}
      {archive && !state?.finished && (
        <Row style={{ gap: space.xs, alignItems: 'flex-start' }}>
          <Icon name="information-circle-outline" size={16} />
          <T variant="caption" color="textMuted" style={{ flex: 1 }}>
            Arşiv oyunu: serini ve yapbozunu etkilemez.
          </T>
        </Row>
      )}

      {q.format === 'price' || q.format === 'number' ? (
        <NumericPlay {...props} />
      ) : q.format === 'compare' ? (
        <ComparePlay {...props} />
      ) : q.format === 'celeb' ? (
        <CelebPlay {...props} />
      ) : story ? (
        <StoryPlay {...props} />
      ) : (
        <PollPlay {...props} />
      )}

      {state?.finished && (
        <View onLayout={(e) => (resultY.current = e.nativeEvent.layout.y)} style={{ gap: space.lg }}>
          <ResultPanel question={q} play={state} mode={mode} streak={streak} />
          {mode === 'pahali' && !archive && (
            <Button title="Sınırsız moda geç · Premium" icon="play-forward" kind="secondary" size="lg" onPress={() => router.push('/practice')} />
          )}
          {next ? (
            <Button
              title={`Sıradaki: ${MODE_LABEL[next.mode]}`}
              icon="arrow-forward"
              size="lg"
              onPress={() => router.replace({ pathname: '/play/[mode]', params: dayParam ? { mode: next.mode, day: dayParam } : { mode: next.mode } })}
            />
          ) : (
            <Button title={archive ? 'Güne dön' : 'Yapbozuna bak'} icon={archive ? 'arrow-back' : 'extension-puzzle'} size="lg" onPress={() => router.back()} />
          )}
        </View>
      )}
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen scrollRef={scroll} topInset={false} width={wide ? 'game' : 'narrow'}>
        {split ? (
          // Geniş ekran (sayı ve anket): solda büyük görsel ve soru, sağda cevap alanı ve sonuç.
          <View style={styles.split}>
            <View style={styles.splitQuestion}>{header}</View>
            <View style={styles.splitPlay}>{playArea}</View>
          </View>
        ) : (
          <>
            {header}
            {playArea}
          </>
        )}
      </Screen>
      {confetti && <Confetti />}
    </View>
  );
}

/**
 * Arşivden bir oyun bu ziyarette bitirildiyse, çıkarken geçiş reklamı adayıdır
 * (sıklık sınırları AdsProvider'da). Eski, zaten bitmiş bir oyunu açıp kapatmak sayılmaz.
 */
function useInterstitialAfterArchive(day: string | undefined, finished: boolean | undefined) {
  const { maybeShowInterstitial } = useAds();
  // Oyun durumu yüklenince ilk görülen değer: zaten bitmişse bu ziyaret sayılmaz.
  const initial = useRef<boolean | null>(null);
  const finishedHere = useRef(false);
  useEffect(() => {
    if (!day || finished === undefined) return;
    if (initial.current === null) initial.current = finished;
    else if (finished && !initial.current) finishedHere.current = true;
  }, [day, finished]);
  const show = useRef(maybeShowInterstitial);
  useEffect(() => {
    show.current = maybeShowInterstitial;
  }, [maybeShowInterstitial]);
  useEffect(
    () => () => {
      if (finishedHere.current) void show.current('after_archive');
    },
    [],
  );
}

/** Oyun bu ekranda (yeniden açılışta değil) bilinerek bittiyse konfeti. */
function useConfettiOnSolve(finished: boolean | undefined, solved: boolean | undefined): boolean {
  const initial = useRef<boolean | undefined>(undefined);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (finished === undefined) return;
    if (initial.current === undefined) {
      initial.current = finished;
      return;
    }
    if (finished && !initial.current && solved) {
      initial.current = true;
      setShow(true);
      const id = setTimeout(() => setShow(false), 2600);
      return () => clearTimeout(id);
    }
  }, [finished, solved]);
  return show;
}

const styles = StyleSheet.create({
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xxl },
  splitQuestion: { flex: 1, minWidth: 0 },
  splitPlay: { width: 540, gap: space.lg },
  splitPrompt: { fontSize: 40, lineHeight: 46 },
});
