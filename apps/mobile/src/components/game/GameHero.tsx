import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { PublicQuestion } from '@/api/types';
import { BrandMark } from '@/components/BrandMark';
import { Icon, PressableScale, Row } from '@/components/ui';
import { FORMAT_LABEL, formatDay } from '@/lib/format';
import { font, fonts, radius, shadow, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

import { useFormatStyle } from './formatStyle';

/** Sıcak degrade başlık: marka, soru numarası, gün, format ve seri. */
export function GameHero({ question, streak, archive }: { question: PublicQuestion; streak: number; archive: boolean }) {
  const c = useColors();
  const f = useFormatStyle(question.format);
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={[styles.wrap, shadow(c.heroTo, 2)]}>
      <LinearGradient colors={[c.heroFrom, c.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.bigMark} pointerEvents="none">
          <BrandMark size={230} sun={false} opacity={0.13} />
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={styles.wordmark} accessibilityRole="header">
            Günün Sorusu <Text style={{ opacity: 0.75 }}>?</Text>
          </Text>
          <PressableScale
            haptic="select"
            accessibilityRole="button"
            accessibilityLabel="Nasıl oynanır?"
            onPress={() => router.push({ pathname: '/how-to-play', params: { format: question.format } })}
            style={styles.help}>
            <Icon name="help" size={20} color="#FFFFFF" />
          </PressableScale>
        </Row>
        <Text style={styles.meta}>
          #{question.no} · {formatDay(question.day)}
        </Text>
        <Row style={{ flexWrap: 'wrap', marginTop: space.xs }}>
          <View style={[styles.pill, { backgroundColor: '#FFFFFF' }]}>
            <Icon name={f.icon} size={14} color={f.color} />
            <Text style={[styles.pillText, { color: f.color }]}>{FORMAT_LABEL[question.format]}</Text>
          </View>
          {streak > 0 && !archive && (
            <View style={[styles.pill, styles.glass]} accessibilityLabel={`${streak} günlük seri`}>
              <Text style={styles.pillText}>🔥 {streak} gün</Text>
            </View>
          )}
          {archive && (
            <View style={[styles.pill, styles.glass]}>
              <Icon name="time-outline" size={14} color="#FFFFFF" />
              <Text style={styles.pillText}>Arşiv</Text>
            </View>
          )}
        </Row>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.xl },
  hero: { borderRadius: radius.xl, padding: space.xl, gap: space.xs, overflow: 'hidden' },
  bigMark: { position: 'absolute', right: -50, top: -30 },
  wordmark: { ...font.title, color: '#FFFFFF' },
  meta: { ...font.body, color: '#FFFFFF', opacity: 0.9 },
  help: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6 },
  glass: { backgroundColor: 'rgba(255,255,255,0.22)' },
  pillText: { ...font.caption, fontFamily: fonts.extrabold, color: '#FFFFFF' },
});
