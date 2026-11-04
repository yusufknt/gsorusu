import { Stack } from 'expo-router';

import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

// Bağlantıyla doğrudan bir lige ya da katılma ekranına gelinince altta lig listesi olsun.
export const unstable_settings = { anchor: 'index' };

export default function LeaguesLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Ligler' }} />
      <Stack.Screen name="create" options={{ title: 'Lig kur' }} />
      <Stack.Screen name="join" options={{ title: 'Lige katıl' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
    </Stack>
  );
}
