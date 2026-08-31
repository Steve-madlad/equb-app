import { requireAdmin } from '@/lib/firebase/auth';
import {
  buildAutomatedPayoutScheduleConfig,
  DEFAULT_PAYOUT_CRON,
  DEFAULT_PAYOUT_SCHEDULE_ID,
} from '@/lib/services/payoutSchedule';
import { Client } from '@upstash/qstash';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request.headers.get('authorization'));
    const token = process.env.QSTASH_TOKEN;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!token || !appUrl) {
      throw new Error('QSTASH_TOKEN and NEXT_PUBLIC_APP_URL are required');
    }

    const client = new Client({ token });
    const scheduleConfig = buildAutomatedPayoutScheduleConfig({
      appUrl,
      configuredBy: admin.id,
      scheduleId: process.env.QSTASH_PAYOUT_SCHEDULE_ID ?? DEFAULT_PAYOUT_SCHEDULE_ID,
      cron: process.env.QSTASH_PAYOUT_CRON ?? DEFAULT_PAYOUT_CRON,
    });
    const schedule = await client.schedules.create(scheduleConfig);

    return NextResponse.json({ ...scheduleConfig, schedule });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to create schedule',
      },
      { status: 400 },
    );
  }
}
