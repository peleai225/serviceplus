import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/firebase-admin.js';
import { validateSession } from './_lib/session.js';
import { cors } from './_lib/config.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ valid: false, error: 'Token requis' });

    const session = await validateSession(token);
    if (!session.valid) {
      return res.status(401).json({ valid: false });
    }

    const userSnap = await db.doc(`users/${session.userId}`).get();
    const userData = userSnap.data();
    if (!userData) return res.status(401).json({ valid: false });

    const { passwordHash, ...safeUser } = userData as any;
    return res.status(200).json({ valid: true, user: { ...safeUser, id: session.userId } });
  } catch (err: any) {
    console.error('check-session error:', err);
    return res.status(500).json({ valid: false, error: 'Erreur serveur' });
  }
}
