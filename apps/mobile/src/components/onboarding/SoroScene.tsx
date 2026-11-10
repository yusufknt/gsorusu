import { Canvas, Circle, Group, Oval, Path, rect, RoundedRect, rrect, useClock, vec, type Transforms3d } from '@shopify/react-native-skia';
import { View } from 'react-native';
import { GestureDetector, usePanGesture, useExclusiveGestures, useTapGesture } from 'react-native-gesture-handler';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { FEET_Y, REACTION_MS, REACTIONS, Soro } from './Soro';
import { SORO_VIEWBOX } from './soroShape';

export type SceneColors = {
  /** Soro'nun arkasındaki düz güneş diski ve ışınları (degrade yok). */
  disk: string;
  ray: string;
  ground: string;
  bar: string;
  barHot: string;
  sparkle: string;
  /** Yörünge baloncukları: Soro'nun çizim diliyle aynı (krem zemin, koyu kontur, turuncu "?"). */
  bubble: { fill: string; ink: string; mark: string };
  /** Konfeti: yalnızca marka tonları. */
  confetti: string[];
};

type Props = {
  /** Tanıtım adımı; geçişlerde kesirli (0 → 1 → 2) akar, sahne buna göre karışır. */
  step: SharedValue<number>;
  size: number;
  colors: SceneColors;
  /** Azaltılmış hareket: saat durur, zıplama/konfeti yok; dokunuşlar yine çalışır. */
  reduced: boolean;
  /** Soro'ya dokunuldu (titreşim, ipucunu gizleme). */
  onPoke: () => void;
  /** 2. adımda bir çubuk seçildi. */
  onPickBar: (index: number) => void;
};

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
// Düşüş: yerçekimi gibi hızlanır (yalnız zıplamanın iniş yarısında).
const FALL = Easing.bezier(0.55, 0, 1, 0.45);
const MARK = 'M 372 404 A 142 142 0 1 1 588 525 C 536 556 512 580 512 628';
const BARS = [0.42, 0.66, 0.5, 0.84, 0.58] as const;
const START_BAR = 3;
const CONFETTI = 18;
/** Beş format = beş baloncuk. */
const ORBIT = [0, 1, 2, 3, 4];

function weight(s: number, i: number) {
  'worklet';
  return Math.max(0, 1 - Math.abs(s - i));
}
function smooth(x: number) {
  'worklet';
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}
/** Sürüklerken uzaklaştıkça artan direnç (lastik). */
function rubber(d: number, limit: number) {
  'worklet';
  return d / (1 + Math.abs(d) / limit);
}

/**
 * Etkileşimli tanıtım sahnesi. Soro ön planda; dokununca zıplar ve konfeti saçar, sürüklenince parmağı izler
 * (bırakınca yaylanarak döner), gözleri parmağa bakar.
 * 0: el sallar · 1: format baloncukları yörüngede, sürükleyince döner · 2: çubuklar yükselir, Soro dokunulan çubuğa zıplar.
 * Bütün hareket UI iş parçacığında (Skia + Reanimated); degrade kullanılmaz, düz renk ve şekiller.
 */
