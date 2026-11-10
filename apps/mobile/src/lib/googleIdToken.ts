/**
 * Google id_token (RS256 JWT) doğrulaması: imza (Google'ın açık anahtarlarıyla), yayıncı, hedef kitle ve süre.
 * Saf modüldür: SHA-256 dışarıdan verilir (uygulamada expo-crypto, testte node:crypto), RSA doğrulaması BigInt ile
 * yapılır; böylece web ve telefonda (Hermes) aynı kod çalışır. Gerçek sunucu aynı denetimleri Google.Apis.Auth ile yapar.
 */

export const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
/** Saat farkı payı (sn). */
const SKEW_S = 300;

export interface Jwk {
  kid: string;
  kty: string;
  alg?: string;
  n: string;
  e: string;
}

export interface GoogleClaims {
  sub: string;
  email: string | null;
  name: string | null;
}

/** Doğrulanamayan jeton. `reason` yalnızca günlük / test içindir. */
export class InvalidIdTokenError extends Error {
  constructor(public readonly reason: string) {
    super(`Geçersiz Google jetonu: ${reason}`);
    this.name = 'InvalidIdTokenError';
  }
}

export interface VerifyOptions {
  /** Kabul edilen istemci kimlikleri ("aud"). */
  audiences: string[];
  /** Google'ın o anki açık anahtarları (JWKS "keys"). */
  keys: Jwk[];
  /** UTF-8 metnin SHA-256 özeti, küçük harf onaltılık. */
  sha256Hex: (data: string) => Promise<string>;
  /** Şu an, saniye. */
  nowS: number;
}

export async function verifyGoogleIdToken(idToken: string, o: VerifyOptions): Promise<GoogleClaims> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new InvalidIdTokenError('biçim');
  const [h, p, s] = parts;

  const header = parseJson(h);
  if (header.alg !== 'RS256') throw new InvalidIdTokenError('algoritma');
  const key = o.keys.find((k) => k.kid === header.kid && k.kty === 'RSA');
  if (!key) throw new InvalidIdTokenError('anahtar');

  if (!(await rsaSha256Verify(`${h}.${p}`, base64UrlToBytes(s), key, o.sha256Hex))) throw new InvalidIdTokenError('imza');

  const c = parseJson(p);
  if (typeof c.iss !== 'string' || !ISSUERS.includes(c.iss)) throw new InvalidIdTokenError('yayıncı');
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (!aud.some((a) => typeof a === 'string' && o.audiences.includes(a))) throw new InvalidIdTokenError('hedef kitle');
  if (typeof c.exp !== 'number' || c.exp + SKEW_S < o.nowS) throw new InvalidIdTokenError('süresi dolmuş');
  if (typeof c.iat === 'number' && c.iat - SKEW_S > o.nowS) throw new InvalidIdTokenError('gelecek tarihli');
  if (typeof c.sub !== 'string' || !c.sub) throw new InvalidIdTokenError('kimlik');

  return {
    sub: c.sub,
    email: typeof c.email === 'string' && c.email_verified !== false ? c.email : null,
    name: typeof c.name === 'string' ? c.name : null,
  };
}

// --- RSASSA-PKCS1-v1_5 / SHA-256 ---

/** DigestInfo(SHA-256) ön eki (RFC 8017, 9.2). */
const SHA256_PREFIX = '3031300d060960864801650304020105000420';

async function rsaSha256Verify(message: string, signature: Uint8Array, key: Jwk, sha256Hex: VerifyOptions['sha256Hex']): Promise<boolean> {
  const nBytes = base64UrlToBytes(key.n);
  const k = nBytes.length;
  if (signature.length !== k || k < 128) return false;
  const n = bytesToBigInt(nBytes);
  const e = bytesToBigInt(base64UrlToBytes(key.e));
  const sig = bytesToBigInt(signature);
  if (sig >= n) return false;

  const em = modPow(sig, e, n).toString(16).padStart(k * 2, '0');
  const t = SHA256_PREFIX + (await sha256Hex(message)).toLowerCase();
  const padLen = k - 3 - t.length / 2;
  if (padLen < 8) return false;
  return em === `0001${'ff'.repeat(padLen)}00${t}`;
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = BigInt(1);
  let b = base % mod;
  let x = exp;
  const zero = BigInt(0);
  const one = BigInt(1);
  while (x > zero) {
    if ((x & one) === one) result = (result * b) % mod;
    b = (b * b) % mod;
    x >>= one;
  }
  return result;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex ? BigInt(`0x${hex}`) : BigInt(0);
}

// --- base64url / JSON ---

export function base64UrlToBytes(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new InvalidIdTokenError('biçim');
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  return Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
}

function parseJson(part: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(base64UrlToBytes(part)));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch (e) {
    if (e instanceof InvalidIdTokenError) throw e;
  }
  throw new InvalidIdTokenError('biçim');
}
