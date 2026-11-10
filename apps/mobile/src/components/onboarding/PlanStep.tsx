import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { usePurchasePremium } from '@/api/hooks';
import { SoroFigure, type SoroMood } from '@/components/mascot/SoroFigure';
import { PremiumFinePrint } from '@/components/premium/PremiumCard';
import { Button, Icon, InlineError, PressableScale, Row, T, type IconName } from '@/components/ui';
import { PREMIUM } from '@/lib/premium';
import { font, fonts, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

import { AuthActions } from './AuthActions';

type Plan = 'free' | 'premium';

const FREE_PERKS: { icon: IconName; text: string }[] = [
  { icon: 'today', text: 'Her gün 4 oyun' },
  { icon: 'extension-puzzle', text: 'Seri, yapboz ve koleksiyon' },
  { icon: 'play-circle-outline', text: 'Reklamlı' },
];
const PREMIUM_PERKS: { icon: IconName; text: string }[] = [
  { icon: 'scale', text: 'Sınırsız Hangisi pahalı?' },
  { icon: 'sparkles', text: 'Reklamsız oyun' },
  { icon: 'bulb', text: 'İpucu, ek tahmin ve seri kurtarma video izlemeden' },
];
const ON_PREMIUM = '#FFFFFF';
const ON_PREMIUM_SOFT = 'rgba(255,255,255,0.82)';
const CHIP_ON_PREMIUM = 'rgba(255,255,255,0.18)';
const HERO_SORO = 128;
const RAYS = 14;

/**
 * Tanıtımdan sonra, girişten önce: Ücretsiz ya da Premium (aylık). Soro her yerde başka hâlde: başlıkta seçime
 * göre el sallar ya da sevinir, satın alırken düşünür; Ücretsiz kartının köşesinden bakar, Premium kartında
 * kollarını kaldırır. Premium seçilirse abonelik başlar (test sürümünde ödeme alınmaz); sonra giriş gelir.
 */
export function PlanStep({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const purchase = usePurchasePremium();
  const [plan, setPlan] = useState<Plan>('free');
  const [chosen, setChosen] = useState<Plan | null>(null);

  const next = () => {
    if (plan === 'free') return setChosen('free');
    purchase.mutate(undefined, { onSuccess: () => setChosen('premium') });
  };

  const mood: SoroMood = purchase.isPending ? 'think' : chosen === 'premium' || (!chosen && plan === 'premium') ? 'cheer' : 'wave';
  const say = purchase.isPending
    ? 'Hazırlıyorum…'
    : chosen === 'premium'
      ? 'Sınırsız oynayalım!'
      : chosen === 'free'
        ? 'Harika, başlayalım!'
        : plan === 'premium'
          ? 'Reklamsız ve sınırsız!'
          : 'Nasıl oynamak istersin?';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xl }]}>
      <Hero mood={mood} say={say} />

      <View style={{ gap: 2 }}>
        <T variant="headline" center accessibilityRole="header">
          {chosen ? 'Neredeyse hazır!' : 'Planını seç'}
        </T>
        <T color="textMuted" center style={styles.lead}>
          {chosen ? 'Giriş yaparsan serin ve yapbozun telefon değişse de seninle kalır.' : 'İstediğin zaman Profil’den değiştirebilirsin.'}
        </T>
      </View>

      {chosen ? (
        <Animated.View entering={FadeInDown.duration(300)} style={{ gap: space.md }}>
          {chosen === 'premium' && <PremiumBadge />}
          <AuthActions onDone={onDone} />
        </Animated.View>
      ) : (
        <>
          <View style={styles.plans} accessibilityRole="radiogroup">
            <FreeCard selected={plan === 'free'} onPress={() => setPlan('free')} />
            <PremiumPlanCard selected={plan === 'premium'} onPress={() => setPlan('premium')} />
          </View>
          <Button
            title={plan === 'free' ? 'Ücretsiz devam et' : `Premium’u başlat · ${PREMIUM.price}/${PREMIUM.periodLabel}`}
            icon={plan === 'free' ? 'arrow-forward' : 'sparkles'}
            size="lg"
            loading={purchase.isPending}
            onPress={next}
          />
          {plan === 'premium' ? (
            <PremiumFinePrint />
          ) : (
            <T variant="caption" color="textSubtle" center>
              Premium’a sonra da Profil’den geçebilirsin.
            </T>
          )}
          <InlineError error={purchase.error} />
        </>
      )}
    </ScrollView>
  );
}

