import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from './_lib/config.js';
import { db } from './_lib/firebase-admin.js';
import { generateOTP, storeOTP, cleanExpiredOTPs, verifyOTP } from './_lib/otp.js';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_OTP_PER_WINDOW = 3;
const MAX_ATTEMPTS_PER_WINDOW = 5;
const ATTEMPTS_COLLECTION = 'otp_attempts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, phone, code } = req.body || {};

  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'Le numéro de téléphone est requis' });
  }

  if (action === 'send') {
    try {
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
      const recent = await db.collection('otp_codes')
        .where('phone', '==', phone)
        .where('createdAt', '>=', windowStart)
        .get();

      if (recent.size >= MAX_OTP_PER_WINDOW) {
        return res.status(429).json({ error: 'Trop de demandes. Réessayez dans quelques minutes.' });
      }

      const otpCode = generateOTP();
      await storeOTP(phone, otpCode);
      console.log(`[OTP] Code for ${phone}: ${otpCode}`);
      cleanExpiredOTPs().catch((e) => console.error('[OTP] cleanup error:', e));

      return res.status(200).json({ success: true, message: 'Code envoyé' });
    } catch (err) {
      console.error('[OTP send] Error:', err);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }

  if (action === 'verify') {
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Le code OTP est requis' });
    }
    try {
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
      const attempts = await db.collection(ATTEMPTS_COLLECTION)
        .where('phone', '==', phone)
        .where('attemptedAt', '>=', windowStart)
        .get();

      if (attempts.size >= MAX_ATTEMPTS_PER_WINDOW) {
        return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans quelques minutes.' });
      }

      await db.collection(ATTEMPTS_COLLECTION).add({ phone, attemptedAt: new Date() });

      const valid = await verifyOTP(phone, code);
      if (valid) {
        return res.status(200).json({ success: true, message: 'Code vérifié avec succès' });
      }
      return res.status(400).json({ success: false, error: 'Code invalide ou expiré' });
    } catch (err) {
      console.error('[OTP verify] Error:', err);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }

  return res.status(400).json({ error: 'action doit être "send" ou "verify"' });
}
