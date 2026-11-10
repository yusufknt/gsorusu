import * as Crypto from 'expo-crypto';

import { GOOGLE_CERTS_URL, InvalidIdTokenError, verifyGoogleIdToken, type GoogleClaims, type Jwk } from '../lib/googleIdToken';

/** Test sunucusunun kabul ettiği istemci kimliği: telefondaki Google girişi de web kimliğiyle jeton alır. */
const AUDIENCES = [process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID].filter((x): x is string => !!x);
const CACHE_MS = 60 * 60_000;

let cache: { keys: Jwk[]; at: number } | null = null;

async function googleKeys(force: boolean): Promise<Jwk[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.keys;
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) throw new Error(`Google anahtarları alınamadı (${res.status})`);
  const body = (await res.json()) as { keys?: Jwk[] };
  cache = { keys: body.keys ?? [], at: Date.now() };
  return cache.keys;
}

const sha256Hex = (data: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);

/**
 * Gerçek sunucunun yaptığı doğrulamanın aynısı (imza, yayıncı, hedef kitle, süre).
 * Geçersiz jetonda InvalidIdTokenError, Google'a ulaşılamazsa başka bir hata atar.
 */
export async function verifyInTestServer(idToken: string): Promise<GoogleClaims> {
  const verify = async (force: boolean) =>
    verifyGoogleIdToken(idToken, { audiences: AUDIENCES, keys: await googleKeys(force), sha256Hex, nowS: Math.floor(Date.now() / 1000) });
  try {
    return await verify(false);
  } catch (e) {
    // Google anahtarlarını düzenli değiştirir; tanınmayan anahtarda listeyi bir kez tazele.
    if (e instanceof InvalidIdTokenError && e.reason === 'anahtar') return verify(true);
    throw e;
  }
}
