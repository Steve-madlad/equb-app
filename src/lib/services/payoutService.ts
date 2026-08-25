import { getEligibleMembers } from "@/lib/domain/eligibility";
import { formatMoney } from "@/lib/domain/money";
import type { Cycle, Payout, PayoutDraw } from "@/lib/domain/types";
import { COLLECTIONS, getAdminDb } from "@/lib/firebase/admin";
import { getPayoutSelectionStrategy } from "@/lib/payout/RandomSelectionStrategy";
import { v4 as uuidv4 } from "uuid";
import { createAuditLog } from "./auditService";
import {
  getCyclesForEqub,
  getEqub,
  getMembershipsForEqub,
} from "./equbService";
import {
  createLedgerEntry,
  getSettledContributionTotalForCycle,
} from "./ledgerService";
import { createNotification } from "./notificationService";
import {
  getObligationsForCycle,
  markOverdueObligationsForEqub,
} from "./paymentService";

export interface DrawPayoutResult {
  draw: PayoutDraw;
  payout: Payout;
  cycle: Cycle;
}

/**
 * Performs a server-side random payout draw with full atomicity.
 * Protected against duplicate/concurrent execution via Firestore transaction
 * and cycle status checks.
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

  return db.runTransaction(async (transaction) => {
    const cycleDoc = await transaction.get(cycleRef);
    if (!cycleDoc.exists) throw new Error("Cycle not found");

    const cycle = cycleDoc.data() as Cycle;
    if (cycle.equbId !== equbId)
      throw new Error("Cycle does not belong to Equb");

    if (cycle.payoutRecipientId || cycle.drawId) {
      throw new Error("Payout already drawn for this cycle");
    }

    if (cycle.dueDate > currentDate) {
      throw new Error(`Cycle is not due until ${cycle.dueDate}`);
    }

    if (
      !["ACTIVE", "DRAW_PENDING", "WAITING_FOR_ELIGIBILITY"].includes(
        cycle.status,
      )
    ) {
      throw new Error(`Cycle not ready for draw: ${cycle.status}`);
    }

    const equb = await getEqub(equbId);
    if (!equb) throw new Error("Equb not found");
    if (equb.status !== "ACTIVE" && equb.status !== "PAUSED") {
      throw new Error("Equb is not active");
    }

    const memberships = await getMembershipsForEqub(equbId);
    const activeMemberships = memberships.filter((m) =>
      ["ACTIVE", "APPROVED"].includes(m.status),
    );

    const cycleObligations = await getObligationsForCycle(cycleId);

    const allObligationsSnapshot = await db
      .collection(COLLECTIONS.obligations)
      .where("equbId", "==", equbId)
      .get();
    const allObligations = allObligationsSnapshot.docs.map(
      (d) => d.data() as import("@/lib/domain/types").ContributionObligation,
    );

    const eligible = getEligibleMembers(
      activeMemberships,
      cycleObligations,
      allObligations,
    );

    if (settledPoolAmount <= 0) {
      throw new Error(
        "No settled contributions are available for this cycle's payout.",
      );
    }

    if (eligible.length === 0) {
      await createAuditLog({
        action: "PAYOUT_DRAW_STARTED",
        actorId: adminId,
        equbId,
        entityId: cycleId,
        metadata: { result: "NO_ELIGIBLE_MEMBERS", cycleContinues: true },
      });
      throw new Error(
        "No eligible members for payout. The cycle remains open for eligible members.",
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
      status: "PENDING",
      drawId,
      createdAt: new Date().toISOString(),
    };

    transaction.set(db.collection(COLLECTIONS.draws).doc(drawId), draw);
    transaction.set(db.collection(COLLECTIONS.payouts).doc(payout.id), payout);
    transaction.update(cycleRef, {
      status: "DRAWN",
      poolAmountMinor: settledPoolAmount,
      payoutRecipientId: result.selectedMembership.userId,
      drawId,
      drawnAt: new Date().toISOString(),
    });
    transaction.update(
      db.collection(COLLECTIONS.memberships).doc(result.selectedMembership.id),
      {
        hasReceivedPayout: true,
        payoutReceivedAt: new Date().toISOString(),
        payoutCycleId: cycleId,
      },
    );

    await createAuditLog({
      action: "PAYOUT_DRAW_STARTED",
      actorId: adminId,
      equbId,
      entityId: cycleId,
    });

    await createAuditLog({
      action: "PAYOUT_RECIPIENT_SELECTED",
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
      type: "PAYOUT_OBLIGATION",
      amountMinor: settledPoolAmount,
      currency: "ETB",
      description: `Payout obligation for cycle ${cycle.cycleNumber}`,
      referenceId: payout.id,
      referenceType: "payout",
      createdBy: adminId,
    });

    await createNotification({
      userId: result.selectedMembership.userId,
      type: "PAYOUT_RECEIVED",
      title: "Congratulations! You won the Equb draw",
      message: `You have been selected to receive ${formatMoney(settledPoolAmount)} for cycle ${cycle.cycleNumber}.`,
      equbId,
    });

    for (const member of activeMemberships) {
      if (member.userId !== result.selectedMembership.userId) {
        await createNotification({
          userId: member.userId,
          type: "PAYOUT_DRAW_RESULT",
          title: "Equb Draw Result",
          message: `Cycle ${cycle.cycleNumber} payout recipient has been selected.`,
          equbId,
        });
      }
    }

    return { draw, payout, cycle: { ...cycle, status: "DRAWN" as const } };
  });
}

export async function completePayout(
  payoutId: string,
  adminId: string,
): Promise<Payout> {
  const db = getAdminDb();
  const payoutRef = db.collection(COLLECTIONS.payouts).doc(payoutId);

  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(payoutRef);
    if (!doc.exists) throw new Error("Payout not found");

    const payout = doc.data() as Payout;
    if (payout.status === "COMPLETED") return payout;

    transaction.update(payoutRef, {
      status: "COMPLETED",
      completedAt: new Date().toISOString(),
    });

    await createLedgerEntry({
      equbId: payout.equbId,
      userId: payout.userId,
      membershipId: payout.membershipId,
      cycleId: payout.cycleId,
      type: "PAYOUT_COMPLETED",
      amountMinor: payout.amountMinor,
      currency: "ETB",
      description: `Payout completed ${formatMoney(payout.amountMinor)}`,
      referenceId: payout.id,
      referenceType: "payout",
      createdBy: adminId,
    });

    await createAuditLog({
      action: "PAYOUT_COMPLETED",
      actorId: adminId,
      equbId: payout.equbId,
      affectedUserId: payout.userId,
      entityId: payoutId,
    });

    const cycles = await getCyclesForEqub(payout.equbId);
    const currentCycle = cycles.find((c) => c.id === payout.cycleId);
    if (currentCycle) {
      transaction.update(
        db.collection(COLLECTIONS.cycles).doc(currentCycle.id),
        {
          status: "COMPLETED",
          completedAt: new Date().toISOString(),
        },
      );

      const nextCycle = cycles.find(
        (c) => c.cycleNumber === currentCycle.cycleNumber + 1,
      );
      if (nextCycle) {
        transaction.update(
          db.collection(COLLECTIONS.cycles).doc(nextCycle.id),
          {
            status: "ACTIVE",
          },
        );
      } else {
        transaction.update(
          db.collection(COLLECTIONS.equbs).doc(payout.equbId),
          {
            status: "COMPLETED",
            completedAt: new Date().toISOString(),
          },
        );
      }
    }

    return { ...payout, status: "COMPLETED" as const };
  });
}

export async function getDrawForCycle(
  cycleId: string,
): Promise<PayoutDraw | null> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.draws)
    .where("cycleId", "==", cycleId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as PayoutDraw;
}

export async function getPayoutsForEqub(equbId: string): Promise<Payout[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.payouts)
    .where("equbId", "==", equbId)
    .orderBy("createdAt", "asc")
    .get();
  return snapshot.docs.map((doc) => doc.data() as Payout);
}
