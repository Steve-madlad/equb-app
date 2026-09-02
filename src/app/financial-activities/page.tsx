'use client';

import { Navbar } from '@/components/layout/Navbar';
import { EqubLoading } from '@/components/ui/EqubLoading';
import { formatMoney } from '@/lib/domain/money';
import type { LedgerEntry, UserProfile } from '@/lib/domain/types';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { formatDateTime } from '@/lib/utils';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  History,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Activity = LedgerEntry & { equbName: string; direction: 'IN' | 'OUT' };

export default function FinancialActivitiesPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.href = '/login';
        return;
      }
      const token = await user.getIdToken();
      const [profileRes, activityRes] = await Promise.all([
        fetch('/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/financial-activities', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (profileRes.ok) {
        const nextProfile = (await profileRes.json()).profile as UserProfile;
        if (nextProfile.role === 'ADMIN') {
          window.location.href = '/dashboard';
          return;
        }
        setProfile(nextProfile);
      }
      if (activityRes.ok) setActivities((await activityRes.json()).activities);
      setLoading(false);
    });
    return unsub;
  }, []);

  const { totalInflow, totalOutflow } = useMemo(() => {
    let inAmount = 0;
    let outAmount = 0;
    for (const act of activities) {
      if (act.direction === 'IN') {
        inAmount += act.amountMinor;
      } else {
        outAmount += act.amountMinor;
      }
    }
    return { totalInflow: inAmount, totalOutflow: outAmount };
  }, [activities]);

  if (loading) return <EqubLoading />;

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

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Financial Activities & Ledger
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Immutable statement of your contribution payments and completed Equb payouts.
          </p>
        </div>

        {/* Metric tiles */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none dark:shadow-black/25">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Payouts Received
              </p>
              <p className="mt-1 text-xl leading-none font-black text-emerald-600 dark:text-emerald-400">
                +{formatMoney(totalInflow)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none dark:shadow-black/25">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15">
              <TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Contributions Paid
              </p>
              <p className="mt-1 text-xl leading-none font-black text-rose-600 dark:text-rose-400">
                -{formatMoney(totalOutflow)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none dark:shadow-black/25">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
              <History className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Total Transactions
              </p>
              <p className="mt-1 text-xl leading-none font-black text-slate-900 dark:text-white">
                {activities.length} Recorded
              </p>
            </div>
          </div>
        </div>

        {/* Ledger Statement */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] dark:shadow-xl dark:shadow-black/25">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Transaction History
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Double-entry financial records verified on-ledger.
              </p>
            </div>
            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 font-mono text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
              Verified Immutable
            </span>
          </div>

          {activities.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-12 text-center dark:border-white/5 dark:bg-white/[0.02]">
              <Wallet className="mx-auto mb-2 h-10 w-10 text-slate-400 dark:text-slate-500" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-400">
                No financial activities yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Your contributions and payouts will be automatically cataloged here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const received = activity.direction === 'IN';
                return (
                  <div
                    key={activity.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 transition-all hover:border-emerald-500/40 dark:border-white/5 dark:bg-slate-900/40"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={
                          received
                            ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        }
                      >
                        {received ? (
                          <ArrowDownLeft className="h-5 w-5" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {received ? 'Payout Disbursed' : 'Contribution Payment'}
                          </p>
                          <span className="rounded bg-slate-200/80 px-2 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-white/5 dark:text-slate-400">
                            {activity.type}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {activity.equbName}
                          </span>
                          {' · '}
                          {activity.description}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={
                          received
                            ? 'text-base font-black text-emerald-600 dark:text-emerald-400'
                            : 'text-base font-black text-rose-600 dark:text-rose-400'
                        }
                      >
                        {received ? '+' : '-'}
                        {formatMoney(activity.amountMinor)}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                        Ref: {activity.id.slice(0, 10)}…
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
