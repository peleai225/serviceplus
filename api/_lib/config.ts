import { db } from './firebase-admin';

let _cache: { apiKey: string; apiKeyId: string; storeId: string; env: string } | null = null;

export async function getJekoConfig() {
  if (_cache) return _cache;
  try {
    const snap = await db.doc('platform/secrets').get();
    const d = snap.data() || {};
    _cache = {
      apiKey:   d.jekoApiKey    || process.env.JEKO_API_KEY    || '',
      apiKeyId: d.jekoApiKeyId  || process.env.JEKO_API_KEY_ID || '',
      storeId:  d.jekoStoreId   || process.env.JEKO_STORE_ID   || '',
      env:      d.jekoEnv       || process.env.JEKO_ENV         || 'sandbox',
    };
  } catch {
    _cache = {
      apiKey:   process.env.JEKO_API_KEY    || '',
      apiKeyId: process.env.JEKO_API_KEY_ID || '',
      storeId:  process.env.JEKO_STORE_ID   || '',
      env:      process.env.JEKO_ENV         || 'sandbox',
    };
  }
  return _cache;
}

export function invalidateCache() {
  _cache = null;
}

export const APP_BASE_URL = process.env.APP_BASE_URL ?? 'https://serviplus-f1b8f.vercel.app';

export function cors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
