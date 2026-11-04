import { NativeTabs } from 'expo-router/native-tabs';

import { useReminderSync } from '@/lib/reminders';
import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

export default function TabLayout() {
  const c = useColors();
  useReminderSync();

  return (
    <NativeTabs
      backgroundColor={c.surface}
      indicatorColor={c.accentSoft}
      labelStyle={{ default: { fontFamily: fonts.bold, color: c.textMuted }, selected: { fontFamily: fonts.extrabold, color: c.accent } }}
      iconColor={{ default: c.textMuted, selected: c.accent }}
      labelVisibilityMode="labeled">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Bugün</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="questionmark.circle.fill" md="help" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Label>İstatistik</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="bar_chart" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="leagues">
        <NativeTabs.Trigger.Label>Lig</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="trophy.fill" md="emoji_events" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="archive">
        <NativeTabs.Trigger.Label>Arşiv</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
