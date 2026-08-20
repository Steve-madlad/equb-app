"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Navbar } from "@/components/layout/Navbar";
import { EqubLoading } from "@/components/ui/EqubLoading";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { formatMoney } from "@/lib/domain/money";
import type { Equb, UserProfile } from "@/lib/domain/types";

type EqubSummary = Equb & {
  activeMemberCount?: number;
  pendingMemberCount?: number;
};

const ADMIN_STATUS_OPTIONS = [
  "ALL",
  "DRAFT",
  "OPEN_FOR_MEMBERS",
  "LOCKED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
] as const;

const FREQUENCY_OPTIONS = ["ALL", "WEEKLY", "MONTHLY", "CUSTOM"] as const;

const SORT_OPTIONS = [
  "NEWEST",
  "OLDEST",
  "CONTRIBUTION_ASC",
  "CONTRIBUTION_DESC",
  "START_SOONEST",
] as const;

export default function AdminEqubsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [equbs, setEqubs] = useState<EqubSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof ADMIN_STATUS_OPTIONS)[number]>("ALL");
  const [frequencyFilter, setFrequencyFilter] = useState<(typeof FREQUENCY_OPTIONS)[number]>("ALL");
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]>("NEWEST");
  const [minContribution, setMinContribution] = useState("");
  const [maxContribution, setMaxContribution] = useState("");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [startDateTo, setStartDateTo] = useState("");

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const token = await user.getIdToken();
      const profileRes = await fetch("/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const { profile: p } = await profileRes.json();
        setProfile(p);
        if (p.role !== "ADMIN") {
          window.location.href = "/search";
          return;
        }
      } else {
        window.location.href = "/login";
        return;
      }

      const res = await fetch("/api/equbs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { equbs: e } = await res.json();
        setEqubs(e);
      }
      setLoading(false);
    });

    return unsub;
  }, []);

  const filteredEqubs = useMemo(() => {
    const search = query.trim().toLowerCase();
    const minContributionMinor = minContribution ? Number(minContribution) * 100 : null;
    const maxContributionMinor = maxContribution ? Number(maxContribution) * 100 : null;

    const filtered = equbs.filter((equb) => {
      const matchesStatus = statusFilter === "ALL" || equb.status === statusFilter;
      const matchesFrequency =
        frequencyFilter === "ALL" || equb.frequency === frequencyFilter;
      const matchesSearch =
        !search ||
        equb.name.toLowerCase().includes(search) ||
        (equb.description ?? "").toLowerCase().includes(search) ||
        equb.id.toLowerCase().includes(search);
      const matchesContribution =
        (minContributionMinor === null || equb.contributionAmountMinor >= minContributionMinor) &&
        (maxContributionMinor === null || equb.contributionAmountMinor <= maxContributionMinor);
      const matchesDateRange =
        (startDateFrom === "" || equb.startDate >= startDateFrom) &&
        (startDateTo === "" || equb.startDate <= startDateTo);
      return matchesStatus && matchesFrequency && matchesSearch && matchesContribution && matchesDateRange;
    });
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "OLDEST":
          return a.createdAt.localeCompare(b.createdAt);
        case "CONTRIBUTION_ASC":
          return a.contributionAmountMinor - b.contributionAmountMinor;
        case "CONTRIBUTION_DESC":
          return b.contributionAmountMinor - a.contributionAmountMinor;
        case "START_SOONEST":
          return a.startDate.localeCompare(b.startDate);
        case "NEWEST":
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
  }, [
    equbs,
    frequencyFilter,
    maxContribution,
    minContribution,
    query,
    sortBy,
    startDateFrom,
    startDateTo,
    statusFilter,
  ]);

  if (loading) {
    return <EqubLoading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        links={[]}
        userName={profile?.displayName}
        isAdmin={profile?.role === "ADMIN"}
        searchHref="/equbs"
        onSignOut={() => signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))}
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Equbs</h1>
            <p className="mt-1 text-sm text-gray-600">
              Search and manage every Equb, including drafts.
            </p>
          </div>
          <Link href="/admin/equbs/new">
            <Button>Create Equb</Button>
          </Link>
        </div>

        <Card className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, description, or ID"
              aria-label="Search Equbs"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as (typeof ADMIN_STATUS_OPTIONS)[number])
              }
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              {ADMIN_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL" ? "All statuses" : status.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <select
              value={frequencyFilter}
              onChange={(event) =>
                setFrequencyFilter(event.target.value as (typeof FREQUENCY_OPTIONS)[number])
              }
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              {FREQUENCY_OPTIONS.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {frequency === "ALL" ? "All frequencies" : frequency.toLowerCase()}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as (typeof SORT_OPTIONS)[number])
              }
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (char) => char.toUpperCase())}
                </option>
              ))}
            </select>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              value={minContribution}
              onChange={(event) => setMinContribution(event.target.value)}
              placeholder="Min contribution ETB"
            />
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              value={maxContribution}
              onChange={(event) => setMaxContribution(event.target.value)}
              placeholder="Max contribution ETB"
            />
            <Input
              type="date"
              value={startDateFrom}
              onChange={(event) => setStartDateFrom(event.target.value)}
              aria-label="Start date from"
            />
            <Input
              type="date"
              value={startDateTo}
              onChange={(event) => setStartDateTo(event.target.value)}
              aria-label="Start date to"
            />
          </div>
        </Card>

        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredEqubs.map((equb) => (
            <Link key={equb.id} href={`/equbs/${equb.id}`} className="block h-full">
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{equb.name}</h3>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-3">{equb.description}</p>
                  </div>
                  <StatusBadge status={equb.status} />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
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
                    <dd className="font-medium text-gray-900">{formatMoney(equb.contributionAmountMinor)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Cycles</dt>
                    <dd className="font-medium text-gray-900">{equb.numberOfCycles}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Created</dt>
                    <dd className="font-medium text-gray-900">{formatDateTime(equb.createdAt)}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>{equb.frequency.toLowerCase()}</span>
                  <span>{formatDate(equb.startDate)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {filteredEqubs.length === 0 && (
          <Card className="mt-6">
            <p className="text-sm text-gray-500">No Equbs matched your search.</p>
          </Card>
        )}
      </main>
    </div>
  );
}
