import type { ContributionFrequency, EqubConfig } from "./types";

export function generateCycleDates(
  startDate: string,
  frequency: ContributionFrequency,
  numberOfCycles: number,
  customIntervalDays?: number
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);

  for (let i = 0; i < numberOfCycles; i++) {
    const date = new Date(start);
    if (frequency === "MONTHLY") {
      date.setMonth(start.getMonth() + i + 1);
    } else if (frequency === "WEEKLY") {
      date.setDate(start.getDate() + (i + 1) * 7);
    } else if (frequency === "CUSTOM" && customIntervalDays) {
      date.setDate(start.getDate() + (i + 1) * customIntervalDays);
    }
    dates.push(date.toISOString().split("T")[0]);
  }

  return dates;
}

export function calculatePoolAmount(
  contributionAmountMinor: number,
  memberCount: number
): number {
  return contributionAmountMinor * memberCount;
}

export function validateEqubConfig(config: Partial<EqubConfig>): string[] {
  const errors: string[] = [];

  if (!config.name?.trim()) errors.push("Name is required");
  if (!config.contributionAmountMinor || config.contributionAmountMinor <= 0)
    errors.push("Contribution amount must be positive");
  if (!config.numberOfCycles || config.numberOfCycles < 1)
    errors.push("Number of cycles must be at least 1");
  if (!config.memberLimit || config.memberLimit < 2)
    errors.push("Member limit must be at least 2");
  if (!config.minimumMemberCount || config.minimumMemberCount < 2)
    errors.push("Minimum member count must be at least 2");
  if (
    config.minimumMemberCount &&
    config.memberLimit &&
    config.minimumMemberCount > config.memberLimit
  ) {
    errors.push("Minimum member count cannot exceed member limit");
  }
  if (config.numberOfCycles && config.memberLimit && config.numberOfCycles !== config.memberLimit)
    errors.push("Number of cycles should equal member limit (one payout per member)");
  if (!config.startDate) errors.push("Start date is required");
  if (config.frequency === "CUSTOM" && !config.customIntervalDays)
    errors.push("Custom interval days required for CUSTOM frequency");

  return errors;
}
