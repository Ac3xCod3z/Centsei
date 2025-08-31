import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

function init() {
  if (admin.apps.length) {
    app = admin.app();
    return app!;
  }
  try {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      : undefined;
    if (sa) {
      app = admin.initializeApp({
        credential: admin.credential.cert(sa as admin.ServiceAccount),
      });
    } else {
      app = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  } catch (e) {
    // Last resort: initialize without credentials (will fail on verify)
    try {
      app = admin.initializeApp();
    } catch {}
  }
  return app!;
}

export function getAdminApp() {
  return app ?? init();
}

export async function verifyIdToken(idToken: string) {
  const a = getAdminApp();
  const auth = admin.auth(a);
  return auth.verifyIdToken(idToken);
}

