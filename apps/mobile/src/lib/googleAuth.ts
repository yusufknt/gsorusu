/**
 * Google ile giriş. Şimdilik yalnızca yeri hazır: düğme ve akış var, bağlantı yok.
 *
 * Bağlamak için gerekenler:
 * 1. Google Cloud'da OAuth istemci kimlikleri (iOS, Android, web).
 * 2. Development build: Expo Go'da yerel Google girişi yok (`@react-native-google-signin/google-signin`
 *    ya da `expo-auth-session` + yerel istemci kimlikleri).
 * 3. Sunucuda `/auth/google`: id_token'ı doğrular, mevcut cihaz hesabını (JWT) Google hesabına bağlar;
 *    böylece seri, puanlar ve ligler telefon değişince kaybolmaz.
 */
export class GoogleAuthUnavailableError extends Error {
  constructor() {
    super('Google ile giriş henüz bağlı değil.');
    this.name = 'GoogleAuthUnavailableError';
  }
}

export async function signInWithGoogle(): Promise<void> {
  throw new GoogleAuthUnavailableError();
}
