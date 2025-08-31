import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuthFromRequest } from '@/lib/api-auth';

export async function POST(req: Request) {
  try {
    const { calendarId, email } = await req.json();
    if (!calendarId || !email) return NextResponse.json({ error: 'Missing calendarId or email' }, { status: 400 });

    const auth = await getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const calDoc = await getDoc(doc(firestore, 'calendars', calendarId));
    if (!calDoc.exists()) return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    const cal = calDoc.data() as any;
    const isMember = cal?.members?.includes(auth.uid);
    if (!isMember) return NextResponse.json({ error: 'Not authorized to invite on this calendar' }, { status: 403 });

    const token = Math.random().toString(36).slice(2);
    await addDoc(collection(firestore, 'calendars', calendarId, 'invites'), {
      email,
      token,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ ok: true, token });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
