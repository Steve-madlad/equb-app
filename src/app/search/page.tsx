'use client';

import { CreateEqubDialog } from '@/components/equbs/CreateEqubDialog';
import { Navbar } from '@/components/layout/Navbar';
import { EqubLoading } from '@/components/ui/EqubLoading';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { formatMoney } from '@/lib/domain/money';
import type { Equb, UserProfile } from '@/lib/domain/types';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { formatDate } from '@/lib/utils';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import { ArrowRight, Compass, Filter, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type EqubSummary = Equb & {
  activeMemberCount?: number;
  pendingMemberCount?: number;
  createdByName?: string;
};

const STATUS_OPTIONS = [
  'ALL',
  'DRAFT',
  'OPEN_FOR_MEMBERS',
  'LOCKED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
] as const;

const FREQUENCY_OPTIONS = ['ALL', 'WEEKLY', 'MONTHLY', 'CUSTOM'] as const;

const SORT_OPTIONS = [
  'NEWEST',
  'OLDEST',
  'CONTRIBUTION_ASC',
  'CONTRIBUTION_DESC',
  'START_SOONEST',
] as const;

export default function SearchPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState('');
  const [equbs, setEqubs] = useState<EqubSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('ALL');
  const [frequencyFilter, setFrequencyFilter] = useState<(typeof FREQUENCY_OPTIONS)[number]>('ALL');
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]>('NEWEST');
  const [contributionRange, setContributionRange] = useState<[number, number]>([0, 0]);
  const [startDateFrom, setStartDateFrom] = useState('');
  const [startDateTo, setStartDateTo] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const tok = await user.getIdToken();
      setToken(tok);
      const profileRes = await fetch('/api/users/profile', {
        headers: { Authorization: `Bearer ${tok}` },
      });
      let admin = false;
      if (profileRes.ok) {
        const { profile: p } = await profileRes.json();
        setProfile(p);
        admin = p.role === 'ADMIN';
      }

      const res = await fetch('/api/equbs', {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.ok) {
        const { equbs: e } = await res.json();
        setEqubs(e.filter((equb: EqubSummary) => admin || equb.status !== 'DRAFT'));
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
      (startDateFrom === '' || equb.startDate >= startDateFrom) &&
      (startDateTo === '' || equb.startDate <= startDateTo);

    const filtered = equbs.filter((equb) => {
      const matchesStatus = statusFilter === 'ALL' || equb.status === statusFilter;
      const matchesFrequency = frequencyFilter === 'ALL' || equb.frequency === frequencyFilter;
      const matchesSearch =
        !search ||
        equb.name.toLowerCase().includes(search) ||
        (equb.description ?? '').toLowerCase().includes(search) ||
        equb.id.toLowerCase().includes(search);
      const matchesCreator = creatorFilter === 'ALL' || equb.createdBy === creatorFilter;
      return (
        matchesStatus && matchesFrequency && matchesSearch && matchesCreator && matchesRange(equb)
      );
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'OLDEST':
          return a.createdAt.localeCompare(b.createdAt);
        case 'CONTRIBUTION_ASC':
          return a.contributionAmountMinor - b.contributionAmountMinor;
        case 'CONTRIBUTION_DESC':
          return b.contributionAmountMinor - a.contributionAmountMinor;
        case 'START_SOONEST':
          return a.startDate.localeCompare(b.startDate);
        case 'NEWEST':
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
  }, [
    equbs,
    contributionRange,
    creatorFilter,
    frequencyFilter,
    query,
    sortBy,
    startDateFrom,
    startDateTo,
    statusFilter,
  ]);

  const resetFilters = () => {
    setQuery('');
    setStatusFilter('ALL');
    setFrequencyFilter('ALL');
    setSortBy('NEWEST');
    setStartDateFrom('');
    setStartDateTo('');
    setCreatorFilter('ALL');
    setContributionRange([contributionBounds[0], contributionBounds[1]]);
  };

  const hasActiveFilters =
    query !== '' ||
    statusFilter !== 'ALL' ||
    frequencyFilter !== 'ALL' ||
    sortBy !== 'NEWEST' ||
    startDateFrom !== '' ||
    startDateTo !== '' ||
    creatorFilter !== 'ALL';

  if (loading) {
    return <EqubLoading />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 transition-colors duration-300 dark:bg-linear-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
      {/* Ambient glow (dark mode only) */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-0 dark:opacity-100">
        <div className="absolute top-1/4 right-1/3 h-96 w-96 rounded-full bg-emerald-600/10 blur-[140px]" />
        <div className="absolute bottom-1/3 left-1/4 h-72 w-72 rounded-full bg-teal-600/8 blur-[120px]" />
      </div>

      <Navbar
        links={[]}
        userName={profile?.displayName}
        isAdmin={profile?.role === 'ADMIN'}
        searchHref="/search"
        onSignOut={() => signOut(getFirebaseAuth()).then(() => (window.location.href = '/'))}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {profile?.role === 'ADMIN' ? 'Admin Equb Directory' : 'Explore Active Equbs'}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {profile?.role === 'ADMIN'
                ? 'Search, audit, and manage every Equb across all statuses.'
                : 'Browse vetted rotating savings groups with transparent rules and schedules.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition-all hover:text-emerald-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:shadow-none dark:hover:text-emerald-400"
            >
              <SlidersHorizontal className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
            </button>
            {profile?.role === 'ADMIN' && (
              <CreateEqubDialog
                token={token}
                onCreated={(equbId) => {
                  window.location.href = `/equbs/${equbId}`;
                }}
              />
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-8 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] dark:shadow-xl dark:shadow-black/25">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                <Filter className="h-4 w-4" />
                <span>Search & Filter Engine</span>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset All</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by group name, description, or ID…"
                    aria-label="Search Equbs"
                    className="rounded-xl border-slate-300 bg-slate-50 pl-10 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
                  />
                </div>

                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as (typeof STATUS_OPTIONS)[number])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.filter(
                      (status) => profile?.role === 'ADMIN' || status !== 'DRAFT',
                    ).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status === 'ALL' ? 'All statuses' : status.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {profile?.role === 'ADMIN' && (
                  <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Created by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All creators</SelectItem>
                      {[
                        ...new Map(
                          equbs.map((equb) => [
                            equb.createdBy,
                            equb.createdByName ?? equb.createdBy,
                          ]),
                        ).entries(),
                      ]
                        .sort(([, first], [, second]) => first.localeCompare(second))
                        .map(([id, name]) => (
                          <SelectItem key={id} value={id}>
                            {name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}

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
                        {frequency === 'ALL' ? 'All frequencies' : frequency.toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as (typeof SORT_OPTIONS)[number])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option
                          .replace(/_/g, ' ')
                          .toLowerCase()
                          .replace(/\b\w/g, (char) => char.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Slider for Contribution Range */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/5 dark:bg-slate-900/40">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-white">
                      Contribution Amount Range (ETB)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Filter by per-cycle contribution size
                    </p>
                  </div>
                  <p className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 font-mono text-xs font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                    {contributionRange[0]} ETB – {contributionRange[1]} ETB
                  </p>
                </div>
                <Slider
                  value={contributionRange}
                  onValueChange={(value) => setContributionRange([value[0] ?? 0, value[1] ?? 0])}
                  min={contributionBounds[0]}
                  max={Math.max(contributionBounds[1], contributionBounds[0])}
                  step={100}
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-500">
                  <span>Min: {contributionBounds[0]} ETB</span>
                  <span>Max: {Math.max(contributionBounds[1], contributionBounds[0])} ETB</span>
                </div>
              </div>

              {/* Date Filters */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    Start Date From
                  </label>
                  <Input
                    type="date"
                    value={startDateFrom}
                    onChange={(event) => setStartDateFrom(event.target.value)}
                    aria-label="Start date from"
                    className="rounded-xl border-slate-300 bg-slate-50 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    Start Date To
                  </label>
                  <Input
                    type="date"
                    value={startDateTo}
                    onChange={(event) => setStartDateTo(event.target.value)}
                    aria-label="Start date to"
                    className="rounded-xl border-slate-300 bg-slate-50 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Bar */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Showing{' '}
            <span className="font-bold text-slate-900 dark:text-white">{filteredEqubs.length}</span>{' '}
            matching Equbs
          </p>
        </div>

        {/* Card Grid */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredEqubs.map((equb) => {
            const memberPercent = equb.memberLimit
              ? Math.min(100, Math.round(((equb.activeMemberCount ?? 0) / equb.memberLimit) * 100))
              : 0;

            return (
              <Link key={equb.id} href={`/equbs/${equb.id}`} className="block h-full">
                <div className="group relative flex h-full flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 shadow-md shadow-slate-200/70 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/60 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none dark:hover:bg-white/[0.06] dark:hover:shadow-black/20">
                  <div>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                        {equb.frequency}
                      </span>
                      <StatusBadge status={equb.status} />
                    </div>

                    <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {equb.name}
                    </h3>
                    {equb.description && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {equb.description}
                      </p>
                    )}

                    <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-2.5 dark:border-white/5 dark:bg-slate-900/40">
                        <dt className="text-[10px] font-medium text-slate-500 uppercase dark:text-slate-500">
                          Contribution
                        </dt>
                        <dd className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                          {formatMoney(equb.contributionAmountMinor)}
                        </dd>
                      </div>
                      <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-2.5 dark:border-white/5 dark:bg-slate-900/40">
                        <dt className="text-[10px] font-medium text-slate-500 uppercase dark:text-slate-500">
                          Cycles
                        </dt>
                        <dd className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                          {equb.numberOfCycles}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="font-medium">Members</span>
                        <span className="font-bold text-slate-800 dark:text-slate-300">
                          {equb.activeMemberCount ?? 0}/{equb.memberLimit}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-900/60">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                          style={{ width: `${memberPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-white/5 dark:text-slate-400">
                    <span>Starts {formatDate(equb.startDate)}</span>
                    <span className="flex items-center gap-0.5 font-semibold text-emerald-600 transition-transform group-hover:translate-x-0.5 dark:text-emerald-400">
                      View Group <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filteredEqubs.length === 0 && (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-md backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none">
            <Compass className="mx-auto mb-2 h-10 w-10 text-slate-400 dark:text-slate-500" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-300">
              No Equbs matched your filters
            </p>
            <p className="mt-1 mb-4 text-xs text-slate-500">
              Try broadening your search terms or adjusting the contribution range.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm"
            >
              Clear Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
