import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { calendarId, token, uid } = await req.json();
    if (!calendarId || !token || !uid) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const invitesQ = query(collection(firestore, 'calendars', calendarId, 'invites'), where('token', '==', token));
    const snap = await getDocs(invitesQ);
    if (snap.empty) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    const inviteDoc = snap.docs[0];

    await updateDoc(doc(firestore, 'calendars', calendarId), { members: arrayUnion(uid) });
    await deleteDoc(inviteDoc.ref);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

