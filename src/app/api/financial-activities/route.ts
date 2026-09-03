import { requireAuth } from '@/lib/firebase/auth';
import { getEqub } from '@/lib/services/equbService';
import { getLedgerEntriesForUser } from '@/lib/services/ledgerService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request.headers.get('authorization'));
    const entries = await getLedgerEntriesForUser(user.id);
    const equbIds = [...new Set(entries.map((entry) => entry.equbId))];
    const equbs = await Promise.all(equbIds.map((id) => getEqub(id)));
    const equbNames = Object.fromEntries(
      equbs.filter(Boolean).map((equb) => [equb!.id, equb!.name]),
    );

    return NextResponse.json({
      // An obligation is an internal reservation, not a cash movement. It
      // must not appear as a second contribution in the user's finances.
      activities: entries.filter((entry) => entry.type !== 'PAYOUT_OBLIGATION').map((entry) => ({
        ...entry,
        equbName: equbNames[entry.equbId] ?? 'Equb',
        direction: entry.type === 'PAYOUT_COMPLETED' ? 'IN' : 'OUT',
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unauthorized' },
      { status: 401 },
    );
  }
}
