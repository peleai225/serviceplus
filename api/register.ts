import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/firebase-admin.js';
import { cors } from './_lib/config.js';
import crypto from 'crypto';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function generateUserId(): string {
  return 'usr_' + crypto.randomBytes(8).toString('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, phone, city, role, password } = req.body || {};

    // Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Le numéro de téléphone doit contenir 10 chiffres' });
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 4 caractères' });
    }
    if (!role || !['CLIENT', 'PROVIDER'].includes(role)) {
      return res.status(400).json({ error: 'Le rôle doit être CLIENT ou PROVIDER' });
    }

    // Check if phone already exists
    const existingUsers = await db.collection('users').where('phone', '==', phone).limit(1).get();
    if (!existingUsers.empty) {
      return res.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
    }

    const userId = generateUserId();
    const passwordHash = hashPassword(password);

    // Store user in Firestore (without password)
    const userData = {
      id: userId,
      name: name.trim(),
      phone,
      role,
      city: city || '',
      verified: false,
      createdAt: new Date().toISOString(),
    };
    await db.collection('users').doc(userId).set(userData);

    // Store hashed password separately
    await db.collection('auth_credentials').doc(phone).set({
      phone,
      passwordHash,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      user: { id: userId, name: userData.name, phone, role, city: userData.city },
    });
  } catch (err: any) {
    console.error('[register] Error:', err);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
