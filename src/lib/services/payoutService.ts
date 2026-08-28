import { getEligibleMembers, getIneligibilityReason } from '@/lib/domain/eligibility';
import { formatMoney } from '@/lib/domain/money';
import type { Cycle, Payout, PayoutDraw } from '@/lib/domain/types';
import { COLLECTIONS, getAdminDb } from '@/lib/firebase/admin';
import { getUserProfile } from '@/lib/firebase/auth';
import { getPayoutSelectionStrategy } from '@/lib/payout/RandomSelectionStrategy';
import { v4 as uuidv4 } from 'uuid';
import { createAuditLog } from './auditService';
import { initiatePayoutTransfer, verifyPayoutTransfer } from './chapaTransferService';
import { getCyclesForEqub, getEqub, getMembershipsForEqub } from './equbService';
import { createLedgerEntry, getSettledContributionTotalForCycle } from './ledgerService';
import { createNotification } from './notificationService';
import { getObligationsForCycle, markOverdueObligationsForEqub } from './paymentService';

export interface DrawPayoutResult {
  draw: PayoutDraw;
  payout: Payout;
  cycle: Cycle;
}

export interface AutomatedPayoutCycleResult {
  equbId: string;
  equbName: string;
  cycleId: string;
  cycleNumber: number;
  status:
    | 'PAYOUT_COMPLETED'
    | 'DRAW_CREATED_PAYOUT_PENDING'
    | 'WAITING_FOR_ELIGIBILITY'
    | 'SKIPPED'
    | 'FAILED';
  paidMember: {
    userId: string;
    membershipId: string;
    amountMinor: number;
  } | null;
  selectedMember: {
    userId: string;
    membershipId: string;
    amountMinor: number;
  } | null;
  eligibleMembers: string[];
  notPaidMembers: Array<{
    userId: string;
    membershipId: string;
    reason: string;
  }>;
  error?: string;
}

export interface AutomatedPayoutRunResult {
  processedAt: string;
  reconciledCount: number;
  cycles: AutomatedPayoutCycleResult[];
}

/**
 * Sweeps due cycles, reconciles stuck payouts, and delegates selection
 * and settlement to transaction-backed payout operations.
 */
