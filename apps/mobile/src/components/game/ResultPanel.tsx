import * as Clipboard from 'expo-clipboard';
import { useRef, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { ViewShotRef } from 'react-native-view-shot';

import { useCrowd } from '@/api/hooks';
import type { Crowd, PlayState, PublicQuestion } from '@/api/types';
import { Bar, Button, Card, Chip, Icon, Row, T, useToast } from '@/components/ui';
import { formatAmount, formatCountdown, formatMonthYear, formatTrNumber, nextResetMs, pct, pctOf } from '@/lib/format';
import { useHaptics } from '@/lib/haptics';
import { ensureNotificationPermission } from '@/lib/reminders';
import { shareParts, shareText } from '@/lib/share';
import { useSettings } from '@/settings/settings';
import { font, fonts, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

import { ScoreRing } from './ScoreRing';
import { ShareCard, shareCardImage } from './ShareCard';
import { useNow } from './useNow';

/** Sonuç: puan, paylaş (üst yarıda, plan A5), cevap, Biliyor muydun?, Türkiye ne dedi?, sonraki soru. */
export function ResultPanel({
  question,
  play,
  streak,
  onNextDay,
}: {
  question: PublicQuestion;
  play: PlayState;
  streak: number;
  onNextDay?: () => void;
}) {
  const c = useColors();
  const toast = useToast();
  const buzz = useHaptics();
  const crowd = useCrowd(question.day, true);
  const cardRef = useRef<ViewShotRef>(null);
  const [sharingImage, setSharingImage] = useState(false);
  const text = shareText(play, streak);
  const { squares } = shareParts(play);

  const shareImage = async () => {
    setSharingImage(true);
    try {
      await shareCardImage(cardRef.current);
    } catch {
      toast('Görsel hazırlanamadı, metin olarak paylaşmayı dene');
    } finally {
      setSharingImage(false);
    }
  };

  return (
    <View style={{ gap: space.lg }}>
      <Animated.View entering={FadeInDown.springify().damping(16)}>
        <Card style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xl }}>
          <T variant="title" center>
            {headline(play, question)}
          </T>
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

          <View style={{ alignSelf: 'stretch', gap: space.sm, marginTop: space.sm }}>
            <Button title="Paylaş" icon="share-social" size="lg" onPress={() => void Share.share({ message: text })} />
            <Row>
              <View style={{ flex: 1 }}>
                <Button title="Hikâye görseli" icon="image-outline" kind="secondary" loading={sharingImage} onPress={shareImage} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Kopyala"
                  icon="copy-outline"
                  kind="secondary"
                  onPress={async () => {
                    await Clipboard.setStringAsync(text);
                    buzz('success');
                    toast('Sonuç kopyalandı');
                  }}
                />
              </View>
            </Row>
          </View>
        </Card>
      </Animated.View>

      <Reveal question={question} play={play} />
      {crowd.data && crowd.data.plays > 0 && <CrowdCard question={question} play={play} crowd={crowd.data} />}
      {!play.archive && <NextQuestion day={question.day} onReached={onNextDay} />}

      <ShareCard ref={cardRef} play={play} streak={streak} colors={c} />
    </View>
  );
}

function headline(play: PlayState, q: PublicQuestion): string {
  if (play.scorePending) return 'Oyun kaydedildi';
  if (q.format === 'poll') return (play.score ?? 0) >= 80 ? 'Türkiye’yi iyi tanıyorsun!' : 'Türkiye seni şaşırttı';
  if (play.solved) return (play.score ?? 0) >= 85 ? 'Muhteşem! 🎉' : 'Bildin!';
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
    case 'poll': {
      const p = play.poll;
      if (!p || p.actualPct == null) return 'Serin şimdiden sayıldı';
      return `Gerçek: ${pct(p.actualPct)} · Tahminin: %${p.predictedPct}`;
    }
  }
}

function Reveal({ question, play }: { question: PublicQuestion; play: PlayState }) {
  const c = useColors();
  const r = play.reveal;
  if (!r) return null;
  const options = play.trivia?.options;
  const answer = r.answer != null ? formatAmount(r.answer, r.unit) : r.correctOption != null && options ? options[r.correctOption] : null;
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
        {r.priceHistory && r.priceHistory.length > 0 && (
          <View style={{ gap: space.xs }}>
            <T variant="caption" color="textMuted">
              Geçmiş fiyatlar
            </T>
            <Row style={{ flexWrap: 'wrap' }}>
              {r.priceHistory.map((p) => (
                <View key={p.date} style={[styles.history, { backgroundColor: c.surfaceMuted }]}>
                  <Text style={[font.caption, { color: c.textMuted }]}>{formatMonthYear(p.date)}</Text>
                  <Text style={[font.bodyStrong, { color: c.text }]}>{formatAmount(p.price, r.unit)}</Text>
                </View>
              ))}
            </Row>
          </View>
        )}
        {r.factText && (
          <View style={[styles.fact, { backgroundColor: c.accentSoft }]}>
            <Row style={{ gap: space.sm }}>
              <Icon name="bulb" size={18} color={c.accent} />
              <T variant="bodyStrong" style={{ color: c.accent }}>
                Bunu biliyor muydun?
              </T>
            </Row>
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
            <View style={[styles.histBar, { height: 6 + (b / max) * 64, backgroundColor: i === myBucket ? c.accent : c.surfaceSunken }]} />
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

function NextQuestion({ day, onReached }: { day: string; onReached?: () => void }) {
  const c = useColors();
  const toast = useToast();
  const { settings, update } = useSettings();
  const now = useNow(1000);
  const remaining = nextResetMs(day) - now;

  if (remaining <= 0) return <Button title="Yeni soru geldi!" icon="sparkles" size="lg" onPress={() => onReached?.()} />;

  return (
    <Card tone="muted" style={{ alignItems: 'center' }}>
      <T variant="label" color="textMuted">
        Sonraki soru
      </T>
      <Text
        style={[font.headline, { fontFamily: fonts.black, color: c.text, fontVariant: ['tabular-nums'] }]}
        accessibilityLabel={`Sonraki soruya ${formatCountdown(remaining)} kaldı`}>
        {formatCountdown(remaining)}
      </Text>
      {!settings.reminders && (
        <Button
          title="Bana hatırlat"
          icon="alarm-outline"
          kind="ghost"
          onPress={async () => {
            if (await ensureNotificationPermission()) {
              update({ reminders: true });
              toast('Her gün hatırlatacağız');
            } else {
              toast('Bildirim izni verilmedi');
            }
          }}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  pending: { width: 168, height: 168, borderRadius: 84, alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.lg },
  squares: { fontSize: 28, letterSpacing: 3 },
  history: { borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm },
  fact: { borderRadius: radius.md, padding: space.md, gap: space.xs },
  histogram: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 92 },
  histCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  histBar: { width: '100%', borderRadius: 4 },
});
