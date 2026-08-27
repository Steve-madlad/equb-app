"use client";

import { EditEqubDialog } from "@/components/equbs/EditEqubDialog";
import { Navbar } from "@/components/layout/Navbar";
import { MockPaymentSheet } from "@/components/payments/MockPaymentSheet";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EqubLoading } from "@/components/ui/EqubLoading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/domain/money";
import type {
  ContributionObligation,
  Cycle,
  Equb,
  Membership,
  PayoutDraw,
} from "@/lib/domain/types";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { getBrowserTestDate, getTodayIsoDate } from "@/lib/testClock";
import { formatDate, formatDateTime } from "@/lib/utils";
import { onIdTokenChanged, signOut } from "firebase/auth";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCheck,
  Coins,
  Crown,
  History,
  Layers,
  Lock,
  PencilLine,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface EqubDetailData {
  equb: Equb;
  memberships: Membership[];
  cycles: Cycle[];
  userMembership: Membership | null;
  userObligations: ContributionObligation[];
  eligibility: { eligible: boolean; reason: string | null } | null;
  poolDisplay: string;
  draws: PayoutDraw[];
  pendingRequests?: Array<
    Membership & {
      requesterName: string;
      requesterEmail: string;
      requesterRating: number;
    }
  >;
  memberSummaries?: Array<{
    membership: Membership;
    user: {
      id: string;
      displayName: string;
      email: string;
      rating: number;
    };
    contributionStatus: ContributionObligation["status"] | "NOT_STARTED";
  }>;
  currentPoolMinor: number;
  currentPoolDisplay: string;
}

