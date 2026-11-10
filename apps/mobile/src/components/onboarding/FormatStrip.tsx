import { StyleSheet, View } from 'react-native';

import { DAILY_MODES } from '@/api/types';
import { Card, Icon, T } from '@/components/ui';
import { MODE_LABEL } from '@/lib/modes';
import { modeStyle, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/** Günün dört modu tek kartta, nötr çizgi ikonlarla (mod renkleri oyunun içinde kalır). */
export function FormatStrip() {
  const c = useColors();
  return (
    <Card padded={false} style={styles.card}>
      {DAILY_MODES.map((mode, i) => (
        <View key={mode} style={[styles.cell, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: c.border }]}>
          <Icon name={modeStyle[mode].icon} size={20} color={c.textMuted} />
          <T variant="caption" color="textMuted" numberOfLines={1}>
            {MODE_LABEL[mode]}
          </T>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', paddingVertical: space.md },
  cell: { flex: 1, alignItems: 'center', gap: space.xs },
});
