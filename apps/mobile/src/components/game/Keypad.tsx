import { StyleSheet, Text, View } from 'react-native';

import { Icon, PressableScale } from '@/components/ui';
import { applyKey } from '@/lib/keypad';
import { font, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'] as const;

/**
 * Oyuna özel sayı tuş takımı. Sistem klavyesi ekranın yarısını kaplayıp tahmin geçmişini
 * örttüğü için kullanılır; ayrıca Türkçe virgül her cihazda aynı yerde olur.
 */
export function Keypad({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const c = useColors();
  return (
    <View style={styles.grid} accessibilityLabel="Sayı tuşları">
      {KEYS.map((k) => (
        <PressableScale
          key={k}
          haptic="select"
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={k === '⌫' ? 'Sil' : k === ',' ? 'Virgül' : k}
          onPress={() => onChange(applyKey(value, k))}
          onLongPress={k === '⌫' ? () => onChange('') : undefined}
          containerStyle={styles.cell}
          style={[styles.key, { backgroundColor: k === '⌫' || k === ',' ? c.surfaceMuted : c.surface, borderColor: c.border }]}>
          {k === '⌫' ? <Icon name="backspace-outline" size={24} color={c.text} /> : <Text style={[font.title, { color: c.text }]}>{k}</Text>}
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'space-between' },
  cell: { width: '31.8%' },
  key: {
    width: '100%',
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
