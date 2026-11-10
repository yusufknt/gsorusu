import { Circle, Group, Oval, Path, vec, type Transforms3d } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import {
  BELLY,
  BODY_PARTS,
  CHEEKS,
  CURL,
  CURL_PIVOT,
  EYES,
  FACE_LINES,
  HIP_HAND,
  HIP_PIVOT,
  LIMBS,
  TAIL,
  WAVE_ARM,
  type SoroOval,
  type SoroPath,
} from './soroShape';

/** Dokunma tepkileri; her dokunuşta sıradaki oynar. */
export const REACTIONS = ['jump', 'flip', 'giggle', 'surprise'] as const;
export const REACTION_MS = [620, 760, 720, 820] as const;

export const FEET_Y = 70.6;
const DARK = '#19140E';
// Soro'nun kendi kolu (çenesine/beline attığı çizgi): omuzdan döner. Omuz noktası çizimin gövdeye bağlandığı uç.
const HAND_PIVOT = { x: 27.4, y: 52.6 };

// Uzuvların gövdeye bağlandığı noktalar (80×80 çizim alanı). Sıra: soroShape.ts'deki LIMBS, sonra sağ üst kol, iki kulak.
const PIVOTS = {
  footL: vec(27.5, 63.5),
  footR: vec(53, 63.5),
  lowerL: vec(20.5, 50),
  lowerR: vec(60, 50),
  upperL: vec(19.8, 36.5),
  upperR: vec(60.6, 37.5),
  earL: vec(27, 24.5),
  earR: vec(52.5, 24.5),
};

// İfade şekilleri: kapalı mutlu gözler, kahkaha ve "o" ağız.
const HAPPY_EYES = ['M27.4 39.4 Q31.2 34.2 35 39.4', 'M45.2 37.6 Q48.9 32.6 52.7 37.6'];
const LAUGH = 'M35.4 40.4 Q40.4 42.4 45.2 39.4 Q45.6 46 40.6 47 Q35.8 46.8 35.4 40.4 Z';
const LAUGH_TONGUE = { cx: 40.6, cy: 45.2, rx: 2.7, ry: 1.4 };
const O_MOUTH = { cx: 40.5, cy: 42.8, rx: 1.9, ry: 2.5 };
// Çığlık ağzının merkezi (korktukça büyür) ve alnından süzülen ter damlası.
const SCREAM = { cx: 40.5, cy: 43.4 };
const SWEAT = 'M56.2 25.6 Q59.2 30.2 56.2 31.8 Q53.2 30.2 56.2 25.6 Z';
/** Başı dönünce gözlerin yerini alan spiral (göz merkezinde, ~4 birim). */
const SPIRAL = (() => {
  let d = 'M0 0';
  for (let a = 0; a <= Math.PI * 5; a += 0.25) d += ` L${(Math.cos(a) * a * 0.26).toFixed(2)} ${(Math.sin(a) * a * 0.26).toFixed(2)}`;
  return d;
})();

export type SoroInputs = {
  /** Saat (ms); azaltılmış harekette sabit 0. */
  t: SharedValue<number>;
  /** Tanıtım adımı (kesirli). */
  step: SharedValue<number>;
  /** Bakış yönü, −1…1. */
  look: SharedValue<{ x: number; y: number }>;
  /** Ezilme (+) / uzama (−). */
  squish: SharedValue<number>;
  /** Sürükleme hızına göre eğilme (radyan). */
  tilt: SharedValue<number>;
  /** Sürükleniyor: 0…1. */
  held: SharedValue<number>;
  /** Son dokunma tepkisi (REACTIONS sırası) ve ilerlemesi (0→1; 1 = bitti). */
  react: SharedValue<number>;
  reactP: SharedValue<number>;
  /** Sürükleme miktarı, sahne boyuna göre (y < 0 yukarı). */
  pull: SharedValue<{ x: number; y: number }>;
  /** Baloncukları hızlı çevirince biriken baş dönmesi, 0…1. */
  dizzy: SharedValue<number>;
};

