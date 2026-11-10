import { View } from 'react-native';

import type { Me } from '@/api/types';
import { GoogleButton } from '@/components/GoogleButton';
import { Button, Card, Icon, Row, T } from '@/components/ui';
import { space } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

import { useGoogleAccount } from './useGoogleAccount';

/** Profil: Google hesabı bağlıysa hesabı ve çıkışı, değilse Google ile giriş önerisini gösterir. */
export function AccountCard({ me }: { me: Me }) {
  const c = useColors();
  const account = useGoogleAccount();
  const linked = me.authProvider === 'google';

  return (
    <Card>
      <Row style={{ alignItems: 'flex-start', gap: space.md }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceMuted }}>
          <Icon name={linked ? 'checkmark-circle' : 'person-outline'} size={18} color={c.textMuted} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="bodyStrong">{linked ? 'Google hesabı' : 'Misafir olarak oynuyorsun'}</T>
          <T variant="caption" color="textMuted">
            {linked
              ? (me.email ?? 'Google hesabınla giriş yaptın.')
              : 'Google ile giriş yaparsan serin ve puanların başka cihazda da seninle olur.'}
          </T>
        </View>
      </Row>
      {linked ? (
        <Button title="Çıkış yap" icon="exit-outline" kind="secondary" loading={account.busy} onPress={() => void account.signOut()} />
      ) : (
        <GoogleButton onPress={() => void account.signIn()} loading={account.busy} />
      )}
    </Card>
  );
}
