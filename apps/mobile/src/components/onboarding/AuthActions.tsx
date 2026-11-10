import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GoogleButton } from '@/components/GoogleButton';
import { Button, useToast } from '@/components/ui';
import { GoogleAuthUnavailableError, signInWithGoogle } from '@/lib/googleAuth';
import { useHaptics } from '@/lib/haptics';
import { space } from '@/theme/tokens';

/** Tanıtımın son adımı: Google ile giriş ya da misafir olarak devam. İkisi de bitince `onDone` çağrılır. */
export function AuthActions({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const buzz = useHaptics();
  const [busy, setBusy] = useState(false);

  const google = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
      onDone();
    } catch (e) {
      buzz('warning');
      toast(e instanceof GoogleAuthUnavailableError ? 'Google ile giriş çok yakında' : 'Google ile giriş yapılamadı');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.stack}>
      <GoogleButton onPress={google} loading={busy} />
      <Button title="Misafir olarak devam et" kind="ghost" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: space.xs } });
