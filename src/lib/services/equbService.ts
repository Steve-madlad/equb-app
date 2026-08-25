import {
  generateCycleDates,
  validateEqubConfig,
} from "@/lib/domain/cycleUtils";
import {
  assertTransition,
  canJoinEqub,
  canLeaveEqub,
  canStartEqub,
} from "@/lib/domain/equbLifecycle";
import type {
  Cycle,
  Equb,
  EqubConfig,
  EqubStatus,
  Membership,
  UserProfile,
} from "@/lib/domain/types";
import { COLLECTIONS, getAdminDb } from "@/lib/firebase/admin";
import { getUserProfile } from "@/lib/firebase/auth";
import type { Transaction } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import { createAuditLog } from "./auditService";
import { createNotification } from "./notificationService";

export async function createEqub(
  config: EqubConfig,
  createdBy: string,
): Promise<Equb> {
  const errors = validateEqubConfig(config);
  if (errors.length > 0) throw new Error(errors.join("; "));

  const db = getAdminDb();
  const now = new Date().toISOString();
  const equb: Equb = {
    id: uuidv4(),
    ...config,
    status: "DRAFT",
    createdBy,
    createdAt: now,
    updatedAt: now,
  };

  const cleanEqub = Object.fromEntries(
    Object.entries(equb).filter(([, value]) => value !== undefined),
  ) as Equb;

  await db.collection(COLLECTIONS.equbs).doc(equb.id).set(cleanEqub);
  await createAuditLog({
    action: "EQUB_CREATED",
    actorId: createdBy,
    equbId: equb.id,
    entityId: equb.id,
    metadata: { name: equb.name },
  });

  return equb;
}

export async function grantPayoutEligibilityException(
  membershipId: string,
  adminId: string,
  reason: string,
): Promise<Membership> {
  const db = getAdminDb();
  const membershipRef = db
    .collection(COLLECTIONS.memberships)
    .doc(membershipId);
  const membershipDoc = await membershipRef.get();
  if (!membershipDoc.exists) throw new Error("Membership not found");

  const membership = membershipDoc.data() as Membership;
  const exception = {
    grantedBy: adminId,
    grantedAt: new Date().toISOString(),
    reason,
  };
  await membershipRef.update({ payoutEligibilityException: exception });
  await createAuditLog({
    action: "PAYOUT_ELIGIBILITY_EXCEPTION_GRANTED",
    actorId: adminId,
    equbId: membership.equbId,
    affectedUserId: membership.userId,
    entityId: membershipId,
    reason,
    metadata: { type: "PAYOUT_ELIGIBILITY_EXCEPTION" },
  });
  return { ...membership, payoutEligibilityException: exception };
}

async function notifyEqubStartDateChange(
  equbId: string,
  equbName: string,
  startDate: string,
  memberships: Membership[],
): Promise<void> {
  for (const membership of memberships) {
    if (["LEFT", "REMOVED"].includes(membership.status)) continue;

    await createNotification({
      id: `start-date-${equbId}-${startDate}-${membership.userId}`,
      userId: membership.userId,
      type: "EQUB_START_DATE_CHANGED",
      title: "Equb start date updated",
      message: `${equbName} now starts on ${startDate}.`,
      equbId,
    });
  }
}

async function syncStartDateOnActivation(
  equbId: string,
  equbName: string,
  actorId: string,
  activationDate: string,
): Promise<void> {
  const current = await getEqub(equbId);
  if (!current || current.startDate === activationDate) return;

  const memberships = await getMembershipsForEqub(equbId);
  const db = getAdminDb();
  await db.collection(COLLECTIONS.equbs).doc(equbId).update({
    startDate: activationDate,
    updatedAt: new Date().toISOString(),
  });

  await createAuditLog({
    action: "EQUB_UPDATED",
    actorId,
    equbId,
    entityId: equbId,
    metadata: {
      name: equbName,
      startDateFrom: current.startDate,
      startDateTo: activationDate,
      reason: "Activated on a different date than the scheduled start date",
    },
  });

  await notifyEqubStartDateChange(
    equbId,
    equbName,
    activationDate,
    memberships,
  );
}

