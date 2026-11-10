import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useCrowd } from '@/api/hooks';
import type { Crowd, DailyMode, PlayState, PublicQuestion } from '@/api/types';
import type { SoroMood } from '@/components/mascot/SoroFigure';
import { SoroSays } from '@/components/mascot/SoroSays';
import { Bar, Card, Chip, Icon, Row, T } from '@/components/ui';
import { formatAmount, formatTrNumber, pct, pctOf } from '@/lib/format';
import { font, fonts, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

import { PriceHistoryChart } from './PriceHistoryChart';
import { ScoreRing } from './ScoreRing';

const SQUARE = { higher: '🟧', lower: '🟦', close: '🟥', correct: '🟩', miss: '⬛' } as const;

/** Tahmin/tur kareleri (paylaşımdakiyle aynı renkler; cevabı vermez). */
function squaresOf(play: PlayState): string | null {
  if (play.compare) return play.compare.answered.map((r) => (r.correct ? SQUARE.correct : SQUARE.miss)).join('');
  if (play.numeric) {
    const s = play.numeric.guesses.map((g) => (g.direction === 'correct' ? SQUARE.correct : g.close ? SQUARE.close : SQUARE[g.direction])).join('');
    return play.numeric.hintUsed ? `${s} · ipuçlu` : s;
  }
  return null;
}

/** Modun sonucu: puan ve kareler, cevap, Biliyor muydun?, Türkiye ne dedi?. Paylaşım günün merkezinde. */
export function ResultPanel({ question, play, mode, streak }: { question: PublicQuestion; play: PlayState; mode: DailyMode; streak: number }) {
  const c = useColors();
  const crowd = useCrowd(question.day, mode, true);
  const squares = squaresOf(play);

  return (
    <View style={{ gap: space.lg }}>
      <Animated.View entering={FadeInDown.springify().damping(16)}>
        <Card style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xl }}>
          <SoroSays mood={resultMood(play, question)} text={headline(play, question)} size={84} />
          {play.scorePending ? (
            <View style={[styles.pending, { backgroundColor: c.surfaceMuted }]}>
              <Icon name="hourglass-outline" size={36} color={c.textMuted} />
              <T variant="bodyStrong" center color="textMuted">
                {'Gece yarısı\nkesinleşir'}
              </T>
            </View>
          ) : (
            <ScoreRing score={play.score ?? 0} />
          )}
          <T color="textMuted" center>
            {subtitle(play)}
          </T>
          {squares && (
            <Text style={styles.squares} accessibilityLabel="Tahmin kareleri">
              {squares}
            </Text>
          )}
          {!play.archive && streak > 0 && <Chip label={`${streak} günlük seri`} icon="flame" color={c.flame} bg={c.accentSoft} />}
        </Card>
      </Animated.View>

      <Reveal question={question} play={play} />
      {crowd.data && crowd.data.plays > 0 && <CrowdCard question={question} play={play} crowd={crowd.data} />}
    </View>
  );
}

function resultMood(play: PlayState, q: PublicQuestion): SoroMood {
  if (play.scorePending) return 'think';
  if (q.format === 'poll') return (play.score ?? 0) >= 80 ? 'cheer' : 'think';
  return play.solved ? 'cheer' : 'sad';
}

function headline(play: PlayState, q: PublicQuestion): string {
  if (play.scorePending) return 'Cevabın kaydedildi';
  if (q.format === 'poll') return (play.score ?? 0) >= 80 ? 'Türkiye’yi iyi tanıyorsun!' : 'Türkiye seni şaşırttı';
  if (play.solved) return (play.score ?? 0) >= 85 ? 'Muhteşem!' : 'Bildin!';
  return 'Bu sefer olmadı';
}

function subtitle(play: PlayState): string {
  switch (play.format) {
    case 'price':
    case 'number': {
      const n = play.numeric!;
      return play.solved ? `${n.attemptsUsed}. tahminde buldun${n.hintUsed ? ' (ipuçlu)' : ''}` : 'Doğru cevap aşağıda';
    }
    case 'trivia': {
      const t = play.trivia;
      if (t?.timedOut) return 'Süre doldu';
      return play.solved ? `${formatTrNumber((t?.elapsedMs ?? 0) / 1000, 1)} saniyede doğru cevap` : 'Yanlış cevap';
    }
    case 'compare':
      return `${play.compare?.answered.filter((a) => a.correct).length ?? 0}/${play.compare?.rounds ?? 5} tur doğru`;
    case 'celeb': {
      const n = play.celeb?.guesses.length ?? 0;
      return play.solved ? `${n}. tahminde buldun` : 'Günün ünlüsü aşağıda';
    }
    case 'poll': {
      const p = play.poll;
      if (!p || p.actualPct == null) return 'Türkiye’nin cevabı gece yarısı kesinleşir; aşağıda şimdilik durum var';
      return `Gerçek: ${pct(p.actualPct)} · Tahminin: %${p.predictedPct}`;
    }
  }
}

