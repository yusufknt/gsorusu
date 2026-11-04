import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { serverNow } from '@/api/client';
import { useMe, useStats } from '@/api/hooks';
import { useSettings } from '@/settings/settings';

/**
 * Yerel hatırlatmalar (sunucu gerekmez, Expo Go'da çalışır — plan A4):
 *  - Her gün seçilen saatte: "Günün sorusu hazır".
 *  - Seri tehlikedeyse o gün 21:00'de ek hatırlatma (bugün henüz oynanmadıysa).
 */
const CHANNEL = 'daily';
const STREAK_HOUR = 21;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** İzin ister; verilmezse ya da bildirim sistemi hata verirse false döner (düğmeler hiç sessizce çökmesin). */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Günlük hatırlatma',
        importance: AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

async function sync(enabled: boolean, hour: number, streak: number, playedToday: boolean) {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled || !(await Notifications.getPermissionsAsync()).granted) return;

  await Notifications.scheduleNotificationAsync({
    content: { title: 'Günün Sorusu ?', body: 'Bugünün sorusu seni bekliyor. Bakalım bilebilecek misin?' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0, channelId: CHANNEL },
  });

  // İstanbul saatiyle bugün 21:00 (UTC+3).
  const now = serverNow();
  const istanbulMidnight = Math.floor((now + 3 * 3_600_000) / 86_400_000) * 86_400_000 - 3 * 3_600_000;
  const streakAt = istanbulMidnight + STREAK_HOUR * 3_600_000;
  if (streak > 0 && !playedToday && streakAt > now) {
    await Notifications.scheduleNotificationAsync({
      content: { title: `${streak} günlük serin tehlikede 🔥`, body: 'Gece yarısından önce bugünün sorusunu çöz, seri devam etsin.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(streakAt), channelId: CHANNEL },
    });
  }
}

/** Ayar, saat ya da seri değişince bildirimleri yeniden planlar. */
export function useReminderSync() {
  const { reminders } = useSettings().settings;
  const me = useMe();
  const stats = useStats();
  const hour = me.data?.notifyHour ?? 9;
  const streak = stats.data?.currentStreak ?? 0;
  const playedToday = stats.data?.playedToday ?? false;

  useEffect(() => {
    sync(reminders, hour, streak, playedToday).catch(() => {});
  }, [reminders, hour, streak, playedToday]);
}
