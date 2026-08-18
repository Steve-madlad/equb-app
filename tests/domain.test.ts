import {
  generateCycleDates,
  validateEqubConfig,
} from "@/lib/domain/cycleUtils";
import { isEligibleForPayout } from "@/lib/domain/eligibility";
import {
  canJoinEqub,
  canLeaveEqub,
  canStartEqub,
  canTransition,
} from "@/lib/domain/equbLifecycle";
import {
  calculatePenalty,
  formatMoney,
  toMinorUnits,
} from "@/lib/domain/money";
import type { ContributionObligation, Membership } from "@/lib/domain/types";
import { RandomSelectionStrategy } from "@/lib/payout/RandomSelectionStrategy";
import { describe, expect, it } from "vitest";

describe("money utilities", () => {
  it("converts ETB to minor units", () => {
    expect(toMinorUnits(1000)).toBe(100000);
    expect(toMinorUnits("1000.50")).toBe(100050);
  });

  it("formats money correctly", () => {
    expect(formatMoney(100000)).toBe("1000.00 ETB");
  });

  it("returns zero penalty when disabled", () => {
    expect(calculatePenalty(100000, false, null, null)).toBe(0);
  });

  it("calculates fixed penalty", () => {
    expect(calculatePenalty(100000, true, "FIXED_AMOUNT", 50)).toBe(5000);
  });
});

describe("equb lifecycle", () => {
  it("allows valid transitions", () => {
    expect(canTransition("DRAFT", "OPEN_FOR_MEMBERS")).toBe(true);
    expect(canTransition("OPEN_FOR_MEMBERS", "LOCKED")).toBe(true);
    expect(canTransition("LOCKED", "ACTIVE")).toBe(true);
  });

  it("blocks invalid transitions", () => {
    expect(canTransition("DRAFT", "ACTIVE")).toBe(false);
    expect(canTransition("COMPLETED", "ACTIVE")).toBe(false);
  });

  it("allows joining only when open", () => {
    expect(canJoinEqub("OPEN_FOR_MEMBERS")).toBe(true);
    expect(canJoinEqub("ACTIVE")).toBe(false);
  });

  it("allows leaving only before lock", () => {
    expect(canLeaveEqub("OPEN_FOR_MEMBERS")).toBe(true);
    expect(canLeaveEqub("ACTIVE")).toBe(false);
  });

  it("requires the minimum member threshold before starting the Equb", () => {
    expect(canStartEqub(0, 1, 10)).toBe(false);
    expect(canStartEqub(1, 1, 10)).toBe(true);
    expect(canStartEqub(10, 1, 10)).toBe(true);
    expect(canStartEqub(11, 1, 10)).toBe(false);
  });
});

describe("payout eligibility", () => {
  const baseMembership: Membership = {
    id: "m1",
    equbId: "e1",
    userId: "u1",
    status: "ACTIVE",
    joinedAt: "2026-01-01",
    hasReceivedPayout: false,
  };

  it("rejects member who already received payout", () => {
    expect(
      isEligibleForPayout({
        membership: { ...baseMembership, hasReceivedPayout: true },
        obligationsForCycle: [],
        allObligations: [],
      }),
    ).toBe(false);
  });

  it("rejects member with unpaid cycle obligation", () => {
    const obligation: ContributionObligation = {
      id: "o1",
      equbId: "e1",
      cycleId: "c1",
      membershipId: "m1",
      userId: "u1",
      amountMinor: 100000,
      penaltyMinor: 0,
      totalDueMinor: 100000,
      status: "PENDING",
      dueDate: "2026-09-01",
    };
    expect(
      isEligibleForPayout({
        membership: baseMembership,
        obligationsForCycle: [obligation],
        allObligations: [obligation],
      }),
    ).toBe(false);
  });

  it("accepts eligible member", () => {
    const obligation: ContributionObligation = {
      id: "o1",
      equbId: "e1",
      cycleId: "c1",
      membershipId: "m1",
      userId: "u1",
      amountMinor: 100000,
      penaltyMinor: 0,
      totalDueMinor: 100000,
      status: "PAID",
      dueDate: "2026-09-01",
      paidAt: "2026-09-01",
    };
    expect(
      isEligibleForPayout({
        membership: baseMembership,
        obligationsForCycle: [obligation],
        allObligations: [obligation],
      }),
    ).toBe(true);
  });
});

describe("random selection", () => {
  it("selects from eligible members", () => {
    const strategy = new RandomSelectionStrategy();
    const members: Membership[] = [
      {
        id: "m1",
        equbId: "e1",
        userId: "u1",
        status: "ACTIVE",
        joinedAt: "",
        hasReceivedPayout: false,
      },
      {
        id: "m2",
        equbId: "e1",
        userId: "u2",
        status: "ACTIVE",
        joinedAt: "",
        hasReceivedPayout: false,
      },
    ];
    const result = strategy.selectRecipient(members, "draw-1");
    expect(members.map((m) => m.id)).toContain(result.selectedMembership.id);
    expect(result.randomSeed).toHaveLength(64);
  });

  it("throws when no eligible members", () => {
    const strategy = new RandomSelectionStrategy();
    expect(() => strategy.selectRecipient([], "draw-1")).toThrow();
  });
});

describe("cycle utilities", () => {
  it("generates monthly cycle dates", () => {
    const dates = generateCycleDates("2026-09-01", "MONTHLY", 3);
    expect(dates).toHaveLength(3);
    expect(dates[0]).toBe("2026-09-01");
  });

  it("validates equb config", () => {
    const errors = validateEqubConfig({
      name: "",
      contributionAmountMinor: 0,
      currency: "ETB",
      frequency: "MONTHLY",
      numberOfCycles: 1,
      memberLimit: 1,
      startDate: "",
      penaltyEnabled: false,
      penaltyType: null,
      penaltyAmount: null,
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});
