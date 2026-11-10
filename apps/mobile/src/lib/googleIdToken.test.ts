import assert from 'node:assert/strict';
import { createHash, createSign, generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';

import { InvalidIdTokenError, verifyGoogleIdToken, type Jwk } from './googleIdToken';

const AUD = 'web-istemci.apps.googleusercontent.com';
const NOW = 1_800_000_000;

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...(publicKey.export({ format: 'jwk' }) as { n: string; e: string }), kid: 'anahtar-1', kty: 'RSA' } as Jwk;
const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;

const b64url = (s: string | Buffer) => Buffer.from(s).toString('base64url');
const sha256Hex = async (data: string) => createHash('sha256').update(data, 'utf8').digest('hex');

function sign(claims: Record<string, unknown>, opts: { kid?: string; key?: typeof privateKey; alg?: string } = {}) {
  const head = b64url(JSON.stringify({ alg: opts.alg ?? 'RS256', kid: opts.kid ?? 'anahtar-1', typ: 'JWT' }));
  const body = b64url(JSON.stringify(claims));
  const s = createSign('RSA-SHA256').update(`${head}.${body}`).sign(opts.key ?? privateKey);
  return `${head}.${body}.${b64url(s)}`;
}

const valid = {
  iss: 'https://accounts.google.com',
  aud: AUD,
  sub: '1234567890',
  email: 'ayse@example.com',
  email_verified: true,
  name: 'Ayşe Yılmaz',
  iat: NOW - 10,
  exp: NOW + 3600,
};

const verify = (token: string) => verifyGoogleIdToken(token, { audiences: [AUD], keys: [jwk], sha256Hex, nowS: NOW });

async function rejects(token: string, reason: string) {
  await assert.rejects(verify(token), (e: unknown) => e instanceof InvalidIdTokenError && e.reason === reason);
}

test('geçerli jeton: kimlik, e-posta ve Türkçe ad okunur', async () => {
  assert.deepEqual(await verify(sign(valid)), { sub: '1234567890', email: 'ayse@example.com', name: 'Ayşe Yılmaz' });
});

test('başka anahtarla imzalanmış ya da değiştirilmiş jeton reddedilir', async () => {
  await rejects(sign(valid, { key: other }), 'imza');
  const [h, , s] = sign(valid).split('.');
  await rejects(`${h}.${b64url(JSON.stringify({ ...valid, sub: 'saldirgan' }))}.${s}`, 'imza');
});

test('imzasız, bilinmeyen anahtarlı ve bozuk jetonlar reddedilir', async () => {
  await rejects(sign(valid, { alg: 'none' }), 'algoritma');
  await rejects(sign(valid, { kid: 'yok' }), 'anahtar');
  await rejects('a.b.c', 'biçim');
  await rejects('sahte', 'biçim');
});

test('yayıncı, hedef kitle ve süre denetlenir', async () => {
  await rejects(sign({ ...valid, iss: 'https://kotu.example' }), 'yayıncı');
  await rejects(sign({ ...valid, aud: 'baska-uygulama' }), 'hedef kitle');
  await rejects(sign({ ...valid, exp: NOW - 3600 }), 'süresi dolmuş');
});

test('doğrulanmamış e-posta alınmaz', async () => {
  assert.equal((await verify(sign({ ...valid, email_verified: false }))).email, null);
});