export async function runAutomatedPayouts(
  currentDateIso: string = new Date().toISOString(),
): Promise<AutomatedPayoutRunResult> {
  const db = getAdminDb();
  const currentDate = currentDateIso.slice(0, 10);

  // 1. Reconcile stuck transfers (>12h verification, >24h admin escalation)
  const reconciledCount = await reconcilePendingPayouts(currentDateIso);

  // 2. Query and process due cycles
  const cycleSnapshot = await db.collection(COLLECTIONS.cycles).get();
  const dueCycles = cycleSnapshot.docs
    .map((doc) => doc.data() as Cycle)
    .filter(
      (cycle) =>
        cycle.dueDate <= currentDate &&
        ['ACTIVE', 'DRAW_PENDING', 'WAITING_FOR_ELIGIBILITY', 'DRAWN'].includes(cycle.status),
    )
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));

  const results: AutomatedPayoutCycleResult[] = [];
  for (const cycle of dueCycles) {
    const equb = await getEqub(cycle.equbId);
    if (!equb || !['ACTIVE', 'PAUSED'].includes(equb.status)) continue;

    const memberships = await getMembershipsForEqub(equb.id);
    const activeMemberships = memberships.filter((membership) =>
      ['ACTIVE', 'APPROVED'].includes(membership.status),
    );
    const cycleObligations = await getObligationsForCycle(cycle.id);
    const allObligationsSnapshot = await db
      .collection(COLLECTIONS.obligations)
      .where('equbId', '==', equb.id)
      .get();
    const allObligations = allObligationsSnapshot.docs.map(
      (doc) => doc.data() as import('@/lib/domain/types').ContributionObligation,
    );
    const eligible = getEligibleMembers(activeMemberships, cycleObligations, allObligations);
    const notPaidMembers = activeMemberships
      .filter((membership) => !eligible.some((member) => member.id === membership.id))
      .map((membership) => ({
        userId: membership.userId,
        membershipId: membership.id,
        reason:
          getIneligibilityReason({
            membership,
            obligationsForCycle: cycleObligations,
            allObligations,
          }) ?? 'Not selected for this cycle',
      }));

    try {
      let payout = await getPendingPayoutForCycle(cycle.id);
      if (!payout && !cycle.drawId) {
        const drawn = await drawPayoutRecipient(equb.id, cycle.id, 'system:qstash', {
          currentDateIso,
        });
        payout = drawn.payout;
      }

      if (!payout) {
        results.push({
          equbId: equb.id,
          equbName: equb.name,
          cycleId: cycle.id,
          cycleNumber: cycle.cycleNumber,
          status: 'WAITING_FOR_ELIGIBILITY',
          paidMember: null,
          selectedMember: null,
          eligibleMembers: eligible.map((membership) => membership.userId),
          notPaidMembers: notPaidMembers.map((member) => ({
            ...member,
            reason:
              member.reason === 'Not selected for this cycle'
                ? 'No eligible member was available'
                : member.reason,
          })),
        });
        continue;
      }

      if (payout.status === 'COMPLETED') {
        const paidMember = {
          userId: payout.userId,
          membershipId: payout.membershipId,
          amountMinor: payout.amountMinor,
        };
        results.push({
          equbId: equb.id,
          equbName: equb.name,
          cycleId: cycle.id,
          cycleNumber: cycle.cycleNumber,
          status: 'PAYOUT_COMPLETED',
          paidMember,
          selectedMember: paidMember,
          eligibleMembers: eligible.map((membership) => membership.userId),
          notPaidMembers: getNotPaidMembers(activeMemberships, paidMember.userId, notPaidMembers),
        });
        continue;
      }

      const selectedMember = {
        userId: payout.userId,
        membershipId: payout.membershipId,
        amountMinor: payout.amountMinor,
      };
      results.push({
        equbId: equb.id,
        equbName: equb.name,
        cycleId: cycle.id,
        cycleNumber: cycle.cycleNumber,
        status: 'DRAW_CREATED_PAYOUT_PENDING',
        paidMember: null,
        selectedMember,
        eligibleMembers: eligible.map((membership) => membership.userId),
        notPaidMembers: getNotPaidMembers(activeMemberships, selectedMember.userId, notPaidMembers),
      });
    } catch (error) {
      results.push({
        equbId: equb.id,
        equbName: equb.name,
        cycleId: cycle.id,
        cycleNumber: cycle.cycleNumber,
        status:
          error instanceof Error && error.message.includes('No eligible')
            ? 'WAITING_FOR_ELIGIBILITY'
            : 'FAILED',
        paidMember: null,
        selectedMember: null,
        eligibleMembers: eligible.map((membership) => membership.userId),
        notPaidMembers,
        error: error instanceof Error ? error.message : 'Automated payout failed',
      });
    }
  }

  await notifyAdminsOfAutomatedPayoutRun({
    processedAt: currentDateIso,
    reconciledCount,
    cycles: results,
  });
  return { processedAt: currentDateIso, reconciledCount, cycles: results };
}

/**
 * Reconciles stuck transfers and unapproved payouts:
 * - If in PROCESSING/AWAITING_ADMIN_APPROVAL > 12h: queries Chapa verification endpoint.
 * - If in PROCESSING/AWAITING_ADMIN_APPROVAL > 24h: emits admin escalation notification.
 */
