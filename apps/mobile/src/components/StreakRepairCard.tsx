import { useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAds } from '@/ads/AdsProvider';
import { useStreakRepair } from '@/api/hooks';
import { space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

import { Button, Card, Icon, InlineError, Row, T, useToast } from './ui';

/**
 * Bir gün kaçırıldıktan sonra: ödüllü reklamla seri kurtarma (haftada 1, plan A11).
 * Bugün ekranında (ilk açılışta) ve İstatistik'te görünür; kural sunucuda.
 */
export function StreakRepairCard() {
  const c = useColors();
  const ads = useAds();
  const repair = useStreakRepair();
  const toast = useToast();
  const [watching, setWatching] = useState(false);

  const onPress = async () => {
    setWatching(true);
    try {
      if (!(await ads.showRewarded('streak_repair'))) return;
    } finally {
      setWatching(false);
    }
    repair.mutate(undefined, { onSuccess: () => toast('Serin kurtarıldı') });
  };

  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Card style={{ gap: space.sm }}>
        <Row>
          <Icon name="bandage" size={20} color={c.flame} />
          <T variant="bodyStrong">Dün oynamayı kaçırdın</T>
        </Row>
        <T color="textMuted">Kısa bir video izle, serin kurtulsun. Haftada bir kez kullanılabilir.</T>
        <Button title="Video izle · seriyi kurtar" icon="play-circle" onPress={() => void onPress()} loading={watching || repair.isPending} />
        <InlineError error={repair.error} />
      </Card>
    </Animated.View>
  );
}
