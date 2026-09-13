import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/firebase-admin.js';
import { cors } from './_lib/config.js';
import { validateSession } from './_lib/session.js';
import crypto from 'crypto';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, userId } = req.body || {};

    if (!token || !userId) {
      return res.status(400).json({ error: 'Token et userId requis' });
    }

    // Validate admin session
    const session = await validateSession(token);
    if (!session.valid) {
      return res.status(401).json({ error: 'Session invalide' });
    }

    // Verify the caller is an admin
    const callerSnap = await db.collection('users').doc(session.userId!).get();
    const caller = callerSnap.data();
    if (!caller || caller.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    // Get target user
    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    const user = userSnap.data()!;

    // Generate a temporary 4-digit code
    const tempCode = Math.floor(1000 + Math.random() * 9000).toString();
    const passwordHash = hashPassword(tempCode);

    // Save new hash in auth_credentials (keyed by phone)
    await db.collection('auth_credentials').doc(user.phone).set({
      phone: user.phone,
      passwordHash,
      updatedAt: new Date().toISOString(),
      resetBy: session.userId,
    }, { merge: true });

    return res.status(200).json({
      success: true,
      tempCode,
      message: `Code temporaire généré pour ${user.name}. Communiquez-le à l'utilisateur.`,
    });
  } catch (err: any) {
    console.error('[admin-reset-password] Error:', err);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
