
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

const swPath = path.join(process.cwd(), 'public', 'firebase-messaging-sw.js');
let swContent = fs.readFileSync(swPath, 'utf8');

const configString = JSON.stringify(firebaseConfig);
swContent = swContent.replace('__FIREBASE_CONFIG__', configString);

fs.writeFileSync(swPath, swContent);

console.log('Firebase config injected into service worker.');
