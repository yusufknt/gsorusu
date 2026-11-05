import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAds } from '@/ads/AdsProvider';
import { keys, usePlay, usePlayAction, useQuestion, useStats, type PlayAction } from '@/api/hooks';
import { StreakRepairCard } from '@/components/StreakRepairCard';
import { Button, Card, ErrorView, Icon, InlineError, LoadingScreen, Row, Screen, T } from '@/components/ui';
import { useSettings } from '@/settings/settings';
import { radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

import { ComparePlay } from './ComparePlay';
import { Confetti } from './Confetti';
import { FormatTip, shouldShowTip } from './FormatTip';
import { GameHero } from './GameHero';
import { NumericPlay } from './NumericPlay';
import { PollPlay } from './PollPlay';
import { ResultPanel } from './ResultPanel';
import { TriviaPlay } from './TriviaPlay';
import { YesterdayStrip } from './YesterdayStrip';

/**
 * Bir günün sorusu. `day` verilmezse bugünün sorusu (Bugün sekmesi); verilirse arşiv.
 * Soruya ulaşmak için en fazla 1 dokunuş: uygulama açılınca doğrudan burası gelir.
 */
export function GameScreen({ day, topInset = true }: { day?: string; topInset?: boolean }) {
  const c = useColors();
  const qc = useQueryClient();
  const question = useQuestion(day);
  const q = question.data;
  const play = usePlay(q?.day);
  const stats = useStats();
  const action = usePlayAction(q?.day ?? '');
  const confetti = useConfettiOnSolve(play.data?.finished, play.data?.solved);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const resultY = useRef(0);
  const steps = (play.data?.numeric?.attemptsUsed ?? 0) + (play.data?.compare?.answered.length ?? 0);
  const finished = !!play.data?.finished;
  const { settings, update: updateSettings } = useSettings();

  // Formatı bir kez oynayan (bu cihazda ya da önceden) ipucunu bir daha görmez.
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
    if (advanced && !finished) {
      const id = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 120);
      return () => clearTimeout(id);
    }
  }, [steps, finished]);

  useInterstitialAfterArchive(day, play.data?.finished);

  const act = useCallback((a: PlayAction) => action.mutate(a), [action]);
  const refetchPlay = useCallback(() => void play.refetch(), [play]);
  const refresh = useCallback(() => {
    void question.refetch();
    if (q) void play.refetch();
  }, [question, play, q]);
  const goToNextDay = useCallback(() => {
    void qc.invalidateQueries({ queryKey: keys.question('today') });
    void qc.invalidateQueries({ queryKey: keys.stats });
  }, [qc]);

  // "Bugünün sorusu hazırlanıyor" dahil tüm hatalar sunucunun Türkçe mesajıyla gösterilir.
  if (question.isError) return <ErrorView error={question.error} onRetry={refresh} />;
  if (play.isError) return <ErrorView error={play.error} onRetry={refetchPlay} />;
  if (!q || play.isPending) return <LoadingScreen />;

  const state = play.data;
  const props = { question: q, play: state, act, busy: action.isPending, error: action.error };
  const streak = stats.data?.currentStreak ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <Screen scrollRef={scroll} topInset={topInset} refreshControl={<RefreshControl refreshing={question.isRefetching} onRefresh={refresh} tintColor={c.accent} colors={[c.accent]} />}>
        {/* Arşiv sekmesinden açılan geçmiş gün, kendi gününde oynanmış olsa da "arşiv" görünümündedir. */}
        <GameHero question={q} streak={streak} archive={!!day || (state?.archive ?? false)} />
        {/* Bir gün kaçırıldıysa önce seri kurtarma (ödüllü reklam); yoksa dün şeridi. */}
        {!day && !q.cancelled && !state?.finished && stats.data?.canRepairStreak && <StreakRepairCard />}
        {/* Hiç oynamamış yeni oyuncuya "dün kaçırdın" anlamsız; şerit yalnızca geri dönenlere. */}
        {!day && !q.cancelled && !state?.finished && !stats.data?.canRepairStreak && (stats.data?.played ?? 0) > 0 && <YesterdayStrip today={q.day} />}

        {q.cancelled ? (
          <Card style={{ gap: space.sm }}>
            <Row>
              <Icon name="alert-circle" size={22} color={c.warning} />
              <T variant="bodyStrong">Bu soru iptal edildi</T>
            </Row>
            <T>Sorunun bir hatası vardı, özür dileriz. Bugün kimsenin serisi bozulmayacak; oynamış olanlar 100 puan aldı.</T>
          </Card>
        ) : (
          <>
            {q.format !== 'compare' && (
              <Animated.View entering={FadeInDown.delay(80).duration(350)} style={{ gap: space.md }}>
                {q.mediaUrl && (
                  <Image source={q.mediaUrl} style={[styles.media, { backgroundColor: c.surfaceMuted }]} contentFit="contain" accessibilityLabel="Soru görseli" />
                )}
                <T variant="headline">{q.prompt}</T>
              </Animated.View>
            )}
            {state?.archiveAccess !== 'locked' && shouldShowTip(q.format, settings.seenFormats, !!state?.finished) && <FormatTip format={q.format} />}
            {state?.archive && !state.finished && state.archiveAccess !== 'locked' && (
              <Row style={{ gap: space.xs, alignItems: 'flex-start' }}>
                <Icon name="information-circle-outline" size={16} color={c.textMuted} />
                <T variant="caption" color="textMuted" style={{ flex: 1 }}>
                  {state.archiveAccess === 'free'
                    ? 'Arşiv oyunu: serini etkilemez. Bu soruyla bugünkü ücretsiz arşiv hakkını kullanacaksın.'
                    : 'Arşiv oyunu: serini ve istatistiklerini etkilemez.'}
                </T>
              </Row>
            )}

            {state?.archiveAccess === 'locked' ? (
              <ArchiveLockCard busy={action.isPending} error={action.error} onUnlocked={() => act({ kind: 'unlock' })} />
            ) : q.format === 'price' || q.format === 'number' ? (
              <NumericPlay {...props} />
            ) : q.format === 'trivia' ? (
              <TriviaPlay {...props} onTimeUp={refetchPlay} />
            ) : q.format === 'compare' ? (
              <ComparePlay {...props} />
            ) : (
              <PollPlay {...props} />
            )}

            {state?.finished && (
              <View onLayout={(e) => (resultY.current = e.nativeEvent.layout.y)}>
                <ResultPanel question={q} play={state} streak={streak} isToday={!day} onNextDay={goToNextDay} />
              </View>
            )}
          </>
        )}
      </Screen>
      {confetti && <Confetti />}
    </View>
  );
}

