import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccount) {
    try {
      const parsed = JSON.parse(serviceAccount);
      initializeApp({ credential: cert(parsed) });
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
      initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'serviplus-f1b8f' });
    }
  } else {
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'serviplus-f1b8f' });
  }
}

export const db = getFirestore();
export { FieldValue };