/** Başlık: güneş ışınlarının önünde Soro ve konuşma balonu (sözü seçime göre değişir). */
function Hero({ mood, say }: { mood: SoroMood; say: string }) {
  const c = useColors();
  const box = HERO_SORO * 2.1;
  return (
    <View style={styles.hero}>
      <View style={[styles.rays, { width: box, height: box }]} pointerEvents="none">
        <Svg width={box} height={box} viewBox="-50 -50 100 100">
          <G>
            {Array.from({ length: RAYS }, (_, i) => (
              <Path key={i} d="M0 0 L-5 -50 L5 -50 Z" fill={c.accentSoft} transform={`rotate(${(360 / RAYS) * i})`} />
            ))}
          </G>
          <Circle r={24} fill={c.accentSoft} />
        </Svg>
      </View>
      <SoroFigure size={HERO_SORO} mood={mood} />
      <Animated.View key={say} entering={FadeIn.duration(220)} style={[styles.bubble, { backgroundColor: c.surface, borderColor: c.text }]}>
        <Text style={[font.bodyStrong, { color: c.text }]}>{say}</Text>
        <View style={[styles.bubbleTail, { backgroundColor: c.surface, borderColor: c.text }]} />
      </Animated.View>
    </View>
  );
}

function FreeCard({ selected, onPress }: { selected: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <PlanShell selected={selected} onPress={onPress} label={`Ücretsiz, 0 TL. ${FREE_PERKS.map((p) => p.text).join(', ')}`}>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: selected ? c.text : c.border }, selected && styles.cardSelected]}>
        {/* Soro kartın köşesinden bakar. */}
        <View style={styles.peek} pointerEvents="none">
          <SoroFigure size={64} mood="happy" animate={false} />
        </View>
        <View style={{ gap: 2 }}>
          <T variant="label" color="textMuted">
            Ücretsiz
          </T>
          <Row style={{ alignItems: 'baseline', gap: 4 }}>
            <Text style={[styles.price, { color: c.text }]}>0 TL</Text>
          </Row>
        </View>
        <View style={{ gap: space.sm }}>
          {FREE_PERKS.map((p) => (
            <Perk key={p.text} icon={p.icon} text={p.text} chip={c.surfaceMuted} color={c.textMuted} />
          ))}
        </View>
        <Radio selected={selected} ring={c.text} fill={c.text} />
      </View>
    </PlanShell>
  );
}

function PremiumPlanCard({ selected, onPress }: { selected: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <PlanShell selected={selected} onPress={onPress} label={`Premium, ayda ${PREMIUM.price}. ${PREMIUM_PERKS.map((p) => p.text).join(', ')}`}>
      <LinearGradient
        colors={[c.premiumFrom, c.premiumTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: selected ? c.text : 'transparent' }, selected && styles.cardSelected]}>
        {/* Arkada büyük, soluk soru işareti: kartın dokusu (kart içinde kırpılır; Soro ise dışarı taşar). */}
        <View style={styles.watermarkClip} pointerEvents="none">
          <Text style={styles.watermark} accessible={false}>
            ?
          </Text>
        </View>
        <View style={styles.peek} pointerEvents="none">
          <SoroFigure size={76} mood="cheer" />
        </View>
        <View style={{ gap: 2 }}>
          <Row style={{ gap: space.sm }}>
            <T variant="label" style={{ color: ON_PREMIUM }}>
              Premium
            </T>
            <View style={styles.ribbon}>
              <Text style={[styles.ribbonText, { color: c.premiumTo }]}>SINIRSIZ</Text>
            </View>
          </Row>
          <Row style={{ alignItems: 'baseline', gap: 4 }}>
            <Text style={[styles.price, { color: ON_PREMIUM }]}>{PREMIUM.price}</Text>
            <Text style={[font.bodyStrong, { color: ON_PREMIUM_SOFT }]}>/ {PREMIUM.periodLabel}</Text>
          </Row>
        </View>
        <View style={{ gap: space.sm }}>
          <Text style={[font.caption, { color: ON_PREMIUM_SOFT }]}>Ücretsizdeki her şey, artı:</Text>
          {PREMIUM_PERKS.map((p) => (
            <Perk key={p.text} icon={p.icon} text={p.text} chip={CHIP_ON_PREMIUM} color={ON_PREMIUM} strong />
          ))}
        </View>
        <Radio selected={selected} ring={ON_PREMIUM} fill={ON_PREMIUM} />
      </LinearGradient>
    </PlanShell>
  );
}

