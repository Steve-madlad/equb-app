import { formatMoney } from "@/lib/domain/money";
import { isObligationOverdue } from "@/lib/domain/paymentTiming";
import type {
  ContributionObligation,
  Cycle,
  Equb,
  Membership,
  PaymentRecord,
} from "@/lib/domain/types";
import { COLLECTIONS, getAdminDb } from "@/lib/firebase/admin";
import { adjustUserRating } from "@/lib/firebase/auth";
import { generateIdempotencyKey, getPaymentProvider } from "@/lib/payments";
import type { DocumentReference } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import { createAuditLog } from "./auditService";
import { createLedgerEntry } from "./ledgerService";
import { createNotification } from "./notificationService";

export async function createObligationsForCycle(
  equb: Equb,
  cycle: Cycle,
  memberships: Membership[],
  options?: { dueDateOverride?: string },
): Promise<ContributionObligation[]> {
  const db = getAdminDb();
  const obligations: ContributionObligation[] = [];
  const dueDate = options?.dueDateOverride ?? cycle.dueDate;

  for (const membership of memberships) {
    if (!["ACTIVE", "APPROVED"].includes(membership.status)) continue;

    const obligation: ContributionObligation = {
      id: uuidv4(),
      equbId: equb.id,
      cycleId: cycle.id,
      membershipId: membership.id,
      userId: membership.userId,
      amountMinor: equb.contributionAmountMinor,
      penaltyMinor: 0,
      totalDueMinor: equb.contributionAmountMinor,
      status: "PENDING",
      dueDate,
    };

    await db
      .collection(COLLECTIONS.obligations)
      .doc(obligation.id)
      .set(obligation);
    obligations.push(obligation);

    await createAuditLog({
      action: "CONTRIBUTION_CREATED",
      actorId: "system",
      equbId: equb.id,
      affectedUserId: membership.userId,
      entityId: obligation.id,
      metadata: { cycleNumber: cycle.cycleNumber },
    });
  }

  return obligations;
}

export async function initiatePayment(
  obligationId: string,
  userId: string,
  currentDateIso: string = new Date().toISOString(),
): Promise<PaymentRecord> {
  const db = getAdminDb();
  const obligationRef = db
    .collection(COLLECTIONS.obligations)
    .doc(obligationId);
  const obligationDoc = await obligationRef.get();

  if (!obligationDoc.exists) throw new Error("Obligation not found");
  const obligation = obligationDoc.data() as ContributionObligation;

  if (obligation.userId !== userId) throw new Error("Unauthorized");
  if (obligation.status === "PAID") throw new Error("Already paid");

  if (
    obligation.status === "PENDING" &&
    isObligationOverdue(obligation, currentDateIso)
  ) {
    await markObligationOverdue(obligationRef, obligation);
  }

  const existingPayment = await db
    .collection(COLLECTIONS.payments)
    .where("obligationId", "==", obligationId)
    .where("status", "in", ["INITIATED", "PENDING", "SUCCESS"])
    .limit(1)
    .get();

  if (!existingPayment.empty) {
    const existingDoc = existingPayment.docs[0];
    const existing = existingDoc.data() as PaymentRecord;
    if (existing.status === "SUCCESS") return existing;

    // The mock provider is in memory, so a server restart can leave Firestore
    // with a transaction that the provider no longer knows about.
    if (getPaymentProvider().name === "mock") {
      try {
        await getPaymentProvider().getPaymentStatus(
          existing.providerTransactionId,
        );
        return existing;
      } catch {
        await existingDoc.ref.update({
          status: "CANCELLED",
          failureReason: "Mock payment session expired",
        });
      }
    } else {
      return existing;
    }
  }

  const idempotencyKey = generateIdempotencyKey();
  const provider = getPaymentProvider();

  const result = await provider.createPayment({
    amountMinor: obligation.totalDueMinor,
    currency: "ETB",
    userId,
    obligationId,
    equbId: obligation.equbId,
    idempotencyKey,
  });

  const payment: PaymentRecord = {
    id: uuidv4(),
    equbId: obligation.equbId,
    obligationId,
    userId,
    amountMinor: obligation.totalDueMinor,
    currency: "ETB",
    status: result.status,
    providerTransactionId: result.providerTransactionId,
    idempotencyKey,
    initiatedAt: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.payments).doc(payment.id).set(payment);

  await createAuditLog({
    action: "PAYMENT_INITIATED",
    actorId: userId,
    equbId: obligation.equbId,
    affectedUserId: userId,
    entityId: payment.id,
    metadata: { providerTransactionId: result.providerTransactionId },
  });

  return {
    ...payment,
    ...(result.redirectUrl ? { redirectUrl: result.redirectUrl } : {}),
  };
}

