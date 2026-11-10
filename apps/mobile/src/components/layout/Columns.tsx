import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useWide } from '@/components/ui';
import { layout, space } from '@/theme/tokens';

/** Sekmelerin ortak gövde düzeni: geniş ekranda solda ana içerik, sağda yan sütun (tokens.layout.side); dar ekranda alt alta. */
export function Columns({ main, side }: { main: ReactNode; side?: ReactNode }) {
  const wide = useWide();
  if (!wide || !side) {
    return (
      <>
        {main}
        {side}
      </>
    );
  }
  return (
    <View style={styles.row}>
      <View style={styles.main}>{main}</View>
      <View style={styles.side}>{side}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xl },
  main: { flex: 1, gap: space.lg, minWidth: 0 },
  side: { width: layout.side, gap: space.lg },
});
