
// Safe Firebase bootstrap that reports missing configuration.
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

const firebaseEnabled = Object.values(firebaseConfig).every(Boolean);

if (!firebaseEnabled) {
    const missingKeys = Object.entries(firebaseConfig)
        .filter(([, value]) => !value)
        .map(([key]) => key);
    console.error(`Firebase configuration is missing the following keys: ${missingKeys.join(', ')}. The app will not work correctly.`);
    // In a real app, you might want to show a more user-friendly error screen.
}

let app: FirebaseApp;
if (getApps().length) {
    app = getApps()[0];
} else {
    app = initializeApp(firebaseConfig);
}

const auth: Auth = getAuth(app);
const firestore: Firestore = getFirestore(app);
const googleProvider: GoogleAuthProvider = new GoogleAuthProvider();
let analytics: Analytics | null = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    analytics = getAnalytics(app);
}

export { app, auth, googleProvider, firestore, analytics, firebaseEnabled };
