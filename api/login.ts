import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/firebase-admin.js';
import { cors } from './_lib/config.js';
import { checkRateLimit, rateLimitResponse } from './_lib/rate-limit.js';
import crypto from 'crypto';

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const computed = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return computed === hash;
}

function generateToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { phone, password } = req.body || {};

    if (!phone || !password) {
      return res.status(400).json({ error: 'Numéro et mot de passe requis' });
    }
    if (typeof phone !== 'string' || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Format de numéro invalide (10 chiffres requis)' });
    }

    // Rate limit: 5 attempts per 15 minutes per phone number
    const rateLimitResult = await checkRateLimit(`login:${phone}`, 5, 15);
    if (rateLimitResponse(res, rateLimitResult)) return;

    // Find user by phone
    const usersSnap = await db.collection('users').where('phone', '==', phone).limit(1).get();
    if (usersSnap.empty) {
      return res.status(401).json({ error: 'Numéro ou mot de passe incorrect' });
    }

    const userDoc = usersSnap.docs[0];
    const user = userDoc.data();

    // Get password hash from auth_credentials
    const credDoc = await db.collection('auth_credentials').doc(phone).get();
    if (!credDoc.exists) {
      return res.status(401).json({ error: 'Numéro ou mot de passe incorrect' });
    }

    const { passwordHash } = credDoc.data()!;
    if (!verifyPassword(password, passwordHash)) {
      return res.status(401).json({ error: 'Numéro ou mot de passe incorrect' });
    }

    // Generate session token with 7-day expiry
    const token = generateToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db.collection('sessions').doc(token).set({
      userId: user.id,
      token,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        city: user.city || '',
        verified: user.verified || false,
      },
      token,
    });
  } catch (err: any) {
    console.error('[login] Error:', err);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
