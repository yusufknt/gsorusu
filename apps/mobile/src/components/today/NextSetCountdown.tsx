import { useQueryClient } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { useNow } from '@/components/game/useNow';
import { Button, T, useToast } from '@/components/ui';
import { formatCountdown, nextResetMs } from '@/lib/format';
import { ensureNotificationPermission } from '@/lib/reminders';
import { useSettings } from '@/settings/settings';
import { font, fonts, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/** Yeni sete kalan süre; süre dolunca günü yeniler. */
export function NextSetCountdown({ day }: { day: string }) {
  const c = useColors();
  const qc = useQueryClient();
  const toast = useToast();
  const { settings, update } = useSettings();
  const now = useNow(1000);
  const remaining = nextResetMs(day) - now;

  if (remaining <= 0) {
    return (
      <Button
        title="Yeni sorular geldi!"
        icon="sparkles"
        size="lg"
        onPress={() => {
          void qc.invalidateQueries({ queryKey: ['day'] });
          void qc.invalidateQueries({ queryKey: ['stats'] });
        }}
      />
    );
  }

  return (
    <View style={[styles.countdown, { borderColor: c.border }]}>
      <T variant="label" color="textMuted">
        Yeni sorular
      </T>
      <Text
        style={[font.headline, { fontFamily: fonts.black, color: c.text, fontVariant: ['tabular-nums'] }]}
        accessibilityLabel={`Yeni sorulara ${formatCountdown(remaining)} kaldı`}>
        {formatCountdown(remaining)}
      </Text>
      {!settings.reminders && (
        <Button
          title="Bana hatırlat"
          icon="alarm-outline"
          kind="ghost"
          onPress={async () => {
            if (await ensureNotificationPermission()) {
              update({ reminders: true });
              toast('Her gün hatırlatacağız');
            } else {
              toast('Bildirim izni verilmedi');
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  countdown: { alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.lg, paddingVertical: space.lg, gap: 2 },
});
