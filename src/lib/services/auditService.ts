import { v4 as uuidv4 } from "uuid";
import { COLLECTIONS, getAdminDb } from "@/lib/firebase/admin";
import type { AuditAction, AuditLogEntry } from "@/lib/domain/types";

export async function createAuditLog(params: {
  action: AuditAction;
  actorId: string;
  equbId?: string;
  affectedUserId?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  reason?: string;
}): Promise<AuditLogEntry> {
  const db = getAdminDb();
  const entry: AuditLogEntry = {
    id: uuidv4(),
    ...params,
    timestamp: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.auditLogs).doc(entry.id).set(entry);
  return entry;
}

export async function getAuditLogsForEqub(equbId: string): Promise<AuditLogEntry[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.auditLogs)
    .where("equbId", "==", equbId)
    .orderBy("timestamp", "desc")
    .limit(100)
    .get();

  return snapshot.docs.map((doc) => doc.data() as AuditLogEntry);
}
