"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
import { onIdTokenChanged } from "firebase/auth";
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
      const profileRes = await fetch("/api/users/profile", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (profileRes.ok) {
        const { profile } = await profileRes.json();
        setIsAdmin(profile.role === "ADMIN");
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
    poolDisplay,
    pendingRequests = [],
    memberSummaries = [],
  } = data;
  const memberCount = memberships.length;
  const hasMembers = memberCount > 0;
  const currentCycle = cycles.find((c) =>
    ["ACTIVE", "DRAW_PENDING", "WAITING_FOR_ELIGIBILITY", "DRAWN"].includes(
      c.status,
    ),
  );
  const pendingObligations = userObligations.filter((o) => o.status !== "PAID");
  const overdueObligations = userObligations.filter(
    (o) => o.status === "OVERDUE",
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        links={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/equbs", label: "Equbs" },
        ]}
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
                <dt className="text-gray-500">Pool</dt>
                <dd className="font-medium text-emerald-700">{poolDisplay}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Start date</dt>
                <dd>{formatDate(equb.startDate)}</dd>
              </div>
            </dl>
          </Card>

          {userMembership && (
            <Card title="Your status">
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
            </Card>
          )}

          <Card title="Actions">
            {isAdmin && !hasMembers && (
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
                    variant="danger"
                    onClick={handleDelete}
                    loading={actionLoading}
                  >
                    Delete Equb
                  </Button>
                </div>
              </div>
            )}
            {!isAdmin && equb.status === "DRAFT" && (
              <div className="rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
                This Equb is still in draft mode. Members can join once an admin
                opens it.
              </div>
            )}
            {isAdmin && equb.status === "OPEN_FOR_MEMBERS" && (
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
              (isAdmin ? (
                <p className="text-sm text-gray-500">
                  Admin accounts cannot join Equbs. Use the approval controls
                  below to manage requests.
                </p>
              ) : (
                <Button
                  onClick={handleJoin}
                  loading={actionLoading}
                  className="w-full"
                >
                  Request to Join
                </Button>
              ))}
            {!userMembership && equb.status === "DRAFT" && !isAdmin && (
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
          </Card>
        </div>

        {isAdmin && pendingRequests.length > 0 && (
          <Card title="Membership Requests" className="mt-6">
            <div className="space-y-3">
              {pendingRequests.map((membership) => (
                <div
                  key={membership.id}
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">{membership.requesterName}</p>
                    <p className="text-sm text-gray-500">
                      {membership.requesterEmail || membership.userId}
                    </p>
                    <p className="text-xs text-gray-500">
                      Risk rating: {membership.requesterRating}/100
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={membership.status} />
                    <Button
                      onClick={() => handleApprove(membership.id)}
                      loading={actionLoading}
                    >
                      Admit User
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {isAdmin && memberSummaries.length > 0 && (
          <Card title="Equb Members" className="mt-6">
            <div className="space-y-3">
              {memberSummaries.map(({ membership, user }) => (
                <div
                  key={membership.id}
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-sm text-gray-500">
                      {user.email || user.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        user.rating >= 75
                          ? "bg-emerald-100 text-emerald-700"
                          : user.rating >= 50
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      Rating {user.rating}/100
                    </span>
                    <StatusBadge status={membership.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {currentCycle && isAdmin && !currentCycle.drawId && (
          <Card
            title={`Cycle ${currentCycle.cycleNumber} — Draw Payout`}
            className="mt-6"
          >
            <p className="text-sm text-gray-600">
              Pool: {formatMoney(currentCycle.poolAmountMinor)} · Status:{" "}
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
                  Draw complete — Member selected
                </p>
                <p className="text-sm text-emerald-700">
                  Draw ID: {drawResult.id}
                </p>
              </div>
            )}
          </Card>
        )}

        <Card title="Cycles & Payouts" className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4">Cycle</th>
                  <th className="pb-2 pr-4">Due Date</th>
                  <th className="pb-2 pr-4">Pool</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Recipient</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cycle) => (
                  <tr key={cycle.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4">{cycle.cycleNumber}</td>
                    <td className="py-3 pr-4">{formatDate(cycle.dueDate)}</td>
                    <td className="py-3 pr-4">
                      {formatMoney(cycle.poolAmountMinor)}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={cycle.status} />
                    </td>
                    <td className="py-3">
                      {cycle.payoutRecipientId
                        ? memberships
                            .find((m) => m.userId === cycle.payoutRecipientId)
                            ?.userId.slice(0, 8) + "..."
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
