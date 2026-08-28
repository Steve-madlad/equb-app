import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/firebase/auth';
import { drawPayoutRecipient } from '@/lib/services/payoutService';
import { getDrawForCycle } from '@/lib/services/payoutService';
import { resolveRequestDate } from '@/lib/testClock';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request.headers.get('authorization'));
    const { id: equbId } = await params;
    const body = await request.json();
    const { cycleId } = body;

    if (!cycleId) {
      return NextResponse.json({ error: 'cycleId required' }, { status: 400 });
    }

    const existingDraw = await getDrawForCycle(cycleId);
    if (existingDraw) {
      return NextResponse.json(
        { error: 'Draw already completed', draw: existingDraw },
        { status: 409 },
      );
    }

    const result = await drawPayoutRecipient(equbId, cycleId, admin.id, {
      currentDateIso: resolveRequestDate(request),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Draw failed';
    const status = message.includes('already drawn') ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request.headers.get('authorization'));
    const cycleId = request.nextUrl.searchParams.get('cycleId');
    if (!cycleId) {
      return NextResponse.json({ error: 'cycleId required' }, { status: 400 });
    }

    const draw = await getDrawForCycle(cycleId);
    if (!draw) {
      return NextResponse.json({ error: 'No draw found' }, { status: 404 });
    }

    return NextResponse.json({ draw });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unauthorized' },
      { status: 401 },
    );
  }
}