export async function reconcilePendingPayouts(
  currentDateIso: string = new Date().toISOString(),
): Promise<number> {
  const db = getAdminDb();
  const nowMs = new Date(currentDateIso).getTime();
  const snapshot = await db
    .collection(COLLECTIONS.payouts)
    .where('status', 'in', ['PROCESSING', 'AWAITING_ADMIN_APPROVAL', 'PENDING'])
    .get();

  let reconciled = 0;
  for (const doc of snapshot.docs) {
    const payout = doc.data() as Payout;
    const createdAtMs = new Date(payout.createdAt || currentDateIso).getTime();
    const ageHours = (nowMs - createdAtMs) / (1000 * 60 * 60);

    // 12-Hour Fallback: Check verification if transfer reference exists
    if (ageHours >= 12 && payout.transferReference) {
      try {
        const verifyResult = await verifyPayoutTransfer(payout.transferReference);
        if (verifyResult.status === 'SUCCESS') {
          await completePayout(payout.id, 'system:reconciliation', {
            transferReference: payout.transferReference,
            bankName: payout.bankName,
          });
          reconciled++;
          continue;
        } else if (verifyResult.status === 'FAILED') {
          await doc.ref.update({
            status: 'FAILED',
            failureReason: verifyResult.message ?? 'Transfer failed on provider',
            updatedAt: currentDateIso,
          });
          await createAuditLog({
            action: 'PAYOUT_TRANSFER_FAILED',
            actorId: 'system:reconciliation',
            equbId: payout.equbId,
            affectedUserId: payout.userId,
            entityId: payout.id,
            metadata: { reason: verifyResult.message },
          });
          reconciled++;
          continue;
        }
      } catch (err) {
        console.warn(`Error verifying stuck payout ${payout.id}:`, err);
      }
    }

    // 24-Hour Escalation Alert to Admins
    if (ageHours >= 24) {
      const winner = await getUserProfile(payout.userId);
      const winnerName = winner?.displayName ?? payout.userId;
      const admins = await db.collection(COLLECTIONS.users).where('role', '==', 'ADMIN').get();

      for (const adminDoc of admins.docs) {
        await createNotification({
          id: `escalation-${payout.id}-${adminDoc.id}`,
          userId: adminDoc.id,
          type: 'PAYOUT_ACTION_REQUIRED',
          title: 'Escalation: Unresolved Payout',
          message: `ESCALATION: Cycle payout for ${winnerName} has been pending/unapproved for over 24 hours (Ref: ${payout.transferReference ?? payout.id}).`,
          equbId: payout.equbId,
        });
      }
    }
  }

  return reconciled;
}

function getNotPaidMembers(
  activeMemberships: import('@/lib/domain/types').Membership[],
  paidUserId: string,
  ineligibleMembers: Array<{
    userId: string;
    membershipId: string;
    reason: string;
  }>,
): Array<{ userId: string; membershipId: string; reason: string }> {
  const ineligibleByMembershipId = new Map(
    ineligibleMembers.map((member) => [member.membershipId, member.reason]),
  );
  return activeMemberships
    .filter((membership) => membership.userId !== paidUserId)
    .map((membership) => ({
      userId: membership.userId,
      membershipId: membership.id,
      reason:
        ineligibleByMembershipId.get(membership.id) ?? 'Eligible but not selected for this cycle',
    }));
}

async function getPendingPayoutForCycle(cycleId: string): Promise<Payout | null> {
  const snapshot = await getAdminDb()
    .collection(COLLECTIONS.payouts)
    .where('cycleId', '==', cycleId)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as Payout;
}

async function notifyAdminsOfAutomatedPayoutRun(run: AutomatedPayoutRunResult): Promise<void> {
  const db = getAdminDb();
  const admins = await db.collection(COLLECTIONS.users).where('role', '==', 'ADMIN').get();

  for (const adminDoc of admins.docs) {
    for (const cycle of run.cycles) {
      const paid = cycle.paidMember
        ? `Paid: ${cycle.paidMember.userId} (${formatMoney(cycle.paidMember.amountMinor)}).`
        : cycle.selectedMember
          ? `Selected but not paid: ${cycle.selectedMember.userId} (${formatMoney(cycle.selectedMember.amountMinor)}); payout is pending disbursement.`
          : 'Paid: none.';
      const notPaid = cycle.notPaidMembers.length
        ? cycle.notPaidMembers.map((member) => `${member.userId}: ${member.reason}`).join('; ')
        : 'Not paid: none.';
      await createNotification({
        id: `automated-payout-${cycle.cycleId}-${adminDoc.id}`,
        userId: adminDoc.id,
        type: 'GENERAL',
        title:
          cycle.status === 'PAYOUT_COMPLETED'
            ? `Automated payout completed: ${cycle.equbName}`
            : `Automated payout needs attention: ${cycle.equbName}`,
        message: `Cycle ${cycle.cycleNumber}: ${paid} Eligible members: ${cycle.eligibleMembers.length}. ${notPaid}${cycle.error ? ` Error: ${cycle.error}` : ''}`,
        equbId: cycle.equbId,
      });
    }
  }
}

