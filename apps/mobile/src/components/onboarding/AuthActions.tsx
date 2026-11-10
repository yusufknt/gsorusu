import { StyleSheet, View } from 'react-native';

import { useGoogleAccount } from '@/components/account/useGoogleAccount';
import { GoogleButton } from '@/components/GoogleButton';
import { Button } from '@/components/ui';
import { space } from '@/theme/tokens';

/** Tanıtımın son adımı: Google ile giriş ya da misafir olarak devam. İkisi de bitince `onDone` çağrılır. */
export function AuthActions({ onDone }: { onDone: () => void }) {
  const account = useGoogleAccount();

  return (
    <View style={styles.stack}>
      <GoogleButton onPress={() => void account.signIn().then((ok) => ok && onDone())} loading={account.busy} />
      <Button title="Misafir olarak devam et" kind="ghost" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: space.xs } });
