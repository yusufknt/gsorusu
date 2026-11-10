import { Stack, useLocalSearchParams } from 'expo-router';

import { DAILY_MODES, type DailyMode } from '@/api/types';
import { ModeGame } from '@/components/game/ModeGame';
import { ErrorView } from '@/components/ui';
import { MODE_LABEL } from '@/lib/modes';

/** Günün bir modu: /play/kac (bugün) ya da /play/kac?day=2026-11-05 (arşiv). */
export default function PlayScreen() {
  const { mode, day } = useLocalSearchParams<{ mode: string; day?: string }>();
  if (!(DAILY_MODES as readonly string[]).includes(mode)) {
    return <ErrorView error={new Error('Böyle bir oyun yok.')} />;
  }
  const m = mode as DailyMode;
  return (
    <>
      <Stack.Screen options={{ title: MODE_LABEL[m] }} />
      <ModeGame mode={m} day={day} />
    </>
  );
}