export default function SoroScene({ step, size, colors, reduced, onPoke, onPickBar }: Props) {
  const clock = useClock();
  const t = useDerivedValue(() => (reduced ? 0 : clock.get()));

  const cx = size / 2;
  const bigM = size * 0.74;
  const smallM = size * 0.34;
  const bigFeetY = size * 0.94;

  // Çubuk geometrisi (2. adım).
  const barW = size * 0.14;
  const barGap = (size * 0.9 - barW * BARS.length) / (BARS.length - 1);
  const barX0 = size * 0.05;
  const barBottom = size * 0.98;
  const barMax = size * 0.5;

  // Etkileşim durumu.
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const tilt = useSharedValue(0);
  const touching = useSharedValue(0);
  const touchX = useSharedValue(cx);
  const touchY = useSharedValue(size / 2);
  const squish = useSharedValue(0);
  const jumpY = useSharedValue(0);
  const burst = useSharedValue(1);
  const burstX = useSharedValue(cx);
  const burstY = useSharedValue(size / 2);
  const orbit = useSharedValue(0);
  const sel = useSharedValue(START_BAR);
  const hopFrom = useSharedValue(START_BAR);
  const hop = useSharedValue(1);
  const held = useSharedValue(0);
  const react = useSharedValue(-1);
  const reactP = useSharedValue(1);
  const dizzy = useSharedValue(0);
  // Sürükleme, sahne boyuna göre (Soro'nun adıma özgü hâlleri bunu okur).
  const pull = useDerivedValue(() => ({ x: dragX.get() / (size * 0.35), y: dragY.get() / (size * 0.35) }));

  const e2 = useDerivedValue(() => smooth(weight(step.get(), 2) * 1.15 - 0.1));
  const grow = useDerivedValue(() => smooth(weight(step.get(), 2) * 1.5 - 0.2));

  // Soro'nun ayak ortası ve ölçeği: 0–1. adımda ortada ve büyük, 2. adımda seçili çubuğun üstünde.
  const feet = useDerivedValue(() => {
    const barCenter = (i: number) => barX0 + i * (barW + barGap) + barW / 2;
    const barTop = (i: number) => barBottom - BARS[i] * barMax * grow.get();
    const p = hop.get();
    const ep = p * p * (3 - 2 * p);
    const onBarX = barCenter(hopFrom.get()) + (barCenter(sel.get()) - barCenter(hopFrom.get())) * ep;
    const onBarY = barTop(hopFrom.get()) + (barTop(sel.get()) - barTop(hopFrom.get())) * ep - Math.sin(Math.PI * p) * size * 0.14;
    const w = e2.get();
    const bob = Math.sin(t.get() / 650) * size * 0.01;
    return {
      x: cx + (onBarX - cx) * w + dragX.get(),
      y: bigFeetY + (onBarY - bigFeetY) * w + dragY.get() + jumpY.get() + bob * (1 - w),
      m: bigM + (smallM - bigM) * w,
    };
  });

  const soro = useDerivedValue<Transforms3d>(() => {
    const f = feet.get();
    const s = f.m / SORO_VIEWBOX;
    return [{ translateX: f.x - 40 * s }, { translateY: f.y - FEET_Y * s }, { scale: s }];
  });
  // Bakış: dokunurken parmağa, yoksa ağır ağır etrafa.
  const look = useDerivedValue(() => {
    const f = feet.get();
    const headY = f.y - f.m * 0.55;
    if (touching.get() > 0.5) {
      return {
        x: Math.max(-1, Math.min(1, (touchX.get() - f.x) / (size * 0.25))),
        y: Math.max(-1, Math.min(1, (touchY.get() - headY) / (size * 0.25))),
      };
    }
    return { x: 0.6 * Math.sin(t.get() / 1700), y: 0.3 * Math.sin(t.get() / 2300) };
  });

  const shadowW = useDerivedValue(() => {
    const f = feet.get();
    return f.m * 0.5 * (1 - Math.min(0.6, -jumpY.get() / (size * 0.3)));
  });
  const shadowX = useDerivedValue(() => feet.get().x - shadowW.get() / 2);
  const shadowY = useDerivedValue(() => feet.get().y - jumpY.get() - feet.get().m * 0.03);
  const shadowH = useDerivedValue(() => feet.get().m * 0.06);

  const rays = useDerivedValue<Transforms3d>(() => [{ rotate: t.get() / 16000 }]);

  // Tepkiyi oynat: zıplama (konfeti), havada takla, kıkırdama ya da şaşırma. `delay`: bırakınca düşüp sonra sevinme gibi.
  const play = (next: number, delay = 0) => {
    'worklet';
    react.set(next);
    // Sıfırdan başlatma: ardışık set(0) + set(withTiming) bazı platformlarda animasyonu başlatmıyor.
    reactP.set(
      withSequence(
        withTiming(0, { duration: 0 }),
        withDelay(delay, withTiming(1, { duration: reduced ? 0 : REACTION_MS[next], easing: Easing.linear })),
      ),
    );
    if (!reduced) {
      const kind = REACTIONS[next];
      if (kind === 'jump' || kind === 'flip') {
        const height = kind === 'flip' ? 0.2 : 0.13;
        const air = kind === 'flip' ? 300 : 220;
        // Önce çömelir, zıplar, iner, yaylanır.
        squish.set(
          withSequence(
            withTiming(0.8, { duration: 90 }),
            withTiming(-0.5, { duration: air, easing: EASE_OUT }),
            withTiming(0, { duration: air + 20, easing: FALL }),
            withTiming(0.6, { duration: 70 }),
            withSpring(0, { duration: 520, dampingRatio: 0.35 }),
          ),
        );
        jumpY.set(
          withSequence(
            withDelay(90, withTiming(-size * height, { duration: air, easing: EASE_OUT })),
            withTiming(0, { duration: air + 20, easing: FALL }),
          ),
        );
        const f = feet.get();
        burstX.set(f.x);
        burstY.set(f.y - f.m * 0.95);
        burst.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 950, easing: Easing.linear })));
      } else if (kind === 'surprise') {
        squish.set(withSequence(withTiming(-0.6, { duration: 120, easing: EASE_OUT }), withSpring(0, { duration: 600, dampingRatio: 0.3 })));
      } else {
        squish.set(withDelay(delay, withSequence(withTiming(0.35, { duration: 80 }), withSpring(0, { duration: 700, dampingRatio: 0.25 }))));
      }
    }
    scheduleOnRN(onPoke);
  };

  // Her dokunuşta sıradaki tepki.
  const poke = () => {
    'worklet';
    play((react.get() + 1) % REACTIONS.length);
  };

  const pickBar = (x: number) => {
    'worklet';
    const i = Math.max(0, Math.min(BARS.length - 1, Math.floor((x - barX0 + barGap / 2) / (barW + barGap))));
    if (i === sel.get()) return false;
    hopFrom.set(sel.get());
    sel.set(i);
    hop.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: reduced ? 0 : 460, easing: Easing.bezier(0.45, 0, 0.55, 1) })));
    scheduleOnRN(onPickBar, i);
    return true;
  };

  const pan = usePanGesture({
    minDistance: 6,
    onBegin: (e) => {
      'worklet';
      touching.set(1);
      touchX.set(e.x);
      touchY.set(e.y);
    },
    onUpdate: (e) => {
      'worklet';
      touchX.set(e.x);
      touchY.set(e.y);
      held.set(1);
      // 2. adımda yukarı daha çok kaldırılabilir (korkusu yükseklikle artar).
      const w2 = weight(step.get(), 2);
      const up = e.translationY < 0 ? size * (0.25 + 0.3 * w2) : size * 0.25;
      dragX.set(rubber(e.translationX, size * 0.35));
      dragY.set(rubber(e.translationY, up));
      tilt.set(Math.max(-0.35, Math.min(0.35, e.velocityX / 3500)));
      if (weight(step.get(), 1) > 0.5) {
        orbit.set(orbit.get() + e.changeX / (size * 0.35));
        // Hızlı çevirdikçe başı döner.
        dizzy.set(Math.min(1, dizzy.get() + Math.abs(e.changeX) / (size * 1.4)));
      }
    },
    onDeactivate: (e) => {
      'worklet';
      const s = step.get();
      const pl = pull.get();
      // 0: yeterince gerip bırakınca sapan gibi fırlar, takla atar · 2: yüksekten bırakınca çubuğa düşer, rahatlayıp güler.
      if (weight(s, 0) > 0.5 && Math.hypot(pl.x, pl.y) > 0.45) play(1);
      else if (weight(s, 2) > 0.5 && pl.y < -0.3) play(2, 380);
      if (weight(s, 1) > 0.5) dizzy.set(withDelay(900, withTiming(0, { duration: 1800 })));
      // Fırlatınca bıraktığı hızla geri yaylanır.
      dragX.set(withSpring(0, { duration: 550, dampingRatio: 0.45, velocity: e.velocityX }));
      dragY.set(withSpring(0, { duration: 550, dampingRatio: 0.45, velocity: e.velocityY }));
      tilt.set(withSpring(0, { duration: 500, dampingRatio: 0.4 }));
      held.set(withTiming(0, { duration: 260 }));
      if (weight(step.get(), 1) > 0.5) orbit.set(withDecay({ velocity: e.velocityX / (size * 0.35), deceleration: 0.996 }));
    },
    onFinalize: () => {
      'worklet';
      touching.set(0);
    },
  });

  const tap = useTapGesture({
    onBegin: (e) => {
      'worklet';
      touching.set(1);
      touchX.set(e.x);
      touchY.set(e.y);
    },
    onActivate: (e) => {
      'worklet';
      // 2. adımda Soro'nun dışında, çubukların hizasına dokunmak çubuk seçer.
      const f = feet.get();
      const onSoro = Math.abs(e.x - f.x) < f.m * 0.45 && e.y > f.y - f.m * 0.95 && e.y < f.y;
      if (weight(step.get(), 2) > 0.5 && !onSoro && e.y > barBottom - barMax) {
        if (pickBar(e.x)) return;
      }
      poke();
    },
    onFinalize: () => {
      'worklet';
      touching.set(0);
    },
  });

  const gesture = useExclusiveGestures(pan, tap);

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width: size, height: size }}>
        <Canvas style={{ width: size, height: size }}>
          {/* Işınlar yuvarlak bir rozetin içinde kalır; kare tuvalin kenarında kesik görünmez. */}
          <Group clip={rrect(rect(size * 0.02, size * 0.02, size * 0.96, size * 0.96), size * 0.48, size * 0.48)}>
            <Group transform={rays} origin={vec(cx, size * 0.5)}>
              <Sunburst cx={cx} cy={size * 0.5} r={size * 0.7} color={colors.ray} />
            </Group>
          </Group>
          <Circle cx={cx} cy={size * 0.5} r={size * 0.33} color={colors.disk} />

          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Sparkle key={i} i={i} t={t} step={step} size={size} color={colors.sparkle} />
          ))}
          {BARS.map((h, i) => (
            <ResultBar
              key={i}
              i={i}
              x={barX0 + i * (barW + barGap)}
              w={barW}
              full={h * barMax}
              bottom={barBottom}
              grow={grow}
              sel={sel}
              color={colors.bar}
              hot={colors.barHot}
            />
          ))}
          {ORBIT.map((i) => (
            <OrbitBubble key={`b${i}`} i={i} layer="back" t={t} orbit={orbit} step={step} size={size} look={colors.bubble} />
          ))}

          <Oval x={shadowX} y={shadowY} width={shadowW} height={shadowH} color={colors.ground} />

          <Group transform={soro}>
            <Soro t={t} step={step} look={look} squish={squish} tilt={tilt} held={held} react={react} reactP={reactP} pull={pull} dizzy={dizzy} />
          </Group>

          {ORBIT.map((i) => (
            <OrbitBubble key={`f${i}`} i={i} layer="front" t={t} orbit={orbit} step={step} size={size} look={colors.bubble} />
          ))}
          {Array.from({ length: CONFETTI }, (_, i) => (
            <Confetti key={i} i={i} burst={burst} x={burstX} y={burstY} size={size} color={colors.confetti[i % colors.confetti.length]} />
          ))}
        </Canvas>
      </View>
    </GestureDetector>
  );
}

