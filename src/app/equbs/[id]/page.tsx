"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
import { formatDate } from "@/lib/utils";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { CheckCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
  const [actionLoading, setActionLoading] = useState(false);
  const [drawResult, setDrawResult] = useState<PayoutDraw | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState<string | undefined>();
  const [selectedMembershipIds, setSelectedMembershipIds] = useState<string[]>(
    [],
  );
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);

  const loadData = useCallback(async (id: string, authToken: string) => {
    const res = await fetch(`/api/equbs/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      setData(await res.json());
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
        setUserName(profile.displayName ?? profile.email ?? user.displayName ?? user.email ?? "Account");
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
    if (res.ok) loadData(equbId, token);
    setActionLoading(false);
  }

  async function handlePay(obligationId: string) {
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
      window.location.href = `/payments/mock/${payment.providerTransactionId}`;
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
      loadData(equbId, token);
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
    }
    setActionLoading(false);
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
    }
    setActionLoading(false);
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
      const approvedCount = result?.approved?.length ?? selectedMembershipIds.length;
      const skippedCount = result?.skipped?.length ?? 0;
      setSelectedMembershipIds([]);
      setBulkStatus(
        skippedCount > 0
          ? `Approved ${approvedCount} member(s). ${skippedCount} selection(s) were skipped.`
          : `Approved ${approvedCount} member(s).`,
      );
      await loadData(equbId, token);
    } else {
      const body = await res.json().catch(() => null);
      setBulkStatus(body?.error ?? "Bulk approval failed.");
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
      window.location.href = "/admin";
      return;
    }
    setActionLoading(false);
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
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
  const memberCount = memberships.length;
  const hasMembers = memberCount > 0;
  const currentCycle = cycles.find((c) =>
    ["ACTIVE", "DRAW_PENDING", "WAITING_FOR_ELIGIBILITY", "DRAWN"].includes(
      c.status,
    ),
  );
  const memberRows = memberSummaries;
  const pendingMemberRows = memberRows.filter(
    ({ membership }) => membership.status === "PENDING",
  );
  const allPendingSelected =
    pendingMemberRows.length > 0 &&
    pendingMemberRows.every(({ membership }) =>
      selectedMembershipIds.includes(membership.id),
    );
  const selectedPendingCount = selectedMembershipIds.length;
  const pendingObligations = userObligations.filter((o) => o.status !== "PAID");
  const overdueObligations = userObligations.filter(
    (o) => o.status === "OVERDUE",
  );
  const memberNameByUserId = new Map(
    memberSummaries.map(({ membership, user }) => [membership.userId, user.displayName]),
  );
  const navLinks = isAdmin
    ? [{ href: "/admin", label: "Admin" }]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        links={navLinks}
        userName={userName}
        isAdmin={isAdmin}
        searchHref={isAdmin ? "/equbs" : "/search"}
        notificationsHref="/notifications"
        onSignOut={() => signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))}
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
                  {
                    memberships.filter((m) =>
                      ["ACTIVE", "APPROVED"].includes(m.status),
                    ).length
                  }{" "}
                  / {equb.memberLimit}
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
                      Due: {formatMoney(o.totalDueMinor)} by {formatDate(o.dueDate)}
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
                    <Link href={`/admin/equbs/${equb.id}/edit`}>
                      <Button variant="secondary" type="button">
                        Edit Equb
                      </Button>
                    </Link>
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
                    Minimum members required to start: {equb.minimumMemberCount}.
                    Current members: {memberCount}.
                  </p>
                  {memberCount >= equb.minimumMemberCount ? (
                    <Button
                      onClick={handleLock}
                      loading={actionLoading}
                      className="w-full"
                    >
                      Start Equb
                    </Button>
                  ) : (
                    <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                      This Equb cannot start until it reaches{" "}
                      {equb.minimumMemberCount} active members.
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
                            pendingMemberRows.map(({ membership }) => membership.id),
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                      No members yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  memberRows.map(({ membership, user }) => {
                    const isPending = membership.status === "PENDING";
                    const isChecked = selectedMembershipIds.includes(membership.id);

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
                                    : current.filter((id) => id !== membership.id),
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
                        <TableCell>{formatDate(membership.joinedAt)}</TableCell>
                        <TableCell>
                          <StatusBadge status={membership.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          {isPending ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              loading={actionLoading}
                              onClick={() => handleApprove(membership.id)}
                            >
                              Approve
                            </Button>
                          ) : (
                            <span className="text-sm text-gray-400">Approved</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {currentCycle && isAdmin && !currentCycle.drawId && (
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

        <Card title="Cycles & Payouts" className="mt-6">
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
                      ? memberNameByUserId.get(cycle.payoutRecipientId) ??
                        `${cycle.payoutRecipientId.slice(0, 8)}...`
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}

