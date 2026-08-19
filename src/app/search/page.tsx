"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onIdTokenChanged, signOut } from "firebase/auth";
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
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { formatDate, formatDateTime } from "@/lib/utils";
import { formatMoney } from "@/lib/domain/money";
import type { Equb, UserProfile } from "@/lib/domain/types";

type EqubSummary = Equb & {
  activeMemberCount?: number;
  pendingMemberCount?: number;
};

const USER_STATUS_OPTIONS = [
  "ALL",
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

export default function SearchPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [equbs, setEqubs] = useState<EqubSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof USER_STATUS_OPTIONS)[number]>("ALL");
  const [frequencyFilter, setFrequencyFilter] = useState<(typeof FREQUENCY_OPTIONS)[number]>("ALL");
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]>("NEWEST");
  const [contributionRange, setContributionRange] = useState<[number, number]>([0, 0]);
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
        if (p.role === "ADMIN") {
          window.location.href = "/equbs";
          return;
        }
      }

      const res = await fetch("/api/equbs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { equbs: e } = await res.json();
        setEqubs(e.filter((equb: EqubSummary) => equb.status !== "DRAFT"));
      }
      setLoading(false);
    });

    return unsub;
  }, []);

  const contributionBounds = useMemo(() => {
    if (equbs.length === 0) return [0, 0] as const;

    const values = equbs.map((equb) => Math.round(equb.contributionAmountMinor / 100));
    return [Math.min(...values), Math.max(...values)] as const;
  }, [equbs]);

  useEffect(() => {
    setContributionRange([contributionBounds[0], contributionBounds[1]]);
  }, [contributionBounds]);

  const filteredEqubs = useMemo(() => {
    const search = query.trim().toLowerCase();
    const [minContributionEtb, maxContributionEtb] = contributionRange;
    const minContributionMinor = minContributionEtb * 100;
    const maxContributionMinor = maxContributionEtb * 100;

    const matchesRange = (equb: EqubSummary) =>
      equb.contributionAmountMinor >= minContributionMinor &&
      equb.contributionAmountMinor <= maxContributionMinor &&
      (startDateFrom === "" || equb.startDate >= startDateFrom) &&
      (startDateTo === "" || equb.startDate <= startDateTo);

    const filtered = equbs.filter((equb) => {
      const matchesStatus = statusFilter === "ALL" || equb.status === statusFilter;
      const matchesFrequency =
        frequencyFilter === "ALL" || equb.frequency === frequencyFilter;
      const matchesSearch =
        !search ||
        equb.name.toLowerCase().includes(search) ||
        (equb.description ?? "").toLowerCase().includes(search) ||
        equb.id.toLowerCase().includes(search);
      return matchesStatus && matchesFrequency && matchesSearch && matchesRange(equb);
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
    contributionRange,
    frequencyFilter,
    query,
    sortBy,
    startDateFrom,
    startDateTo,
    statusFilter,
  ]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        links={[]}
        userName={profile?.displayName}
        isAdmin={profile?.role === "ADMIN"}
        searchHref="/search"
        onSignOut={() => signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))}
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Search Equbs</h1>
            <p className="mt-1 text-sm text-gray-600">
              Browse only non-draft Equbs with filters for status and keywords.
            </p>
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Narrow the list by status, schedule, contribution size, and start date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, description, or ID"
                aria-label="Search Equbs"
                className="md:col-span-2"
              />

              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as (typeof USER_STATUS_OPTIONS)[number])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {USER_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "ALL" ? "All statuses" : status.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={frequencyFilter}
                onValueChange={(value) =>
                  setFrequencyFilter(value as (typeof FREQUENCY_OPTIONS)[number])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All frequencies" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((frequency) => (
                    <SelectItem key={frequency} value={frequency}>
                      {frequency === "ALL" ? "All frequencies" : frequency.toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sortBy}
                onValueChange={(value) =>
                  setSortBy(value as (typeof SORT_OPTIONS)[number])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option
                        .replace(/_/g, " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (char) => char.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Contribution range</p>
                  <p className="text-xs text-gray-500">
                    Filter by the contribution amount in ETB.
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  {contributionRange[0]} ETB - {contributionRange[1]} ETB
                </p>
              </div>
              <Slider
                value={contributionRange}
                onValueChange={(value) =>
                  setContributionRange([value[0] ?? 0, value[1] ?? 0])
                }
                min={contributionBounds[0]}
                max={Math.max(contributionBounds[1], contributionBounds[0])}
                step={100}
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{contributionBounds[0]} ETB</span>
                <span>{Math.max(contributionBounds[1], contributionBounds[0])} ETB</span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredEqubs.map((equb) => (
            <Link key={equb.id} href={`/equbs/${equb.id}`} className="block h-full">
              <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <CardTitle className="truncate">{equb.name}</CardTitle>
                      <CardDescription className="line-clamp-3">
                        {equb.description}
                      </CardDescription>
                    </div>
                    <StatusBadge status={equb.status} />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-gray-500">Members</dt>
                      <dd className="font-medium text-gray-900">
                        {equb.activeMemberCount ?? 0}/{equb.memberLimit}
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

                <CardFooter className="justify-between text-xs text-gray-500">
                  <span>{equb.frequency.toLowerCase()}</span>
                  <span>{formatDate(equb.startDate)}</span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>

        {filteredEqubs.length === 0 && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">No Equbs matched your search.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
