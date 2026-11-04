import { useLocalSearchParams } from 'expo-router';

import { LeagueForm } from '@/components/league/LeagueForm';

/** Davet bağlantısı da buraya gelir: gununsorusu://leagues/join?code=K7P2QX */
export default function JoinLeagueScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  return <LeagueForm mode="join" initialCode={code} />;
}