function weight(s: number, i: number) {
  'worklet';
  return Math.max(0, 1 - Math.abs(s - i));
}
function clamp01(x: number) {
  'worklet';
  return Math.min(1, Math.max(0, x));
}
/** a–b arasında yumuşak 0→1 geçiş; altında 0, üstünde 1 (ifadeler ara hâlde asılı kalmasın). */
function step01(a: number, b: number, x: number) {
  'worklet';
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
}
function easeOut(p: number) {
  'worklet';
  return 1 - Math.pow(1 - p, 3);
}
/** Belli bir periyodun belli bir diliminde 0→1→0 kavis (ara sıra kendiliğinden zıplama). */
function arcAt(t: number, period: number, at: number, len: number) {
  'worklet';
  const k = ((t % period) / period - at) / len;
  return k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0;
}
/**
 * Doğrusal ara değer. Modül düzeyinde ve 'worklet' olmalı: bileşen içinde tanımlanınca React Compiler onu
 * `_temp` olarak dışarı taşıyor, UI iş parçacığından çağrılınca telefonda uygulama hata veriyordu.
 */
function lerp(a: number, b: number, k: number) {
  'worklet';
  return a + (b - a) * k;
}

/**
 * Soro, 80×80 birimlik alanda. Her kare tek bir "poz" hesaplanır; parçalar oradan okur.
 * Adıma göre davranır (0: el sallar, ara ara sevinçle zıplar · 1: ritimle dans eder · 2: kolları havada, sevinç zıplamaları),
 * dokununca sıradaki tepkiyi oynar. Sürüklenince adıma özgü hâle girer: 0'da sapan gibi gerilip sırıtır, 1'de baloncukları
 * hızlı çevirince başı döner (spiral gözler), 2'de yukarı kaldırdıkça korkar (çığlık, çırpınan kollar, tekmeler, ter).
 * Uzuvlar ayrı ayrı kıpırdar.
 */
