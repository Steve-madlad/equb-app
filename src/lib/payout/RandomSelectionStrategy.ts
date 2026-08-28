import { randomInt, randomBytes } from 'crypto';
import type { Membership } from '@/lib/domain/types';
import type { DrawResult, PayoutSelectionStrategy } from './PayoutSelectionStrategy';

/**
 * Server-side cryptographically secure random selection.
 * Uses Node crypto.randomInt — NOT Math.random().
 */
export class RandomSelectionStrategy implements PayoutSelectionStrategy {
  readonly name = 'random';

  selectRecipient(eligibleMembers: Membership[], drawId: string): DrawResult {
    if (eligibleMembers.length === 0) {
      throw new Error('No eligible members for payout draw');
    }

    const randomSeed = randomBytes(32).toString('hex');
    const index = randomInt(0, eligibleMembers.length);
    const selectedMembership = eligibleMembers[index];

    return {
      selectedMembership,
      eligibleMemberships: eligibleMembers,
      randomSeed,
      drawId,
    };
  }
}

export function getPayoutSelectionStrategy(): PayoutSelectionStrategy {
  return new RandomSelectionStrategy();
}
