import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useLeagues } from '@/api/hooks';
import type { LeagueSummary } from '@/api/types';
import { Button, Card, ErrorView, Icon, LoadingScreen, PressableScale, Row, Screen, T } from '@/components/ui';
import { font, fonts, radius, shadow, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/** Arkadaş ligleri: haftalık sıralamadaki yerin, lig kurma ve koda katılma. */
export default function LeaguesScreen() {
  const c = useColors();
  const leagues = useLeagues();

  if (leagues.isError) return <ErrorView error={leagues.error} onRetry={() => void leagues.refetch()} />;
  if (leagues.isPending) return <LoadingScreen />;

  return (
    <Screen topInset={false} refreshControl={<RefreshControl refreshing={leagues.isRefetching} onRefresh={() => void leagues.refetch()} />}>
      {leagues.data.length === 0 ? (
        <EmptyHero />
      ) : (
        leagues.data.map((l, i) => (
          <Animated.View key={l.id} entering={FadeInDown.delay(i * 60).springify().damping(16)}>
            <LeagueRow league={l} />
          </Animated.View>
        ))
      )}

      <Row style={{ alignItems: 'stretch' }}>
        <View style={{ flex: 1 }}>
          <Button title="Lig kur" icon="add-circle" onPress={() => router.push('/leagues/create')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Koda katıl" icon="enter-outline" kind="secondary" onPress={() => router.push('/leagues/join')} />
        </View>
      </Row>

      <Row style={{ gap: space.xs, justifyContent: 'center' }}>
        <Icon name="refresh" size={14} color={c.textSubtle} />
        <T variant="caption" color="textSubtle">
          Sıralama her Pazartesi 00:00’da sıfırlanır.
        </T>
      </Row>
    </Screen>
  );
}

function EmptyHero() {
  const c = useColors();
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={[{ borderRadius: radius.xl }, shadow(c.heroTo, 2)]}>
      <LinearGradient colors={[c.heroFrom, c.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.trophy} accessible={false}>
          🏆
        </Text>
        <Text style={[font.title, styles.onHero]}>Arkadaşlarınla yarış</Text>
        <Text style={[font.body, styles.onHeroMuted]}>
          Ailen, iş yerin ya da okul arkadaşların için bir lig kur, kodu paylaş. Herkes her gün aynı soruyu çözer; haftanın en çok puan toplayanı
          birinci olur.
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}

function LeagueRow({ league: l }: { league: LeagueSummary }) {
  const c = useColors();
  const leading = l.myRank === 1 && l.myTotal > 0;
  const subtitle = [`${l.memberCount} kişi`, l.memberCount > 1 ? `bugün ${l.playedToday} kişi oynadı` : 'henüz yalnızsın'].join(' · ');
  return (
    <PressableScale
      haptic="select"
      accessibilityRole="button"
      accessibilityLabel={`${l.name}, ${l.memberCount} kişi, ${l.myRank}. sıradasın, ${l.myTotal} puan`}
      onPress={() => router.push(`/leagues/${l.id}`)}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={[styles.rank, { backgroundColor: leading ? c.accent : c.surfaceMuted }]}>
          <Text style={[styles.rankValue, { color: leading ? c.textOnAccent : c.text }]}>{l.myRank}.</Text>
          <Text style={[styles.rankLabel, { color: leading ? c.textOnAccent : c.textMuted }]}>SIRA</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="bodyStrong" numberOfLines={1}>
            {l.name}
          </T>
          <T variant="caption" color="textMuted" numberOfLines={1}>
            {subtitle}
          </T>
          {l.leaderName && !leading && (
            <T variant="caption" color="textMuted" numberOfLines={1}>
              👑 {l.leaderName} önde
            </T>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[font.title, { color: c.text }]}>{l.myTotal}</Text>
          <T variant="caption" color="textMuted">
            puan
          </T>
        </View>
        <Icon name="chevron-forward" size={18} color={c.textSubtle} />
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: space.xl, gap: space.sm },
  trophy: { fontSize: 44, lineHeight: 52 },
  onHero: { color: '#FFFFFF' },
  onHeroMuted: { color: 'rgba(255,255,255,0.88)' },
  rank: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rankValue: { fontFamily: fonts.black, fontSize: 22, lineHeight: 26 },
  rankLabel: { fontFamily: fonts.extrabold, fontSize: 10, letterSpacing: 0.8 },
});