export function Soro({ t, step, look, squish, tilt, held, react, reactP, pull, dizzy }: SoroInputs) {
  const pose = useDerivedValue(() => {
    const tt = t.get();
    const s = step.get();
    const w0 = weight(s, 0);
    const w1 = weight(s, 1);
    const w2 = weight(s, 2);
    const h = held.get();
    const r = react.get();
    const rp = reactP.get();
    const bump = rp < 1 ? Math.sin(Math.PI * Math.min(1, rp)) : 0;

    // Adıma özgü sürükleme hâlleri: 0'da sapan gibi gerilir, 1'de başı döner, 2'de yükseldikçe korkar.
    const pl = pull.get();
    const stretch = w0 * h * Math.min(1, Math.hypot(pl.x, pl.y));
    const dz = w1 * dizzy.get();
    const fear = w2 * h * clamp01(-pl.y * 1.3);
    const scream = step01(0.12, 0.45, fear);

    const hop0 = w0 * arcAt(tt, 3000, 0.7, 0.17);
    const hop2 = w2 * arcAt(tt, 1300, 0, 0.42);
    const beat = Math.sin(tt / 380);

    // İfadeler ham değerden kısa bir eşikle açılıp kapanır: iki göz/ağız üst üste yarı saydam görünmez.
    const joyful = r === 0 || r === 2 ? bump * 1.3 : 0;
    const happy = step01(0.3, 0.7, Math.max(hop0 * 1.3, hop2 * 1.4, joyful)) * (1 - h);
    const surprise = step01(0.35, 0.65, Math.max(h * w1 * 0.9, r === 3 ? bump * 1.3 : 0)) * (1 - scream);
    const laugh = step01(0.4, 0.6, Math.max(hop0 * 1.2, hop2 * 1.3, joyful, w2 * 0.7 * (1 - h), stretch * 1.4));

    const flip = r === 1 && rp < 1 ? easeOut(rp) * Math.PI * 2 : 0;
    const giggle = r === 2 && rp < 1 ? 0.17 * Math.sin(rp * 44) * (1 - rp) : 0;
    const armsUp = clamp01(Math.max(w2 * 0.9, r === 0 ? bump : 0, r === 1 ? bump : 0, h * 0.7, hop0 * 0.5, fear * 1.2, stretch * 0.8));
    // Korkunca kollar "yardım edin!" der gibi çırpınır, ayaklar tekmeler, gövde titrer.
    const flail = fear * 0.55;
    const tremble = fear * 0.05 * Math.sin(tt / 22) + dz * 0.13 * Math.sin(tt / 140);
    const wave = w0 * (0.5 + 0.32 * Math.sin(tt / 150));
    const jig = (i: number) => Math.sin(tt / (260 + i * 41) + i * 1.3) * 0.08;
    const dangle = h * 0.4 * Math.sin(tt / 110);

    // Kol (çizgi): boşta çenesinde hafifçe kıpırdar; hâllere göre omuzdan döner (− yukarı kaldırır).
    const free = 1 - h;
    const up = r === 0 || r === 1 ? bump : 0;
    const giggleHand = r === 2 ? bump : 0;
    const cheekHand = r === 3 ? bump : 0;
    // Soro'nun iki eli var: çenesindeki kol (a, tx/ty, k) ve sağ belindeki el (c, hx/hy). İki el gereken
    // hâllerde beldeki el kalkar; üçüncü bir el (aynadaki kopya) çizilmez.
    // a / c = dönüş (− yukarı), tx/ty ve hx/hy = kayma, k = büyüme.
    const flipping = r === 1 && rp < 1 ? bump : 0;
    const overhead = Math.max(up, flipping);
    const wobble = Math.sin(tt / 240);
    let a = 0.05 * Math.sin(tt / 700) + w0 * free * 0.06 * wobble;
    let tx = 0;
    let ty = 0;
    let k = 1;
    let c = 0.04 * Math.sin(tt / 600);
    let hx = 0;
    let hy = 0;
    // 1. adım dans: kol ritimle iner kalkar, beldeki el ters ritimle sallanır.
    a = lerp(a, 0.28 * beat, w1 * free);
    c = lerp(c, -0.25 * beat, w1 * free);
    // 3. adım: iki el havada sevinir (çenedeki kol ve beldeki el).
    const cheer = w2 * free;
    a = lerp(a, -1.05 + 0.15 * Math.sin(tt / 190), cheer);
    tx = lerp(tx, -2, cheer);
    ty = lerp(ty, -2, cheer);
    c = lerp(c, -1.7 + 0.15 * Math.sin(tt / 190 + 1.4), cheer);
    hx = lerp(hx, 1, cheer);
    hy = lerp(hy, -2, cheer);
    // Zıplarken ve taklada iki el başın üstüne doğru kalkar (taklanın doğal duruşu).
    a = lerp(a, -2.3, overhead);
    tx = lerp(tx, -3, overhead);
    ty = lerp(ty, -7, overhead);
    k = lerp(k, 1.25, overhead);
    c = lerp(c, -2.1, overhead);
    hy = lerp(hy, -4, overhead);
    a = lerp(a, -0.6, hop0 * 1.3 * free);
    // Kıkırdarken eli ağzında titrer, şaşırınca yanağına gider.
    a = lerp(a, -0.22 + 0.1 * Math.sin(tt / 40), giggleHand);
    a = lerp(a, -0.55, cheekHand);
    // 0 sapan: gerilirken iki el geriye/yukarı uzanır.
    a = lerp(a, -1.6, stretch);
    tx = lerp(tx, -3, stretch);
    ty = lerp(ty, -3, stretch);
    k = lerp(k, 1.15, stretch);
    c = lerp(c, -1.5, stretch);
    hy = lerp(hy, -2, stretch);
    // 1: baloncukları çevirirken uzanır; başı dönünce elini başına koyup sendeler.
    const reachOut = w1 * h * (1 - dz);
    a = lerp(a, -1.0, reachOut);
    tx = lerp(tx, -3, reachOut);
    a = lerp(a, -1.25 + 0.12 * Math.sin(tt / 160), dz);
    tx = lerp(tx, 1.5, dz);
    ty = lerp(ty, -7, dz);
    // 2: kaldırınca iki el gövdeden taşar ve sağa sola debelenir.
    a = lerp(a, -1.35 + 0.9 * Math.sin(tt / 45), fear);
    tx = lerp(tx, -6 + 2 * Math.sin(tt / 70), fear);
    ty = lerp(ty, -2, fear);
    k = lerp(k, 1.25, fear);
    c = lerp(c, -1.35 + 0.9 * Math.sin(tt / 45 + 2.3), fear);
    hx = lerp(hx, 1.5 + Math.sin(tt / 70 + 1), fear);
    hy = lerp(hy, -2, fear);

    return {
      hopY: -(hop0 * 6 + hop2 * 4.5 * (1 - h)) + (r === 3 ? -bump * 2 : 0),
      spin: flip + giggle + w1 * 0.08 * beat + tremble,
      hand: { a, tx, ty, k },
      hip: { c, hx, hy },
      // Gövde: dansta yana eğilip ritimle ezilir, sapanda çekilen yöne yatar, zıplarken gerilir.
      lean: w1 * free * 0.16 * beat - pl.x * 0.35 * stretch + fear * 0.06 * Math.sin(tt / 30),
      pulse: w1 * free * 0.06 * Math.abs(beat) - hop0 * 0.08 - hop2 * 0.06,
      stretch,
      fear,
      scream,
      dizzyEyes: step01(0.3, 0.6, dz),
      sweat: step01(0.35, 0.6, fear),
      breath: 0.012 * Math.sin(tt / 650),
      happy,
      surprise,
      laugh,
      footL: jig(0) + dangle + w1 * Math.max(0, beat) * 0.28 + fear * 0.45 * Math.sin(tt / 70),
      footR: jig(1) - dangle - w1 * Math.max(0, -beat) * 0.28 - fear * 0.45 * Math.sin(tt / 70 + 1.7),
      lowerL: jig(2) + w1 * 0.32 * beat + giggle * 2 + fear * 0.5 * Math.sin(tt / 60 + 0.5),
      lowerR: jig(3) + w1 * 0.32 * beat - giggle * 2 - fear * 0.5 * Math.sin(tt / 60 + 2.1),
      upperL: jig(4) + 1.05 * armsUp + flail * Math.sin(tt / 55),
      upperR: jig(5) - wave - 1.05 * armsUp - flail * Math.sin(tt / 55 + 1.6),
      earL: jig(6) * 1.5 - surprise * 0.4,
      earR: jig(7) * 1.5 + surprise * 0.4,
      curl: 0.08 * Math.sin(tt / 520) + w1 * 0.16 * beat + (r === 0 && rp < 1 ? easeOut(rp) * Math.PI * 2 : 0) + dz * (tt / 160),
      curlY: -surprise * 3.5 - hop0 * 1.5 - fear * 3,
      eyeScale: 1 + 0.32 * surprise + 0.45 * fear,
      squint: 1 - 0.5 * stretch,
      cheek: 1 + 0.55 * happy,
      brow: -surprise * 2.2 - fear * 2.8 + happy * 0.6 + stretch * 1.3,
    };
  });

  const hop = useDerivedValue<Transforms3d>(() => [{ translateY: pose.get().hopY }]);
  const spin = useDerivedValue<Transforms3d>(() => [{ rotate: pose.get().spin }]);
  const squash = useDerivedValue<Transforms3d>(() => {
    const q = squish.get();
    // Sapan: çekildikçe boyuna uzar, enine incelir.
    const ps = pose.get();
    const st = ps.stretch;
    return [
      { rotate: tilt.get() },
      { skewX: ps.lean },
      { scaleX: 1 + 0.16 * q - 0.12 * st + ps.pulse },
      { scaleY: 1 - 0.16 * q + ps.breath * 1.6 + 0.3 * st - ps.pulse },
    ];
  });
  const rot = (key: 'footL' | 'footR' | 'lowerL' | 'lowerR' | 'upperL' | 'upperR' | 'earL' | 'earR') => {
    'worklet';
    return [{ rotate: pose.get()[key] }];
  };
  const footL = useDerivedValue<Transforms3d>(() => rot('footL'));
  const footR = useDerivedValue<Transforms3d>(() => rot('footR'));
  const lowerL = useDerivedValue<Transforms3d>(() => rot('lowerL'));
  const lowerR = useDerivedValue<Transforms3d>(() => rot('lowerR'));
  const upperL = useDerivedValue<Transforms3d>(() => rot('upperL'));
  const upperR = useDerivedValue<Transforms3d>(() => rot('upperR'));
  const earL = useDerivedValue<Transforms3d>(() => rot('earL'));
  const earR = useDerivedValue<Transforms3d>(() => rot('earR'));
  const curl = useDerivedValue<Transforms3d>(() => [{ translateY: pose.get().curlY }, { rotate: pose.get().curl }]);
  const brow = useDerivedValue<Transforms3d>(() => [{ translateY: pose.get().brow }]);
  const handL = useDerivedValue<Transforms3d>(() => {
    const hd = pose.get().hand;
    return [{ translateX: hd.tx }, { translateY: hd.ty }, { rotate: hd.a }, { scale: hd.k }];
  });
  const hip = useDerivedValue<Transforms3d>(() => {
    const hp = pose.get().hip;
    return [{ translateX: hp.hx }, { translateY: hp.hy }, { rotate: hp.c }];
  });
  const cheek = useDerivedValue<Transforms3d>(() => [{ scale: pose.get().cheek }]);

  const smileO = useDerivedValue(() => 1 - Math.max(pose.get().laugh, pose.get().surprise, pose.get().scream));
  const laughO = useDerivedValue(() => pose.get().laugh * (1 - pose.get().surprise) * (1 - pose.get().scream));
  const oO = useDerivedValue(() => pose.get().surprise);
  // Çığlık: korku arttıkça ağız aşağı doğru açılır.
  const screamO = useDerivedValue(() => pose.get().scream);
  const screamRx = useDerivedValue(() => 2 + 1.7 * pose.get().fear);
  const screamRy = useDerivedValue(() => 1.6 + 4.2 * pose.get().fear);
  const screamX = useDerivedValue(() => SCREAM.cx - screamRx.get());
  const screamY = useDerivedValue(() => SCREAM.cy - 1.2 - screamRy.get() * 0.4);
  const screamW = useDerivedValue(() => screamRx.get() * 2);
  const screamH = useDerivedValue(() => screamRy.get() * 2);
  const sweatO = useDerivedValue(() => pose.get().sweat);
  const sweat = useDerivedValue<Transforms3d>(() => [{ translateY: ((t.get() / 9) % 6) * pose.get().sweat }]);
  const dizzyO = useDerivedValue(() => pose.get().dizzyEyes);
  const spiral = useDerivedValue<Transforms3d>(() => [{ rotate: t.get() / 110 }]);
  const happyO = useDerivedValue(() => clamp01((pose.get().happy - 0.8) / 0.2) * (1 - pose.get().dizzyEyes));

  const [lFoot, rFoot, lLower, rLower, lUpper] = LIMBS;
  const [lEar, rEar, torso] = BODY_PARTS;

  return (
    <Group transform={hop}>
      <Group transform={spin} origin={vec(40, 46)}>
        <Group transform={squash} origin={vec(40, FEET_Y)}>
          <Limb p={lFoot} transform={footL} pivot={PIVOTS.footL} />
          <Limb p={rFoot} transform={footR} pivot={PIVOTS.footR} />
          <Limb p={lLower} transform={lowerL} pivot={PIVOTS.lowerL} />
          <Limb p={rLower} transform={lowerR} pivot={PIVOTS.lowerR} />
          <Limb p={lUpper} transform={upperL} pivot={PIVOTS.upperL} />
          <Limb p={WAVE_ARM} transform={upperR} pivot={PIVOTS.upperR} />
          <Limb p={lEar} transform={earL} pivot={PIVOTS.earL} />
          <Limb p={rEar} transform={earR} pivot={PIVOTS.earR} />
          {/* Beldeki el gövdenin arkasında: duruşta gövde iç kenarını örter, kalkınca dışarı çıkar. */}
          <Limb p={HIP_HAND} transform={hip} pivot={HIP_PIVOT} />
          <Part p={torso} />
          <Ellipse o={BELLY} />
          <Group transform={handL} origin={vec(HAND_PIVOT.x, HAND_PIVOT.y)}>
            <Part p={FACE_LINES[0]} />
          </Group>

          {EYES.map((e, i) => (
            <Eye key={i} eye={e} t={t} look={look} pose={pose} delay={i * 40} />
          ))}
          {HAPPY_EYES.map((d, i) => (
            <Path key={i} path={d} color={DARK} style="stroke" strokeWidth={1.9} strokeCap="round" opacity={happyO} />
          ))}

          <Group opacity={smileO}>
            <Part p={FACE_LINES[1]} />
            <Part p={FACE_LINES[2]} />
          </Group>
          <Group opacity={laughO}>
            <Path path={LAUGH} color={DARK} />
            <Oval
              x={LAUGH_TONGUE.cx - LAUGH_TONGUE.rx}
              y={LAUGH_TONGUE.cy - LAUGH_TONGUE.ry}
              width={LAUGH_TONGUE.rx * 2}
              height={LAUGH_TONGUE.ry * 2}
              color="#F0733A"
            />
          </Group>
          <Oval x={O_MOUTH.cx - O_MOUTH.rx} y={O_MOUTH.cy - O_MOUTH.ry} width={O_MOUTH.rx * 2} height={O_MOUTH.ry * 2} color={DARK} opacity={oO} />
          <Oval x={screamX} y={screamY} width={screamW} height={screamH} color={DARK} opacity={screamO} />
          {EYES.map((e, i) => (
            <Group key={`dz${i}`} transform={spiral} origin={vec(e.ball.cx, e.ball.cy)} opacity={dizzyO}>
              <Group transform={[{ translateX: e.ball.cx }, { translateY: e.ball.cy }]}>
                <Circle cx={0} cy={0} r={4.6} color="#FFFFFF" />
                <Path path={SPIRAL} color={DARK} style="stroke" strokeWidth={0.9} strokeCap="round" />
              </Group>
            </Group>
          ))}
          <Group transform={sweat} opacity={sweatO}>
            <Path path={SWEAT} color="#BFE6FA" />
            <Path path={SWEAT} color={DARK} style="stroke" strokeWidth={0.5} />
          </Group>

          <Group transform={brow}>
            <Part p={FACE_LINES[3]} />
          </Group>
          {CHEEKS.map((o, i) => (
            <Group key={i} transform={cheek} origin={vec(o.cx, o.cy)}>
              <Ellipse o={o} />
            </Group>
          ))}
          <Group transform={curl} origin={vec(CURL_PIVOT.x, CURL_PIVOT.y)}>
            <Part p={CURL} />
          </Group>
          <Part p={TAIL} />
        </Group>
      </Group>
    </Group>
  );
}

