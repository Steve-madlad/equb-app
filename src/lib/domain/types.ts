import type { Currency, MoneyMinor, PenaltyType } from "./money";

// ─── Roles ───────────────────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "USER";

// ─── Equb lifecycle ──────────────────────────────────────────────────────────

export type EqubStatus =
  | "DRAFT"
  | "OPEN_FOR_MEMBERS"
  | "LOCKED"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

export type ContributionFrequency = "WEEKLY" | "MONTHLY" | "CUSTOM";

export interface EqubConfig {
  name: string;
  description?: string;
  contributionAmountMinor: MoneyMinor;
  currency: Currency;
  frequency: ContributionFrequency;
  /** Interval in days when frequency is CUSTOM */
  customIntervalDays?: number;
  numberOfCycles: number;
  memberLimit: number;
  minimumMemberCount: number;
  startDate: string; // ISO date
  penaltyEnabled: boolean;
  penaltyType: PenaltyType | null;
  penaltyAmount: number | null;
}

export interface Equb extends EqubConfig {
  id: string;
  status: EqubStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lockedAt?: string;
  activatedAt?: string;
  completedAt?: string;
}

// ─── Membership ──────────────────────────────────────────────────────────────

export type MembershipStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "LEFT"
  | "REMOVED";

export interface Membership {
  id: string;
  equbId: string;
  userId: string;
  status: MembershipStatus;
  joinedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  removedAt?: string;
  removedBy?: string;
  removalReason?: string;
  hasReceivedPayout: boolean;
  payoutReceivedAt?: string;
  payoutCycleId?: string;
  payoutEligibilityException?: {
    grantedBy: string;
    grantedAt: string;
    reason: string;
  };
}

// ─── Cycles ──────────────────────────────────────────────────────────────────

export type CycleStatus =
  | "UPCOMING"
  | "ACTIVE"
  | "WAITING_FOR_ELIGIBILITY"
  | "DRAW_PENDING"
  | "DRAWN"
  | "COMPLETED";

export interface Cycle {
  id: string;
  equbId: string;
  cycleNumber: number;
  dueDate: string;
  status: CycleStatus;
  poolAmountMinor: MoneyMinor;
  payoutRecipientId?: string;
  drawId?: string;
  drawnAt?: string;
  completedAt?: string;
}

// ─── Contribution obligations ──────────────────────────────────────────────────

export type ObligationStatus = "PENDING" | "PAID" | "OVERDUE" | "PARTIAL";

export interface ContributionObligation {
  id: string;
  equbId: string;
  cycleId: string;
  membershipId: string;
  userId: string;
  amountMinor: MoneyMinor;
  penaltyMinor: MoneyMinor;
  totalDueMinor: MoneyMinor;
  status: ObligationStatus;
  dueDate: string;
  paidAt?: string;
  paymentId?: string;
}

// ─── Payments ──────────────────────────────────────────────────────────────────

export type PaymentStatus =
  | "INITIATED"
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED";

export interface PaymentRecord {
  id: string;
  equbId: string;
  obligationId: string;
  userId: string;
  amountMinor: MoneyMinor;
  currency: Currency;
  status: PaymentStatus;
  providerTransactionId: string;
  idempotencyKey: string;
  initiatedAt: string;
  verifiedAt?: string;
  failureReason?: string;
}

// ─── Payouts ───────────────────────────────────────────────────────────────────

export type PayoutStatus =
  | "PENDING"
  | "PROCESSING"
  | "AWAITING_ADMIN_APPROVAL"
  | "COMPLETED"
  | "FAILED";

export interface PayoutAccount {
  bankCode: string; // e.g. "cbe", "656", "telebirr"
  bankName: string; // e.g. "Commercial Bank of Ethiopia"
  accountNumber: string; // Bank account or phone number
  accountName: string; // Full name on record
}

export interface Payout {
  id: string;
  equbId: string;
  cycleId: string;
  membershipId: string;
  userId: string;
  amountMinor: MoneyMinor;
  status: PayoutStatus;
  drawId: string;
  transferReference?: string;
  providerTransactionId?: string;
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  failureReason?: string;
  initiatedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// ─── Draw audit ────────────────────────────────────────────────────────────────

export interface PayoutDraw {
  id: string;
  equbId: string;
  cycleId: string;
  eligibleMemberIds: string[];
  selectedMemberId: string;
  selectedMembershipId: string;
  performedBy: string;
  performedAt: string;
  randomSeed: string;
  poolAmountMinor: MoneyMinor;
}

// ─── Ledger ────────────────────────────────────────────────────────────────────

export type LedgerEntryType =
  | "CONTRIBUTION_RECEIVED"
  | "PENALTY_APPLIED"
  | "PAYOUT_OBLIGATION"
  | "PAYOUT_COMPLETED";

export interface LedgerEntry {
  id: string;
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
  createdAt: string;
  createdBy: string;
}

// ─── Audit log ─────────────────────────────────────────────────────────────────

export type AuditAction =
  | "EQUB_CREATED"
  | "EQUB_UPDATED"
  | "EQUB_DELETED"
  | "EQUB_OPENED"
  | "MEMBER_JOINED"
  | "MEMBER_APPROVED"
  | "PAYOUT_ELIGIBILITY_EXCEPTION_GRANTED"
  | "MEMBER_REJECTED"
  | "MEMBER_WITHDRAWN"
  | "EQUB_LOCKED"
  | "EQUB_ACTIVATED"
  | "CYCLE_CREATED"
  | "PAYOUT_DRAW_STARTED"
  | "PAYOUT_RECIPIENT_SELECTED"
  | "CONTRIBUTION_CREATED"
  | "PAYMENT_INITIATED"
  | "PAYMENT_VERIFIED"
  | "PAYMENT_FAILED"
  | "PAYOUT_CREATED"
  | "PAYOUT_COMPLETED"
  | "PAYOUT_TRANSFER_INITIATED"
  | "PAYOUT_TRANSFER_AWAITING_APPROVAL"
  | "PAYOUT_TRANSFER_FAILED"
  | "MEMBER_REMOVED"
  | "EQUB_CANCELLED"
  | "EQUB_PAUSED"
  | "EQUB_COMPLETED";

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actorId: string;
  equbId?: string;
  affectedUserId?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  reason?: string;
  timestamp: string;
}

// ─── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType =
  | "CONTRIBUTION_DUE"
  | "CONTRIBUTION_OVERDUE"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "PAYOUT_RECEIVED"
  | "PAYOUT_PROCESSING"
  | "PAYOUT_ACTION_REQUIRED"
  | "PAYOUT_DRAW_RESULT"
  | "MEMBERSHIP_REQUESTED"
  | "MEMBERSHIP_APPROVED"
  | "MEMBERSHIP_REJECTED"
  | "MEMBERSHIP_WITHDRAWN"
  | "EQUB_START_DATE_CHANGED"
  | "EQUB_LOCKED"
  | "CYCLE_DUE"
  | "CYCLE_WAITING_ELIGIBILITY"
  | "GENERAL";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  equbId?: string;
  read: boolean;
  createdAt: string;
}

// ─── User profile ──────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  rating: number;
  ratingUpdatedAt: string;
  phone?: string;
  payoutAccount?: PayoutAccount;
  createdAt: string;
  updatedAt: string;
}

