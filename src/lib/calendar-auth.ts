import { GoogleAuthProvider, reauthenticateWithPopup, linkWithPopup } from 'firebase/auth';
import { auth, firebaseEnabled } from '@/lib/firebase';

/** Minimal scope to insert/update events */
export const EVENTS_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
/** Full scope if you want to create a dedicated “Centsei” calendar */
export const FULL_CAL_SCOPE = 'https://www.googleapis.com/auth/calendar';

/**
 * Ask Google for Calendar scope via Firebase Auth (incremental).
 * Returns a short-lived OAuth access token or null (guest/local mode).
 */
export async function getCalendarAccessToken(opts?: { full?: boolean }): Promise<string | null> {
  if (!firebaseEnabled || !auth?.currentUser) {
    // In guest mode or no Firebase: caller should fall back to ICS export.
    console.info('Calendar connect skipped: not signed in / Firebase disabled.');
    return null;
  }

  const provider = new GoogleAuthProvider();
  provider.addScope(EVENTS_SCOPE);
  if (opts?.full) provider.addScope(FULL_CAL_SCOPE);

  // Prefer linking (adds scope to existing account). Fallback to reauth.
  try {
    const cred = await linkWithPopup(auth.currentUser, provider);
    // @ts-expect-error Firebase types: .accessToken exists on GoogleAuthProvider credential
    return cred?.credential?.accessToken ?? null;
  } catch {
    const cred = await reauthenticateWithPopup(auth.currentUser, provider);
    // @ts-expect-error
    return cred?.credential?.accessToken ?? null;
  }
}
