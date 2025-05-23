import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { setupBrowserCompatibility } from '../utils/browserCompatibility';

// Setup browser compatibility fixes
setupBrowserCompatibility();

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

// Detect Safari
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Initialize Firestore with browser-specific configuration
export const db = isFirebaseConfigured ? initializeFirestore(app, {
  localCache: isSafari 
    ? persistentLocalCache({
        // Safari has issues with multi-tab, use single tab manager
        tabManager: persistentSingleTabManager({
          forceOwnership: false
        })
      })
    : persistentLocalCache({
        // Other browsers can use multi-tab
        tabManager: persistentMultipleTabManager()
      })
}) : null;

if (isSafari && isFirebaseConfigured) {
  console.log('🦁 Safari detected - using single-tab persistence mode');
}

export const auth = isFirebaseConfigured ? getAuth(app) : null;

export { app };