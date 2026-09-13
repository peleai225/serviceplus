import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from './_lib/config.js';
import { db } from './_lib/firebase-admin.js';
import { verifyOTP } from './_lib/otp.js';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS_PER_WINDOW = 5;
const ATTEMPTS_COLLECTION = 'otp_attempts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, code } = req.body || {};

  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'Le numéro de téléphone est requis' });
  }
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Le code OTP est requis' });
  }

  try {
    // Rate limit: max 5 verification attempts per phone in 10 minutes
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recentAttempts = await db
      .collection(ATTEMPTS_COLLECTION)
      .where('phone', '==', phone)
      .where('attemptedAt', '>=', windowStart)
      .get();

    if (recentAttempts.size >= MAX_ATTEMPTS_PER_WINDOW) {
      return res.status(429).json({
        error: 'Trop de tentatives. Réessayez dans quelques minutes.',
      });
    }

    // Record this attempt
    await db.collection(ATTEMPTS_COLLECTION).add({
      phone,
      attemptedAt: new Date(),
    });

    const valid = await verifyOTP(phone, code);

    if (valid) {
      return res.status(200).json({ success: true, message: 'Code vérifié avec succès' });
    } else {
      return res.status(400).json({ success: false, error: 'Code invalide ou expiré' });
    }
  } catch (err) {
    console.error('[OTP] Error verifying OTP:', err);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