/** Ücretsiz arşiv hakkı bitti: soru ödüllü reklamla açılır. */
function ArchiveLockCard({ busy, error, onUnlocked }: { busy: boolean; error: unknown; onUnlocked: () => void }) {
  const c = useColors();
  const ads = useAds();
  const [watching, setWatching] = useState(false);
  const watch = async () => {
    setWatching(true);
    try {
      if (await ads.showRewarded('archive_unlock')) onUnlocked();
    } finally {
      setWatching(false);
    }
  };
  return (
    <Animated.View entering={FadeInDown.delay(120).duration(350)}>
      <Card style={{ gap: space.md, alignItems: 'center', paddingVertical: space.xl }}>
        <View style={[styles.lock, { backgroundColor: c.accentSoft }]}>
          <Icon name="lock-closed" size={26} color={c.accent} />
        </View>
        <T variant="bodyStrong" center>
          Bugünkü ücretsiz arşiv hakkını kullandın
        </T>
        <T color="textMuted" center>
          Bu soruyu kısa bir video izleyerek açabilirsin. Yarın yeni bir ücretsiz hakkın olacak.
        </T>
        <View style={{ alignSelf: 'stretch' }}>
          <Button title="Video izle · soruyu aç" icon="play-circle" size="lg" onPress={() => void watch()} loading={watching || busy} />
        </View>
        <InlineError error={error} />
      </Card>
    </Animated.View>
  );
}

/**
 * Arşivden bir soru bu ziyarette bitirildiyse, listeye dönerken geçiş reklamı adayıdır
 * (sıklık sınırları AdsProvider'da). Eski, zaten bitmiş bir günü açıp kapatmak sayılmaz.
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
  media: { width: '100%', aspectRatio: 1, borderRadius: radius.lg },
  lock: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
