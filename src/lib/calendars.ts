import { addDoc, collection, doc, getDoc, getDocs, query, where, serverTimestamp, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

export type CalendarDoc = {
  ownerId: string;
  members: string[];
  name: string;
  createdAt?: any;
};

export async function ensurePersonalCalendar(db: Firestore, userId: string): Promise<string> {
  const q = query(collection(db, 'calendars'), where('ownerId', '==', userId));
  const snap = await getDocs(q);
  if (!snap.empty) {
    return snap.docs[0].id;
  }
  const ref = await addDoc(collection(db, 'calendars'), {
    ownerId: userId,
    members: [userId],
    name: 'Personal',
    createdAt: serverTimestamp(),
  } as CalendarDoc);
  return ref.id;
}

export async function addMemberToCalendar(db: Firestore, calendarId: string, uid: string) {
  const cdoc = doc(db, 'calendars', calendarId);
  await updateDoc(cdoc, { members: arrayUnion(uid) });
}

