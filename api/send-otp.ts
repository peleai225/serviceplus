import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from './_lib/config.js';
import { db } from './_lib/firebase-admin.js';
import { generateOTP, storeOTP, cleanExpiredOTPs } from './_lib/otp.js';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_PER_WINDOW = 3;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone } = req.body || {};

  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'Le numéro de téléphone est requis' });
  }

  try {
    // Rate limit: max 3 OTP per phone in 10 minutes
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recentOTPs = await db
      .collection('otp_codes')
      .where('phone', '==', phone)
      .where('createdAt', '>=', windowStart)
      .get();

    if (recentOTPs.size >= MAX_OTP_PER_WINDOW) {
      return res.status(429).json({
        error: 'Trop de demandes. Réessayez dans quelques minutes.',
      });
    }

    const code = generateOTP();
    await storeOTP(phone, code);

    // SMS placeholder — log OTP to console for now
    console.log(`[OTP] Code for ${phone}: ${code}`);

    // Clean up expired OTPs in the background (fire and forget)
    cleanExpiredOTPs().catch((err) =>
      console.error('[OTP] Failed to clean expired codes:', err)
    );

    return res.status(200).json({ success: true, message: 'Code envoyé' });
  } catch (err) {
    console.error('[OTP] Error sending OTP:', err);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
