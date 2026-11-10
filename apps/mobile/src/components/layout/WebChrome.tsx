import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStats } from '@/api/hooks';
import { DAILY_MODES } from '@/api/types';
import { Doodle, type DoodleName } from '@/components/doodles';
import { SoroFigure } from '@/components/mascot/SoroFigure';
import { Icon } from '@/components/ui';
import { fonts, layout, modeStyle, radius, shadow, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/**
 * Web kabuğu: üstte dört oyun renginde ince şerit, altında tam genişlik menü — solda Soro rozeti + logo,
 * ortada hap grubunda sekmeler (seçili olan kabarık), sağda yardım ve seri. Dar web ekranında sekmeler alta iner.
 * Telefonda yerel sekmeler (NativeTabs) kullanılır; bu dosya yalnız web içindir.
 */


const TABS: Record<string, { label: string; doodle: DoodleName }> = {
  index: { label: 'Bugün', doodle: 'today' },
  stats: { label: 'Seri', doodle: 'flame' },
  profile: { label: 'Profil', doodle: 'person' },
};

/** Barın üstündeki ince şerit: günün dört oyununun renkleri, soldan sağa oyun sırasıyla. */
const STRIPE_COLORS = DAILY_MODES.map((m) => modeStyle[m].color);

function ModeStripe() {
  return (
    <View style={styles.stripe} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {STRIPE_COLORS.map((color) => (
        <View key={color} style={[styles.stripeSeg, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="link" accessibilityLabel="Günün Sorusu, ana sayfa" onPress={() => router.navigate('/')} style={styles.brand}>
      <View style={[styles.mascotBadge, { backgroundColor: c.accentSoft }, compact && styles.mascotBadgeCompact]}>
        <SoroFigure size={compact ? 30 : 38} mood="happy" animate={false} />
      </View>
      <View>
        <Text style={[styles.wordmark, { color: c.text }, compact && { fontSize: 20, lineHeight: 24 }]}>
          Günün Sorusu <Text style={{ color: c.accent }}>?</Text>
        </Text>
        {!compact && <Text style={[styles.tagline, { color: c.textSubtle }]}>HER GÜN 4 OYUN</Text>}
      </View>
    </Pressable>
  );
}

function StreakPill() {
  const c = useColors();
  const streak = useStats().data?.currentStreak ?? 0;
  const on = streak > 0;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${streak} günlük seri`}
      onPress={() => router.navigate('/stats')}
      style={({ hovered }: { hovered?: boolean }) => [
        styles.streak,
        { backgroundColor: on ? c.accentSoft : c.surfaceMuted, borderColor: on ? c.flame : c.border },
        hovered && styles.lift,
      ]}>
      <Icon name="flame" size={18} color={on ? c.flame : c.textSubtle} />
      <Text style={[styles.streakText, { color: on ? c.flame : c.textMuted }]}>{streak}</Text>
      <Text style={[styles.streakUnit, { color: on ? c.flame : c.textSubtle }]}>gün</Text>
    </Pressable>
  );
}

function HelpButton() {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Nasıl oynanır?"
      onPress={() => router.push('/how-to-play')}
      style={({ hovered }: { hovered?: boolean }) => [
        styles.iconBtn,
        { borderColor: c.border, backgroundColor: hovered ? c.surfaceSunken : c.surfaceMuted },
      ]}>
      <Icon name="help-circle-outline" size={20} color={c.text} />
    </Pressable>
  );
}

/** Sekme çubuğu: geniş ekranda üst menü, dar ekranda alt çubuk. */
export function WebTabBar({ state, navigateToTab, wide }: BottomTabBarProps & { wide: boolean }) {
  const c = useColors();
  const items = state.routes.map((route, i) => {
    const tab = TABS[route.name];
    if (!tab) return null;
    const focused = state.index === i;
    const onPress = () => {
      if (!focused) navigateToTab(route.key);
    };
    return wide ? (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        onPress={onPress}
        style={({ hovered }: { hovered?: boolean }) => [
          styles.topItem,
          focused
            ? [{ backgroundColor: c.background, borderColor: c.border }, shadow(c.shadow, 1)]
            : { backgroundColor: hovered ? c.surfaceSunken : 'transparent', borderColor: 'transparent' },
        ]}>
        <Doodle name={tab.doodle} size={22} dim={!focused} />
        <Text style={[styles.topLabel, { color: focused ? c.text : c.textMuted, fontFamily: focused ? fonts.extrabold : fonts.semibold }]}>{tab.label}</Text>
        {focused && <View style={[styles.activeDot, { backgroundColor: c.accent }]} />}
      </Pressable>
    ) : (
      <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} onPress={onPress} style={styles.bottomItem}>
        <View style={[styles.bottomIcon, focused && { backgroundColor: c.surfaceSunken }]}>
          <Doodle name={tab.doodle} size={26} dim={!focused} />
        </View>
        <Text style={[styles.bottomLabel, { color: focused ? c.text : c.textMuted, fontFamily: focused ? fonts.extrabold : fonts.semibold }]}>{tab.label}</Text>
      </Pressable>
    );
  });

  if (!wide) {
    return <View style={[styles.bottom, { backgroundColor: c.background, borderTopColor: c.border }]}>{items}</View>;
  }
  return (
    <View style={[styles.top, { backgroundColor: c.background, borderBottomColor: c.border }]}>
      <ModeStripe />
      <View style={styles.topInner}>
        <View style={styles.side}>
          <BrandLockup />
        </View>
        <View style={[styles.topNav, { backgroundColor: c.surfaceMuted, borderColor: c.border }]} accessibilityRole="tablist">
          {items}
        </View>
        <View style={[styles.side, styles.sideEnd]}>
          <HelpButton />
          <StreakPill />
        </View>
      </View>
    </View>
  );
}

/** Dar web ekranında sekmeli sayfaların üstündeki ince marka şeridi. */
export function WebCompactHeader() {
  const c = useColors();
  return (
    <View style={[styles.top, { backgroundColor: c.background, borderBottomColor: c.border }]}>
      <ModeStripe />
      <View style={[styles.topInner, styles.compactInner]}>
        <BrandLockup compact />
        <View style={styles.sideEnd}>
          <HelpButton />
          <StreakPill />
        </View>
      </View>
    </View>
  );
}

/** Yığın ekranlarının (oyun, arşiv, kurallar) web başlığı: geri, sayfa adı, sağda logo. */
export function WebStackHeader({ title, canGoBack, onBack }: { title: string; canGoBack: boolean; onBack: () => void }) {
  const c = useColors();
  return (
    <View style={[styles.top, { backgroundColor: c.background, borderBottomColor: c.border }]}>
      <ModeStripe />
      <View style={[styles.topInner, styles.compactInner]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={canGoBack ? 'Geri' : 'Ana sayfa'}
          onPress={canGoBack ? onBack : () => router.navigate('/')}
          style={({ hovered }: { hovered?: boolean }) => [styles.back, { borderColor: c.text, backgroundColor: hovered ? c.surfaceMuted : 'transparent' }]}>
          <Icon name="arrow-back" size={18} color={c.text} />
          <Text style={[styles.topLabel, { color: c.text, fontFamily: fonts.bold }]}>{canGoBack ? 'Geri' : 'Bugün'}</Text>
        </Pressable>
        <Text style={[styles.stackTitle, { color: c.text }]} numberOfLines={1}>
          {title}
        </Text>
        <BrandLockup compact />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { borderBottomWidth: 1, width: '100%' },
  topInner: {
    width: '100%',
    // Sayfa içeriğiyle aynı genişlik (tokens.layout.wide), aynı kenar boşluğu.
    maxWidth: layout.wide,
    alignSelf: 'center',
    paddingHorizontal: space.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xl,
    minHeight: 68,
  },
  compactInner: { minHeight: 60, paddingHorizontal: space.lg, gap: space.md, justifyContent: 'space-between' },
  stripe: { flexDirection: 'row', height: 4, width: '100%' },
  stripeSeg: { flex: 1 },
  // Marka ve sağ grup eşit genişlikte; böylece sekmeler tam ortada kalır.
  side: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  sideEnd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space.sm },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  mascotBadge: { width: 48, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  mascotBadgeCompact: { width: 38, height: 38 },
  wordmark: { fontFamily: fonts.serif, fontSize: 25, lineHeight: 28 },
  tagline: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 13, letterSpacing: 1.6, marginTop: 1 },
  topNav: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4, borderWidth: 1, borderRadius: radius.pill },
  topItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  topLabel: { fontSize: 15 },
  activeDot: { width: 6, height: 6, borderRadius: radius.pill, marginLeft: -2 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: space.md, height: 40 },
  streakText: { fontFamily: fonts.black, fontSize: 17 },
  streakUnit: { fontFamily: fonts.bold, fontSize: 13 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  lift: { transform: [{ translateY: -1 }] },
  bottom: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 6, paddingBottom: 8 },
  bottomItem: { flex: 1, alignItems: 'center', gap: 2 },
  bottomIcon: { width: 56, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  bottomLabel: { fontSize: 11 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6 },
  stackTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.serif, fontSize: 20 },
});
