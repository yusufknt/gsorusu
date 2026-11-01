import { Stack } from 'expo-router';

import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

export default function ArchiveLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: c.background },
        headerTitleStyle: { fontFamily: fonts.black, color: c.text },
        headerTintColor: c.text,
        contentStyle: { backgroundColor: c.background },
      }}>
      <Stack.Screen name="index" options={{ title: 'Arşiv' }} />
      <Stack.Screen name="[day]" options={{ title: '' }} />
    </Stack>
  );
}