/** Logodaki güneşin ışınları gibi düz dilimler; arka planda çok yavaş döner. */
function Sunburst({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  const n = 14;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = a0 + Math.PI / n;
    d += `M${cx} ${cy} L${cx + Math.cos(a0) * r} ${cy + Math.sin(a0) * r} L${cx + Math.cos(a1) * r} ${cy + Math.sin(a1) * r} Z `;
  }
  return <Path path={d} color={color} />;
}

const SPARKLES = [
  [0.1, 0.18, 1],
  [0.88, 0.14, 0.8],
  [0.93, 0.52, 1.1],
  [0.06, 0.58, 0.7],
  [0.26, 0.05, 0.6],
  [0.74, 0.04, 0.9],
  [0.94, 0.86, 0.6],
] as const;
const STAR = 'M0 -1 Q0.16 -0.16 1 0 Q0.16 0.16 0 1 Q-0.16 0.16 -1 0 Q-0.16 -0.16 0 -1 Z';

function Sparkle({ i, t, step, size, color }: { i: number; t: SharedValue<number>; step: SharedValue<number>; size: number; color: string }) {
  const [fx, fy, k] = SPARKLES[i];
  const r = size * 0.03 * k;
  const opacity = useDerivedValue(() => weight(step.get(), 0) * (0.55 + 0.45 * Math.sin(t.get() / 380 + i * 1.7)));
  const transform = useDerivedValue<Transforms3d>(() => [
    { translateX: fx * size },
    { translateY: fy * size },
    { scale: r * (0.75 + 0.25 * Math.sin(t.get() / 380 + i * 1.7)) },
    { rotate: t.get() / 2400 + i },
  ]);
  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={STAR} color={color} />
    </Group>
  );
}