function PlanShell({ selected, onPress, label, children }: { selected: boolean; onPress: () => void; label: string; children: ReactNode }) {
  return (
    <PressableScale haptic="select" accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress} containerStyle={styles.planCell}>
      {children}
    </PressableScale>
  );
}

function Perk({ icon, text, chip, color, strong = false }: { icon: IconName; text: string; chip: string; color: string; strong?: boolean }) {
  return (
    <Row style={{ gap: space.sm }}>
      <View style={[styles.perkIcon, { backgroundColor: chip }]}>
        <Icon name={icon} size={16} color={color} />
      </View>
      <Text style={[font.body, { flex: 1, color, fontFamily: strong ? fonts.bold : fonts.regular }]}>{text}</Text>
    </Row>
  );
}

function Radio({ selected, ring, fill }: { selected: boolean; ring: string; fill: string }) {
  return (
    <View style={[styles.radio, { borderColor: ring, opacity: selected ? 1 : 0.6 }]}>
      {selected && <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.dot, { backgroundColor: fill }]} />}
    </View>
  );
}

/** Premium seçildikten sonra, giriş adımında: kısa onay. */
function PremiumBadge() {
  const c = useColors();
  return (
    <LinearGradient colors={[c.premiumFrom, c.premiumTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
      <Icon name="sparkles" size={18} color={ON_PREMIUM} />
      <Text style={[font.bodyStrong, { color: ON_PREMIUM, flex: 1 }]}>Premium aktif: sınırsız Hangisi pahalı? ve reklamsız oyun</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', gap: space.lg, paddingHorizontal: space.xl, width: '100%', maxWidth: 760, alignSelf: 'center' },
  hero: { alignItems: 'center', justifyContent: 'center', paddingTop: space.lg },
  rays: { position: 'absolute', alignItems: 'center', justifyContent: 'center', opacity: 0.9 },
  bubble: { marginTop: space.sm, borderWidth: 1.5, borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: space.sm },
  bubbleTail: { position: 'absolute', top: -7, alignSelf: 'center', width: 12, height: 12, borderLeftWidth: 1.5, borderTopWidth: 1.5, transform: [{ rotate: '45deg' }] },
  lead: { maxWidth: 400, alignSelf: 'center' },
  // Kartların üstünde Soro'ya yer kalsın diye üst boşluk.
  plans: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, paddingTop: space.xl },
  planCell: { flexBasis: 280, flexGrow: 1 },
  card: { borderRadius: radius.xl, padding: space.lg, paddingTop: space.xl, gap: space.md, borderWidth: 1, overflow: 'visible', minHeight: 250 },
  cardSelected: { borderWidth: 3 },
  peek: { position: 'absolute', top: -44, right: space.md },
  price: { fontFamily: fonts.black, fontSize: 34, lineHeight: 38 },
  watermarkClip: { ...StyleSheet.absoluteFill, borderRadius: radius.xl, overflow: 'hidden' },
  watermark: { position: 'absolute', right: -6, bottom: -40, fontFamily: fonts.serif, fontSize: 200, lineHeight: 220, color: 'rgba(255,255,255,0.08)' },
  ribbon: { backgroundColor: ON_PREMIUM, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 },
  ribbonText: { fontFamily: fonts.black, fontSize: 10, letterSpacing: 1.2 },
  perkIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  radio: { position: 'absolute', bottom: space.lg, right: space.lg, width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.lg, padding: space.md },
});
