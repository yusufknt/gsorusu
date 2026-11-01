import { useLocalSearchParams } from 'expo-router';

import { GameScreen } from '@/components/game/GameScreen';

export default function ArchiveDayScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  return <GameScreen day={day} topInset={false} />;
}