async function rejectPendingMembershipsOnActivation(
  equbId: string,
  equbName: string,
  adminId: string,
): Promise<number> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.memberships)
    .where("equbId", "==", equbId)
    .where("status", "==", "PENDING")
    .get();

  if (snapshot.empty) return 0;

  const rejectedAt = new Date().toISOString();
  let rejectedCount = 0;

  for (const doc of snapshot.docs) {
    const membership = doc.data() as Membership;
    const reason = `${equbName} started before your request was approved.`;
    await doc.ref.update({
      status: "REJECTED",
      rejectedAt,
      rejectedBy: adminId,
      rejectionReason: reason,
    });

    await createAuditLog({
      action: "MEMBER_REJECTED",
      actorId: adminId,
      equbId,
      affectedUserId: membership.userId,
      entityId: membership.id,
      metadata: {
        reason,
        autoRejectedOnStart: true,
      },
    });

    await createNotification({
      id: `membership-rejected-${membership.id}`,
      userId: membership.userId,
      type: "MEMBERSHIP_REJECTED",
      title: "Membership request rejected",
      message: reason,
      equbId,
    });

    rejectedCount += 1;
  }

  return rejectedCount;
}

async function createStartupContributionObligations(
  equb: Equb,
  memberships: Membership[],
  activationDate: string,
): Promise<void> {
  const db = getAdminDb();
  const cycles = await getCyclesForEqub(equb.id);

  for (const [index, cycle] of cycles.entries()) {
    const dueDate = index === 0 ? activationDate : cycle.dueDate;
    for (const membership of memberships) {
      if (!["ACTIVE", "APPROVED"].includes(membership.status)) continue;

      const existing = await db
        .collection(COLLECTIONS.obligations)
        .where("cycleId", "==", cycle.id)
        .where("membershipId", "==", membership.id)
        .limit(1)
        .get();
      if (!existing.empty) continue;

      const obligation = {
        id: uuidv4(),
        equbId: equb.id,
        cycleId: cycle.id,
        membershipId: membership.id,
        userId: membership.userId,
        amountMinor: equb.contributionAmountMinor,
        penaltyMinor: 0,
        totalDueMinor: equb.contributionAmountMinor,
        status: "PENDING" as const,
        dueDate,
      };

      await db
        .collection(COLLECTIONS.obligations)
        .doc(obligation.id)
        .set(obligation);

      await createAuditLog({
        action: "CONTRIBUTION_CREATED",
        actorId: "system",
        equbId: equb.id,
        affectedUserId: membership.userId,
        entityId: obligation.id,
        metadata: {
          cycleNumber: cycle.cycleNumber,
          dueDate,
          startupContribution: index === 0,
        },
      });
    }
  }
}

async function notifyMembersToContribute(
  equb: Equb,
  memberships: Membership[],
  dueDate: string,
): Promise<void> {
  for (const membership of memberships) {
    if (!["ACTIVE", "APPROVED"].includes(membership.status)) continue;

    await createNotification({
      userId: membership.userId,
      type: "EQUB_LOCKED",
      title: "Equb started",
      message: `${equb.name} has started. Please contribute by ${dueDate} to avoid a rating penalty.`,
      equbId: equb.id,
    });
  }
}

export async function rejectMembership(
  membershipId: string,
  adminId: string,
  reason?: string,
): Promise<Membership> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTIONS.memberships).doc(membershipId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Membership not found");

  const membership = doc.data() as Membership;
  if (membership.status !== "PENDING") {
    throw new Error("Only pending membership requests can be rejected");
  }

  const rejectionReason =
    reason?.trim() || "Your Equb membership request was rejected.";
  const now = new Date().toISOString();
  const updates = {
    status: "REJECTED" as const,
    rejectedAt: now,
    rejectedBy: adminId,
    rejectionReason,
  };

  await ref.update(updates);

  await createAuditLog({
    action: "MEMBER_REJECTED",
    actorId: adminId,
    equbId: membership.equbId,
    affectedUserId: membership.userId,
    entityId: membershipId,
    metadata: {
      reason: rejectionReason,
    },
  });

  await createNotification({
    id: `membership-rejected-${membership.id}`,
    userId: membership.userId,
    type: "MEMBERSHIP_REJECTED",
    title: "Membership request rejected",
    message: rejectionReason,
    equbId: membership.equbId,
  });

  return { ...membership, ...updates };
}

