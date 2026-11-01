import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import { useSettings } from '@/settings/settings';

type Kind = 'tap' | 'select' | 'success' | 'warning' | 'error';

/** Ayarlardan kapatılabilen titreşim geri bildirimi. Hata olursa sessizce yok sayılır. */
export function useHaptics() {
  const enabled = useSettings().settings.haptics;
  return useCallback(
    (kind: Kind) => {
      if (!enabled || Platform.OS === 'web') return;
      const run = () => {
        switch (kind) {
          case 'tap':
            return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          case 'select':
            return Haptics.selectionAsync();
          case 'success':
            return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          case 'warning':
            return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          case 'error':
            return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      };
      run().catch(() => {});
    },
    [enabled],
  );
}
