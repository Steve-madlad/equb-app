import type { EqubStatus } from './types';

const VALID_TRANSITIONS: Record<EqubStatus, EqubStatus[]> = {
  DRAFT: ['OPEN_FOR_MEMBERS', 'CANCELLED'],
  OPEN_FOR_MEMBERS: ['LOCKED', 'CANCELLED'],
  LOCKED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['ACTIVE', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: EqubStatus, to: EqubStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: EqubStatus, to: EqubStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid Equb status transition: ${from} → ${to}`);
  }
}

export function canJoinEqub(status: EqubStatus): boolean {
  return status === 'OPEN_FOR_MEMBERS';
}

export function canLeaveEqub(status: EqubStatus): boolean {
  return status === 'OPEN_FOR_MEMBERS' || status === 'DRAFT';
}

export function canStartEqub(
  memberCount: number,
  minimumMemberCount: number,
  memberLimit: number,
): boolean {
  if (!Number.isFinite(memberCount) || !Number.isFinite(minimumMemberCount)) {
    return false;
  }
  if (minimumMemberCount < 2) return false;
  return memberCount >= minimumMemberCount && memberCount <= memberLimit;
}

export function isMembershipLocked(status: EqubStatus): boolean {
  return ['LOCKED', 'ACTIVE', 'PAUSED', 'COMPLETED'].includes(status);
}

export function canInitiateDraw(status: EqubStatus, cycleStatus: string): boolean {
  return (
    (status === 'ACTIVE' || status === 'PAUSED') &&
    (cycleStatus === 'DRAW_PENDING' || cycleStatus === 'WAITING_FOR_ELIGIBILITY')
  );
}
