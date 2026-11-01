import { useColorScheme } from 'react-native';

import { useSettings } from '@/settings/settings';

import { darkColors, lightColors, type ThemeColors } from './tokens';

/** Kullanıcının tema tercihi (Sistem / Açık / Koyu) dikkate alınır. */
export function useIsDark(): boolean {
  const system = useColorScheme();
  const { theme } = useSettings().settings;
  return theme === 'system' ? system === 'dark' : theme === 'dark';
}

export function useColors(): ThemeColors {
  return useIsDark() ? darkColors : lightColors;
}
