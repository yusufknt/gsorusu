import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from '@expo-google-fonts/nunito';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AdsProvider } from '@/ads/AdsProvider';
import { ApiError } from '@/api/client';
import { ToastProvider } from '@/components/ui';
import { SettingsProvider, useSettings } from '@/settings/settings';
import { fonts } from '@/theme/tokens';
import { useColors, useIsDark } from '@/theme/useTheme';

void SplashScreen.preventAutoHideAsync();

// Uygulama öne gelince sorgular tazelenir (gece yarısından sonra açılınca yeni soru gelir).
focusManager.setEventListener((setFocused) => {
  const sub = AppState.addEventListener('change', (s) => setFocused(s === 'active'));
  return () => sub.remove();
});

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Kullanıcı hatalarında (4xx) tekrar deneme anlamsız; ağ ve sunucu hatalarında 2 kez dene.
        retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
      },
      mutations: { retry: false },
    },
  });
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <QueryClientProvider client={queryClient}>
          <ThemedApp />
        </QueryClientProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}

function ThemedApp() {
  const dark = useIsDark();
  const c = useColors();
  const { ready } = useSettings();
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });
  const loaded = ready && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  const base = dark ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{
        ...base,
        colors: { ...base.colors, background: c.background, card: c.background, text: c.text, primary: c.accent, border: c.border },
      }}>
      <ToastProvider>
        <AdsProvider>
          <StatusBar style={dark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              headerTitleStyle: { fontFamily: fonts.black, color: c.text },
              contentStyle: { backgroundColor: c.background },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="how-to-play" options={{ presentation: 'modal', title: 'Nasıl oynanır?' }} />
          </Stack>
        </AdsProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
