import { initializeApp, getApps, getApp } from "firebase/app";
import * as firebaseFirestore from "firebase/firestore";
const { getFirestore, setLogLevel } = firebaseFirestore as any;
import * as firebaseStorage from "firebase/storage";
const { getStorage, ref, uploadBytes, getDownloadURL } = firebaseStorage as any;
import * as firebaseFunctions from "firebase/functions";
const { getFunctions, httpsCallable } = firebaseFunctions as any;
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "AIzaSyCQ8TihwntETKPot4dOqn9I1w1a2kbS83Q",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "serviplus-f1b8f.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "serviplus-f1b8f",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "serviplus-f1b8f.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "86413980892",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "1:86413980892:web:ad53f1c531ebd12e65f019",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     || "G-7C5JBHR0PS",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const auth = getAuth(app);

auth.languageCode = 'fr';

export { RecaptchaVerifier, signInWithPhoneNumber };

setLogLevel('silent');

// Cloud Functions helpers
export const sendSmsFunction = httpsCallable(functions, 'sendSms');

/**
 * Uploads a file to Firebase Storage with a strict fail-fast timeout.
 */
export const uploadImage = async (file: File, path: string): Promise<string> => {
  if (!file) return '';
  try {
    const storageRef = ref(storage, path);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout upload image")), 3500)
    );
    await Promise.race([uploadBytes(storageRef, file), timeoutPromise]);
    return await getDownloadURL(storageRef);
  } catch (e: any) {
    console.warn("uploadImage failed:", e.message);
    return '';
  }
};
