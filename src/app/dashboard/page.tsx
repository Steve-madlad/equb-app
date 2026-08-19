"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { Plus } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Navbar } from "@/components/layout/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatDateTime } from "@/lib/utils";
import { formatMoney } from "@/lib/domain/money";
import type { Equb, Membership, UserProfile } from "@/lib/domain/types";

type EqubSummary = Equb & {
  activeMemberCount?: number;
  pendingMemberCount?: number;
};

type MembershipSummary = {
  membership: Membership;
  equb: Equb | null;
};

const PAGE_SIZE = 6;

function getMembershipTone(status?: Membership["status"]) {
  switch (status) {
    case "PENDING":
      return "border-amber-200 bg-amber-50";
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50";
    case "ACTIVE":
      return "border-emerald-300 bg-white";
    default:
      return "border-gray-200 bg-white";
  }
}

function formatRoleCopy(role?: UserProfile["role"]) {
  return role === "ADMIN"
    ? "These are the groups you manage."
    : "These are the groups you participate in.";
}

function EqubCard({
  equb,
  membership,
  managedByYou = false,
  highlightTone,
}: {
  equb: EqubSummary;
  membership?: Membership;
  managedByYou?: boolean;
  highlightTone?: string;
}) {
  return (
    <Card
      className={[
        "h-full overflow-hidden transition-shadow hover:shadow-md",
        highlightTone ?? "",
      ].join(" ")}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                {membership ? "My Equb" : "Available"}
              </span>
              {managedByYou ? (
                <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-700">
                  Managed by you
                </span>
              ) : null}
            </div>
            <CardTitle className="truncate">{equb.name}</CardTitle>
            <CardDescription className="line-clamp-3">
              {equb.description}
            </CardDescription>
          </div>
          <StatusBadge status={equb.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {membership ? <StatusBadge status={membership.status} /> : null}
          <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-600">
            {equb.frequency.toLowerCase()}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Members</dt>
            <dd className="font-medium text-gray-900">
              {equb.activeMemberCount ?? 0}/{equb.memberLimit}
              {equb.pendingMemberCount ? (
                <span className="ml-1 text-xs text-amber-600">
                  ({equb.pendingMemberCount} pending)
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Contribution</dt>
            <dd className="font-medium text-gray-900">
              {formatMoney(equb.contributionAmountMinor)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Cycles</dt>
            <dd className="font-medium text-gray-900">{equb.numberOfCycles}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="font-medium text-gray-900">
              {formatDateTime(equb.createdAt)}
            </dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter className="flex items-center justify-between text-xs text-gray-500">
        <span>{formatDate(equb.startDate)}</span>
        {membership ? (
          <span>Joined {formatDateTime(membership.joinedAt)}</span>
        ) : (
          <span>Open to view</span>
        )}
      </CardFooter>
    </Card>
  );
}

function CreateEqubDialog({
  token,
  onCreated,
}: {
  token: string;
  onCreated: (equbId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    contributionAmount: 1000,
    frequency: "MONTHLY" as "WEEKLY" | "MONTHLY",
    memberLimit: 10,
    minimumMemberCount: 2,
    startDate: new Date().toISOString().split("T")[0],
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/equbs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...form,
        numberOfCycles: form.memberLimit,
        penaltyEnabled: false,
      }),
    });

    if (res.ok) {
      const { equb } = await res.json();
      setOpen(false);
      onCreated(equb.id);
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Unable to create Equb.");
    }

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus className="mr-2 size-4" />
          Create Equb
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Equb</DialogTitle>
          <DialogDescription>
            Create a new rotating savings group from the dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                required
                placeholder="Name the group"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
                placeholder="Short details about the Equb"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Contribution (ETB)</label>
              <Input
                type="number"
                min="1"
                value={form.contributionAmount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contributionAmount: Number(event.target.value),
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Frequency</label>
              <Select
                value={form.frequency}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    frequency: value as "WEEKLY" | "MONTHLY",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Member limit</label>
              <Input
                type="number"
                min="2"
                value={form.memberLimit}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setForm((current) => ({
                    ...current,
                    memberLimit: next,
                    minimumMemberCount: Math.min(current.minimumMemberCount, next),
                  }));
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum members to start</label>
              <Input
                type="number"
                min="1"
                max={form.memberLimit}
                value={form.minimumMemberCount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    minimumMemberCount: Number(event.target.value),
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Start date</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Equb
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [equbs, setEqubs] = useState<EqubSummary[]>([]);
  const [membershipStatuses, setMembershipStatuses] = useState<MembershipSummary[]>([]);
  const [token, setToken] = useState("");
  const [searchHref, setSearchHref] = useState<string | undefined>();
  const [notificationCount, setNotificationCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const token = await user.getIdToken();
      setToken(token);
      const [feedRes, equbsRes] = await Promise.all([
        fetch("/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/equbs", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (feedRes.ok) {
        const data = await feedRes.json();
        setProfile(data.profile);
        setMembershipStatuses(data.membershipStatuses ?? []);
        setNotificationCount(data.unreadCount ?? 0);
        setSearchHref(data.profile?.role === "ADMIN" ? "/equbs" : "/search");
      }

      if (equbsRes.ok) {
        const { equbs: e } = await equbsRes.json();
        setEqubs(e);
      }

      setLoading(false);
    });

    return unsub;
  }, []);

  const visibleEqubs = useMemo(
    () => equbs.filter((equb) => equb.status !== "DRAFT"),
    [equbs],
  );

  const myEqubIds = useMemo(() => {
    if (!profile) return new Set<string>();
    if (profile.role === "ADMIN") {
      return new Set(
        visibleEqubs.filter((equb) => equb.createdBy === profile.id).map((equb) => equb.id),
      );
    }
    return new Set(membershipStatuses.map(({ membership }) => membership.equbId));
  }, [membershipStatuses, profile, visibleEqubs]);

  const myEqubs = useMemo(
    () => visibleEqubs.filter((equb) => myEqubIds.has(equb.id)),
    [myEqubIds, visibleEqubs],
  );

  const discoverEqubs = useMemo(
    () => visibleEqubs.filter((equb) => !myEqubIds.has(equb.id)),
    [myEqubIds, visibleEqubs],
  );

  const totalPages = Math.max(1, Math.ceil(discoverEqubs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedDiscoverEqubs = discoverEqubs.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        links={[]}
        userName={profile?.displayName}
        isAdmin={profile?.role === "ADMIN"}
        searchHref={searchHref}
        notificationCount={notificationCount}
        notificationsHref="/notifications"
        onSignOut={() => signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))}
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {profile?.displayName}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {myEqubs.length} Equb{myEqubs.length === 1 ? "" : "s"} in your space and{" "}
              {discoverEqubs.length} more to explore.
            </p>
          </div>
          {profile?.role === "ADMIN" ? (
            <CreateEqubDialog
              token={token}
              onCreated={(equbId) => {
                window.location.href = `/equbs/${equbId}`;
              }}
            />
          ) : null}
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Your Equbs</h2>
              <p className="text-sm text-gray-600">{formatRoleCopy(profile?.role)}</p>
            </div>
          </div>

          {myEqubs.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">
                  You are not part of any active Equbs yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {myEqubs.map((equb) => {
                const membership = membershipStatuses.find(({ membership }) => membership.equbId === equb.id)?.membership;
                const isManaged = profile?.role === "ADMIN" && equb.createdBy === profile.id;

                return (
                  <Link key={equb.id} href={`/equbs/${equb.id}`} className="block h-full">
                    <EqubCard
                      equb={equb}
                      membership={membership}
                      managedByYou={isManaged}
                      highlightTone={getMembershipTone(membership?.status)}
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Discover Equbs</h2>
              <p className="text-sm text-gray-600">
                Browse the other active Equbs available in the system.
              </p>
            </div>
            <p className="text-sm text-gray-500">
              Page {safePage} of {totalPages}
            </p>
          </div>

          {pagedDiscoverEqubs.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">
                  No additional Equbs available right now.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {pagedDiscoverEqubs.map((equb) => (
                <Link key={equb.id} href={`/equbs/${equb.id}`} className="block h-full">
                  <EqubCard equb={equb} />
                </Link>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <div />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
