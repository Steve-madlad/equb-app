import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/firebase/auth';
import { markOverdueObligationsForDate } from '@/lib/services/paymentService';
import { resolveRequestDate } from '@/lib/testClock';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request.headers.get('authorization'));
    const markedCount = await markOverdueObligationsForDate(resolveRequestDate(request));

    return NextResponse.json({
      markedCount,
      performedBy: admin.id,
      performedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark overdue obligations';
    const status = message.includes('permissions') ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
