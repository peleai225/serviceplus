import { db, FieldValue } from './firebase-admin.js';

const OTP_COLLECTION = 'otp_codes';
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a random 6-digit OTP code.
 */
export function generateOTP(): string {
  return Math.floor(100_000 + Math.random() * 900_000).toString();
}

/**
 * Store an OTP code in Firestore with a 5-minute expiry.
 */
export async function storeOTP(phone: string, code: string): Promise<void> {
  await db.collection(OTP_COLLECTION).add({
    phone,
    code,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    used: false,
  });
}

/**
 * Verify an OTP code: checks it matches, hasn't expired, and hasn't been used.
 * Deletes the document after successful verification.
 * Returns true if the code is valid.
 */
export async function verifyOTP(phone: string, code: string): Promise<boolean> {
  const now = new Date();
  const snapshot = await db
    .collection(OTP_COLLECTION)
    .where('phone', '==', phone)
    .where('code', '==', code)
    .where('used', '==', false)
    .get();

  if (snapshot.empty) return false;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);

    if (expiresAt > now) {
      await doc.ref.delete();
      return true;
    }
  }

  return false;
}

/**
 * Delete all expired OTP documents from Firestore.
 */
export async function cleanExpiredOTPs(): Promise<number> {
  const now = new Date();
  const snapshot = await db
    .collection(OTP_COLLECTION)
    .where('expiresAt', '<', now)
    .get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  return snapshot.size;
}
