import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/firebase-admin.js';
import { invalidateCache, cors } from './_lib/config.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { adminUserId, jekoApiKey, jekoApiKeyId, jekoStoreId, jekoEnv } = req.body || {};

    if (!adminUserId) return res.status(400).json({ error: 'adminUserId required' });

    const userSnap = await db.doc(`users/${adminUserId}`).get();
    const userData = userSnap.data();
    if (!userData || userData.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const update: Record<string, string> = { updatedAt: new Date().toISOString(), updatedBy: adminUserId };
    if (jekoApiKey)   update.jekoApiKey   = jekoApiKey;
    if (jekoApiKeyId) update.jekoApiKeyId = jekoApiKeyId;
    if (jekoStoreId)  update.jekoStoreId  = jekoStoreId;
    if (jekoEnv)      update.jekoEnv      = jekoEnv;

    await db.doc('platform/secrets').set(update, { merge: true });
    invalidateCache();

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('save-api-config error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