function Reveal({ question, play }: { question: PublicQuestion; play: PlayState }) {
  const c = useColors();
  const r = play.reveal;
  if (!r) return null;
  const options = play.trivia?.options;
  const answer =
    r.answer != null
      ? formatAmount(r.answer, r.unit)
      : r.correctOption != null && options
        ? options[r.correctOption]
        : (play.celeb?.answer?.name ?? null);
  // Ankette gösterilecek cevap ya da bilgi yoksa kart hiç çizilmez.
  if (!answer && !r.factText && !r.priceHistory?.length) return null;
  return (
    <Animated.View entering={FadeInDown.delay(120).springify().damping(16)}>
      <Card>
        {answer && (
          <View style={{ gap: 2 }}>
            <T variant="label" color="textMuted">
              Doğru cevap
            </T>
            <T variant="headline">{answer}</T>
          </View>
        )}
        {r.priceHistory && r.priceHistory.length > 0 && <PriceHistoryChart history={r.priceHistory} today={r.answer} unit={r.unit} />}
        {r.factText && (
          // Gazete kutusu gibi: solda kalın çizgi, nötr zemin.
          <View style={[styles.fact, { backgroundColor: c.surfaceMuted, borderLeftWidth: 4, borderLeftColor: c.text }]}>
            <T variant="label" color="textMuted">
              Bunu biliyor muydun?
            </T>
            <T>{r.factText}</T>
          </View>
        )}
        {r.sourceText && (
          <T variant="caption" color="textSubtle">
            Kaynak: {r.sourceText}
          </T>
        )}
        {question.isSponsored && (
          <T variant="caption" color="textSubtle">
            Sponsorlu soru
          </T>
        )}
      </Card>
    </Animated.View>
  );
}

function CrowdCard({ question, play, crowd }: { question: PublicQuestion; play: PlayState; crowd: Crowd }) {
  const c = useColors();
  const options = question.options ?? play.trivia?.options ?? [];
  const numeric = question.format === 'price' || question.format === 'number';
  const mine = play.poll?.option ?? play.trivia?.chosenOption ?? null;
  return (
    <Animated.View entering={FadeInDown.delay(220).springify().damping(16)}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row style={{ flex: 1 }}>
            <Icon name="people" size={20} color={c.text} />
            <T variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
              Türkiye ne dedi?
            </T>
          </Row>
          <T variant="caption" color="textMuted">
            {formatTrNumber(crowd.plays)} oyuncu
          </T>
        </Row>

        {numeric && crowd.underPct != null && (
          <T>
            Oyuncuların <T variant="bodyStrong">{pctOf(crowd.underPct)}</T> ilk tahminde {question.format === 'price' ? 'ucuz sandı' : 'az tahmin etti'},{' '}
            <T variant="bodyStrong">{pctOf(crowd.overPct ?? 0)}</T> {question.format === 'price' ? 'pahalı sandı' : 'fazla tahmin etti'}.
          </T>
        )}

        {crowd.optionPcts?.map((v, i) => (
          <Bar
            key={i}
            label={options[i] ?? `${i + 1}`}
            value={v}
            delay={i * 90}
            highlight={i === mine}
            color={question.format === 'trivia' && i === play.reveal?.correctOption ? c.correct : undefined}
          />
        ))}

        {question.format === 'trivia' && crowd.solvedPct != null && <T color="textMuted">Türkiye’nin {pctOf(100 - crowd.solvedPct)} bilemedi.</T>}

        {(numeric || question.format === 'compare') && play.score != null && <Histogram buckets={crowd.histogram} mine={play.score} />}

        {crowd.avgScore != null && (
          <T variant="caption" color="textMuted">
            Ortalama puan {formatTrNumber(crowd.avgScore, 1)}
            {!crowd.final ? ' · 5 dakikada bir güncellenir' : ''}
          </T>
        )}
      </Card>
    </Animated.View>
  );
}

/** Puan dağılımı; oyuncunun kovası vurgulanır. */
function Histogram({ buckets, mine }: { buckets: number[]; mine: number }) {
  const c = useColors();
  const max = Math.max(1, ...buckets);
  const myBucket = Math.min(9, Math.floor(mine / 10));
  return (
    <View style={{ gap: space.xs }} accessible accessibilityLabel={`Puan dağılımı; sen ${mine} puanla ${myBucket * 10}–${myBucket * 10 + 9} aralığındasın`}>
      <View style={styles.histogram}>
        {buckets.map((b, i) => (
          <View key={i} style={styles.histCol}>
            {i === myBucket && <Text style={[font.caption, { fontFamily: fonts.black, color: c.accent }]}>Sen</Text>}
            <View style={[styles.histBar, { height: 6 + (b / max) * 64, backgroundColor: i === myBucket ? c.accent : c.border }]} />
          </View>
        ))}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="caption" color="textSubtle">
          0
        </T>
        <T variant="caption" color="textSubtle">
          100 puan
        </T>
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  pending: { width: 168, height: 168, borderRadius: 84, alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.lg },
  squares: { fontSize: 28, letterSpacing: 3 },
  fact: { borderRadius: radius.md, padding: space.md, gap: space.xs },
  histogram: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 92 },
  histCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  histBar: { width: '100%', borderRadius: 4 },
});
