import admin from 'firebase-admin';

if (!admin.apps?.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccount) {
    try {
      const parsed = JSON.parse(serviceAccount);
      admin.initializeApp({
        credential: admin.credential.cert(parsed),
      });
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'serviplus-f1b8f',
      });
    }
  } else {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'serviplus-f1b8f',
    });
  }
}

export const db = admin.firestore();
export { admin };
