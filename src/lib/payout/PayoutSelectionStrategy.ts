import type { Membership } from "@/lib/domain/types";

export interface DrawResult {
  selectedMembership: Membership;
  eligibleMemberships: Membership[];
  randomSeed: string;
  drawId: string;
}

export interface PayoutSelectionStrategy {
  readonly name: string;
  selectRecipient(
    eligibleMembers: Membership[],
    drawId: string
  ): DrawResult;
}