export async function withdrawMembership(
  membershipId: string,
  userId: string,
): Promise<Membership> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTIONS.memberships).doc(membershipId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Membership not found");

  const membership = doc.data() as Membership;
  if (membership.userId !== userId) {
    throw new Error("You can only withdraw your own membership");
  }

  const equb = await getEqub(membership.equbId);
  if (!equb) throw new Error("Equb not found");
  if (equb.status === "ACTIVE" || equb.status === "COMPLETED") {
    throw new Error("You can only withdraw before the Equb starts");
  }
  if (!["PENDING", "APPROVED"].includes(membership.status)) {
    throw new Error("Membership cannot be withdrawn");
  }

  const now = new Date().toISOString();
  const updates = {
    status: "LEFT" as const,
    removedAt: now,
    removedBy: userId,
    removalReason: "Withdrawn before Equb start",
  };

  await ref.update(updates);

  await createAuditLog({
    action: "MEMBER_WITHDRAWN",
    actorId: userId,
    equbId: membership.equbId,
    affectedUserId: userId,
    entityId: membershipId,
    metadata: {
      reason: updates.removalReason,
    },
  });

  const equbOwner = equb.createdBy;
  const profile = await getUserProfile(userId);
  await createNotification({
    userId: equbOwner,
    type: "GENERAL",
    title: "Membership withdrawn",
    message: `${profile?.displayName ?? userId} withdrew from ${equb.name} before it started.`,
    equbId: equb.id,
  });

  await createNotification({
    userId,
    type: "MEMBERSHIP_WITHDRAWN",
    title: "Membership withdrawn",
    message: `You withdrew from ${equb.name} before it started.`,
    equbId: equb.id,
  });

  return { ...membership, ...updates };
}

export async function updateEqub(
  equbId: string,
  updates: Partial<EqubConfig>,
  actorId: string,
): Promise<Equb> {
  const db = getAdminDb();
  const current = await getEqub(equbId);
  if (!current) throw new Error("Equb not found");

  const memberships = await getMembershipsForEqub(equbId);
  if (!["DRAFT", "OPEN_FOR_MEMBERS", "LOCKED"].includes(current.status)) {
    throw new Error(
      "Only draft, open, or locked Equbs can be edited before activation",
    );
  }
  const otherFieldChanged =
    updates.name !== undefined ||
    updates.description !== undefined ||
    updates.contributionAmountMinor !== undefined ||
    updates.currency !== undefined ||
    updates.frequency !== undefined ||
    updates.customIntervalDays !== undefined ||
    updates.numberOfCycles !== undefined ||
    updates.memberLimit !== undefined ||
    updates.minimumMemberCount !== undefined ||
    updates.penaltyEnabled !== undefined ||
    updates.penaltyType !== undefined ||
    updates.penaltyAmount !== undefined;

  if (current.status === "ACTIVE") {
    throw new Error("Cannot edit Equb after it has started");
  }

  if (memberships.length > 0 && otherFieldChanged) {
    throw new Error(
      "After members have joined, only the start date can be updated before activation",
    );
  }

  const nextConfig: EqubConfig = {
    name: updates.name ?? current.name,
    description: updates.description ?? current.description,
    contributionAmountMinor:
      updates.contributionAmountMinor ?? current.contributionAmountMinor,
    currency: current.currency,
    frequency: updates.frequency ?? current.frequency,
    customIntervalDays:
      updates.customIntervalDays ?? current.customIntervalDays,
    numberOfCycles: updates.numberOfCycles ?? current.numberOfCycles,
    memberLimit: updates.memberLimit ?? current.memberLimit,
    minimumMemberCount:
      updates.minimumMemberCount ?? current.minimumMemberCount,
    startDate: updates.startDate ?? current.startDate,
    penaltyEnabled: updates.penaltyEnabled ?? current.penaltyEnabled,
    penaltyType: updates.penaltyType ?? current.penaltyType,
    penaltyAmount: updates.penaltyAmount ?? current.penaltyAmount,
  };

  const validationErrors = validateEqubConfig(nextConfig);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join("; "));
  }

  const now = new Date().toISOString();
  const patch = {
    ...nextConfig,
    updatedAt: now,
  };

  const cleanPatch = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  );

  await db.collection(COLLECTIONS.equbs).doc(equbId).update(cleanPatch);

  const updated = { ...current, ...cleanPatch } as Equb;

  await createAuditLog({
    action: "EQUB_UPDATED",
    actorId,
    equbId,
    entityId: equbId,
    metadata: { name: updated.name },
  });

  if (updates.startDate && updates.startDate !== current.startDate) {
    await notifyEqubStartDateChange(
      equbId,
      updated.name,
      updates.startDate,
      memberships,
    );
  }

  return updated;
}

