import type { ContributionObligation } from "./types";

export const PAYMENT_GRACE_PERIOD_HOURS = 48;
export const PAYMENT_GRACE_PERIOD_MS =
  PAYMENT_GRACE_PERIOD_HOURS * 60 * 60 * 1000;

/** Due dates are stored as calendar dates and become due at UTC midnight. */
export function getObligationDueAt(obligation: ContributionObligation): number {
  return Date.parse(`${obligation.dueDate}T00:00:00.000Z`);
}

export function isObligationOverdue(
  obligation: ContributionObligation,
  currentDateIso: string,
): boolean {
  const currentTime = Date.parse(
    currentDateIso.length === 10
      ? `${currentDateIso}T00:00:00.000Z`
      : currentDateIso,
  );
  return currentTime > getObligationDueAt(obligation) + PAYMENT_GRACE_PERIOD_MS;
}
