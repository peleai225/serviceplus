import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/firebase-admin.js';
import { cors } from './_lib/config.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token } = req.body || {};

    if (!token || typeof token !== 'string') {
      return res.status(401).json({ valid: false, error: 'Token requis' });
    }

    // Look up session
    const sessionDoc = await db.collection('sessions').doc(token).get();
    if (!sessionDoc.exists) {
      return res.status(401).json({ valid: false, error: 'Session invalide' });
    }

    const session = sessionDoc.data()!;

    // Check expiry
    if (new Date(session.expiresAt) < new Date()) {
      // Clean up expired session
      await db.collection('sessions').doc(token).delete();
      return res.status(401).json({ valid: false, error: 'Session expirée' });
    }

    // Fetch user
    const userDoc = await db.collection('users').doc(session.userId).get();
    if (!userDoc.exists) {
      return res.status(401).json({ valid: false, error: 'Utilisateur introuvable' });
    }

    const user = userDoc.data()!;

    return res.status(200).json({
      valid: true,
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        city: user.city || '',
        verified: user.verified || false,
      },
    });
  } catch (err: any) {
    console.error('[me] Error:', err);
    return res.status(500).json({ valid: false, error: 'Erreur interne du serveur' });
  }
}
