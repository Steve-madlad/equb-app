import { generateCycleDates, validateEqubConfig } from '@/lib/domain/cycleUtils';
import { getEligibleMembers, isEligibleForPayout } from '@/lib/domain/eligibility';
import { canJoinEqub, canLeaveEqub, canStartEqub, canTransition } from '@/lib/domain/equbLifecycle';
import { calculatePenalty, formatMoney, toMinorUnits } from '@/lib/domain/money';
import { isObligationOverdue, PAYMENT_GRACE_PERIOD_HOURS } from '@/lib/domain/paymentTiming';
import type { ContributionObligation, Membership } from '@/lib/domain/types';
import { RandomSelectionStrategy } from '@/lib/payout/RandomSelectionStrategy';
import { describe, expect, it } from 'vitest';

describe('money utilities', () => {
  it('converts ETB to minor units', () => {
    expect(toMinorUnits(1000)).toBe(100000);
    expect(toMinorUnits('1000.50')).toBe(100050);
  });

  it('formats money correctly', () => {
    expect(formatMoney(100000)).toBe('1000.00 ETB');
  });

  it('returns zero penalty when disabled', () => {
    expect(calculatePenalty(100000, false, null, null)).toBe(0);
  });

  it('calculates fixed penalty', () => {
    expect(calculatePenalty(100000, true, 'FIXED_AMOUNT', 50)).toBe(5000);
  });
});

describe('equb lifecycle', () => {
  it('allows valid transitions', () => {
    expect(canTransition('DRAFT', 'OPEN_FOR_MEMBERS')).toBe(true);
    expect(canTransition('OPEN_FOR_MEMBERS', 'LOCKED')).toBe(true);
    expect(canTransition('LOCKED', 'ACTIVE')).toBe(true);
  });

  it('blocks invalid transitions', () => {
    expect(canTransition('DRAFT', 'ACTIVE')).toBe(false);
    expect(canTransition('COMPLETED', 'ACTIVE')).toBe(false);
  });

  it('allows joining only when open', () => {
    expect(canJoinEqub('OPEN_FOR_MEMBERS')).toBe(true);
    expect(canJoinEqub('ACTIVE')).toBe(false);
  });

  it('allows leaving only before lock', () => {
    expect(canLeaveEqub('OPEN_FOR_MEMBERS')).toBe(true);
    expect(canLeaveEqub('ACTIVE')).toBe(false);
  });

  it('requires the minimum member threshold before starting the Equb', () => {
    expect(canStartEqub(0, 2, 10)).toBe(false);
    expect(canStartEqub(1, 2, 10)).toBe(false);
    expect(canStartEqub(2, 2, 10)).toBe(true);
    expect(canStartEqub(10, 2, 10)).toBe(true);
    expect(canStartEqub(11, 2, 10)).toBe(false);
  });
});

describe('payout eligibility', () => {
  const baseMembership: Membership = {
    id: 'm1',
    equbId: 'e1',
    userId: 'u1',
    status: 'ACTIVE',
    joinedAt: '2026-01-01',
    hasReceivedPayout: false,
  };

  it('rejects member who already received payout', () => {
    expect(
      isEligibleForPayout({
        membership: { ...baseMembership, hasReceivedPayout: true },
        obligationsForCycle: [],
        allObligations: [],
      }),
    ).toBe(false);
  });

  it('rejects member with unpaid cycle obligation', () => {
    const obligation: ContributionObligation = {
      id: 'o1',
      equbId: 'e1',
      cycleId: 'c1',
      membershipId: 'm1',
      userId: 'u1',
      amountMinor: 100000,
      penaltyMinor: 0,
      totalDueMinor: 100000,
      status: 'PENDING',
      dueDate: '2026-09-01',
    };
    expect(
      isEligibleForPayout({
        membership: baseMembership,
        obligationsForCycle: [obligation],
        allObligations: [obligation],
      }),
    ).toBe(false);
  });

  it('accepts eligible member', () => {
    const obligation: ContributionObligation = {
      id: 'o1',
      equbId: 'e1',
      cycleId: 'c1',
      membershipId: 'm1',
      userId: 'u1',
      amountMinor: 100000,
      penaltyMinor: 0,
      totalDueMinor: 100000,
      status: 'PAID',
      dueDate: '2026-09-01',
      paidAt: '2026-09-01',
    };
    expect(
      isEligibleForPayout({
        membership: baseMembership,
        obligationsForCycle: [obligation],
        allObligations: [obligation],
      }),
    ).toBe(true);
  });

  function obligation(
    id: string,
    cycleId: string,
    status: ContributionObligation['status'],
  ): ContributionObligation {
    return {
      id,
      equbId: 'e1',
      cycleId,
      membershipId: 'm1',
      userId: 'u1',
      amountMinor: 100000,
      penaltyMinor: 0,
      totalDueMinor: 100000,
      status,
      dueDate: cycleId === 'c1' ? '2026-09-01' : '2026-10-01',
    };
  }

  it('keeps a member eligible after a late obligation is settled', () => {
    const settled = obligation('o1', 'c1', 'PAID');
    expect(
      isEligibleForPayout({
        membership: baseMembership,
        obligationsForCycle: [settled],
        allObligations: [settled],
      }),
    ).toBe(true);
  });

  it('does not let a newer payment erase an older unresolved overdue obligation', () => {
    const cycleOne = obligation('o1', 'c1', 'OVERDUE');
    const cycleTwo = obligation('o2', 'c2', 'PAID');
    expect(
      isEligibleForPayout({
        membership: baseMembership,
        obligationsForCycle: [cycleTwo],
        allObligations: [cycleOne, cycleTwo],
      }),
    ).toBe(false);
  });

  it('allows a future payout after all overdue obligations are settled', () => {
    const cycleOne = obligation('o1', 'c1', 'PAID');
    const cycleTwo = obligation('o2', 'c2', 'PAID');
    expect(
      isEligibleForPayout({
        membership: baseMembership,
        obligationsForCycle: [cycleTwo],
        allObligations: [cycleOne, cycleTwo],
      }),
    ).toBe(true);
  });

  it('allows an explicit admin exception without changing payment status', () => {
    const unpaid = obligation('o1', 'c1', 'OVERDUE');
    const membership = {
      ...baseMembership,
      payoutEligibilityException: {
        grantedBy: 'admin-1',
        grantedAt: '2026-09-03T00:00:00.000Z',
        reason: 'Approved hardship exception',
      },
    };
    expect(
      isEligibleForPayout({
        membership,
        obligationsForCycle: [unpaid],
        allObligations: [unpaid],
      }),
    ).toBe(true);
    expect(unpaid.status).toBe('OVERDUE');
  });

  it('keeps a previous payout intact while blocking future eligibility', () => {
    const overdue = obligation('o1', 'c1', 'OVERDUE');
    expect(
      isEligibleForPayout({
        membership: { ...baseMembership, hasReceivedPayout: true },
        obligationsForCycle: [overdue],
        allObligations: [overdue],
      }),
    ).toBe(false);
  });

  it('keeps compliant members eligible when another member has not paid', () => {
    const unpaid = obligation('o1', 'c1', 'PENDING');
    const compliant = { ...baseMembership, id: 'm2', userId: 'u2' };
    const paid = {
      ...unpaid,
      id: 'o2',
      membershipId: 'm2',
      userId: 'u2',
      status: 'PAID' as const,
    };
    expect(getEligibleMembers([baseMembership, compliant], [unpaid, paid], [unpaid, paid])).toEqual(
      [compliant],
    );
  });
});