export async function verifyAndRecordPayment(
  providerTransactionId: string,
  actorId: string = "system",
  currentDateIso: string = new Date().toISOString(),
): Promise<PaymentRecord> {
  const db = getAdminDb();
  const provider = getPaymentProvider();

  const paymentQuery = await db
    .collection(COLLECTIONS.payments)
    .where("providerTransactionId", "==", providerTransactionId)
    .limit(1)
    .get();

  if (paymentQuery.empty) throw new Error("Payment record not found");
  const paymentDoc = paymentQuery.docs[0];
  const payment = paymentDoc.data() as PaymentRecord;

  if (payment.status === "SUCCESS") return payment;

  const obligationRef = db
    .collection(COLLECTIONS.obligations)
    .doc(payment.obligationId);
  const obligationDoc = await obligationRef.get();
  const obligation = obligationDoc.data() as ContributionObligation;
  if (
    obligation.status === "PENDING" &&
    isObligationOverdue(obligation, currentDateIso)
  ) {
    await markObligationOverdue(obligationRef, obligation);
  }

  const verification = await provider.verifyPayment(providerTransactionId);

  return db.runTransaction(async (transaction) => {
    const freshDoc = await transaction.get(paymentDoc.ref);
    const freshPayment = freshDoc.data() as PaymentRecord;

    if (freshPayment.status === "SUCCESS") return freshPayment;

    if (
      verification.status === "SUCCESS" &&
      verification.verifiedAmountMinor === freshPayment.amountMinor
    ) {
      const freshObligationRef = db
        .collection(COLLECTIONS.obligations)
        .doc(freshPayment.obligationId);
      const freshObligationDoc = await transaction.get(freshObligationRef);
      const freshObligation =
        freshObligationDoc.data() as ContributionObligation;

      transaction.update(paymentDoc.ref, {
        status: "SUCCESS",
        verifiedAt: new Date().toISOString(),
      });
      transaction.update(freshObligationRef, {
        status: "PAID",
        paidAt: new Date().toISOString(),
        paymentId: freshPayment.id,
      });

      await createLedgerEntry({
        equbId: freshPayment.equbId,
        userId: freshPayment.userId,
        membershipId: freshObligation.membershipId,
        cycleId: freshObligation.cycleId,
        type: "CONTRIBUTION_RECEIVED",
        amountMinor: freshPayment.amountMinor,
        currency: "ETB",
        description: `Contribution payment ${formatMoney(freshPayment.amountMinor)}`,
        referenceId: freshPayment.id,
        referenceType: "payment",
        createdBy: actorId,
      });

      await createAuditLog({
        action: "PAYMENT_VERIFIED",
        actorId,
        equbId: freshPayment.equbId,
        affectedUserId: freshPayment.userId,
        entityId: freshPayment.id,
      });

      await createNotification({
        userId: freshPayment.userId,
        type: "PAYMENT_SUCCESS",
        title: "Payment Successful",
        message: `Your contribution of ${formatMoney(freshPayment.amountMinor)} was received.`,
        equbId: freshPayment.equbId,
      });

      return { ...freshPayment, status: "SUCCESS" as const };
    }

    if (
      verification.status === "SUCCESS" &&
      verification.verifiedAmountMinor !== freshPayment.amountMinor
    ) {
      throw new Error("Verified payment amount does not match the obligation");
    }

    if (verification.status === "PENDING" || verification.status === "INITIATED") {
      transaction.update(paymentDoc.ref, {
        status: verification.status,
      });
      return { ...freshPayment, status: verification.status };
    }

    const failurePatch: Record<string, unknown> = {
      status: "FAILED",
    };
    if (verification.failureReason) {
      failurePatch.failureReason = verification.failureReason;
    }

    transaction.update(paymentDoc.ref, failurePatch);

    await createAuditLog({
      action: "PAYMENT_FAILED",
      actorId,
      equbId: freshPayment.equbId,
      affectedUserId: freshPayment.userId,
      entityId: freshPayment.id,
      ...(verification.failureReason
        ? { metadata: { reason: verification.failureReason } }
        : {}),
    });

    return { ...freshPayment, status: "FAILED" };
  });
}

