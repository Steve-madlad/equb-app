import { describe, expect, it } from 'vitest';

import type { Cycle } from '@/lib/domain/types';
import { getDuePayoutCycles } from '@/lib/services/payoutService';
import {
  buildAutomatedPayoutScheduleConfig,
  DEFAULT_PAYOUT_CRON,
  DEFAULT_PAYOUT_SCHEDULE_ID,
} from '@/lib/services/payoutSchedule';

describe('automated payout scheduling', () => {
  it('builds a stable QStash schedule config', () => {
    const schedule = buildAutomatedPayoutScheduleConfig({
      appUrl: 'https://example.com/',
      configuredBy: 'admin-1',
    });

    expect(schedule).toEqual({
      scheduleId: DEFAULT_PAYOUT_SCHEDULE_ID,
      destination: 'https://example.com/api/admin/maintenance/payouts',
      cron: DEFAULT_PAYOUT_CRON,
      body: JSON.stringify({
        source: DEFAULT_PAYOUT_SCHEDULE_ID,
        configuredBy: 'admin-1',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('keeps the due-cycle filter aligned with the automated payout run', () => {
    const cycles: Cycle[] = [
      {
        id: 'future',
        equbId: 'e1',
        cycleNumber: 3,
        dueDate: '2026-09-03',
        status: 'ACTIVE',
        poolAmountMinor: 0,
      },
      {
        id: 'paused',
        equbId: 'e1',
        cycleNumber: 2,
        dueDate: '2026-08-31',
        status: 'UPCOMING',
        poolAmountMinor: 0,
      },
      {
        id: 'due-2',
        equbId: 'e1',
        cycleNumber: 2,
        dueDate: '2026-08-31',
        status: 'DRAW_PENDING',
        poolAmountMinor: 0,
      },
      {
        id: 'due-1',
        equbId: 'e1',
        cycleNumber: 1,
        dueDate: '2026-08-30',
        status: 'WAITING_FOR_ELIGIBILITY',
        poolAmountMinor: 0,
      },
      {
        id: 'done',
        equbId: 'e1',
        cycleNumber: 4,
        dueDate: '2026-08-29',
        status: 'COMPLETED',
        poolAmountMinor: 0,
      },
    ];

    expect(getDuePayoutCycles(cycles, '2026-08-31T12:00:00.000Z').map((cycle) => cycle.id)).toEqual([
      'due-1',
      'due-2',
    ]);
  });
});