export async function deleteEqub(
  equbId: string,
  actorId: string,
): Promise<void> {
  const db = getAdminDb();
  const current = await getEqub(equbId);
  if (!current) throw new Error("Equb not found");

  const memberships = await getMembershipsForEqub(equbId);
  if (memberships.length > 0) {
    throw new Error("Cannot delete Equb after members have joined");
  }

  await db.collection(COLLECTIONS.equbs).doc(equbId).delete();

  await createAuditLog({
    action: "EQUB_DELETED",
    actorId,
    equbId,
    entityId: equbId,
    metadata: { name: current.name },
  });
}

export async function getEqub(equbId: string): Promise<Equb | null> {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTIONS.equbs).doc(equbId).get();
  return doc.exists ? (doc.data() as Equb) : null;
}

export async function listEqubs(status?: EqubStatus): Promise<Equb[]> {
  const db = getAdminDb();
  let query = db.collection(COLLECTIONS.equbs).orderBy("createdAt", "desc");
  if (status) query = query.where("status", "==", status) as typeof query;
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as Equb);
}

export async function listEqubsCreatedByUser(userId: string): Promise<Equb[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.equbs)
    .where("createdBy", "==", userId)
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => doc.data() as Equb);
}

export async function transitionEqubStatus(
  equbId: string,
  newStatus: EqubStatus,
  actorId: string,
): Promise<Equb> {
  const db = getAdminDb();
  const equbRef = db.collection(COLLECTIONS.equbs).doc(equbId);

  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(equbRef);
    if (!doc.exists) throw new Error("Equb not found");

    const equb = doc.data() as Equb;
    assertTransition(equb.status, newStatus);

    const updates: Partial<Equb> = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    if (newStatus === "LOCKED") updates.lockedAt = updates.updatedAt;
    if (newStatus === "ACTIVE") updates.activatedAt = updates.updatedAt;
    if (newStatus === "COMPLETED") updates.completedAt = updates.updatedAt;

    transaction.update(equbRef, updates);

    const auditAction =
      newStatus === "LOCKED"
        ? "EQUB_LOCKED"
        : newStatus === "OPEN_FOR_MEMBERS"
          ? "EQUB_OPENED"
          : newStatus === "ACTIVE"
            ? "EQUB_ACTIVATED"
            : newStatus === "COMPLETED"
              ? "EQUB_COMPLETED"
              : newStatus === "CANCELLED"
                ? "EQUB_CANCELLED"
                : newStatus === "PAUSED"
                  ? "EQUB_PAUSED"
                  : "EQUB_CREATED";

    await createAuditLog({
      action: auditAction,
      actorId,
      equbId,
      metadata: { from: equb.status, to: newStatus },
    });

    if (newStatus === "ACTIVE") {
      await createCyclesForEqub(equbId, equb, transaction);
    }

    return { ...equb, ...updates } as Equb;
  });
}

async function createCyclesForEqub(
  equbId: string,
  equb: Equb,
  transaction: Transaction,
): Promise<void> {
  const db = getAdminDb();
  const dates = generateCycleDates(
    equb.startDate,
    equb.frequency,
    equb.numberOfCycles,
    equb.customIntervalDays,
  );

  dates.forEach((dueDate, index) => {
    const cycle: Cycle = {
      id: uuidv4(),
      equbId,
      cycleNumber: index + 1,
      dueDate,
      status: index === 0 ? "ACTIVE" : "UPCOMING",
      poolAmountMinor: 0,
    };
    transaction.set(db.collection(COLLECTIONS.cycles).doc(cycle.id), cycle);
  });
}

