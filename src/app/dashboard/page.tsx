"use client";

import { CreateEqubDialog } from "@/components/equbs/CreateEqubDialog";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
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
import { formatMoney } from "@/lib/domain/money";
import type { Equb, Membership, UserProfile } from "@/lib/domain/types";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { formatDate, formatDateTime } from "@/lib/utils";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [equbs, setEqubs] = useState<EqubSummary[]>([]);
  const [membershipStatuses, setMembershipStatuses] = useState<
    MembershipSummary[]
  >([]);
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
        visibleEqubs
          .filter((equb) => equb.createdBy === profile.id)
          .map((equb) => equb.id),
      );
    }
    return new Set(
      membershipStatuses.map(({ membership }) => membership.equbId),
    );
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
    return <EqubLoading />;
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
        onSignOut={() =>
          signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))
        }
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {profile?.displayName}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {myEqubs.length} Equb{myEqubs.length === 1 ? "" : "s"} in your
              space and {discoverEqubs.length} more to explore.
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

        {myEqubs.length === 0 && discoverEqubs.length === 0 ? (
          <div className="mt-8">
            <Empty className="rounded-xl border bg-white p-10">
              <EmptyContent>
                <EmptyHeader>
                  <EmptyMedia>
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyTitle>No Equbs yet</EmptyTitle>
                  <EmptyDescription>
                    There are no Equbs to show right now.
                  </EmptyDescription>
                </EmptyHeader>
                {profile?.role === "ADMIN" ? (
                  <CreateEqubDialog
                    token={token}
                    onCreated={(equbId) => {
                      window.location.href = `/equbs/${equbId}`;
                    }}
                  />
                ) : null}
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          <>
            {myEqubs.length > 0 ? (
              <section className="mt-8">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Your Equbs
                    </h2>
                    <p className="text-sm text-gray-600">
                      {formatRoleCopy(profile?.role)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {myEqubs.map((equb) => {
                    const membership = membershipStatuses.find(
                      ({ membership }) => membership.equbId === equb.id,
                    )?.membership;
                    const isManaged =
                      profile?.role === "ADMIN" &&
                      equb.createdBy === profile.id;

                    return (
                      <Link
                        key={equb.id}
                        href={`/equbs/${equb.id}`}
                        className="block h-full"
                      >
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
              </section>
            ) : null}

            {discoverEqubs.length > 0 ? (
              <section className={myEqubs.length > 0 ? "mt-10" : "mt-8"}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Discover Equbs
                    </h2>
                    <p className="text-sm text-gray-600">
                      Browse the other active Equbs available in the system.
                    </p>
                  </div>
                  <p className="text-sm text-gray-500">
                    Page {safePage} of {totalPages}
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {pagedDiscoverEqubs.map((equb) => (
                    <Link
                      key={equb.id}
                      href={`/equbs/${equb.id}`}
                      className="block h-full"
                    >
                      <EqubCard equb={equb} />
                    </Link>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setPage((current) => Math.max(1, current - 1))
                      }
                      disabled={safePage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                      disabled={safePage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
