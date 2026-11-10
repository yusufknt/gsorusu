import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, FadeInDown, ReduceMotion, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Button, PressableScale, T, type IconName } from '@/components/ui';
import { useHaptics } from '@/lib/haptics';
import { useSettings } from '@/settings/settings';
import { radius, space } from '@/theme/tokens';
import { useColors, useIsDark } from '@/theme/useTheme';

import { PlanStep } from './PlanStep';
import { FormatStrip } from './FormatStrip';
import { SceneHint } from './SceneHint';
import SoroScene, { type SceneColors } from './SoroScene';
import { StepDots } from './StepDots';

const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

type Step = { title: string; body: string; hint: string; hintIcon: IconName };

const STEPS: readonly Step[] = [
  {
    title: 'Merhaba, ben Soro!',
    body: 'Her gece 00:00’da yeni sorular getiriyorum. Türkiye’de herkese aynı 4 oyun, günde bir kez.',
    hint: 'Bana dokun ya da çekip bırak',
    hintIcon: 'hand',
  },
  {
    title: 'Her gün 4 kısa oyun',
    body: 'Hangisi pahalı? Hangi ünlü? Kaç? Yapar mıydın? Dördünü bitir, yapbozuna bir parça ekle.',
    hint: 'Baloncukları hızlıca çevir',
    hintIcon: 'refresh',
  },
  {
    title: 'Türkiye’yle kıyasla',
    body: 'Cevabını ver, herkesin ne dediğini gör. Gün bitince oyuncuların yüzde kaçından iyi olduğunu gör.',
    hint: 'Soro’yu yukarı kaldır ya da bir çubuğa dokun',
    hintIcon: 'arrow-up',
  },
];
const LAST = STEPS.length - 1;

/**
 * İlk açılış tanıtımı. Üstte Soro'lu etkileşimli sahne (SoroScene), altta adım metni, gösterge ve düğmeler.
 * Adımlar alttaki alanda kaydırılarak ya da "Devam" ile geçilir; "Atla" son adıma götürür. Son adımdan sonra
 * plan seçimi (Ücretsiz / Premium) ve giriş gelir (PlanStep).
 * Bitince ayar `onboarded` olur ve kök yığın bugünün sorusuna yönlendirir. Web karşılığı app/onboarding.web.tsx.
 */
export default function Onboarding() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { update } = useSettings();
  const buzz = useHaptics();
  const reduced = useReducedMotion();
  const sceneColors = useSceneColors();

  const [index, setIndex] = useState(0);
  const [planning, setPlanning] = useState(false);
  const [tried, setTried] = useState<readonly boolean[]>(STEPS.map(() => false));
  const step = useSharedValue(0);
  const base = useSharedValue(0);

  // Sahne ekranın büyük kısmını alır; metin ve düğmeler için ~330 pt bırakılır.
  const sceneSize = Math.max(220, Math.min(width - space.md * 2, height - insets.top - insets.bottom - 330, 520));
  const swipeSpan = width * 0.8;

  const select = (target: number) => {
    if (target === index) return;
    setIndex(target);
    buzz('select');
  };

  const goTo = (next: number) => {
    const target = Math.max(0, Math.min(LAST, next));
    base.set(target);
    step.set(withTiming(target, { duration: reduced ? 0 : 560, easing: EASE_IN_OUT }));
    select(target);
  };

  const markTried = () => setTried((prev) => (prev[index] ? prev : prev.map((v, i) => v || i === index)));

  const finish = () => {
    buzz('success');
    update({ onboarded: true });
  };

  // Alttaki alanda kaydırma: sahne parmağı izler, bırakınca hız ya da mesafeyle karar verir.
  const swipe = usePanGesture({
    activeOffsetX: [-12, 12],
    failOffsetY: [-20, 20],
    onUpdate: (e) => {
      'worklet';
      const raw = base.get() - e.translationX / swipeSpan;
      step.set(raw < 0 ? raw * 0.25 : raw > LAST ? LAST + (raw - LAST) * 0.25 : raw);
    },
    onDeactivate: (e) => {
      'worklet';
      const from = base.get();
      let target = from;
      if (e.translationX < -swipeSpan * 0.25 || e.velocityX < -600) target = from + 1;
      else if (e.translationX > swipeSpan * 0.25 || e.velocityX > 600) target = from - 1;
      target = Math.max(0, Math.min(LAST, target));
      base.set(target);
      step.set(withSpring(target, { duration: 420, dampingRatio: 0.8, velocity: -e.velocityX / swipeSpan, reduceMotion: ReduceMotion.System }));
      scheduleOnRN(select, target);
    },
  });

  const s = STEPS[index];

  if (planning) return <PlanStep onDone={finish} />;

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top + space.xs, paddingBottom: insets.bottom + space.md }]}>
      <View style={styles.topBar}>
        {index < LAST && (
          <PressableScale
            onPress={() => goTo(LAST)}
            haptic={null}
            accessibilityRole="button"
            accessibilityLabel="Tanıtımı atla"
            hitSlop={12}
            style={styles.skip}>
            <T variant="bodyStrong" color="textMuted">
              Atla
            </T>
          </PressableScale>
        )}
      </View>

      <View style={styles.scene}>
        <SoroScene
          step={step}
          size={sceneSize}
          reduced={reduced}
          colors={sceneColors}
          onPoke={() => {
            buzz('tap');
            markTried();
          }}
          onPickBar={() => {
            buzz('select');
            markTried();
          }}
        />
        {!tried[index] && <SceneHint key={index} icon={s.hintIcon} text={s.hint} />}
      </View>

      <GestureDetector gesture={swipe}>
        <View style={styles.bottom}>
          <Animated.View key={index} entering={FadeInDown.duration(320).easing(EASE_OUT).reduceMotion(ReduceMotion.System)} style={styles.copy}>
            <T variant="headline" center accessibilityRole="header">
              {s.title}
            </T>
            <T color="textMuted" center style={styles.body}>
              {s.body}
            </T>
            {index === 1 && <FormatStrip />}
          </Animated.View>

          <StepDots count={STEPS.length} step={step} current={index} />

          {index < LAST ? <Button title="Devam" icon="arrow-forward" size="lg" onPress={() => goTo(index + 1)} /> : <Button title="Başlayalım" icon="arrow-forward" size="lg" onPress={() => setPlanning(true)} />}
        </View>
      </GestureDetector>
    </View>
  );
}

/** Sahne renkleri yalnızca tema renkleri ve Soro'nun kendi çizim tonlarından gelir (format renkleri yok). */
function useSceneColors(): SceneColors {
  const c = useColors();
  const dark = useIsDark();
  return {
    disk: dark ? '#2A1A12' : '#FFE3D1',
    ray: dark ? '#1A1714' : '#FBEDE0',
    ground: dark ? '#00000080' : '#5A3A1A26',
    bar: dark ? c.surfaceMuted : c.surfaceSunken,
    barHot: c.accent,
    sparkle: c.warning,
    bubble: { fill: '#FFFDF8', ink: '#1A1C22', mark: c.accent },
    confetti: [c.accent, c.warning, c.heroTo, '#F89F2A'],
  };
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.xl },
  topBar: { height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  skip: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill },
  scene: { flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: -space.md },
  bottom: { gap: space.lg, paddingTop: space.sm },
  copy: { gap: space.md, minHeight: 128 },
  body: { maxWidth: 380, alignSelf: 'center' },
});
