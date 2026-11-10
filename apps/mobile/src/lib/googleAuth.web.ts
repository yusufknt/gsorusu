/**
 * Google ile giriş: web. Google açılır pencerede hesap seçtirir ve doğrudan id_token döner
 * (istemci sırrı gerekmez). id_token sunucuya gönderilir; sunucu Google'ın anahtarlarıyla doğrular.
 *
 * İstemci kimliği: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (apps/mobile/.env). Google Cloud'da bu kimliğe
 * "Authorized JavaScript origins" ve "Authorized redirect URIs" olarak sitenin kökü (ör. http://localhost:8081) eklenmelidir.
 */
import { useCallback } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import {
  GoogleAuthCancelledError,
  GoogleAuthUnavailableError,
  linkGoogleAccount,
  type GoogleSignIn,
} from './googleAuthCommon';

export { GoogleAuthCancelledError, GoogleAuthUnavailableError, signOutGoogle } from './googleAuthCommon';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || null;

/**
 * Google, girişten sonra açılır pencereyi sitenin köküne geri yönlendirir. Pencerede uygulama açılırken
 * bu çağrı sonucu ana pencereye iletir ve pencere kapanır. Uygulama yüklenir yüklenmez çağrılmalı.
 */
export function completeGoogleRedirect(): void {
  WebBrowser.maybeCompleteAuthSession();
}

function redirectUri(): string {
  return typeof window === 'undefined' ? '' : window.location.origin;
}

export function useGoogleSignIn(): GoogleSignIn {
  // Kanca her zaman çağrılır; kimlik yoksa yer tutucuyla, giriş ise kapalı kalır.
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: WEB_CLIENT_ID ?? 'tanimsiz',
    redirectUri: redirectUri(),
    selectAccount: true,
    language: 'tr',
  });

  const signIn = useCallback(async () => {
    if (!WEB_CLIENT_ID) throw new GoogleAuthUnavailableError();
    if (!request) throw new Error('Google girişi hazırlanıyor, birazdan tekrar dene.');
    const result = await promptAsync();
    if (result.type === 'cancel' || result.type === 'dismiss' || result.type === 'locked') throw new GoogleAuthCancelledError();
    const idToken = result.type === 'success' ? (result.params.id_token ?? result.authentication?.idToken) : undefined;
    if (!idToken) throw new Error('Google girişi tamamlanamadı.');
    return linkGoogleAccount(idToken);
  }, [request, promptAsync]);

  return { available: !!WEB_CLIENT_ID && !!request, signIn };
}