export default function EqubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [equbId, setEqubId] = useState<string>("");
  const [data, setData] = useState<EqubDetailData | null>(null);
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [drawResult, setDrawResult] = useState<PayoutDraw | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState<string | undefined>();
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [activePayment, setActivePayment] = useState<{
    providerTransactionId: string;
    amountMinor: number;
    dueDate: string;
    status: string;
  } | null>(null);
  const [selectedMembershipIds, setSelectedMembershipIds] = useState<string[]>(
    [],
  );
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{
    membershipId: string;
    memberName: string;
  } | null>(null);
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const paymentProvider = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? "mock";

  const loadData = useCallback(async (id: string, authToken: string) => {
    setLoading(true);
    setNotFound(false);
    const res = await fetch(`/api/equbs/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      setData(await res.json());
    } else if (res.status === 404) {
      setData(null);
      setNotFound(true);
    } else {
      toast.error("Failed to load Equb details.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    params.then((p) => setEqubId(p.id));
  }, [params]);

  useEffect(() => {
    if (!equbId) return;
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }
      const t = await user.getIdToken();
      setToken(t);
      setUserName(user.displayName ?? user.email ?? "Account");
      const profileRes = await fetch("/api/users/profile", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (profileRes.ok) {
        const { profile } = await profileRes.json();
        setIsAdmin(profile.role === "ADMIN");
        setUserName(
          profile.displayName ??
          profile.email ??
          user.displayName ??
          user.email ??
          "Account",
        );
      }
      loadData(equbId, t);
      // Fetch notification count
      fetch("/api/notifications", { headers: { Authorization: `Bearer ${t}` } })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d?.unreadCount != null) setNotificationCount(d.unreadCount); })
        .catch(() => undefined);
    });
    return unsub;
  }, [equbId, loadData]);

  async function handleJoin() {
    setActionLoading(true);
    const res = await fetch("/api/memberships", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ equbId }),
    });
    if (res.ok) {
      toast.success("Join request submitted.");
      loadData(equbId, token);
    } else {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Unable to submit join request.");
    }
    setActionLoading(false);
  }

  async function handleOpen() {
    setActionLoading(true);
    const res = await fetch(`/api/equbs/${equbId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "open" }),
    });
    if (res.ok) {
      toast.success("Equb opened for members.");
      loadData(equbId, token);
    } else {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Unable to open Equb.");
    }
    setActionLoading(false);
  }

  async function handleLock() {
    setActionLoading(true);
    const res = await fetch(`/api/equbs/${equbId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "lock" }),
    });
    if (res.ok) {
      toast.success("Equb started.");
      loadData(equbId, token);
    } else {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Unable to start Equb.");
    }
    setActionLoading(false);
  }

  async function handleConfirmedLock() {
    setStartConfirmOpen(false);
    await handleLock();
  }

  async function handleApprove(membershipId: string) {
    setActionLoading(true);
    const res = await fetch(`/api/equbs/${equbId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "approve_member", membershipId }),
    });
    if (res.ok) {
      toast.success("Member approved.");
      loadData(equbId, token);
    } else {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Unable to approve member.");
    }
    setActionLoading(false);
  }

  async function handleReject(membershipId: string) {
    setActionLoading(true);
    const res = await fetch(`/api/equbs/${equbId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "reject_member", membershipId }),
    });
    if (res.ok) {
      toast.success("Membership request rejected.");
      setRejectTarget(null);
      loadData(equbId, token);
    } else {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Unable to reject member.");
    }
    setActionLoading(false);
  }

  async function handleDraw(cycleId: string) {
    setActionLoading(true);
    const res = await fetch(`/api/equbs/${equbId}/draw`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ cycleId }),
    });
    if (res.ok) {
      const body = await res.json();
      setDrawResult(body.draw);
      toast.success("Payout recipient drawn.");
      loadData(equbId, token);
    } else {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Unable to draw payout recipient.");
    }
    setActionLoading(false);
  }

  async function handlePay(obligationId: string) {
    setActionLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "initiate",
          obligationId,
          provider: paymentProvider,
        }),
      });
      if (res.ok) {
        const body = await res.json();
        const matchingObligation = userObligations.find(
          (o) => o.id === obligationId,
        );
        setActivePayment({
          providerTransactionId: body.payment.providerTransactionId,
          amountMinor:
            body.payment.amountMinor ?? matchingObligation?.totalDueMinor ?? 0,
          dueDate:
            body.obligation?.dueDate ??
            matchingObligation?.dueDate ??
            new Date().toISOString(),
          status: body.payment.status,
        });
        setPaymentSheetOpen(true);
      } else {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "Unable to initiate payment.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to initiate payment.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePaymentOutcome(outcome: "SUCCESS" | "FAILED") {
    if (!activePayment) return;
    setActionLoading(true);
    const res = await fetch("/api/payments/mock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        providerTransactionId: activePayment.providerTransactionId,
        outcome,
      }),
    });
    if (res.ok) {
      toast.success(
        outcome === "SUCCESS" ? "Payment confirmed." : "Payment marked failed.",
      );
      setPaymentSheetOpen(false);
      loadData(equbId, token);
    } else {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Unable to process payment outcome.");
    }
    setActionLoading(false);
  }

  async function handleWithdraw() {
    setActionLoading(true);
    const res = await fetch(`/api/equbs/${equbId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: "withdraw_membership",
        membershipId: activeUserMembership?.id ?? data?.userMembership?.id,
      }),
    });
    if (res.ok) {
      toast.success("Withdrawn from Equb.");
      setWithdrawConfirmOpen(false);
      window.location.href = "/dashboard";
    } else {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Unable to withdraw membership.");
      setActionLoading(false);
    }
  }

  async function handleBulkApprove() {
    if (selectedMembershipIds.length === 0) return;
    setActionLoading(true);
    setBulkStatus(null);
    const res = await fetch(`/api/equbs/${equbId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: "approve_members",
        membershipIds: selectedMembershipIds,
      }),
    });

    if (res.ok) {
      const { result } = await res.json();
      const approvedCount =
        result?.approved?.length ?? selectedMembershipIds.length;
      const skippedCount = result?.skipped?.length ?? 0;
      setSelectedMembershipIds([]);
      setBulkStatus(
        skippedCount > 0
          ? `Approved ${approvedCount} member(s). ${skippedCount} selection(s) were skipped.`
          : `Approved ${approvedCount} member(s).`,
      );
      await loadData(equbId, token);
      toast.success(`Approved ${approvedCount} member(s).`);
    } else {
      const body = await res.json().catch(() => null);
      const message = body?.error ?? "Bulk approval failed.";
      setBulkStatus(message);
      toast.error(message);
    }
    setActionLoading(false);
  }

  async function handleDelete() {
    setActionLoading(true);
    const res = await fetch(`/api/equbs/${equbId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      toast.success("Equb deleted.");
      window.location.href = "/dashboard";
      return;
    }
    const body = await res.json().catch(() => null);
    toast.error(body?.error ?? "Unable to delete Equb.");
    setActionLoading(false);
  }

  if (loading || !data) {
    if (notFound) {
      return (
        <div className="min-h-screen bg-slate-100/70 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
          <Navbar
            links={[]}
            userName={userName}
            isAdmin={isAdmin}
            searchHref="/search"
            notificationsHref="/notifications"
            onSignOut={() =>
              signOut(getFirebaseAuth()).then(
                () => (window.location.href = "/"),
              )
            }
          />
          <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center px-4 py-12">
            <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl p-8 text-center w-full shadow-md">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                Equb Not Found
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-6">
                The requested Equb does not exist or has been removed.
              </p>
              <div className="flex justify-center gap-3">
                <Link href="/search">
                  <Button className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold">
                    Browse Groups
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="secondary" className="rounded-xl">
                    Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </main>
        </div>
      );
    }
    return <EqubLoading />;
  }

  const {
    equb,
    memberships,
    cycles,
    userMembership,
    userObligations,
    eligibility,
    currentPoolDisplay,
    memberSummaries = [],
  } = data;

  const visibleMembers = memberSummaries.filter(
    ({ membership }) =>
      !["REJECTED", "LEFT", "REMOVED"].includes(membership.status),
  );
  const memberCount = visibleMembers.length;
  const minimumApprovedMembersToStart = Math.max(2, equb.minimumMemberCount);
  const approvedMemberCount = memberships.filter((m) =>
    ["ACTIVE", "APPROVED"].includes(m.status),
  ).length;
  const hasMembers = visibleMembers.length > 0;
  const currentCycle = cycles.find((c) =>
    ["ACTIVE", "DRAW_PENDING", "WAITING_FOR_ELIGIBILITY", "DRAWN"].includes(
      c.status,
    ),
  );
  const todayIso = getBrowserTestDate() ?? getTodayIsoDate();
  const cycleDueReached = currentCycle
    ? currentCycle.dueDate <= todayIso
    : false;
  const memberRows = visibleMembers;
  const pendingMemberRows = memberRows.filter(
    ({ membership }) => membership.status === "PENDING",
  );
  const allPendingSelected =
    pendingMemberRows.length > 0 &&
    pendingMemberRows.every(({ membership }) =>
      selectedMembershipIds.includes(membership.id),
    );
  const selectedPendingCount = selectedMembershipIds.length;
  const currentCycleObligation = currentCycle
    ? userObligations.find(
      (obligation) => obligation.cycleId === currentCycle.id,
    )
    : undefined;
  const pendingObligations =
    currentCycleObligation && currentCycleObligation.status !== "PAID"
      ? [currentCycleObligation]
      : [];
  const overdueObligations = userObligations.filter(
    (o) => o.status === "OVERDUE",
  );
  const memberNameByUserId = new Map(
    memberSummaries.map(({ membership, user }) => [
      membership.userId,
      user.displayName,
    ]),
  );

  // A membership that is LEFT, REJECTED, or REMOVED is treated as "not a member"
  // so they see the join button again.
  const INACTIVE_STATUSES = ["LEFT", "REJECTED", "REMOVED"];
  const activeUserMembership =
    userMembership && !INACTIVE_STATUSES.includes(userMembership.status)
      ? userMembership
      : null;

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 transition-colors duration-300">
      {/* Ambient glow (dark mode only) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10 opacity-0 dark:opacity-100">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-teal-600/8 rounded-full blur-[120px]" />
      </div>

      <Navbar
        links={[]}
        userName={userName}
        isAdmin={isAdmin}
        searchHref="/search"
        notificationsHref="/notifications"
        notificationCount={notificationCount}
        onSignOut={() =>
          signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))
        }
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Hero Header */}
        <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8 shadow-md shadow-slate-200/60 dark:shadow-black/25 dark:shadow-xl mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  {equb.frequency} Equb
                </span>
                <StatusBadge status={equb.status} />
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {equb.name}
              </h1>
              {equb.description && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {equb.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && ["DRAFT", "OPEN_FOR_MEMBERS", "LOCKED"].includes(equb.status) && (
                <EditEqubDialog
                  token={token}
                  equb={equb}
                  disabled={actionLoading}
                  membersCount={memberCount}
                  onSaved={() => loadData(equbId, token)}
                />
              )}
              {isAdmin && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  loading={actionLoading}
                  className="rounded-xl text-xs"
                >
                  {!actionLoading && <Trash2 className="w-3.5 h-3.5 mr-1" />}
                  Delete
                </Button>
              )}
            </div>
          </div>

          {/* Metric Tiles Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-200 dark:border-white/10">
            <div className="rounded-2xl border border-slate-200/70 dark:border-white/5 bg-slate-50 dark:bg-slate-900/40 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Current Pool</span>
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {currentPoolDisplay}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">Verified on-ledger</p>
            </div>

            <div className="rounded-2xl border border-slate-200/70 dark:border-white/5 bg-slate-50 dark:bg-slate-900/40 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                <Coins className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Contribution</span>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {formatMoney(equb.contributionAmountMinor)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">Per {equb.frequency.toLowerCase()} cycle</p>
            </div>

            <div className="rounded-2xl border border-slate-200/70 dark:border-white/5 bg-slate-50 dark:bg-slate-900/40 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Members</span>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {approvedMemberCount} / {equb.memberLimit}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">
                {minimumApprovedMembersToStart} needed to start
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/70 dark:border-white/5 bg-slate-50 dark:bg-slate-900/40 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Start Date</span>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {formatDate(equb.startDate)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">{equb.numberOfCycles} total cycles</p>
            </div>
          </div>
        </div>

        {/* Member Action / Admin Action Hub */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {/* User Membership Status Tile */}
          {!isAdmin && (
            <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl p-6 shadow-md shadow-slate-200/60 dark:shadow-black/25 dark:shadow-xl md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Your Participation Standing
                </h2>
              </div>

              {activeUserMembership ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-200/70 dark:border-white/5">
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Membership</p>
                      <div className="mt-1">
                        <StatusBadge status={activeUserMembership.status} />
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-200/70 dark:border-white/5">
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Payout Awarded</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                        {activeUserMembership.hasReceivedPayout ? "Yes (Cycle Winner)" : "Pending Draw"}
                      </p>
                    </div>
                    {eligibility && (
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-200/70 dark:border-white/5">
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Draw Eligible</p>
                        <div className="mt-1">
                          <StatusBadge
                            status={eligibility.eligible ? "ELIGIBLE" : "NOT_ELIGIBLE"}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {eligibility?.reason && (
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
                      <span>{eligibility.reason}</span>
                    </div>
                  )}

                  {overdueObligations.length > 0 && (
                    <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/20 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
                      <span>{overdueObligations.length} overdue obligation(s) pending clearance.</span>
                    </div>
                  )}

                  {/* Payment CTA */}
                  {pendingObligations.slice(0, 1).map((o) => (
                    <div
                      key={o.id}
                      className="p-4 rounded-2xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/10 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase">
                          Cycle {currentCycle?.cycleNumber} Obligation Due
                        </p>
                        <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                          {formatMoney(o.totalDueMinor)} by {formatDate(o.dueDate)}
                        </p>
                      </div>
                      <Button
                        onClick={() => handlePay(o.id)}
                        loading={actionLoading}
                        className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold px-5 py-2"
                      >
                        Pay Contribution Now
                      </Button>
                    </div>
                  ))}

                  {activeUserMembership &&
                    ["PENDING", "APPROVED"].includes(activeUserMembership.status) &&
                    !["ACTIVE", "COMPLETED", "CANCELLED"].includes(equb.status) && (
                      <Button
                        variant="secondary"
                        onClick={() => setWithdrawConfirmOpen(true)}
                        loading={actionLoading}
                        className="rounded-xl text-xs border border-slate-200 dark:border-white/10 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      >
                        {!actionLoading && <UserMinus className="mr-1.5 h-3.5 w-3.5" />}
                        Withdraw Membership
                      </Button>
                    )}
                </div>
              ) : (
                <div className="space-y-4">
                  {userMembership && INACTIVE_STATUSES.includes(userMembership.status) && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-white/5 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-slate-400" />
                      <span>You previously left or were removed from this group.</span>
                    </div>
                  )}
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    You are not currently enrolled in this Equb group.
                  </p>
                  {equb.status === "OPEN_FOR_MEMBERS" ? (
                    <Button
                      onClick={handleJoin}
                      loading={actionLoading}
                      className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold px-6 py-2.5 shadow-lg shadow-emerald-500/20"
                    >
                      Request to Join Group
                    </Button>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Joining is not available in current {equb.status.toLowerCase()} state.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Admin Control Hub Tile */}
          {isAdmin && (
            <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl p-6 shadow-md shadow-slate-200/60 dark:shadow-black/25 dark:shadow-xl md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Lifecycle Controls
                </h2>
              </div>

              <div className="space-y-4">
                {equb.status === "DRAFT" && (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      Equb is currently in draft. Open it to start receiving membership requests.
                    </p>
                    <Button
                      onClick={handleOpen}
                      loading={actionLoading}
                      className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-4 py-2 shrink-0 text-xs"
                    >
                      Open For Members
                    </Button>
                  </div>
                )}

                {equb.status === "OPEN_FOR_MEMBERS" && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-700 dark:text-slate-300">
                        {approvedMemberCount >= minimumApprovedMembersToStart
                          ? `Ready to start (${approvedMemberCount} approved members)`
                          : `Need ${minimumApprovedMembersToStart - approvedMemberCount} more approved members to start`}
                      </span>
                      <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                        Min: {minimumApprovedMembersToStart}
                      </span>
                    </div>
                    {approvedMemberCount >= minimumApprovedMembersToStart ? (
                      <Button
                        onClick={() => {
                          if (pendingMemberRows.length > 0) {
                            setStartConfirmOpen(true);
                            return;
                          }
                          handleLock();
                        }}
                        loading={actionLoading}
                        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-2.5 shadow-lg shadow-emerald-500/20"
                      >
                        {!actionLoading && <Play className="w-4 h-4 mr-2" />}
                        Start Equb & Advance to Cycle 1
                      </Button>
                    ) : (
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Equb requires at least {minimumApprovedMembersToStart} approved members before it can start.
                      </p>
                    )}
                  </div>
                )}

                {!["DRAFT", "OPEN_FOR_MEMBERS"].includes(equb.status) && (
                  <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center mb-1">
                      <ShieldAlert className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No actions available</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      This Equb is <span className="font-medium capitalize">{equb.status.toLowerCase().replace(/_/g, " ")}</span> — lifecycle controls are locked.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Info / Schedule Tile */}
          <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl p-6 shadow-md shadow-slate-200/60 dark:shadow-black/25 dark:shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Cycle Timeline
              </h2>
            </div>
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                <dt className="text-slate-500 dark:text-slate-400">Active Cycle</dt>
                <dd className="font-bold text-slate-900 dark:text-white">
                  {currentCycle ? `Cycle #${currentCycle.cycleNumber}` : "Not Started"}
                </dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                <dt className="text-slate-500 dark:text-slate-400">Next Scheduled Due</dt>
                <dd className="font-bold text-emerald-700 dark:text-emerald-400">
                  {currentCycle ? formatDate(currentCycle.dueDate) : formatDate(equb.startDate)}
                </dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                <dt className="text-slate-500 dark:text-slate-400">Admin Fee</dt>
                <dd className="font-bold text-slate-900 dark:text-white">0.00 ETB (0%)</dd>
              </div>
              <div className="flex justify-between py-1.5">
                <dt className="text-slate-500 dark:text-slate-400">Fairness Seed</dt>
                <dd className="font-mono text-slate-700 dark:text-slate-300">SHA-256 Validated</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Admin Member Management Table */}
        {isAdmin && (
          <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl shadow-md shadow-slate-200/60 dark:shadow-black/25 dark:shadow-xl overflow-hidden mb-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/90 dark:border-white/10 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Member Directory & Admission Control
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {memberRows.length} member{memberRows.length === 1 ? "" : "s"}
                  {pendingMemberRows.length > 0 ? ` • ${pendingMemberRows.length} pending approval` : ""}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {bulkStatus && (
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{bulkStatus}</span>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleBulkApprove}
                  loading={actionLoading}
                  disabled={selectedPendingCount === 0}
                  className="rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold"
                >
                  {!actionLoading && <CheckCheck className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                  Approve Selected ({selectedPendingCount})
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                    <TableHead className="w-12 px-6 py-3">
                      <input
                        aria-label="Select all pending members"
                        type="checkbox"
                        checked={allPendingSelected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedMembershipIds(
                              pendingMemberRows.map(({ membership }) => membership.id),
                            );
                          } else {
                            setSelectedMembershipIds([]);
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 text-emerald-600 focus:ring-emerald-500"
                      />
                    </TableHead>
                    <TableHead className="px-6 py-3 text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Member</TableHead>
                    <TableHead className="px-6 py-3 text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Rating</TableHead>
                    <TableHead className="px-6 py-3 text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Joined</TableHead>
                    <TableHead className="px-6 py-3 text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Contribution</TableHead>
                    <TableHead className="px-6 py-3 text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Status</TableHead>
                    <TableHead className="px-6 py-3 text-right text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-6 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                        No members enrolled in this Equb yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    memberRows.map(({ membership, user, contributionStatus }) => {
                      const isPending = membership.status === "PENDING";
                      const isChecked = selectedMembershipIds.includes(membership.id);

                      return (
                        <TableRow
                          key={membership.id}
                          className="border-slate-200/70 dark:border-white/5 hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors"
                        >
                          <TableCell className="px-6 py-3.5">
                            {isPending ? (
                              <input
                                aria-label={`Select ${user.displayName}`}
                                type="checkbox"
                                checked={isChecked}
                                onChange={(event) => {
                                  setSelectedMembershipIds((current) =>
                                    event.target.checked
                                      ? [...current, membership.id]
                                      : current.filter((id) => id !== membership.id),
                                  );
                                }}
                                className="h-4 w-4 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 text-emerald-600 focus:ring-emerald-500"
                              />
                            ) : (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                <CheckCheck className="h-3 w-3" />
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                              {user.displayName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{user.email || user.id}</div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 text-xs font-mono font-bold">
                              {user.rating}/100
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                            {formatDate(membership.joinedAt)}
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <StatusBadge
                              status={
                                contributionStatus === "PAID"
                                  ? "PAID"
                                  : contributionStatus === "OVERDUE"
                                    ? "OVERDUE"
                                    : contributionStatus === "NOT_STARTED"
                                      ? "NOT_STARTED"
                                      : "NOT_PAID"
                              }
                            />
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <StatusBadge status={membership.status} />
                          </TableCell>
                          <TableCell className="px-6 py-3.5 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  loading={actionLoading}
                                  onClick={() => handleApprove(membership.id)}
                                  className="rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                                >
                                  Approve
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  loading={actionLoading}
                                  onClick={() =>
                                    setRejectTarget({
                                      membershipId: membership.id,
                                      memberName: user.displayName,
                                    })
                                  }
                                  className="rounded-xl text-xs"
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500">Active Member</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Draw Trigger Section */}
        {currentCycle && isAdmin && !currentCycle.drawId && cycleDueReached && (
          <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 via-slate-900/80 to-teal-950/60 backdrop-blur-xl p-6 shadow-xl mb-8 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <Crown className="w-4 h-4" />
                  <span>Cycle #{currentCycle.cycleNumber} Draw Ready</span>
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  Execute Autonomous Winner Selection
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Pool amount: <span className="font-bold text-emerald-400">{formatMoney(currentCycle.poolAmountMinor)}</span> • Selects from eligible, paid members.
                </p>
              </div>

              <Button
                onClick={() => handleDraw(currentCycle.id)}
                loading={actionLoading}
                className="rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black px-6 py-3 shadow-lg shadow-emerald-500/30 text-sm"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Draw Payout Recipient
              </Button>
            </div>

            {drawResult && (
              <div className="mt-4 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-emerald-400" />
                <span>Draw executed successfully! Reference: {drawResult.id}</span>
              </div>
            )}
          </div>
        )}

        {/* Cycles & Payouts Statement Table */}
        <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl shadow-md shadow-slate-200/60 dark:shadow-black/25 dark:shadow-xl overflow-hidden">
          <div className="border-b border-slate-200/90 dark:border-white/10 px-6 py-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Cycles, Due Dates & Disbursements
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Audit log of scheduled cycle intervals, pool values, and draw winners.
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <TableHead className="px-6 py-3.5 text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Cycle #</TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Due Date</TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Pool Amount</TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Cycle Status</TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Winner Recipient</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-6 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                      Cycles will be initialized when the Equb starts.
                    </TableCell>
                  </TableRow>
                ) : (
                  cycles.map((cycle) => (
                    <TableRow
                      key={cycle.id}
                      className="border-slate-200/70 dark:border-white/5 hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <TableCell className="px-6 py-4 font-bold text-slate-900 dark:text-white text-sm">
                        Cycle {cycle.cycleNumber}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {formatDate(cycle.dueDate)}
                      </TableCell>
                      <TableCell className="px-6 py-4 font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                        {formatMoney(cycle.poolAmountMinor)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <StatusBadge status={cycle.status} />
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {cycle.payoutRecipientId ? (
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white text-xs">
                            <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                            <span>
                              {memberNameByUserId.get(cycle.payoutRecipientId) ??
                                `${cycle.payoutRecipientId.slice(0, 8)}…`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Awaiting Draw</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      {/* Confirmation Modals */}
      <ConfirmDialog
        open={startConfirmOpen}
        onOpenChange={setStartConfirmOpen}
        variant="warning"
        title="Start Equb with pending requests?"
        description={`${pendingMemberRows.length} pending request${pendingMemberRows.length === 1 ? " is" : "s are"} still waiting. Starting now will automatically reject unapproved requests.`}
        confirmLabel="Confirm & Start"
        loading={actionLoading}
        onConfirm={handleConfirmedLock}
      />

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        variant="danger"
        title="Reject membership request?"
        description={`${rejectTarget?.memberName ?? "This member"} will be notified that their request was not accepted.`}
        confirmLabel="Reject Request"
        loading={actionLoading}
        onConfirm={() => rejectTarget && handleReject(rejectTarget.membershipId)}
      />

      <ConfirmDialog
        open={withdrawConfirmOpen}
        onOpenChange={setWithdrawConfirmOpen}
        variant="danger"
        title="Withdraw your membership?"
        description="This will remove you from the Equb before it starts. You can request to join again later if the group is still open."
        confirmLabel="Withdraw"
        loading={actionLoading}
        onConfirm={handleWithdraw}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => { if (!actionLoading) setDeleteConfirmOpen(open); }}
        variant="danger"
        title="Delete this Equb?"
        description="This action is permanent and cannot be undone. All associated data including cycles, memberships, and records will be removed."
        confirmLabel="Delete Equb"
        loading={actionLoading}
        onConfirm={handleDelete}
      />

      {/* Payment Drawer */}
      {activePayment ? (
        <MockPaymentSheet
          open={paymentSheetOpen}
          loading={actionLoading}
          status={activePayment.status}
          transactionId={activePayment.providerTransactionId}
          amountMinor={activePayment.amountMinor}
          dueDate={activePayment.dueDate}
          equbName={equb.name}
          obligationLabel="Contribution payment"
          provider={paymentProvider === "chapa" ? "chapa" : "mock"}
          onChapaSuccess={async () => {
            const response = await fetch("/api/payments", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                action: "verify",
                providerTransactionId: activePayment.providerTransactionId,
              }),
            });
            if (!response.ok) throw new Error("Unable to verify Chapa payment");
            setPaymentSheetOpen(false);
            await loadData(equbId, token);
            toast.success("Payment verified.");
          }}
          onOpenChange={(open) => setPaymentSheetOpen(open)}
          onOutcome={handlePaymentOutcome}
        />
      ) : null}
    </div>
  );
}
