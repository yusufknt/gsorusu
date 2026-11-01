import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { MockError, mockApi, mockNow } from '@/mock/server';

/**
 * Çalışma modu. EXPO_PUBLIC_API_URL verilmezse uygulama kendi içindeki test sunucusuyla çalışır
 * (Docker gerekmez). Gerçek sunucuya bağlanmak için: EXPO_PUBLIC_API_URL=http://10.0.2.2:5080
 * (Android emülatöründe 10.0.2.2, bilgisayarın localhost'udur).
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? null;
export const IS_MOCK = API_URL === null;

const TIMEOUT_MS = 15_000;
const DEVICE_KEY = 'gunun.device_id';
const TOKEN_KEY = 'gunun.token';

/** Kullanıcıya gösterilebilir hata. `message` her zaman Türkçe ve ekranda gösterilebilir. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const storage = {
  get: (key: string): Promise<string | null> =>
    Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.getItem(key) ?? null) : SecureStore.getItemAsync(key),
  set: async (key: string, value: string) => {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  },
  remove: async (key: string) => {
    if (Platform.OS === 'web') globalThis.localStorage?.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  },
};

let token: string | null = null;
let authInFlight: Promise<string> | null = null;

/** Sunucu saati − telefon saati (ms). Geri sayımlar için; puanlama zaten sunucuda. */
let clockOffsetMs = 0;

export function serverNow(): number {
  return IS_MOCK ? mockNow() : Date.now() + clockOffsetMs;
}

/** Uygulama ilk açıldığında rastgele cihaz kimliği üretilir ve güvenli depoda saklanır (üyelik yok). */
async function deviceId(): Promise<string> {
  let id = await storage.get(DEVICE_KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await storage.set(DEVICE_KEY, id);
  }
  return id;
}

async function authenticate(): Promise<string> {
  authInFlight ??= (async () => {
    try {
      const res = await send('POST', '/auth/device', { deviceId: await deviceId() }, null);
      const body = (await res.json()) as { token: string };
      token = body.token;
      await storage.set(TOKEN_KEY, token);
      return token;
    } finally {
      authInFlight = null;
    }
  })();
  return authInFlight;
}

async function send(method: string, path: string, body: unknown, bearer: string | null): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'network', 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.');
  } finally {
    clearTimeout(timer);
  }

  const date = res.headers.get('date');
  if (date) {
    const parsed = Date.parse(date);
    if (!Number.isNaN(parsed)) clockOffsetMs = parsed - Date.now();
  }

  if (!res.ok && res.status !== 401) throw await toApiError(res);
  return res;
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const p = (await res.json()) as { title?: string; code?: string };
    if (p.title) return new ApiError(res.status, p.code ?? 'error', p.title);
  } catch {
    // Gövde JSON değil; genel mesaj.
  }
  return new ApiError(res.status, 'error', 'Bir şeyler ters gitti. Lütfen biraz sonra tekrar dene.');
}

/** Oturum gerekiyorsa açar; jeton süresi dolmuşsa aynı cihaz kimliğiyle sessizce yeniler. */
export async function api<T>(method: 'GET' | 'POST' | 'PATCH' | 'PUT', path: string, body?: unknown): Promise<T> {
  if (IS_MOCK) {
    try {
      return await mockApi<T>(method, path, body);
    } catch (e) {
      if (e instanceof MockError) throw new ApiError(e.status, e.code, e.message);
      throw e;
    }
  }

  token ??= await storage.get(TOKEN_KEY);
  if (!token) await authenticate();

  let res = await send(method, path, body, token);
  if (res.status === 401) {
    token = null;
    await storage.remove(TOKEN_KEY);
    res = await send(method, path, body, await authenticate());
    if (res.status === 401) throw await toApiError(res);
  }
  return (await res.json()) as T;
}
