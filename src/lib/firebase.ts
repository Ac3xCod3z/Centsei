
// Safe Firebase bootstrap that reports missing configuration and works in Firebase Hosting builds.
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const requiredKeys: (keyof typeof firebaseConfig)[] = [
    'apiKey', 'authDomain', 'projectId', 'appId'
];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
const firebaseEnabled = missingKeys.length === 0;

if (!firebaseEnabled && typeof window !== 'undefined') {
  console.error(`Firebase configuration is missing the following keys: ${missingKeys.join(', ')}. The app will not work correctly.`);
}

let app: FirebaseApp;
if (getApps().length) {
  app = getApps()[0];
} else {
  app = initializeApp(firebaseConfig);
}

const isBrowser = typeof window !== 'undefined';
const auth: Auth | null = isBrowser && firebaseEnabled ? getAuth(app) : null;
const firestore: Firestore | null = isBrowser && firebaseEnabled ? getFirestore(app) : null;
const googleProvider: GoogleAuthProvider | null = isBrowser && firebaseEnabled ? new GoogleAuthProvider() : null;
let analytics: Analytics | null = null;

if (isBrowser && firebaseEnabled && firebaseConfig.measurementId) {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn("Could not initialize Analytics", e);
  }
}

export { app, auth, googleProvider, firestore, analytics, firebaseEnabled };
