import type { ContributionObligation, Membership } from './types';

export interface EligibilityContext {
  membership: Membership;
  obligationsForCycle: ContributionObligation[];
  allObligations: ContributionObligation[];
}

export function isEligibleForPayout(ctx: EligibilityContext): boolean {
  const { membership, obligationsForCycle, allObligations } = ctx;

  if (membership.hasReceivedPayout) return false;
  if (!['ACTIVE', 'APPROVED'].includes(membership.status)) return false;

  if (membership.payoutEligibilityException) return true;

  const cycleObligation = obligationsForCycle.find((o) => o.membershipId === membership.id);
  if (cycleObligation && cycleObligation.status !== 'PAID') return false;

  const hasOverdue = allObligations.some(
    (o) => o.membershipId === membership.id && (o.status === 'OVERDUE' || o.status === 'PARTIAL'),
  );
  if (hasOverdue) return false;

  return true;
}

export function getEligibleMembers(
  memberships: Membership[],
  obligationsForCycle: ContributionObligation[],
  allObligations: ContributionObligation[],
): Membership[] {
  return memberships.filter((m) =>
    isEligibleForPayout({
      membership: m,
      obligationsForCycle,
      allObligations,
    }),
  );
}

export function getIneligibilityReason(ctx: EligibilityContext): string | null {
  const { membership, obligationsForCycle, allObligations } = ctx;

  if (membership.hasReceivedPayout) return 'Already received payout';
  if (!['ACTIVE', 'APPROVED'].includes(membership.status)) return 'Membership not active';

  if (membership.payoutEligibilityException) return null;

  const cycleObligation = obligationsForCycle.find((o) => o.membershipId === membership.id);
  if (cycleObligation && cycleObligation.status !== 'PAID') {
    return 'Current cycle contribution not paid';
  }

  const overdueCount = allObligations.filter(
    (o) => o.membershipId === membership.id && (o.status === 'OVERDUE' || o.status === 'PARTIAL'),
  ).length;
  if (overdueCount > 0) return `${overdueCount} overdue contribution(s)`;

  return null;
}