/** 1. adım: beş "?" baloncuğu eğik yörüngede; Soro'nun önünden ve arkasından geçer. Sürükleyince döner. */
function OrbitBubble({
  i,
  layer,
  t,
  orbit,
  step,
  size,
  look,
}: {
  i: number;
  layer: 'back' | 'front';
  t: SharedValue<number>;
  orbit: SharedValue<number>;
  step: SharedValue<number>;
  size: number;
  look: SceneColors['bubble'];
}) {
  const angle = useDerivedValue(() => t.get() / 2600 + orbit.get() + (i * 2 * Math.PI) / ORBIT.length + (1 - weight(step.get(), 1)) * 1.2);
  const depth = useDerivedValue(() => Math.sin(angle.get()));
  const r = size * 0.068;
  const transform = useDerivedValue<Transforms3d>(() => {
    const w = weight(step.get(), 1);
    const spread = 0.7 + 0.3 * w;
    return [
      { translateX: size / 2 + Math.cos(angle.get()) * size * 0.43 * spread },
      { translateY: size * 0.6 + depth.get() * size * 0.15 * spread },
      { scale: (0.75 + 0.25 * depth.get()) * (0.6 + 0.4 * w) },
    ];
  });
  const opacity = useDerivedValue(() => {
    const side = layer === 'front' ? 0.5 + depth.get() * 3 : 0.5 - depth.get() * 3;
    return weight(step.get(), 1) * Math.min(1, Math.max(0, side));
  });
  const markScale = (r * 1.1) / 620;
  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={0} cy={0} r={r} color={look.fill} />
      <Circle cx={0} cy={0} r={r} color={look.ink} style="stroke" strokeWidth={size * 0.006} />
      <Group transform={[{ scale: markScale }, { translateX: -512 }, { translateY: -560 }]}>
        <Path path={MARK} color={look.mark} style="stroke" strokeWidth={118} strokeCap="round" strokeJoin="round" />
        <Circle cx={512} cy={836} r={66} color={look.mark} />
      </Group>
    </Group>
  );
}

