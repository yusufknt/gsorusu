import {
  DMSans_400Regular,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
  DMSans_900Black,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AdsProvider } from '@/ads/AdsProvider';
import { ApiError } from '@/api/client';
import { WebStackHeader } from '@/components/layout/WebChrome';
import { ToastProvider } from '@/components/ui';
import { completeGoogleRedirect } from '@/lib/googleAuth';
import { SettingsProvider, useSettings } from '@/settings/settings';
import { fonts } from '@/theme/tokens';
import { useColors, useIsDark } from '@/theme/useTheme';

// Web: Google giriş penceresi buraya döndüyse sonucu ana pencereye iletip kapanır.
completeGoogleRedirect();

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
  const { ready, settings } = useSettings();
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    DMSans_900Black,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
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
              headerStyle: { backgroundColor: c.background },
              headerTitleStyle: { fontFamily: fonts.black, color: c.text },
              headerTintColor: c.text,
              headerBackButtonDisplayMode: 'minimal',
              contentStyle: { backgroundColor: c.background },
              // Web'de yığın ekranları da site kabuğuyla aynı başlığı kullanır (geri · sayfa adı · logo).
              ...(Platform.OS === 'web' && {
                header: ({ options, navigation, back }) => (
                  <WebStackHeader title={typeof options.title === 'string' ? options.title : ''} canGoBack={!!back} onBack={() => navigation.goBack()} />
                ),
              }),
            }}>
            {/* Tanıtım görülene kadar yalnız o açılır; bitince yığın kendiliğinden bugünün setine döner. */}
            <Stack.Protected guard={settings.onboarded}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="play/[mode]" options={{ title: '' }} />
              <Stack.Screen name="archive/index" options={{ title: 'Geçmiş günler' }} />
              <Stack.Screen name="archive/[day]" options={{ title: '' }} />
              <Stack.Screen name="collection" options={{ title: 'Koleksiyonum' }} />
              <Stack.Screen name="practice" options={{ title: 'Sınırsız mod' }} />
              <Stack.Screen name="how-to-play" options={{ presentation: 'modal', title: 'Nasıl oynanır?' }} />
            </Stack.Protected>
            <Stack.Protected guard={!settings.onboarded}>
              <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
            </Stack.Protected>
          </Stack>
        </AdsProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
