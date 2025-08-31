import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { getAuthFromRequest } from '@/lib/api-auth';

export async function POST(req: Request) {
  try {
    const { calendarId, token } = await req.json();
    if (!calendarId || !token) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const auth = await getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const invitesQ = query(collection(firestore, 'calendars', calendarId, 'invites'), where('token', '==', token));
    const snap = await getDocs(invitesQ);
    if (snap.empty) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    const inviteDoc = snap.docs[0];
    const inv = inviteDoc.data() as any;

    // If invite email provided, validate matches authenticated email
    if (inv.email && auth.email && inv.email.toLowerCase() !== auth.email.toLowerCase()) {
      return NextResponse.json({ error: 'Invite email mismatch' }, { status: 403 });
    }

    await updateDoc(doc(firestore, 'calendars', calendarId), { members: arrayUnion(auth.uid) });
    await deleteDoc(inviteDoc.ref);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
