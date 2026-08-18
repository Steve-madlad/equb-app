import { v4 as uuidv4 } from "uuid";
import { COLLECTIONS, getAdminDb } from "@/lib/firebase/admin";
import type { LedgerEntry, LedgerEntryType } from "@/lib/domain/types";
import type { Currency, MoneyMinor } from "@/lib/domain/money";

export async function createLedgerEntry(params: {
  equbId: string;
  userId: string;
  membershipId?: string;
  cycleId?: string;
  type: LedgerEntryType;
  amountMinor: MoneyMinor;
  currency: Currency;
  description: string;
  referenceId: string;
  referenceType: "payment" | "payout" | "penalty" | "obligation";
  createdBy: string;
}): Promise<LedgerEntry> {
  const db = getAdminDb();
  const entry: LedgerEntry = {
    id: uuidv4(),
    ...params,
    createdAt: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.ledger).doc(entry.id).set(entry);
  return entry;
}

export async function getLedgerForEqub(equbId: string): Promise<LedgerEntry[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.ledger)
    .where("equbId", "==", equbId)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => doc.data() as LedgerEntry);
}

export async function getLedgerForUser(userId: string, equbId: string): Promise<LedgerEntry[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.ledger)
    .where("equbId", "==", equbId)
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => doc.data() as LedgerEntry);
}