describe('payment grace period', () => {
  const lateObligation = {
    id: 'o1',
    equbId: 'e1',
    cycleId: 'c1',
    membershipId: 'm1',
    userId: 'u1',
    amountMinor: 100000,
    penaltyMinor: 0,
    totalDueMinor: 100000,
    status: 'PENDING' as const,
    dueDate: '2026-09-01',
  };

  it('uses a 48-hour grace period', () => {
    expect(PAYMENT_GRACE_PERIOD_HOURS).toBe(48);
    expect(isObligationOverdue(lateObligation, '2026-09-02T23:59:59.000Z')).toBe(false);
    expect(isObligationOverdue(lateObligation, '2026-09-03T00:00:00.000Z')).toBe(false);
    expect(isObligationOverdue(lateObligation, '2026-09-03T00:00:01.000Z')).toBe(true);
  });
});

describe('random selection', () => {
  it('selects from eligible members', () => {
    const strategy = new RandomSelectionStrategy();
    const members: Membership[] = [
      {
        id: 'm1',
        equbId: 'e1',
        userId: 'u1',
        status: 'ACTIVE',
        joinedAt: '',
        hasReceivedPayout: false,
      },
      {
        id: 'm2',
        equbId: 'e1',
        userId: 'u2',
        status: 'ACTIVE',
        joinedAt: '',
        hasReceivedPayout: false,
      },
    ];
    const result = strategy.selectRecipient(members, 'draw-1');
    expect(members.map((m) => m.id)).toContain(result.selectedMembership.id);
    expect(result.randomSeed).toHaveLength(64);
  });

  it('throws when no eligible members', () => {
    const strategy = new RandomSelectionStrategy();
    expect(() => strategy.selectRecipient([], 'draw-1')).toThrow();
  });
});

describe('cycle utilities', () => {
  it('generates monthly cycle dates', () => {
    const dates = generateCycleDates('2026-09-01', 'MONTHLY', 3);
    expect(dates).toHaveLength(3);
    expect(dates[0]).toBe('2026-10-01');
  });

  it('generates daily custom cycle dates from the configured start date', () => {
    const dates = generateCycleDates('2026-08-31', 'CUSTOM', 3, 1);
    expect(dates).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
  });

  it('validates equb config', () => {
    const errors = validateEqubConfig({
      name: '',
      contributionAmountMinor: 0,
      currency: 'ETB',
      frequency: 'MONTHLY',
      numberOfCycles: 1,
      memberLimit: 1,
      startDate: '',
      penaltyEnabled: false,
      penaltyType: null,
      penaltyAmount: null,
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('payout accounts and supported institutions', () => {
  it('includes top Ethiopian institutions in fallback list', async () => {
    const { FALLBACK_ETHIOPIAN_BANKS } = await import('@/lib/services/chapaTransferService');
    expect(FALLBACK_ETHIOPIAN_BANKS.length).toBe(10);
    const codes = FALLBACK_ETHIOPIAN_BANKS.map((b) => b.code);
    expect(codes).toContain('cbe');
    expect(codes).toContain('telebirr');
    expect(codes).toContain('abyssinia');
    expect(codes).toContain('awash');
    expect(codes).toContain('dashen');
    expect(codes).toContain('mpesa');
    expect(codes).toContain('cbebirr');
    expect(codes).toContain('coop');
    expect(codes).toContain('amhara');
    expect(codes).toContain('enat');
  });
});
