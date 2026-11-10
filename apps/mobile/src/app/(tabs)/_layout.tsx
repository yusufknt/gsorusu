import { Tabs } from 'expo-router/js-tabs';
import { NativeTabs } from 'expo-router/native-tabs';
import { Platform, useWindowDimensions } from 'react-native';

import { useInterstitialTriggers } from '@/ads/useInterstitialTriggers';
import { WebCompactHeader, WebTabBar } from '@/components/layout/WebChrome';
import { useReminderSync } from '@/lib/reminders';
import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/** Web'de bu genişlikten itibaren sekmeler üst menüde; altında alt çubukta (telefon tarayıcısı). */
const WEB_TOP_NAV_MIN = 760;

export default function TabLayout() {
  useReminderSync();
  useInterstitialTriggers();
  return Platform.OS === 'web' ? <WebTabs /> : <PhoneTabs />;
}

/**
 * Web: gazete sitesi gibi üst menü; dar ekranda sekmeler alta iner, üstte ince marka şeridi kalır.
 * Sayfa başlıklarını sekmeler kendisi çizer (PageHero).
 */
function WebTabs() {
  const c = useColors();
  const wide = useWindowDimensions().width >= WEB_TOP_NAV_MIN;
  return (
    <Tabs
      tabBar={(props) => <WebTabBar {...props} wide={wide} />}
      screenOptions={{
        headerShown: !wide,
        header: () => <WebCompactHeader />,
        tabBarPosition: wide ? 'top' : 'bottom',
        sceneStyle: { backgroundColor: c.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Bugün' }} />
      <Tabs.Screen name="stats" options={{ title: 'Seri' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}

function PhoneTabs() {
  const c = useColors();
  return (
    <NativeTabs
      backgroundColor={c.surface}
      indicatorColor={c.surfaceSunken}
      labelStyle={{ default: { fontFamily: fonts.bold, color: c.textMuted }, selected: { fontFamily: fonts.extrabold, color: c.text } }}
      iconColor={{ default: c.textMuted, selected: c.text }}
      labelVisibilityMode="labeled">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Bugün</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="questionmark.circle.fill" md="help" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Label>Seri</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="flame.fill" md="local_fire_department" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
