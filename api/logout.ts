import type { VercelRequest, VercelResponse } from '@vercel/node';
import { deleteSession } from './_lib/session.js';
import { cors } from './_lib/config.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token } = req.body || {};
    if (token) {
      await deleteSession(token);
    }
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('logout error:', err);
    return res.status(200).json({ success: true });
  }
}
