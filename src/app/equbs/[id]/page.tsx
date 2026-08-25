"use client";

import { EditEqubDialog } from "@/components/equbs/EditEqubDialog";
import { Navbar } from "@/components/layout/Navbar";
import { MockPaymentSheet } from "@/components/payments/MockPaymentSheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
import { formatDate } from "@/lib/utils";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { CheckCheck, PencilLine, UserMinus } from "lucide-react";
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

  async function handlePay(obligationId: string) {
    const obligation = userObligations.find((item) => item.id === obligationId);
    setActionLoading(true);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ obligationId }),
    });
    if (res.ok) {
      const { payment } = await res.json();
      setActivePayment({
        providerTransactionId: payment.providerTransactionId,
        amountMinor: payment.amountMinor,
        dueDate: obligation?.dueDate ?? payment.initiatedAt.slice(0, 10),
        status: payment.status,
      });
      setPaymentSheetOpen(true);
      toast.success("Payment ready.");
    } else {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Unable to start payment.");
    }
    setActionLoading(false);
  }

  async function handlePaymentOutcome(outcome: "SUCCESS" | "FAILED") {
    if (!activePayment) return;

    setActionLoading(true);
    const mockResponse = await fetch("/api/payments/mock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        providerTransactionId: activePayment.providerTransactionId,
        outcome,
      }),
    });

    if (!mockResponse.ok) {
      const body = await mockResponse.json().catch(() => null);
      toast.error(body?.error ?? "Unable to update the mock payment.");
      setActionLoading(false);
      return;
    }

    if (outcome === "SUCCESS") {
      const verifyResponse = await fetch("/api/payments", {
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

      if (verifyResponse.ok) {
        setActivePayment((current) =>
          current ? { ...current, status: "SUCCESS" } : current,
        );
        await loadData(equbId, token);
        toast.success("Payment verified.");
      } else {
        const body = await verifyResponse.json().catch(() => null);
        toast.error(body?.error ?? "Unable to verify payment.");
      }
    } else {
      setActivePayment((current) =>
        current ? { ...current, status: "FAILED" } : current,
      );
      toast.error("Payment marked as failed.");
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
      const result = await res.json();
      setDrawResult(result.draw);
      toast.success("Payout draw completed.");
      loadData(equbId, token);
    } else {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Unable to draw payout.");
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
      await loadData(equbId, token);
      toast.success("Equb opened for members.");
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
      await loadData(equbId, token);
      toast.success("Equb started.");
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
      await loadData(equbId, token);
      setSelectedMembershipIds((current) =>
        current.filter((id) => id !== membershipId),
      );
      toast.success("Member approved.");
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
      body: JSON.stringify({
        action: "reject_member",
        membershipId,
      }),
    });
    if (res.ok) {
      const body = await res.json();
      toast.success(body?.message ?? "Member rejected.");
      setRejectTarget(null);
      await loadData(equbId, token);
    } else {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Unable to reject member.");
    }
    setActionLoading(false);
  }

  async function handleWithdraw() {
    if (!userMembership) return;

    setActionLoading(true);
    const res = await fetch(`/api/equbs/${equbId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: "withdraw_membership",
        membershipId: userMembership.id,
      }),
    });

    if (res.ok) {
      toast.success("Membership withdrawn.");
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
    if (!window.confirm("Delete this Equb? This cannot be undone.")) return;
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
      const fallbackSearchHref = isAdmin ? "/equbs" : "/search";
      return (
        <div className="min-h-screen bg-gray-50">
          <Navbar
            links={[]}
            userName={userName}
            isAdmin={isAdmin}
            searchHref={fallbackSearchHref}
            notificationsHref="/notifications"
            onSignOut={() =>
              signOut(getFirebaseAuth()).then(
                () => (window.location.href = "/"),
              )
            }
          />
          <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center px-4 py-12">
            <Card className="w-full">
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <span className="text-xl font-bold">?</span>
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold text-gray-900">
                    Equb not found
                  </h1>
                  <p className="text-sm text-gray-600">
                    The Equb you were looking for does not exist or is no longer
                    available.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href={fallbackSearchHref}>
                    <Button>Back to browsing</Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="secondary">Go to dashboard</Button>
                  </Link>
                </div>
              </div>
            </Card>
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
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        links={[]}
        userName={userName}
        isAdmin={isAdmin}
        searchHref={isAdmin ? "/equbs" : "/search"}
        notificationsHref="/notifications"
        onSignOut={() =>
          signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))
        }
      />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{equb.name}</h1>
            <p className="mt-1 text-gray-600">{equb.description}</p>
          </div>
          <StatusBadge status={equb.status} />
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Card title="Configuration">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Contribution</dt>
                <dd className="font-medium">
                  {formatMoney(equb.contributionAmountMinor)} /{" "}
                  {equb.frequency.toLowerCase()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Members</dt>
                <dd>
                  {approvedMemberCount} / {equb.memberLimit}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Cycles</dt>
                <dd>{equb.numberOfCycles}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Current pool</dt>
                <dd className="font-medium text-emerald-700">
                  {currentPoolDisplay}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Start date</dt>
                <dd>{formatDate(equb.startDate)}</dd>
              </div>
            </dl>
          </Card>

          {!isAdmin && (
            <Card title="Your status">
              {userMembership ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Membership</dt>
                    <dd>
                      <StatusBadge status={userMembership.status} />
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Received payout?</dt>
                    <dd>{userMembership.hasReceivedPayout ? "Yes" : "No"}</dd>
                  </div>
                  {eligibility && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Next draw eligible?</dt>
                      <dd>
                        <StatusBadge
                          status={
                            eligibility.eligible ? "ELIGIBLE" : "NOT_ELIGIBLE"
                          }
                        />
                      </dd>
                    </div>
                  )}
                  {eligibility?.reason && (
                    <p className="text-xs text-red-600">{eligibility.reason}</p>
                  )}
                  {overdueObligations.length > 0 && (
                    <p className="text-xs text-red-600">
                      {overdueObligations.length} overdue contribution(s)
                    </p>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-gray-600">
                  You are not a member of this Equb yet.
                </p>
              )}

              <div className="mt-4 space-y-3">
                {!userMembership && equb.status === "OPEN_FOR_MEMBERS" && (
                  <Button
                    onClick={handleJoin}
                    loading={actionLoading}
                    className="w-full"
                  >
                    Request to Join
                  </Button>
                )}
                {!userMembership && equb.status === "DRAFT" && (
                  <p className="text-sm text-gray-500">
                    Joining is not available yet.
                  </p>
                )}
                {pendingObligations.slice(0, 1).map((o) => (
                  <div key={o.id} className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Due: {formatMoney(o.totalDueMinor)} by{" "}
                      {formatDate(o.dueDate)}
                    </p>
                    <Button
                      onClick={() => handlePay(o.id)}
                      loading={actionLoading}
                      className="w-full"
                    >
                      Pay Contribution
                    </Button>
                  </div>
                ))}
                {userMembership &&
                  equb.status === "ACTIVE" &&
                  pendingObligations.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      The Equb has started. Please contribute right away. If
                      this contribution is not paid by{" "}
                      {formatDate(pendingObligations[0].dueDate)}, your rating
                      will be reduced and you may be marked overdue.
                    </div>
                  )}
                {userMembership &&
                  !["ACTIVE", "COMPLETED", "CANCELLED"].includes(
                    equb.status,
                  ) && (
                    <Button
                      variant="outline"
                      onClick={() => setWithdrawConfirmOpen(true)}
                      loading={actionLoading}
                      className="w-full"
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      Withdraw membership
                    </Button>
                  )}
              </div>
            </Card>
          )}

          {isAdmin && (
            <Card title="Actions">
              {!hasMembers && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                    {equb.status === "DRAFT"
                      ? "This Equb is in draft mode. Open it when you are ready for members to join."
                      : "This Equb has no members yet, so you can still edit or remove it."}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {equb.status === "DRAFT" && (
                      <Button onClick={handleOpen} loading={actionLoading}>
                        Open for Members
                      </Button>
                    )}
                    {["DRAFT", "OPEN_FOR_MEMBERS", "LOCKED"].includes(
                      equb.status,
                    ) ? (
                      <EditEqubDialog
                        token={token}
                        equb={equb}
                        membersCount={memberCount}
                        onSaved={() => loadData(equbId, token)}
                      />
                    ) : null}
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      loading={actionLoading}
                    >
                      Delete Equb
                    </Button>
                  </div>
                </div>
              )}
              {equb.status === "OPEN_FOR_MEMBERS" && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    Minimum approved members required to start:{" "}
                    {minimumApprovedMembersToStart}. Current approved members:{" "}
                    {approvedMemberCount}.
                  </p>
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
                      className="w-full"
                    >
                      Start Equb
                    </Button>
                  ) : (
                    <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                      This Equb cannot start until it reaches{" "}
                      {minimumApprovedMembersToStart} approved members.
                    </div>
                  )}
                </div>
              )}
              {!userMembership &&
                equb.status === "OPEN_FOR_MEMBERS" &&
                isAdmin && (
                  <p className="text-sm text-gray-500">
                    Admin accounts cannot join Equbs. Use the approval controls
                    below to manage requests.
                  </p>
                )}
            </Card>
          )}
        </div>

        {isAdmin && (
          <Card
            title="Members"
            description="Approved and pending members in one table. Select pending members to approve them in bulk."
            className="mt-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
              <p className="text-sm text-gray-600">
                {memberRows.length} member{memberRows.length === 1 ? "" : "s"}
                {pendingMemberRows.length > 0
                  ? `, ${pendingMemberRows.length} pending`
                  : ""}
              </p>
              <div className="flex items-center gap-3">
                {bulkStatus && (
                  <p className="text-sm text-gray-600">{bulkStatus}</p>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleBulkApprove}
                  loading={actionLoading}
                  disabled={selectedPendingCount === 0}
                >
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Approve selected
                </Button>
              </div>
            </div>

            {memberRows.length === 0 ? (
              <div className="py-6">
                <Empty className="border-0 py-4">
                  <EmptyContent>
                    <EmptyHeader>
                      <EmptyMedia>
                        <CheckCheck className="h-5 w-5 text-muted-foreground" />
                      </EmptyMedia>
                      <EmptyTitle>No members yet</EmptyTitle>
                      <EmptyDescription>
                        Members and pending requests will appear here once
                        people join this Equb.
                      </EmptyDescription>
                    </EmptyHeader>
                  </EmptyContent>
                </Empty>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        aria-label="Select all pending members"
                        type="checkbox"
                        checked={allPendingSelected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedMembershipIds(
                              pendingMemberRows.map(
                                ({ membership }) => membership.id,
                              ),
                            );
                          } else {
                            setSelectedMembershipIds([]);
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Contribution</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberRows.map(
                    ({ membership, user, contributionStatus }) => {
                      const isPending = membership.status === "PENDING";
                      const isChecked = selectedMembershipIds.includes(
                        membership.id,
                      );

                      return (
                        <TableRow key={membership.id}>
                          <TableCell>
                            {isPending ? (
                              <input
                                aria-label={`Select ${user.displayName}`}
                                type="checkbox"
                                checked={isChecked}
                                onChange={(event) => {
                                  setSelectedMembershipIds((current) =>
                                    event.target.checked
                                      ? [...current, membership.id]
                                      : current.filter(
                                          (id) => id !== membership.id,
                                        ),
                                  );
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              />
                            ) : (
                              <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-emerald-200 bg-emerald-50 text-emerald-600">
                                <CheckCheck className="h-3 w-3" />
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">
                            {user.displayName}
                          </TableCell>
                          <TableCell>{user.email || user.id}</TableCell>
                          <TableCell>{user.rating}/100</TableCell>
                          <TableCell>
                            {formatDate(membership.joinedAt)}
                          </TableCell>
                          <TableCell>
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
                          <TableCell>
                            <StatusBadge status={membership.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  loading={actionLoading}
                                  onClick={() => handleApprove(membership.id)}
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
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">
                                Approved
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    },
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        )}

        {currentCycle && isAdmin && !currentCycle.drawId && cycleDueReached && (
          <Card
            title={`Cycle ${currentCycle.cycleNumber} - Draw Payout`}
            className="mt-6"
          >
            <p className="text-sm text-gray-600">
              Pool: {formatMoney(currentCycle.poolAmountMinor)} - Status:{" "}
              <StatusBadge status={currentCycle.status} />
            </p>
            <Button
              onClick={() => handleDraw(currentCycle.id)}
              loading={actionLoading}
              className="mt-4"
            >
              Draw Payout Recipient
            </Button>
            {drawResult && (
              <div className="mt-4 rounded-lg bg-emerald-50 p-4">
                <p className="font-semibold text-emerald-800">
                  Draw complete - Member selected
                </p>
                <p className="text-sm text-emerald-700">
                  Draw ID: {drawResult.id}
                </p>
              </div>
            )}
          </Card>
        )}

        {currentCycle &&
          isAdmin &&
          !currentCycle.drawId &&
          !cycleDueReached && (
            <Card
              title={`Cycle ${currentCycle.cycleNumber} - Draw Payout`}
              className="mt-6"
            >
              <p className="text-sm text-gray-600">
                The first payout becomes available on{" "}
                {formatDate(currentCycle.dueDate)}.
              </p>
            </Card>
          )}

        <Card title="Cycles & Payouts" className="mt-6">
          {cycles.length === 0 ? (
            <div className="py-8">
              <Empty className="border-0 py-4">
                <EmptyContent>
                  <EmptyHeader>
                    <EmptyMedia>
                      <PencilLine className="h-5 w-5 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>No cycles yet</EmptyTitle>
                    <EmptyDescription>
                      Cycles and payouts will appear here after the Equb starts.
                    </EmptyDescription>
                  </EmptyHeader>
                </EmptyContent>
              </Empty>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Pool</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipient</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.map((cycle) => (
                  <TableRow key={cycle.id}>
                    <TableCell className="font-medium text-gray-900">
                      {cycle.cycleNumber}
                    </TableCell>
                    <TableCell>{formatDate(cycle.dueDate)}</TableCell>
                    <TableCell>{formatMoney(cycle.poolAmountMinor)}</TableCell>
                    <TableCell>
                      <StatusBadge status={cycle.status} />
                    </TableCell>
                    <TableCell>
                      {cycle.payoutRecipientId
                        ? (memberNameByUserId.get(cycle.payoutRecipientId) ??
                          `${cycle.payoutRecipientId.slice(0, 8)}...`)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </main>

      <Dialog open={startConfirmOpen} onOpenChange={setStartConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Equb with pending requests?</DialogTitle>
            <DialogDescription>
              {pendingMemberRows.length} pending request
              {pendingMemberRows.length === 1 ? " is" : "s are"} still waiting.
              Starting now will reject them automatically and notify them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setStartConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              loading={actionLoading}
              onClick={handleConfirmedLock}
            >
              Start Equb
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => !open && setRejectTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject membership request?</DialogTitle>
            <DialogDescription>
              {rejectTarget?.memberName} will be notified that their request was
              rejected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setRejectTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={actionLoading}
              onClick={() =>
                rejectTarget && handleReject(rejectTarget.membershipId)
              }
            >
              Reject request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawConfirmOpen} onOpenChange={setWithdrawConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw your membership?</DialogTitle>
            <DialogDescription>
              This will remove you from the Equb before it starts. You can
              request to join again later if the Equb is still open.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setWithdrawConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              loading={actionLoading}
              onClick={handleWithdraw}
            >
              Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