/**
 * Performs a server-side random payout draw with full atomicity.
 * Protected against duplicate/concurrent execution via Firestore transaction
 * and cycle status checks.
 *
 * Post-draw, initiates Chapa transfer non-blockingly without rolling back the draw.
 */
export async function drawPayoutRecipient(
  equbId: string,
  cycleId: string,
  adminId: string,
  options?: { currentDateIso?: string },
): Promise<DrawPayoutResult> {
  const db = getAdminDb();
  const cycleRef = db.collection(COLLECTIONS.cycles).doc(cycleId);
  const currentDateIso = options?.currentDateIso ?? new Date().toISOString();
  const currentDate = currentDateIso.slice(0, 10);

  await markOverdueObligationsForEqub(equbId, currentDateIso);
  const settledPoolAmount = await getSettledContributionTotalForCycle(cycleId);

  // 1. Transactional Draw Execution
  const drawResult = await db.runTransaction(async (transaction) => {
    const cycleDoc = await transaction.get(cycleRef);
    if (!cycleDoc.exists) throw new Error('Cycle not found');

    const cycle = cycleDoc.data() as Cycle;
    if (cycle.equbId !== equbId) throw new Error('Cycle does not belong to Equb');

    if (cycle.payoutRecipientId || cycle.drawId) {
      throw new Error('Payout already drawn for this cycle');
    }

    if (cycle.dueDate > currentDate) {
      throw new Error(`Cycle is not due until ${cycle.dueDate}`);
    }

    if (!['ACTIVE', 'DRAW_PENDING', 'WAITING_FOR_ELIGIBILITY'].includes(cycle.status)) {
      throw new Error(`Cycle not ready for draw: ${cycle.status}`);
    }

    const equb = await getEqub(equbId);
    if (!equb) throw new Error('Equb not found');
    if (equb.status !== 'ACTIVE' && equb.status !== 'PAUSED') {
      throw new Error('Equb is not active');
    }

    const memberships = await getMembershipsForEqub(equbId);
    const activeMemberships = memberships.filter((m) => ['ACTIVE', 'APPROVED'].includes(m.status));

    const cycleObligations = await getObligationsForCycle(cycleId);

    const allObligationsSnapshot = await db
      .collection(COLLECTIONS.obligations)
      .where('equbId', '==', equbId)
      .get();
    const allObligations = allObligationsSnapshot.docs.map(
      (d) => d.data() as import('@/lib/domain/types').ContributionObligation,
    );

    const eligible = getEligibleMembers(activeMemberships, cycleObligations, allObligations);

    if (settledPoolAmount <= 0) {
      throw new Error("No settled contributions are available for this cycle's payout.");
    }

    if (eligible.length === 0) {
      await createAuditLog({
        action: 'PAYOUT_DRAW_STARTED',
        actorId: adminId,
        equbId,
        entityId: cycleId,
        metadata: { result: 'NO_ELIGIBLE_MEMBERS', cycleContinues: true },
      });
      throw new Error(
        'No eligible members for payout. The cycle remains open for eligible members.',
      );
    }

    const drawId = uuidv4();
    const strategy = getPayoutSelectionStrategy();
    const result = strategy.selectRecipient(eligible, drawId);

    const draw: PayoutDraw = {
      id: drawId,
      equbId,
      cycleId,
      eligibleMemberIds: eligible.map((m) => m.id),
      selectedMemberId: result.selectedMembership.userId,
      selectedMembershipId: result.selectedMembership.id,
      performedBy: adminId,
      performedAt: new Date().toISOString(),
      randomSeed: result.randomSeed,
      poolAmountMinor: settledPoolAmount,
    };

    const payout: Payout = {
      id: uuidv4(),
      equbId,
      cycleId,
      membershipId: result.selectedMembership.id,
      userId: result.selectedMembership.userId,
      amountMinor: settledPoolAmount,
      status: 'PROCESSING',
      drawId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    transaction.set(db.collection(COLLECTIONS.draws).doc(drawId), draw);
    transaction.set(db.collection(COLLECTIONS.payouts).doc(payout.id), payout);
    transaction.update(cycleRef, {
      status: 'DRAWN',
      poolAmountMinor: settledPoolAmount,
      payoutRecipientId: result.selectedMembership.userId,
      drawId,
      drawnAt: new Date().toISOString(),
    });
    transaction.update(db.collection(COLLECTIONS.memberships).doc(result.selectedMembership.id), {
      hasReceivedPayout: true,
      payoutReceivedAt: new Date().toISOString(),
      payoutCycleId: cycleId,
    });

    await createAuditLog({
      action: 'PAYOUT_DRAW_STARTED',
      actorId: adminId,
      equbId,
      entityId: cycleId,
    });

    await createAuditLog({
      action: 'PAYOUT_RECIPIENT_SELECTED',
      actorId: adminId,
      equbId,
      affectedUserId: result.selectedMembership.userId,
      entityId: drawId,
      metadata: {
        eligibleCount: eligible.length,
        randomSeed: result.randomSeed,
        poolAmount: formatMoney(settledPoolAmount),
      },
    });

    await createLedgerEntry({
      equbId,
      userId: result.selectedMembership.userId,
      membershipId: result.selectedMembership.id,
      cycleId,
      type: 'PAYOUT_OBLIGATION',
      amountMinor: settledPoolAmount,
      currency: 'ETB',
      description: `Payout obligation for cycle ${cycle.cycleNumber}`,
      referenceId: payout.id,
      referenceType: 'payout',
      createdBy: adminId,
    });

    return {
      draw,
      payout,
      cycle: { ...cycle, status: 'DRAWN' as const },
      selectedMembership: result.selectedMembership,
      activeMemberships,
    };
  });

  const { draw, payout, cycle, selectedMembership, activeMemberships } = drawResult;

  // 2. Initial Winner Processing Notification ("No premature declaration")
  await createNotification({
    userId: selectedMembership.userId,
    type: 'PAYOUT_PROCESSING',
    title: 'Congratulations! You won the Equb draw',
    message: `You won Cycle #${cycle.cycleNumber}! Your payout of ${formatMoney(settledPoolAmount)} is currently being processed.`,
    equbId,
  });

  // Notify other members of the draw result
  for (const member of activeMemberships) {
    if (member.userId !== selectedMembership.userId) {
      await createNotification({
        userId: member.userId,
        type: 'PAYOUT_DRAW_RESULT',
        title: 'Equb Draw Result',
        message: `Cycle ${cycle.cycleNumber} payout recipient has been selected.`,
        equbId,
      });
    }
  }

  // 3. Non-blocking Outbound Transfer Dispatch
  const winnerProfile = await getUserProfile(selectedMembership.userId);
  const adminQuery = await db.collection(COLLECTIONS.users).where('role', '==', 'ADMIN').get();

  if (winnerProfile?.payoutAccount) {
    try {
      const transferResult = await initiatePayoutTransfer({
        payoutId: payout.id,
        amountMinor: settledPoolAmount,
        currency: 'ETB',
        account: winnerProfile.payoutAccount,
      });

      const nowIso = new Date().toISOString();

      if (transferResult.status === 'AWAITING_ADMIN_APPROVAL') {
        await db.collection(COLLECTIONS.payouts).doc(payout.id).update({
          status: 'AWAITING_ADMIN_APPROVAL',
          transferReference: transferResult.transferReference,
          bankCode: winnerProfile.payoutAccount.bankCode,
          bankName: winnerProfile.payoutAccount.bankName,
          accountNumber: winnerProfile.payoutAccount.accountNumber,
          accountName: winnerProfile.payoutAccount.accountName,
          initiatedAt: nowIso,
          updatedAt: nowIso,
        });

        for (const adminDoc of adminQuery.docs) {
          await createNotification({
            userId: adminDoc.id,
            type: 'PAYOUT_ACTION_REQUIRED',
            title: 'Action Required: Payout Approval',
            message: `ACTION REQUIRED: Cycle #${cycle.cycleNumber} payout for ${winnerProfile.displayName} requires manual OTP/Dashboard authorization on Chapa.`,
            equbId,
          });
        }

        await createAuditLog({
          action: 'PAYOUT_TRANSFER_AWAITING_APPROVAL',
          actorId: adminId,
          equbId,
          affectedUserId: winnerProfile.id,
          entityId: payout.id,
          metadata: { transferReference: transferResult.transferReference },
        });

        payout.status = 'AWAITING_ADMIN_APPROVAL';
        payout.transferReference = transferResult.transferReference;
      } else if (transferResult.status === 'PROCESSING') {
        await db.collection(COLLECTIONS.payouts).doc(payout.id).update({
          status: 'PROCESSING',
          transferReference: transferResult.transferReference,
          bankCode: winnerProfile.payoutAccount.bankCode,
          bankName: winnerProfile.payoutAccount.bankName,
          accountNumber: winnerProfile.payoutAccount.accountNumber,
          accountName: winnerProfile.payoutAccount.accountName,
          initiatedAt: nowIso,
          updatedAt: nowIso,
        });

        for (const adminDoc of adminQuery.docs) {
          await createNotification({
            userId: adminDoc.id,
            type: 'GENERAL',
            title: 'Payout Initiated',
            message: `Cycle #${cycle.cycleNumber} payout initiated via Chapa API. Awaiting bank clearance.`,
            equbId,
          });
        }

        await createAuditLog({
          action: 'PAYOUT_TRANSFER_INITIATED',
          actorId: adminId,
          equbId,
          affectedUserId: winnerProfile.id,
          entityId: payout.id,
          metadata: { transferReference: transferResult.transferReference },
        });

        payout.status = 'PROCESSING';
        payout.transferReference = transferResult.transferReference;
      } else if (transferResult.status === 'COMPLETED') {
        await completePayout(payout.id, adminId, {
          transferReference: transferResult.transferReference,
          bankName: winnerProfile.payoutAccount.bankName,
        });
        payout.status = 'COMPLETED';
        payout.transferReference = transferResult.transferReference;
      } else {
        // Transfer failed immediately
        await db
          .collection(COLLECTIONS.payouts)
          .doc(payout.id)
          .update({
            status: 'FAILED',
            failureReason: transferResult.message ?? 'Transfer rejected',
            transferReference: transferResult.transferReference,
            updatedAt: nowIso,
          });

        for (const adminDoc of adminQuery.docs) {
          await createNotification({
            userId: adminDoc.id,
            type: 'GENERAL',
            title: 'Payout Transfer Failed',
            message: `Transfer failed for Cycle #${cycle.cycleNumber} payout (${winnerProfile.displayName}): ${transferResult.message}. Admin retry required.`,
            equbId,
          });
        }

        await createAuditLog({
          action: 'PAYOUT_TRANSFER_FAILED',
          actorId: adminId,
          equbId,
          affectedUserId: winnerProfile.id,
          entityId: payout.id,
          metadata: { error: transferResult.message },
        });

        payout.status = 'FAILED';
      }
    } catch (transferError) {
      console.error('Non-blocking payout transfer initiation error:', transferError);
      const errMsg = transferError instanceof Error ? transferError.message : 'Network error';
      await db.collection(COLLECTIONS.payouts).doc(payout.id).update({
        status: 'FAILED',
        failureReason: errMsg,
        updatedAt: new Date().toISOString(),
      });
      payout.status = 'FAILED';
    }
  } else {
    // Winner has no bank account configured
    const nowIso = new Date().toISOString();
    await db.collection(COLLECTIONS.payouts).doc(payout.id).update({
      status: 'AWAITING_ADMIN_APPROVAL',
      failureReason: 'No payout bank account configured on winner profile',
      updatedAt: nowIso,
    });

    for (const adminDoc of adminQuery.docs) {
      await createNotification({
        userId: adminDoc.id,
        type: 'PAYOUT_ACTION_REQUIRED',
        title: 'Action Required: Missing Bank Account',
        message: `ACTION REQUIRED: Cycle #${cycle.cycleNumber} winner ${winnerProfile?.displayName ?? 'Member'} has no bank account configured. Manual disbursement required.`,
        equbId,
      });
    }
    payout.status = 'AWAITING_ADMIN_APPROVAL';
  }

  return { draw, payout, cycle };
}

/**
 * Completes a payout after verified transfer settlement or admin disbursement.
 * Records PAYOUT_COMPLETED ledger, advances cycle, and sends the final success notification to the winner.
 */
export async function completePayout(
  payoutId: string,
  adminId: string,
  options?: { transferReference?: string; bankName?: string },
): Promise<Payout> {
  const db = getAdminDb();
  const payoutRef = db.collection(COLLECTIONS.payouts).doc(payoutId);

  const completed = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(payoutRef);
    if (!doc.exists) throw new Error('Payout not found');

    const payout = doc.data() as Payout;
    if (payout.status === 'COMPLETED') return payout;

    const completedAt = new Date().toISOString();
    const updateData: Partial<Payout> = {
      status: 'COMPLETED',
      completedAt,
      updatedAt: completedAt,
    };
    if (options?.transferReference) {
      updateData.transferReference = options.transferReference;
    }
    if (options?.bankName) {
      updateData.bankName = options.bankName;
    }

    transaction.update(payoutRef, updateData);

    await createLedgerEntry({
      equbId: payout.equbId,
      userId: payout.userId,
      membershipId: payout.membershipId,
      cycleId: payout.cycleId,
      type: 'PAYOUT_COMPLETED',
      amountMinor: payout.amountMinor,
      currency: 'ETB',
      description: `Payout completed ${formatMoney(payout.amountMinor)}`,
      referenceId: payout.id,
      referenceType: 'payout',
      createdBy: adminId,
    });

    await createAuditLog({
      action: 'PAYOUT_COMPLETED',
      actorId: adminId,
      equbId: payout.equbId,
      affectedUserId: payout.userId,
      entityId: payoutId,
      metadata: { transferReference: options?.transferReference ?? payout.transferReference },
    });

    const cycles = await getCyclesForEqub(payout.equbId);
    const currentCycle = cycles.find((c) => c.id === payout.cycleId);
    if (currentCycle) {
      transaction.update(db.collection(COLLECTIONS.cycles).doc(currentCycle.id), {
        status: 'COMPLETED',
        completedAt,
      });

      const nextCycle = cycles.find((c) => c.cycleNumber === currentCycle.cycleNumber + 1);
      if (nextCycle) {
        transaction.update(db.collection(COLLECTIONS.cycles).doc(nextCycle.id), {
          status: 'ACTIVE',
        });
      } else {
        transaction.update(db.collection(COLLECTIONS.equbs).doc(payout.equbId), {
          status: 'COMPLETED',
          completedAt,
        });
      }
    }

    return {
      ...payout,
      ...updateData,
      status: 'COMPLETED' as const,
    };
  });

  // Final Success Notification to Winner (Settlement Confirmed)
  const bankDisplayName = options?.bankName ?? completed.bankName ?? 'bank';
  const refCode = options?.transferReference ?? completed.transferReference ?? completed.id;

  await createNotification({
    userId: completed.userId,
    type: 'PAYOUT_RECEIVED',
    title: 'Payout Transferred Successfully',
    message: `Your payout of ${formatMoney(completed.amountMinor)} has been successfully transferred to your ${bankDisplayName} account (Ref: ${refCode}).`,
    equbId: completed.equbId,
  });

  return completed;
}

export async function getDrawForCycle(cycleId: string): Promise<PayoutDraw | null> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.draws)
    .where('cycleId', '==', cycleId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as PayoutDraw;
}

export async function getPayoutsForEqub(equbId: string): Promise<Payout[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.payouts)
    .where('equbId', '==', equbId)
    .orderBy('createdAt', 'asc')
    .get();
  return snapshot.docs.map((doc) => doc.data() as Payout);
}

export async function getPayoutByTransferReference(
  transferReference: string,
): Promise<Payout | null> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.payouts)
    .where('transferReference', '==', transferReference)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as Payout;
}
