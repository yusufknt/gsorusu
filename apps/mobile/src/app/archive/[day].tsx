import { Stack, useLocalSearchParams } from 'expo-router';

import { DayHub } from '@/components/today/DayHub';
import { formatDay } from '@/lib/format';

/** Arşivdeki bir günün dört modu. */
export default function ArchiveDayScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  return (
    <>
      <Stack.Screen options={{ title: day ? formatDay(day) : '' }} />
      <DayHub day={day} topInset={false} />
    </>
  );
}