export async function openEqubForMembers(
  equbId: string,
  actorId: string,
): Promise<Equb> {
  return transitionEqubStatus(equbId, "OPEN_FOR_MEMBERS", actorId);
}

export async function lockEqub(
  equbId: string,
  actorId: string,
  options?: { currentDateIso?: string },
): Promise<Equb> {
  const db = getAdminDb();
  const membershipsSnapshot = await db
    .collection(COLLECTIONS.memberships)
    .where("equbId", "==", equbId)
    .where("status", "in", ["ACTIVE", "APPROVED"])
    .get();
  const memberships = membershipsSnapshot.docs.map(
    (doc) => doc.data() as Membership,
  );

  const equb = await getEqub(equbId);
  if (!equb) throw new Error("Equb not found");

  if (
    !canStartEqub(memberships.length, equb.minimumMemberCount, equb.memberLimit)
  ) {
    throw new Error(
      `Cannot start Equb: ${memberships.length}/${equb.minimumMemberCount} approved members reached; member limit is ${equb.memberLimit}.`,
    );
  }

  const activationDate = (
    options?.currentDateIso ?? new Date().toISOString()
  ).slice(0, 10);
  await syncStartDateOnActivation(equbId, equb.name, actorId, activationDate);
  await transitionEqubStatus(equbId, "LOCKED", actorId);
  const activated = await transitionEqubStatus(equbId, "ACTIVE", actorId);
  await createStartupContributionObligations(
    activated,
    memberships,
    activationDate,
  );
  await notifyMembersToContribute(activated, memberships, activationDate);
  const rejectedCount = await rejectPendingMembershipsOnActivation(
    equbId,
    equb.name,
    actorId,
  );
  if (rejectedCount > 0) {
    await createAuditLog({
      action: "EQUB_UPDATED",
      actorId,
      equbId,
      entityId: equbId,
      metadata: {
        name: equb.name,
        autoRejectedPendingMemberships: rejectedCount,
        reason: "Equb started with pending membership requests",
      },
    });
  }
  return activated;
}

export async function requestMembership(
  equbId: string,
  userId: string,
): Promise<Membership> {
  const equb = await getEqub(equbId);
  if (!equb) throw new Error("Equb not found");
  if (!canJoinEqub(equb.status))
    throw new Error("Equb is not accepting members");

  const profile = await getUserProfile(userId);
  if (!profile) throw new Error("User profile not found");
  if (profile.role === "ADMIN") throw new Error("Admins cannot join Equbs");

  const db = getAdminDb();

  const existing = await db
    .collection(COLLECTIONS.memberships)
    .where("equbId", "==", equbId)
    .where("userId", "==", userId)
    .where("status", "in", ["PENDING", "ACTIVE", "APPROVED"])
    .get();

  if (!existing.empty) throw new Error("Already a member or pending");

  const membership: Membership = {
    id: uuidv4(),
    equbId,
    userId,
    status: "PENDING",
    joinedAt: new Date().toISOString(),
    hasReceivedPayout: false,
  };

  await db
    .collection(COLLECTIONS.memberships)
    .doc(membership.id)
    .set(membership);
  await createAuditLog({
    action: "MEMBER_JOINED",
    actorId: userId,
    equbId,
    affectedUserId: userId,
    entityId: membership.id,
  });

  await createNotification({
    userId: equb.createdBy,
    type: "MEMBERSHIP_REQUESTED",
    title: "New membership request",
    message: `${profile.displayName} requested to join ${equb.name}.`,
    equbId,
  });

  return membership;
}

