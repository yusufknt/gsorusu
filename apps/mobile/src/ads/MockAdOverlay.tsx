import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { Button, Icon, PressableScale } from '@/components/ui';
import { font, fonts, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

import { MOCK_AD, REWARD_LABEL, type AdPlacement, type RewardedPlacement } from './config';

export type MockAdRequest =
  | { kind: 'rewarded'; placement: RewardedPlacement }
  | { kind: 'interstitial'; placement: AdPlacement };

export type MockAdOutcome = 'rewarded' | 'skipped' | 'closed';

/**
 * Expo Go'da AdMob çalışmadığı için reklam yerine gösterilen tam ekran "test reklamı".
 * Akış gerçek reklamla aynıdır: ödüllü video sonuna kadar izlenirse ödül verilir, erken
 * kapatılırsa verilmez; geçiş reklamı birkaç saniye sonra kapatılabilir.
 */
export function MockAdOverlay({ request, onDone }: { request: MockAdRequest; onDone: (outcome: MockAdOutcome) => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const rewarded = request.kind === 'rewarded';
  const duration = rewarded ? MOCK_AD.rewardedMs : MOCK_AD.interstitialSkipMs;
  const [elapsed, setElapsed] = useState(0);
  const done = useRef(false);
  const complete = elapsed >= duration;
  const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      const e = Date.now() - started;
      setElapsed(e);
      if (e >= duration) clearInterval(id);
    }, 200);
    return () => clearInterval(id);
  }, [duration]);

  const finish = (o: MockAdOutcome) => {
    if (done.current) return;
    done.current = true;
    onDone(o);
  };

  const close = () => {
    if (!rewarded) {
      if (complete) finish('closed');
      return;
    }
    if (complete) {
      finish('rewarded');
      return;
    }
    // Gerçek ödüllü reklamlardaki gibi: erken kapatan ödülü kaybeder, önce sorulur.
    Alert.alert('Videoyu kapat?', 'Sonuna kadar izlemezsen ödülü alamazsın.', [
      { text: 'İzlemeye devam', style: 'cancel' },
      { text: 'Kapat', style: 'destructive', onPress: () => finish('skipped') },
    ]);
  };

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(1, { duration, easing: Easing.linear }));
  }, [duration, progress]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withSequence(withTiming(1.08, { duration: 700 }), withTiming(1, { duration: 700 })), -1));
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));

  const canClose = rewarded || complete;

  return (
    <Modal visible transparent={false} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <StatusBar style="light" />
      <View style={[styles.root, { backgroundColor: c.adBackdrop, paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.topBar}>
          <View style={[styles.badge, { backgroundColor: c.warning }]}>
            <Text style={[font.label, { color: c.adBackdrop }]}>TEST REKLAMI</Text>
          </View>
          {canClose ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={rewarded && !complete ? `Videoyu kapat, ${remaining} saniye kaldı` : 'Reklamı kapat'}
              onPress={close}
              style={styles.close}>
              {rewarded && !complete ? (
                <Text style={[font.bodyStrong, { color: '#FFFFFF' }]}>{remaining}</Text>
              ) : (
                <Icon name="close" size={24} color="#FFFFFF" />
              )}
            </PressableScale>
          ) : (
            <View style={styles.close} accessibilityLabel={`${remaining} saniye sonra kapatılabilir`}>
              <Text style={[font.bodyStrong, { color: '#FFFFFF' }]}>{remaining}</Text>
            </View>
          )}
        </View>

        <View style={styles.stage}>
          <LinearGradient colors={[c.heroFrom, c.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.video}>
            <Animated.View style={pulseStyle}>
              <BrandMark size={96} />
            </Animated.View>
            <Text style={[font.title, styles.white, { textAlign: 'center' }]}>{rewarded ? 'Ödüllü video' : 'Geçiş reklamı'}</Text>
            <Text style={[font.caption, styles.white, { opacity: 0.85, textAlign: 'center' }]}>
              Gerçek sürümde burada AdMob reklamı oynar.{'\n'}Yerleşim: {request.placement}
            </Text>
          </LinearGradient>
        </View>

        <View style={{ gap: space.md }}>
          {rewarded && (
            <View style={styles.rewardRow} accessibilityLiveRegion="polite">
              {complete ? (
                <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.rewardRow}>
                  <Icon name="checkmark-circle" size={22} color={c.correct} />
                  <Text style={[font.bodyStrong, styles.white]}>Ödül kazanıldı: {REWARD_LABEL[request.placement]}</Text>
                </Animated.View>
              ) : (
                <>
                  <Icon name="gift-outline" size={20} color={c.warning} />
                  <Text style={[font.bodyStrong, styles.white]}>Ödül: {REWARD_LABEL[request.placement]}</Text>
                </>
              )}
            </View>
          )}
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { backgroundColor: c.warning }, barStyle]} />
          </View>
          {rewarded && complete && <Button title="Devam et" icon="arrow-forward" size="lg" onPress={() => finish('rewarded')} />}
          {!rewarded && complete && <Button title="Kapat" icon="close" kind="secondary" onPress={() => finish('closed')} />}
          {!complete && (
            <Text style={[font.caption, styles.white, { opacity: 0.6, textAlign: 'center', fontFamily: fonts.semibold }]}>
              {rewarded ? `Ödül için ${remaining} sn daha izle` : `${remaining} sn sonra kapatabilirsin`}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.lg, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 4 },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  stage: { flex: 1, justifyContent: 'center', paddingVertical: space.xl },
  video: { borderRadius: radius.xl, aspectRatio: 9 / 12, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
  white: { color: '#FFFFFF' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
