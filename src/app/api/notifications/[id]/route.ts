import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/firebase/auth';
import { getAdminDb, COLLECTIONS } from '@/lib/firebase/admin';
import { markNotificationRead } from '@/lib/services/notificationService';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await requireAuth(request.headers.get('authorization'));
    const { id } = await params;
    const db = getAdminDb();
    const doc = await db.collection(COLLECTIONS.notifications).doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const notification = doc.data();
    if (notification?.userId !== profile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await markNotificationRead(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 400 },
    );
  }
}
