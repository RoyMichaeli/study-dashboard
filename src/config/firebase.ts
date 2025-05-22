import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Check if Firebase config is available
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if Firebase is configured
export const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

// Initialize Firebase only if configured
let app: any = null;
if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
}

// Initialize Firestore and Auth only if Firebase is configured
export const db = isFirebaseConfigured ? getFirestore(app) : null;
export const auth = isFirebaseConfigured ? getAuth(app) : null;

// Enable offline persistence only if Firebase is configured
if (isFirebaseConfigured && db) {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence enabled in first tab only');
    } else if (err.code === 'unimplemented') {
      console.warn('Browser doesn\'t support persistence');
    }
  });
}

export { app };