import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { useFinishPracticeSet, useOpenPracticeSet, usePractice } from '@/api/hooks';
import type { CompareResult, PracticeState } from '@/api/types';
import { CompareBoard } from '@/components/game/ComparePlay';
import { PageHero } from '@/components/layout/PageHero';
import { PremiumCard } from '@/components/premium/PremiumCard';
import { Button, Card, ErrorView, Icon, InlineError, LoadingScreen, Row, Screen, T, useWide } from '@/components/ui';
import { PRACTICE } from '@/lib/practice';
import { font, fonts, modeStyle, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/**
 * Sınırsız "Hangisi pahalı?" (premium): günün oyunu bitince açılır, seriyi etkilemez. Setler 10 tur, sınırsız.
 * Cevaplar istemcide değerlendirilir, set bitince sonuç sunucuya gider. Premium değilse teklif kartı görünür.
 */
export default function PracticeScreen() {
  const practice = usePractice();
  const open = useOpenPracticeSet();
  const finish = useFinishPracticeSet();
  const wide = useWide();
  const [answers, setAnswers] = useState<{ no: number; list: CompareResult[] }>({ no: 0, list: [] });

  if (practice.isError) return <ErrorView error={practice.error} onRetry={() => void practice.refetch()} />;
  if (!practice.data) return <LoadingScreen />;

  const st = practice.data;
  const set = st.set;
  const answered = set && answers.no === set.no ? answers.list : [];
  const playing = !!set && !set.finished;
  // Set bitince de tahta kalır: son turun açılışı ve özet görünür, altında yeni set kartı.
  const showBoard = !!set && (playing || answered.length > 0);

  const choose = (round: number, choice: number) => {
    if (!set || round !== answered.length) return;
    const r = set.rounds[round];
    const list = [...answered, { round, choice, correct: choice === r.correct, correctChoice: r.correct, valueA: r.valueA, valueB: r.valueB }];
    setAnswers({ no: set.no, list });
    if (list.length === set.rounds.length) finish.mutate(list.filter((a) => a.correct).length);
  };


  return (
    <Screen topInset={false} width={wide ? 'game' : 'narrow'}>
      <PageHero
        eyebrow="Sınırsız mod · Premium · seriyi etkilemez"
        title="Hangisi pahalı?"
        subtitle={`Her set ${PRACTICE.rounds} tur; istediğin kadar set aç.`}
        mood={!st.premium || !st.unlocked ? 'sleep' : playing ? 'think' : 'cheer'}
        say={soroSays(st)}
      />

      <PracticeNumbers state={st} />

      {!st.premium && <PremiumCard reason="Sınırsız Hangisi pahalı? premium aboneliğe dahil." />}
      {st.premium && !st.unlocked && <LockedCard />}
      {st.premium && st.unlocked && showBoard && set && (
        <CompareBoard rounds={set.rounds} answered={answered} finished={answered.length === set.rounds.length} busy={finish.isPending} error={finish.error} onChoose={choose} />
      )}
      {st.premium && st.unlocked && !playing && (
        <NextSetCard state={st} lastCorrect={set?.finished ? set.correct : null} loading={open.isPending} onStart={() => open.mutate()} error={open.error} />
      )}
    </Screen>
  );
}

function soroSays(st: PracticeState): string {
  if (!st.premium) return 'Premium’la istediğin kadar oynayabilirsin.';
  if (!st.unlocked) return 'Önce günün Hangisi pahalı? oyununu bitir.';
  if (st.set && !st.set.finished) return 'Etiketlere değil, sezgine güven!';
  if (st.set?.correct === PRACTICE.rounds) return 'On’da on! Durdurulamazsın.';
  return st.best > 0 ? `Rekorun ${st.best}/${PRACTICE.rounds}. Kırabilir misin?` : 'Hazırsan başlayalım!';
}

function PracticeNumbers({ state }: { state: PracticeState }) {
  return (
    <Row style={{ alignItems: 'stretch' }}>
      <Stat label="Rekor" value={`${state.best}/${PRACTICE.rounds}`} icon="trophy" />
      <Stat label="Toplam doğru" value={String(state.totalCorrect)} icon="checkmark-circle" />
      <Stat label="Bugün set" value={String(state.setsToday)} icon="albums-outline" />
    </Row>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: 'trophy' | 'checkmark-circle' | 'albums-outline' }) {
  const c = useColors();
  return (
    <Card style={styles.number}>
      <Icon name={icon} size={18} color={c.textMuted} />
      <Text style={[font.title, { fontFamily: fonts.black, color: c.text }]} accessibilityLabel={`${label}: ${value}`}>
        {value}
      </Text>
      <T variant="caption" color="textMuted" center>
        {label}
      </T>
    </Card>
  );
}

function LockedCard() {
  const c = useColors();
  return (
    <Card style={styles.center}>
      <View style={[styles.badge, { backgroundColor: c.accentSoft }]}>
        <Icon name="lock-closed" size={26} color={c.accent} />
      </View>
      <T variant="bodyStrong" center>
        Günün Hangisi pahalı? oyununu bitirince açılır
      </T>
      <T color="textMuted" center>
        Önce bugünün 5 turunu oyna; sonra istediğin kadar devam et.
      </T>
      <View style={{ alignSelf: 'stretch' }}>
        <Button title="Günün oyununa git" icon="arrow-forward" size="lg" onPress={() => router.replace({ pathname: '/play/[mode]', params: { mode: 'pahali' } })} />
      </View>
    </Card>
  );
}

function NextSetCard({
  state,
  lastCorrect,
  loading,
  onStart,
  error,
}: {
  state: PracticeState;
  lastCorrect: number | null;
  loading: boolean;
  onStart: () => void;
  error: unknown;
}) {
  const c = useColors();
  const record = lastCorrect !== null && lastCorrect > 0 && lastCorrect === state.best;
  return (
    <Animated.View entering={FadeInDown.springify().damping(16)}>
      <Card style={styles.center}>
        {lastCorrect !== null ? (
          <>
            <T variant="label" color="textMuted">
              Bu setin sonucu
            </T>
            <Animated.Text entering={ZoomIn.springify()} style={[font.display, { fontFamily: fonts.black, color: c.text }]}>
              {lastCorrect}/{PRACTICE.rounds}
            </Animated.Text>
            {record && (
              <Row style={[styles.record, { backgroundColor: modeStyle.pahali.color }]}>
                <Icon name="trophy" size={16} color={c.textOnAccent} />
                <Text style={[styles.recordText, { color: c.textOnAccent }]}>Rekorun!</Text>
              </Row>
            )}
          </>
        ) : (
          <T variant="bodyStrong" center>
            {PRACTICE.rounds} yeni eşleşme seni bekliyor
          </T>
        )}
        <View style={{ alignSelf: 'stretch' }}>
          <Button
            title={lastCorrect === null ? `Başla · ${PRACTICE.rounds} tur` : `${PRACTICE.rounds} tur daha`}
            icon="play"
            size="lg"
            loading={loading}
            onPress={onStart}
          />
        </View>
        <InlineError error={error} />
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  number: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: space.sm },
  center: { alignItems: 'center', gap: space.md, paddingVertical: space.xl },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  record: { gap: 6, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6 },
  recordText: { fontFamily: fonts.black, fontSize: 14 },
});
