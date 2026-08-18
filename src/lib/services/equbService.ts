import {
  calculatePoolAmount,
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

export async function updateEqub(
  equbId: string,
  updates: Partial<EqubConfig>,
  actorId: string,
): Promise<Equb> {
  const db = getAdminDb();
  const current = await getEqub(equbId);
  if (!current) throw new Error("Equb not found");

  const memberships = await getMembershipsForEqub(equbId);
  if (memberships.length > 0) {
    throw new Error("Cannot edit Equb after members have joined");
  }

  if (!["DRAFT", "OPEN_FOR_MEMBERS"].includes(current.status)) {
    throw new Error("Only draft or open Equbs can be edited");
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

  const membershipsSnapshot = await db
    .collection(COLLECTIONS.memberships)
    .where("equbId", "==", equbId)
    .where("status", "in", ["ACTIVE", "APPROVED"])
    .get();

  const memberCount = membershipsSnapshot.size;
  const poolAmount = calculatePoolAmount(
    equb.contributionAmountMinor,
    memberCount,
  );

  dates.forEach((dueDate, index) => {
    const cycle: Cycle = {
      id: uuidv4(),
      equbId,
      cycleNumber: index + 1,
      dueDate,
      status: index === 0 ? "ACTIVE" : "UPCOMING",
      poolAmountMinor: poolAmount,
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

export async function lockEqub(equbId: string, actorId: string): Promise<Equb> {
  const db = getAdminDb();
  const memberships = await db
    .collection(COLLECTIONS.memberships)
    .where("equbId", "==", equbId)
    .where("status", "in", ["ACTIVE", "APPROVED"])
    .get();

  const equb = await getEqub(equbId);
  if (!equb) throw new Error("Equb not found");

  if (
    !canStartEqub(memberships.size, equb.minimumMemberCount, equb.memberLimit)
  ) {
    throw new Error(
      `Cannot start Equb: ${memberships.size}/${equb.minimumMemberCount} minimum members reached; member limit is ${equb.memberLimit}.`,
    );
  }

  await transitionEqubStatus(equbId, "LOCKED", actorId);
  return transitionEqubStatus(equbId, "ACTIVE", actorId);
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

  return requests.sort(
    (a, b) => b.membership.joinedAt.localeCompare(a.membership.joinedAt),
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
