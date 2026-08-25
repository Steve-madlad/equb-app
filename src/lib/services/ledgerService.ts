import type { Currency, MoneyMinor } from "@/lib/domain/money";
import type { LedgerEntry, LedgerEntryType } from "@/lib/domain/types";
import { COLLECTIONS, getAdminDb } from "@/lib/firebase/admin";
import { v4 as uuidv4 } from "uuid";

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

export async function getLedgerForUser(
  userId: string,
  equbId: string,
): Promise<LedgerEntry[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.ledger)
    .where("equbId", "==", equbId)
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => doc.data() as LedgerEntry);
}

export async function getLedgerEntriesForUser(
  userId: string,
): Promise<LedgerEntry[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.ledger)
    .where("userId", "==", userId)
    .get();

  return snapshot.docs
    .map((doc) => doc.data() as LedgerEntry)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSettledContributionTotalForCycle(
  cycleId: string,
): Promise<MoneyMinor> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTIONS.ledger)
    .where("cycleId", "==", cycleId)
    .get();

  return snapshot.docs.reduce<MoneyMinor>((total, doc) => {
    const entry = doc.data() as LedgerEntry;
    return entry.type === "CONTRIBUTION_RECEIVED"
      ? total + entry.amountMinor
      : total;
  }, 0 as MoneyMinor);
}

export async function getCurrentPoolForEqub(
  equbId: string,
): Promise<MoneyMinor> {
  const entries = await getLedgerForEqub(equbId);

  return entries.reduce<MoneyMinor>((balance, entry) => {
    switch (entry.type) {
      case "CONTRIBUTION_RECEIVED":
      case "PENALTY_APPLIED":
        return balance + entry.amountMinor;
      case "PAYOUT_COMPLETED":
        return balance - entry.amountMinor;
      default:
        return balance;
    }
  }, 0 as MoneyMinor);
}
