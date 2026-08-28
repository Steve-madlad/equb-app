import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/firebase/auth';
import { requestMembership } from '@/lib/services/equbService';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request.headers.get('authorization'));
    if (user.role === 'ADMIN') {
      return NextResponse.json({ error: 'Admins cannot join Equbs' }, { status: 403 });
    }
    const body = await request.json();
    const { equbId } = body;

    if (!equbId) {
      return NextResponse.json({ error: 'equbId required' }, { status: 400 });
    }

    const membership = await requestMembership(equbId, user.id);
    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 400 },
    );
  }
}
