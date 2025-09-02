import { addDoc, collection, doc, getDoc, getDocs, query, where, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

export type CalendarDoc = {
  ownerId: string;
  members: string[];
  name: string;
  createdAt?: any;
};

export async function ensurePersonalCalendar(db: Firestore, userId: string): Promise<string> {
  // First, try the straightforward query path. If it fails due to timing/permission,
  // fall back to creating (or upserting) a deterministic personal calendar.
  try {
    const q = query(collection(db, 'calendars'), where('ownerId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].id;
    }
  } catch (e) {
    // Swallow and continue to creation path; this avoids transient auth/propagation races.
    // console.warn('Owner query failed; attempting to create personal calendar', e);
  }

  // Attempt creation with auto ID (allowed by rules: create if ownerId matches auth.uid)
  try {
    const ref = await addDoc(collection(db, 'calendars'), {
      ownerId: userId,
      members: [userId],
      name: 'Personal',
      createdAt: serverTimestamp(),
    } as CalendarDoc);
    return ref.id;
  } catch (createErr) {
    // As a final fallback (in case addDoc is blocked), upsert at a deterministic ID.
    const deterministicRef = doc(db, 'calendars', userId);
    await setDoc(
      deterministicRef,
      {
        ownerId: userId,
        members: [userId],
        name: 'Personal',
        createdAt: serverTimestamp(),
      } as CalendarDoc,
      { merge: true }
    );
    return deterministicRef.id;
  }
}

export async function addMemberToCalendar(db: Firestore, calendarId: string, uid: string) {
  const cdoc = doc(db, 'calendars', calendarId);
  // Note: callers should ensure permissions; rules allow members to update.
  // We avoid arrayUnion to keep the helper tree-shakeable; caller should ensure uniqueness if needed.
  const existing = await getDoc(cdoc).catch(() => null as any);
  const members = existing?.exists() ? (Array.isArray((existing.data() as any)?.members) ? (existing.data() as any).members : []) : [];
  const nextMembers = Array.from(new Set([...(members || []), uid]));
  await updateDoc(cdoc, { members: nextMembers } as any);
}