export async function approveMembership(
  membershipId: string,
  adminId: string,
): Promise<Membership> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTIONS.memberships).doc(membershipId);

  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) throw new Error("Membership not found");

    const membership = doc.data() as Membership;
    if (membership.status !== "PENDING")
      throw new Error("Membership not pending");

    const updates = {
      status: "APPROVED" as const,
      approvedAt: new Date().toISOString(),
      approvedBy: adminId,
    };

    transaction.update(ref, updates);

    await createAuditLog({
      action: "MEMBER_APPROVED",
      actorId: adminId,
      equbId: membership.equbId,
      affectedUserId: membership.userId,
      entityId: membershipId,
    });

    await createNotification({
      userId: membership.userId,
      type: "MEMBERSHIP_APPROVED",
      title: "Membership Approved",
      message: "Your Equb membership request has been approved.",
      equbId: membership.equbId,
    });

    return { ...membership, ...updates };
  });
}

export interface BulkApproveMembershipResult {
  approved: Membership[];
  skipped: Array<{ membershipId: string; reason: string }>;
}

export async function approveMemberships(
  membershipIds: string[],
  adminId: string,
): Promise<BulkApproveMembershipResult> {
  const approved: Membership[] = [];
  const skipped: Array<{ membershipId: string; reason: string }> = [];

  for (const membershipId of membershipIds) {
    try {
      const membership = await approveMembership(membershipId, adminId);
      approved.push(membership);
    } catch (error) {
      skipped.push({
        membershipId,
        reason: error instanceof Error ? error.message : "Approval failed",
      });
    }
  }

  return { approved, skipped };
}

export async function leaveMembership(
  membershipId: string,
  userId: string,
): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection(COLLECTIONS.memberships).doc(membershipId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Membership not found");

  const membership = doc.data() as Membership;
  const equb = await getEqub(membership.equbId);
  if (!equb) throw new Error("Equb not found");

  if (!canLeaveEqub(equb.status)) {
    throw new Error("Cannot leave after Equb is locked");
  }

  await ref.update({
    status: "LEFT",
    removedAt: new Date().toISOString(),
  });
}

export async function getMembershipsForEqub(
  equbId: string,
): Promise<Membership[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.memberships)
    .where("equbId", "==", equbId)
    .get();
  return snapshot.docs.map((doc) => doc.data() as Membership);
}

export async function getMembershipsForUser(
  userId: string,
): Promise<Membership[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.memberships)
    .where("userId", "==", userId)
    .where("status", "in", ["ACTIVE", "APPROVED", "PENDING"])
    .get();
  return snapshot.docs.map((doc) => doc.data() as Membership);
}

export interface PendingMembershipRequest {
  membership: Membership;
  equb: Equb;
  requester: UserProfile | null;
}

export async function getPendingMembershipRequestsForAdmin(
  adminId: string,
): Promise<PendingMembershipRequest[]> {
  const pendingMemberships = await getAdminDb()
    .collection(COLLECTIONS.memberships)
    .where("status", "==", "PENDING")
    .get();

  const equbCache = new Map<string, Equb>();
  const requests: PendingMembershipRequest[] = [];

  for (const doc of pendingMemberships.docs) {
    const membership = doc.data() as Membership;
    let resolvedEqub = equbCache.get(membership.equbId);

    if (!resolvedEqub) {
      const fetchedEqub = await getEqub(membership.equbId);
      if (!fetchedEqub) continue;
      resolvedEqub = fetchedEqub;
      equbCache.set(membership.equbId, fetchedEqub);
    }

    if (!resolvedEqub || resolvedEqub.createdBy !== adminId) continue;

    const requester = await getUserProfile(membership.userId);
    requests.push({
      membership,
      equb: resolvedEqub,
      requester,
    });
  }

  return requests.sort((a, b) =>
    b.membership.joinedAt.localeCompare(a.membership.joinedAt),
  );
}

export async function getCyclesForEqub(equbId: string): Promise<Cycle[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.cycles)
    .where("equbId", "==", equbId)
    .orderBy("cycleNumber", "asc")
    .get();
  return snapshot.docs.map((doc) => doc.data() as Cycle);
}

export async function getCurrentCycle(equbId: string): Promise<Cycle | null> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.cycles)
    .where("equbId", "==", equbId)
    .where("status", "in", [
      "ACTIVE",
      "DRAW_PENDING",
      "WAITING_FOR_ELIGIBILITY",
    ])
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as Cycle;
}
