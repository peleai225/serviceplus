import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (sa) {
    try { initializeApp({ credential: cert(JSON.parse(sa)) }); }
    catch { initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'serviplus-f1b8f' }); }
  } else {
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'serviplus-f1b8f' });
  }
}

const db = getFirestore();

const SUPER_ADMIN = {
  id: 'u3',
  name: 'Admin Servi+',
  email: 'admin@serviplus.ci',
  phone: '0749793516',
  role: 'ADMIN',
  isSuperAdmin: true,
  avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=purple&color=fff',
  verified: true,
  createdAt: new Date().toISOString(),
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Protect against unauthorized admin creation
  const secret = (req.query.secret || req.body?.secret) as string | undefined;
  const expectedSecret = process.env.BOOTSTRAP_SECRET;
  if (!expectedSecret || !secret || secret !== expectedSecret) {
    return res.status(403).json({ error: 'Accès refusé. Secret requis.' });
  }

  try {
    const ref = db.doc(`users/${SUPER_ADMIN.id}`);
    const snap = await ref.get();

    if (snap.exists()) {
      const data = snap.data();
      return res.status(200).json({
        message: 'Super Admin existe déjà dans Firestore.',
        user: { id: SUPER_ADMIN.id, name: data?.name, role: data?.role, isSuperAdmin: data?.isSuperAdmin },
      });
    }

    await ref.set(SUPER_ADMIN);

    return res.status(201).json({
      message: 'Super Admin créé dans Firestore !',
      user: { id: SUPER_ADMIN.id, name: SUPER_ADMIN.name, role: SUPER_ADMIN.role },
      instructions: 'Connectez-vous avec le numéro 0749793516 et le mot de passe habituel.',
    });
  } catch (err: any) {
    console.error('bootstrap-admin error:', err);
    return res.status(500).json({ error: err.message });
  }
}