/** 2. adım: cevap dağılımı gibi çubuklar sırayla yükselir; seçili olan ("senin cevabın") turuncudur. */
function ResultBar({
  i,
  x,
  w,
  full,
  bottom,
  grow,
  sel,
  color,
  hot,
}: {
  i: number;
  x: number;
  w: number;
  full: number;
  bottom: number;
  grow: SharedValue<number>;
  sel: SharedValue<number>;
  color: string;
  hot: string;
}) {
  const g = useDerivedValue(() => {
    const k = Math.min(1, Math.max(0, grow.get() * 1.4 - i * 0.1));
    return k * k * (3 - 2 * k);
  });
  const height = useDerivedValue(() => full * g.get());
  const y = useDerivedValue(() => bottom - height.get());
  const hotOpacity = useDerivedValue(() => (sel.get() === i ? g.get() : 0));
  return (
    <>
      <RoundedRect x={x} y={y} width={w} height={height} r={w * 0.28} color={color} opacity={g} />
      <RoundedRect x={x} y={y} width={w} height={height} r={w * 0.28} color={hot} opacity={hotOpacity} />
    </>
  );
}

/** Dokununca Soro'nun başından saçılan düz renkli konfeti (yerçekimiyle düşer). */
function Confetti({
  i,
  burst,
  x,
  y,
  size,
  color,
}: {
  i: number;
  burst: SharedValue<number>;
  x: SharedValue<number>;
  y: SharedValue<number>;
  size: number;
  color: string;
}) {
  const a = (i / CONFETTI) * Math.PI * 2 + (i % 3) * 0.3;
  const speed = size * (0.28 + ((i * 37) % 10) / 40);
  const transform = useDerivedValue<Transforms3d>(() => {
    const p = burst.get();
    // Başın çevresinden (r0) dışa doğru saçılır; yüzün üstünde başlamaz.
    const r0 = size * 0.08;
    return [
      { translateX: x.get() + Math.cos(a) * (r0 + speed * p) },
      { translateY: y.get() + Math.sin(a) * (r0 + speed * p) * 0.8 - size * 0.12 * p + size * 0.55 * p * p },
      { rotate: p * 7 + i },
    ];
  });
  const opacity = useDerivedValue(() => (burst.get() >= 1 ? 0 : 1 - burst.get() * burst.get()));
  const w = size * 0.022;
  return (
    <Group transform={transform} opacity={opacity}>
      <RoundedRect x={-w / 2} y={-w * 0.8} width={w} height={w * 1.6} r={w * 0.3} color={color} />
    </Group>
  );
}
