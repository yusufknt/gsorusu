import { RefreshControl } from 'react-native';

import { useStats } from '@/api/hooks';
import { PageHero } from '@/components/layout/PageHero';
import { Collection } from '@/components/streak/Collection';
import { ErrorView, LoadingScreen, Screen } from '@/components/ui';
import { PUZZLE_SIZE } from '@/mock/rules';
import { useColors } from '@/theme/useTheme';

/** Koleksiyonum: tamamlanan seri yapbozları bütün hâlde (Bugün'deki bağlantıdan ve Seri'den açılır). */
export default function CollectionScreen() {
  const c = useColors();
  const stats = useStats();

  if (stats.isError) return <ErrorView error={stats.error} onRetry={() => void stats.refetch()} />;
  if (stats.isPending) return <LoadingScreen />;

  const s = stats.data;
  const p = s.puzzle ?? { size: PUZZLE_SIZE, pieces: 0, earnedToday: false, completed: 0 };
  const items = s.collection ?? [];
  return (
    <Screen
      topInset={false}
      width="wide"
      refreshControl={<RefreshControl refreshing={stats.isRefetching} onRefresh={() => void stats.refetch()} tintColor={c.accent} />}>
      <PageHero
        eyebrow="Seri"
        title="Koleksiyonum"
        subtitle={`Her resim ${p.size} günlük kesintisiz serinin ödülü.`}
        mood={items.length ? 'cheer' : 'sleep'}
        say={items.length ? `${items.length} resim senin! Sıradakine ${p.size - p.pieces} gün var.` : `İlk resim için ${p.size - p.pieces} gün daha.`}
      />
      <Collection items={items} puzzle={p} />
    </Screen>
  );
}
