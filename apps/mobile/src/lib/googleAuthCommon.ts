import { adoptSession, api, IS_MOCK, resetSession } from '@/api/client';
import type { GoogleAuthResult } from '@/api/types';
import { mockGoogleSignOut } from '@/mock/server';

/** Google ile giriş bu platformda henüz yok (telefonda development build gerekir) ya da istemci kimliği tanımlı değil. */
export class GoogleAuthUnavailableError extends Error {
  constructor() {
    super('Google ile giriş henüz bağlı değil.');
    this.name = 'GoogleAuthUnavailableError';
  }
}

/** Kullanıcı Google penceresini kapattı; hata gösterilmez. */
export class GoogleAuthCancelledError extends Error {
  constructor() {
    super('Google ile giriş iptal edildi.');
    this.name = 'GoogleAuthCancelledError';
  }
}

export interface GoogleSignIn {
  /** Bu platformda Google ile giriş yapılabilir mi? */
  available: boolean;
  /** Google penceresini açar, id_token'ı sunucuya gönderir ve oturumu Google hesabına bağlar. */
  signIn: () => Promise<GoogleAuthResult>;
}

/** Google'dan alınan id_token'ı sunucuya gönderir; sunucu doğrular ve oyuncuyu hesaba bağlar. */
export async function linkGoogleAccount(idToken: string): Promise<GoogleAuthResult> {
  const result = await api<GoogleAuthResult>('POST', '/auth/google', { idToken });
  if (!IS_MOCK) await adoptSession(result.token);
  return result;
}

/** Çıkış yapar. Ardından tüm sorgular tazelenmeli (yeni misafir oyuncu). */
export async function signOutGoogle(): Promise<void> {
  if (IS_MOCK) await mockGoogleSignOut();
  else await resetSession();
}