export async function markOverdueObligations(): Promise<number> {
  return markOverdueObligationsForDate();
}

export async function markOverdueObligationsForDate(
  currentDateIso: string = new Date().toISOString(),
): Promise<number> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.obligations)
    .where("status", "==", "PENDING")
    .get();

  let count = 0;
  for (const doc of snapshot.docs) {
    const obligation = doc.data() as ContributionObligation;
    if (isObligationOverdue(obligation, currentDateIso)) {
      if (await markObligationOverdue(doc.ref, obligation)) count++;
    }
  }

  return count;
}

export async function markOverdueObligationsForEqub(
  equbId: string,
  currentDateIso: string = new Date().toISOString(),
): Promise<number> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.obligations)
    .where("equbId", "==", equbId)
    .get();

  let count = 0;
  for (const doc of snapshot.docs) {
    const obligation = doc.data() as ContributionObligation;
    if (
      obligation.status === "PENDING" &&
      isObligationOverdue(obligation, currentDateIso)
    ) {
      if (await markObligationOverdue(doc.ref, obligation)) count++;
    }
  }
  return count;
}

async function markObligationOverdue(
  obligationRef: DocumentReference,
  obligation: ContributionObligation,
): Promise<boolean> {
  const db = getAdminDb();
  const marked = await db.runTransaction(async (transaction) => {
    const currentDoc = await transaction.get(obligationRef);
    const current = currentDoc.data() as ContributionObligation | undefined;
    if (!currentDoc.exists || current?.status !== "PENDING") return false;
    transaction.update(obligationRef, { status: "OVERDUE" });
    return true;
  });
  if (!marked) return false;

  await adjustUserRating(
    obligation.userId,
    -5,
    `Contribution overdue for Equb ${obligation.equbId}`,
  );
  await createNotification({
    userId: obligation.userId,
    type: "CONTRIBUTION_OVERDUE",
    title: "Contribution Overdue",
    message: `Your contribution of ${formatMoney(obligation.totalDueMinor)} is overdue.`,
    equbId: obligation.equbId,
  });
  return true;
}

export async function notifyAdminsOfDuePayoutCycles(
  currentDateIso: string = new Date().toISOString(),
): Promise<number> {
  const db = getAdminDb();
  const today = currentDateIso.slice(0, 10);
  const snapshot = await db.collection(COLLECTIONS.cycles).get();

  let count = 0;
  for (const doc of snapshot.docs) {
    const cycle = doc.data() as Cycle;
    if (cycle.dueDate > today) continue;
    if (cycle.status === "COMPLETED" || cycle.status === "DRAWN") continue;

    const equbDoc = await db
      .collection(COLLECTIONS.equbs)
      .doc(cycle.equbId)
      .get();
    const equb = equbDoc.exists ? (equbDoc.data() as Equb) : null;
    if (!equb) continue;

    await createNotification({
      id: `cycle-due-${cycle.id}`,
      userId: equb.createdBy,
      type: "CYCLE_DUE",
      title: "Payout cycle is due",
      message: `Cycle ${cycle.cycleNumber} for ${equb.name} reached its due date.`,
      equbId: equb.id,
    });
    count++;
  }

  return count;
}

export async function getObligationsForCycle(
  cycleId: string,
): Promise<ContributionObligation[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.obligations)
    .where("cycleId", "==", cycleId)
    .get();
  return snapshot.docs.map((doc) => doc.data() as ContributionObligation);
}

export async function getObligationsForUser(
  userId: string,
  equbId: string,
): Promise<ContributionObligation[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.obligations)
    .where("equbId", "==", equbId)
    .where("userId", "==", userId)
    .orderBy("dueDate", "asc")
    .get();
  return snapshot.docs.map((doc) => doc.data() as ContributionObligation);
}

export async function getPaymentByProviderId(
  providerTransactionId: string,
): Promise<PaymentRecord | null> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.payments)
    .where("providerTransactionId", "==", providerTransactionId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as PaymentRecord;
}
