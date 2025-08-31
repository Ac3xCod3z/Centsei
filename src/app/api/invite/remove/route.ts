import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { getAuthFromRequest } from '@/lib/api-auth';

export async function POST(req: Request) {
  try {
    const { calendarId, removeUid } = await req.json();
    if (!calendarId || !removeUid) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const auth = await getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const calRef = doc(firestore, 'calendars', calendarId);
    const calSnap = await getDoc(calRef);
    if (!calSnap.exists()) return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
    const cal = calSnap.data() as any;

    if (cal.ownerId !== auth.uid) {
      return NextResponse.json({ error: 'Only owner can remove members' }, { status: 403 });
    }
    if (removeUid === cal.ownerId) {
      return NextResponse.json({ error: 'Owner cannot be removed' }, { status: 400 });
    }

    await updateDoc(calRef, { members: arrayRemove(removeUid) });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
