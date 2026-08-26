"use client";

import { CreateEqubDialog } from "@/components/equbs/CreateEqubDialog";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { EqubLoading } from "@/components/ui/EqubLoading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/domain/money";
import type { Equb, Membership, UserProfile } from "@/lib/domain/types";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { formatDate, formatDateTime } from "@/lib/utils";
import { onIdTokenChanged, signOut } from "firebase/auth";
import {
  ArrowRight,
  Coins,
  Compass,
  LayoutDashboard,
  Plus,
  Sparkles,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
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

function getMembershipAccent(status?: Membership["status"]) {
  switch (status) {
    case "PENDING":
      return "border-amber-500/40 bg-amber-500/5 dark:border-amber-500/30 dark:bg-amber-500/5";
    case "APPROVED":
      return "border-emerald-500/40 bg-emerald-500/5 dark:border-emerald-500/30 dark:bg-emerald-500/5";
    case "ACTIVE":
      return "border-emerald-500/50 bg-emerald-500/8 dark:border-emerald-500/40 dark:bg-emerald-500/8";
    default:
      return "";
  }
}

function EqubCard({
  equb,
  membership,
  managedByYou = false,
}: {
  equb: EqubSummary;
  membership?: Membership;
  managedByYou?: boolean;
}) {
  const memberPercent = equb.memberLimit
    ? Math.min(100, Math.round(((equb.activeMemberCount ?? 0) / equb.memberLimit) * 100))
    : 0;

  return (
    <div
      className={[
        "group relative h-full rounded-3xl border bg-white dark:bg-white/[0.03] backdrop-blur-xl p-5 shadow-md shadow-slate-200/70 dark:shadow-none",
        "transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/60 dark:hover:shadow-black/20 dark:hover:bg-white/[0.06]",
        membership ? getMembershipAccent(membership.status) : "border-slate-200/90 dark:border-white/10",
      ].join(" ")}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap gap-1.5">
          <span
            className={[
              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
              membership
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400",
            ].join(" ")}
          >
            {membership ? "My Equb" : "Available"}
          </span>
          {managedByYou && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-400 text-[10px] font-semibold border border-teal-500/25">
              Managed by you
            </span>
          )}
        </div>
        <StatusBadge status={equb.status} />
      </div>

      {/* Name & Description */}
      <h3 className="font-bold text-slate-900 dark:text-white truncate text-sm leading-snug">
        {equb.name}
      </h3>
      {equb.description && (
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
          {equb.description}
        </p>
      )}

      {/* Membership status badge */}
      {membership && (
        <div className="mt-2">
          <StatusBadge status={membership.status} />
        </div>
      )}

      {/* Stats grid */}
      <dl className="grid grid-cols-2 gap-2 mt-4 text-xs">
        <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 p-2.5">
          <dt className="text-slate-500 dark:text-slate-500 text-[10px] uppercase tracking-wider mb-0.5 font-medium">Contribution</dt>
          <dd className="font-bold text-slate-900 dark:text-white text-sm">
            {formatMoney(equb.contributionAmountMinor)}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 p-2.5">
          <dt className="text-slate-500 dark:text-slate-500 text-[10px] uppercase tracking-wider mb-0.5 font-medium">Cycles</dt>
          <dd className="font-bold text-slate-900 dark:text-white text-sm">
            {equb.numberOfCycles}
            <span className="ml-1 text-[10px] font-normal text-slate-500 dark:text-slate-400">
              {equb.frequency.toLowerCase()}
            </span>
          </dd>
        </div>
      </dl>

      {/* Member progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
          <span className="font-medium">Members</span>
          <span className="font-bold text-slate-800 dark:text-slate-300">
            {equb.activeMemberCount ?? 0}/{equb.memberLimit}
            {equb.pendingMemberCount ? (
              <span className="ml-1 text-amber-600 dark:text-amber-500">({equb.pendingMemberCount} pending)</span>
            ) : null}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
            style={{ width: `${memberPercent}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400">
        <span>Starts {formatDate(equb.startDate)}</span>
        {membership ? (
          <span>Joined {formatDateTime(membership.joinedAt)}</span>
        ) : (
          <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform">
            View <ArrowRight className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.04] backdrop-blur-xl p-5 flex items-center gap-4 shadow-sm shadow-slate-200/60 dark:shadow-black/25 dark:shadow-none">
      <div className={["w-10 h-10 rounded-xl flex items-center justify-center shrink-0", accent ?? "bg-emerald-500/15"].join(" ")}>
        <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-xl font-black text-slate-900 dark:text-white leading-none mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [equbs, setEqubs] = useState<EqubSummary[]>([]);
  const [membershipStatuses, setMembershipStatuses] = useState<MembershipSummary[]>([]);
  const [token, setToken] = useState("");
  const [searchHref, setSearchHref] = useState<string>("/search");
  const [notificationCount, setNotificationCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"mine" | "explore">("mine");

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const tok = await user.getIdToken();
      setToken(tok);
      const [feedRes, equbsRes] = await Promise.all([
        fetch("/api/notifications", { headers: { Authorization: `Bearer ${tok}` } }),
        fetch("/api/equbs", { headers: { Authorization: `Bearer ${tok}` } }),
      ]);

      if (feedRes.ok) {
        const data = await feedRes.json();
        setProfile(data.profile);
        setMembershipStatuses(data.membershipStatuses ?? []);
        setNotificationCount(data.unreadCount ?? 0);
        setSearchHref("/search");
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
        visibleEqubs.filter((e) => e.createdBy === profile.id).map((e) => e.id),
      );
    }
    return new Set(membershipStatuses.map(({ membership }) => membership.equbId));
  }, [membershipStatuses, profile, visibleEqubs]);

  const myEqubs = useMemo(() => visibleEqubs.filter((e) => myEqubIds.has(e.id)), [myEqubIds, visibleEqubs]);
  const discoverEqubs = useMemo(() => visibleEqubs.filter((e) => !myEqubIds.has(e.id)), [myEqubIds, visibleEqubs]);

  const totalPages = Math.max(1, Math.ceil(discoverEqubs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedDiscoverEqubs = discoverEqubs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage((c) => Math.min(c, totalPages));
  }, [totalPages]);

  const totalContributed = membershipStatuses.length;
  const pendingCount = membershipStatuses.filter((s) => s.membership.status === "PENDING").length;
  const nextActiveEqub = myEqubs.find((e) => e.status === "ACTIVE");

  if (loading) return <EqubLoading />;

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 transition-colors duration-300">
      {/* Ambient glow (dark mode only) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10 opacity-0 dark:opacity-100">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-teal-600/8 rounded-full blur-[120px]" />
      </div>

      <Navbar
        links={[]}
        userName={profile?.displayName}
        isAdmin={profile?.role === "ADMIN"}
        searchHref={searchHref}
        notificationCount={notificationCount}
        notificationsHref="/notifications"
        onSignOut={() => signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Welcome back, {profile?.displayName?.split(" ")[0] ?? "there"} 👋
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {myEqubs.length} Equb{myEqubs.length !== 1 ? "s" : ""} in your space • {discoverEqubs.length} available to explore
            </p>
          </div>
          {profile?.role === "ADMIN" && (
            <CreateEqubDialog
              token={token}
              onCreated={(equbId) => { window.location.href = `/equbs/${equbId}`; }}
            />
          )}
        </div>

        {/* Hero stat tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatTile
            icon={LayoutDashboard}
            label="My Equbs"
            value={String(myEqubs.length)}
            sub={`${myEqubs.filter((e) => e.status === "ACTIVE").length} active`}
          />
          <StatTile
            icon={Users}
            label="Memberships"
            value={String(totalContributed)}
            sub={pendingCount > 0 ? `${pendingCount} pending` : "All confirmed"}
            accent="bg-teal-500/15"
          />
          <StatTile
            icon={Compass}
            label="Discover"
            value={String(discoverEqubs.length)}
            sub="Available to join"
            accent="bg-blue-500/15"
          />
          <StatTile
            icon={TrendingUp}
            label="Next Draw"
            value={nextActiveEqub ? nextActiveEqub.name.slice(0, 10) + (nextActiveEqub.name.length > 10 ? "…" : "") : "—"}
            sub={nextActiveEqub ? "Active draw" : "No active cycle"}
            accent="bg-amber-500/15"
          />
        </div>

        {/* Empty state if totally blank */}
        {myEqubs.length === 0 && discoverEqubs.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.04] backdrop-blur-xl p-14 text-center shadow-md dark:shadow-none">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/15 mb-4">
              <Sparkles className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Equbs yet</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">There are no Equbs to show right now.</p>
            {profile?.role === "ADMIN" && (
              <CreateEqubDialog
                token={token}
                onCreated={(equbId) => { window.location.href = `/equbs/${equbId}`; }}
              />
            )}
          </div>
        ) : (
          <>
            {/* Tab navigation */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-200/80 dark:bg-white/[0.04] border border-slate-300/70 dark:border-white/10 backdrop-blur-xl mb-6 w-fit">
              <button
                type="button"
                onClick={() => setActiveTab("mine")}
                className={[
                  "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
                  activeTab === "mine"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-white/5",
                ].join(" ")}
              >
                <LayoutDashboard className="w-4 h-4" />
                My Equbs
                {myEqubs.length > 0 && (
                  <span className={["px-1.5 py-0.5 rounded-full text-[10px] font-bold", activeTab === "mine" ? "bg-white/20 text-white" : "bg-slate-300 dark:bg-white/10 text-slate-700 dark:text-slate-400"].join(" ")}>
                    {myEqubs.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("explore"); setPage(1); }}
                className={[
                  "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
                  activeTab === "explore"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-white/5",
                ].join(" ")}
              >
                <Compass className="w-4 h-4" />
                Explore
                {discoverEqubs.length > 0 && (
                  <span className={["px-1.5 py-0.5 rounded-full text-[10px] font-bold", activeTab === "explore" ? "bg-white/20 text-white" : "bg-slate-300 dark:bg-white/10 text-slate-700 dark:text-slate-400"].join(" ")}>
                    {discoverEqubs.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab: My Equbs */}
            {activeTab === "mine" && (
              <section>
                {myEqubs.length === 0 ? (
                  <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl p-10 text-center shadow-md dark:shadow-none">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/15 mb-3">
                      <Coins className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      {profile?.role === "ADMIN"
                        ? "You haven't created any Equbs yet."
                        : "You haven't joined any Equbs yet. Explore available groups!"}
                    </p>
                    <div className="mt-4 flex justify-center gap-3">
                      {profile?.role === "ADMIN" && (
                        <CreateEqubDialog token={token} onCreated={(id) => { window.location.href = `/equbs/${id}`; }} />
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTab("explore")}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/10 transition-all"
                      >
                        <Compass className="w-4 h-4" />
                        Explore Equbs
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                      {profile?.role === "ADMIN" ? "Groups you manage." : "Groups you participate in."}
                    </p>
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {myEqubs.map((equb) => {
                        const membership = membershipStatuses.find(
                          ({ membership: m }) => m.equbId === equb.id,
                        )?.membership;
                        return (
                          <Link key={equb.id} href={`/equbs/${equb.id}`} className="block h-full">
                            <EqubCard
                              equb={equb}
                              membership={membership}
                              managedByYou={profile?.role === "ADMIN" && equb.createdBy === profile.id}
                            />
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>
            )}

            {/* Tab: Explore */}
            {activeTab === "explore" && (
              <section>
                {discoverEqubs.length === 0 ? (
                  <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl p-10 text-center shadow-md dark:shadow-none">
                    <p className="text-slate-600 dark:text-slate-400 text-sm">No other Equbs available to explore right now.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                      Browse active groups available in the system.
                    </p>
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {pagedDiscoverEqubs.map((equb) => (
                        <Link key={equb.id} href={`/equbs/${equb.id}`} className="block h-full">
                          <EqubCard equb={equb} />
                        </Link>
                      ))}
                    </div>

                    {/* Pagination toolbar */}
                    {totalPages > 1 && (
                      <div className="mt-8 flex items-center justify-between rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl px-5 py-3 shadow-sm dark:shadow-none">
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          Page {safePage} of {totalPages} • {discoverEqubs.length} groups
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPage((c) => Math.max(1, c - 1))}
                            disabled={safePage === 1}
                            className="px-4 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            ← Previous
                          </button>
                          <button
                            type="button"
                            onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
                            disabled={safePage === totalPages}
                            className="px-4 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
