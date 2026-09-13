import { db } from './firebase-admin.js';
import crypto from 'crypto';

const SESSIONS = 'sessions';
const SESSION_DURATION_DAYS = 7;

export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export async function createSession(userId: string, phone: string) {
  const token = generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await db.collection(SESSIONS).doc(token).set({
    token,
    userId,
    phone,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  return { token, expiresAt: expiresAt.toISOString() };
}

export async function validateSession(token: string): Promise<{ valid: boolean; userId?: string; phone?: string }> {
  if (!token) return { valid: false };

  const snap = await db.collection(SESSIONS).doc(token).get();
  if (!snap.exists) return { valid: false };

  const data = snap.data()!;
  if (new Date(data.expiresAt) < new Date()) {
    await snap.ref.delete();
    return { valid: false };
  }

  return { valid: true, userId: data.userId, phone: data.phone };
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  await db.collection(SESSIONS).doc(token).delete();
}

export async function deleteUserSessions(userId: string): Promise<void> {
  const snaps = await db.collection(SESSIONS).where('userId', '==', userId).get();
  const batch = db.batch();
  snaps.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}
