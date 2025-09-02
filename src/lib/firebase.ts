
// Safe Firebase bootstrap that reports missing configuration and works in Firebase Hosting builds.
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics } from "firebase/analytics";

// Start with the usual NEXT_PUBLIC_* env vars (local/dev).
const firebaseConfig: Record<string, string | undefined> = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// On Firebase App Hosting builds, GOOGLE provides FIREBASE_WEBAPP_CONFIG (JSON).
// If NEXT_PUBLIC_* are not set, fall back to that JSON so SSR build doesn't crash.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId || !firebaseConfig.authDomain) {
  try {
    const raw = process.env.FIREBASE_WEBAPP_CONFIG;
    if (raw) {
      const parsed = JSON.parse(raw);
      firebaseConfig.apiKey = firebaseConfig.apiKey || parsed.apiKey;
      firebaseConfig.authDomain = firebaseConfig.authDomain || parsed.authDomain;
      firebaseConfig.projectId = firebaseConfig.projectId || parsed.projectId;
      firebaseConfig.storageBucket = firebaseConfig.storageBucket || parsed.storageBucket;
      firebaseConfig.messagingSenderId = firebaseConfig.messagingSenderId || parsed.messagingSenderId;
      firebaseConfig.appId = firebaseConfig.appId || parsed.appId;
      firebaseConfig.measurementId = firebaseConfig.measurementId || parsed.measurementId;
    }
  } catch (e) {
    // Ignore parse errors; we'll warn below if required keys are missing.
  }
}

// Only require the core Firebase keys. Analytics is optional.
const requiredKeys: (keyof typeof firebaseConfig)[] = [
    'apiKey', 'authDomain', 'projectId', 'appId'
];

const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

const firebaseEnabled = missingKeys.length === 0;

if (!firebaseEnabled) {
  console.error(`Firebase configuration is missing the following keys: ${missingKeys.join(', ')}. The app will not work correctly.`);
}

let app: FirebaseApp;
if (getApps().length) {
  app = getApps()[0];
} else {
  // Initialize even during SSR build when config is supplied via FIREBASE_WEBAPP_CONFIG.
  // If config is still incomplete, initializeApp will throw in some SDK calls; our code
  // guards usage with firebaseEnabled, so initialization is best-effort here.
  app = initializeApp(firebaseConfig as any);
}

const isBrowser = typeof window !== 'undefined';
const auth: Auth | null = isBrowser && firebaseEnabled ? getAuth(app) : null;
const firestore: Firestore = getFirestore(app);
const googleProvider: GoogleAuthProvider | null = isBrowser && firebaseEnabled ? new GoogleAuthProvider() : null;
let analytics: Analytics | null = null;

if (isBrowser && firebaseConfig.measurementId) {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn("Could not initialize Analytics", e);
  }
}

export { app, auth, googleProvider, firestore, analytics, firebaseEnabled };
