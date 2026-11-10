/**
 * Google ile giriş: telefon. Web sürümü `googleAuth.web.ts` içinde.
 *
 * Yerel Google girişi (`@react-native-google-signin/google-signin`) yalnızca uygulamanın kendi derlemesinde
 * (development build / mağaza sürümü: `npm run android:build`) çalışır; Expo Go'da yerel modül olmadığı için
 * buton "çok yakında" der ve uygulama Expo Go'da bozulmadan açılmaya devam eder.
 *
 * Google Cloud (proje gunun-sorusu-514317): Android istemcisi paket adı + imza SHA-1'i ile, iOS istemcisi bundle id
 * ile kayıtlı. Jeton web istemci kimliğiyle (webClientId) istenir; sunucu bu kimliği hedef kitle olarak doğrular.
 * Mağaza sürümünde Play imzalama anahtarının SHA-1'i de Android istemcisine eklenmelidir.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import {
  GoogleAuthCancelledError,
  GoogleAuthUnavailableError,
  linkGoogleAccount,
  signOutGoogle as signOutCommon,
  type GoogleSignIn,
} from './googleAuthCommon';

export { GoogleAuthCancelledError, GoogleAuthUnavailableError } from './googleAuthCommon';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || null;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined;
const IN_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

let lib: GoogleSigninModule | null | undefined;

/** Yerel modülü yalnızca gerektiğinde ve varsa yükler (Expo Go'da yüklenmez). */
function googleSignin(): GoogleSigninModule | null {
  if (lib !== undefined) return lib;
  if (IN_EXPO_GO || !WEB_CLIENT_ID) return (lib = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
    m.GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, iosClientId: IOS_CLIENT_ID });
    lib = m;
  } catch {
    lib = null;
  }
  return lib;
}

/** Yalnızca web'de iş yapar. */
export function completeGoogleRedirect(): void {}

async function signIn() {
  const g = googleSignin();
  if (!g) throw new GoogleAuthUnavailableError();
  let idToken: string | null;
  try {
    if (Platform.OS === 'android') await g.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await g.GoogleSignin.signIn();
    if (!g.isSuccessResponse(res)) throw new GoogleAuthCancelledError();
    idToken = res.data.idToken;
  } catch (e) {
    if (g.isErrorWithCode(e) && (e.code === g.statusCodes.SIGN_IN_CANCELLED || e.code === g.statusCodes.IN_PROGRESS)) {
      throw new GoogleAuthCancelledError();
    }
    throw e;
  }
  if (!idToken) throw new Error('Google kimlik jetonu vermedi.');
  return linkGoogleAccount(idToken);
}

/** Çıkışta cihazdaki Google oturumu da kapatılır; bir sonraki girişte hesap seçimi yeniden sorulur. */
export async function signOutGoogle(): Promise<void> {
  const g = googleSignin();
  if (g) await g.GoogleSignin.signOut().catch(() => undefined);
  await signOutCommon();
}

export function useGoogleSignIn(): GoogleSignIn {
  return { available: googleSignin() !== null, signIn };
}
