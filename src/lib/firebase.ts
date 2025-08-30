// Safe Firebase bootstrap that gracefully supports "local only" mode.
import { initializeApp, getApps, type FirebaseApp, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics } from "firebase/analytics";

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const firebaseEnabled = Object.values(cfg).every(Boolean);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let analytics: Analytics | null = null;


if (firebaseEnabled) {
  app = getApps()[0] ?? initializeApp(cfg);
  auth = getAuth(app);
  firestore = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  analytics = typeof window !== 'undefined' && cfg.measurementId ? getAnalytics(app) : null;
} else {
  if (typeof window !== 'undefined') {
    // informational only; don’t make this an error
    console.info('Firebase configuration is missing. Running in local-only mode.');
  }
}

export { app, auth, googleProvider, firestore, analytics, firebaseEnabled };