function Part({ p }: { p: SoroPath }) {
  return (
    <>
      <Path path={p.d} color={p.fill} />
      {p.stroke && <Path path={p.d} color={p.stroke} style="stroke" strokeWidth={p.strokeWidth} strokeJoin="round" strokeCap="round" />}
    </>
  );
}

function Limb({ p, transform, pivot }: { p: SoroPath; transform: SharedValue<Transforms3d>; pivot: { x: number; y: number } }) {
  return (
    <Group transform={transform} origin={pivot}>
      <Part p={p} />
    </Group>
  );
}

function Ellipse({ o }: { o: SoroOval }) {
  return <Oval x={o.cx - o.rx} y={o.cy - o.ry} width={o.rx * 2} height={o.ry * 2} color={o.fill} />;
}

/** Göz yalnızca pozun bu iki alanını okur. */
type PoseValue = { get: () => { happy: number; eyeScale: number; squint: number; dizzyEyes: number } };

/** Açık göz: bakışa kayar, şaşırınca büyür, ~3,4 sn'de bir kırpar; mutluyken yerini "^" göze bırakır. */
function Eye({
  eye,
  t,
  look,
  pose,
  delay,
}: {
  eye: (typeof EYES)[number];
  t: SharedValue<number>;
  look: SharedValue<{ x: number; y: number }>;
  pose: PoseValue;
  delay: number;
}) {
  const { ball, shine } = eye;
  const tilt = ((ball.rotate ?? 0) * Math.PI) / 180;
  const transform = useDerivedValue<Transforms3d>(() => {
    const phase = (t.get() + delay) % 3400;
    const lid = phase < 140 ? 1 - 0.9 * Math.sin((phase / 140) * Math.PI) : 1;
    const l = look.get();
    const k = pose.get().eyeScale;
    const close = (1 - 0.92 * pose.get().happy) * pose.get().squint;
    return [{ translateX: l.x * 1.3 }, { translateY: l.y * 1.1 }, { rotate: tilt }, { scaleX: k }, { scaleY: lid * k * close }];
  });
  // Göz ince bir çizgiye inene kadar tam görünür; ondan sonra "^" göz devralır.
  const opacity = useDerivedValue(() => clamp01((0.95 - pose.get().happy) / 0.15) * (1 - pose.get().dizzyEyes));
  return (
    <Group transform={transform} origin={vec(ball.cx, ball.cy)} opacity={opacity}>
      <Ellipse o={ball} />
      <Circle cx={shine.cx} cy={shine.cy} r={shine.r} color="#FFFFFF" />
    </Group>
  );
}
