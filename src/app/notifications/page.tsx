'use client';

import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { EqubLoading } from '@/components/ui/EqubLoading';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Equb, Membership, Notification, UserProfile } from '@/lib/domain/types';
import { getFirebaseAuth } from '@/lib/firebase/client';
import type { PendingMembershipRequest } from '@/lib/services/equbService';
import { formatDateTime } from '@/lib/utils';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import {
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  MailCheck,
  MailOpen,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type NotificationFeedResponse = {
  profile: UserProfile;
  unreadCount: number;
  notifications: Notification[];
  membershipStatuses: Array<{ membership: Membership; equb: Equb | null }>;
  adminRequests: PendingMembershipRequest[];
};

export default function NotificationsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [membershipStatuses, setMembershipStatuses] = useState<
    NotificationFeedResponse['membershipStatuses']
  >([]);
  const [adminRequests, setAdminRequests] = useState<PendingMembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const token = await user.getIdToken();
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = (await res.json()) as NotificationFeedResponse;
        setProfile(data.profile);
        setUnreadCount(data.unreadCount);
        setNotifications(data.notifications);
        setMembershipStatuses(data.membershipStatuses);
        setAdminRequests(data.adminRequests);
      }

      setLoading(false);
    });

    return unsub;
  }, []);

  async function markRead(notificationId: string) {
    const user = getFirebaseAuth().currentUser;
    if (!user) return;

    const token = await user.getIdToken();
    const res = await fetch(`/api/notifications/${notificationId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    }
  }

  async function markAllRead() {
    const user = getFirebaseAuth().currentUser;
    if (!user || unreadCount === 0) return;
    const token = await user.getIdToken();
    const res = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, read: true })),
      );
      setUnreadCount(0);
    }
  }

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
        notificationCount={unreadCount}
        onSignOut={() => signOut(getFirebaseAuth()).then(() => (window.location.href = '/'))}
      />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Notifications & Requests
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Your latest Equb draw alerts, admission requests, and settlement updates.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:shadow-none">
              <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{unreadCount} unread</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4.5 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-30 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:shadow-none dark:hover:bg-white/10"
            >
              <CheckCheck className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Mark all as read
            </Button>
          </div>
        </div>

        {/* Admin Admission Requests */}
        {profile?.role === 'ADMIN' && (
          <section className="mb-8">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] dark:shadow-xl dark:shadow-black/25">
              <div className="mb-4 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Admission Requests
                </h2>
                {adminRequests.length > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                    {adminRequests.length} pending
                  </span>
                )}
              </div>
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                Requests for the Equbs you created. Review them directly from the Equb workspace.
              </p>

              {adminRequests.length === 0 ? (
                <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-6 text-center text-xs text-slate-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-400">
                  No pending admission requests right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {adminRequests.map(({ membership, equb, requester }) => (
                    <div
                      key={membership.id}
                      className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 transition-all hover:border-emerald-500/40 dark:border-white/10 dark:bg-slate-900/50"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {requester?.displayName ?? 'Unknown user'}
                            </p>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              ({requester?.email ?? ''})
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            Requested to join{' '}
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {equb.name}
                            </span>
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                            <Clock className="h-3 w-3" />
                            Submitted {formatDateTime(membership.joinedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={membership.status} />
                          <Link href={`/equbs/${equb.id}`}>
                            <Button
                              size="sm"
                              className="rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:from-emerald-400 hover:to-teal-500"
                            >
                              Review Equb
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Member Approval Status (User view) */}
        {profile?.role !== 'ADMIN' && (
          <section className="mb-8">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] dark:shadow-xl dark:shadow-black/25">
              <div className="mb-4 flex items-center gap-2">
                <MailCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Membership Approval Status
                </h2>
              </div>
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                Your membership applications and current standing in each Equb.
              </p>

              {membershipStatuses.length === 0 ? (
                <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-6 text-center text-xs text-slate-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-400">
                  You have no active or pending membership records.
                </div>
              ) : (
                <div className="space-y-3">
                  {membershipStatuses.map(({ membership, equb }) => (
                    <div
                      key={membership.id}
                      className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 transition-all hover:border-emerald-500/40 dark:border-white/10 dark:bg-slate-900/50"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {equb?.name ?? 'Equb Group'}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                            {membership.status === 'PENDING'
                              ? 'Your application is waiting for administrator approval.'
                              : membership.status === 'APPROVED'
                                ? 'Your request was approved! You are ready to participate.'
                                : `Current status: ${membership.status.toLowerCase()}.`}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                            <Clock className="h-3 w-3" />
                            Joined {formatDateTime(membership.joinedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={membership.status} />
                          {equb && (
                            <Link href={`/equbs/${equb.id}`}>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="rounded-xl border border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                              >
                                View
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Notification Feed */}
        <section>
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] dark:shadow-xl dark:shadow-black/25">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Feed</h2>
            </div>
            <p className="mb-6 text-xs text-slate-500 dark:text-slate-400">
              Actionable messages and system events, ordered newest first.
            </p>

            {notifications.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-10 text-center dark:border-white/5 dark:bg-white/[0.02]">
                <MailOpen className="mx-auto mb-2 h-8 w-8 text-slate-400 dark:text-slate-500" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-400">
                  No notifications yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  You will receive updates here as Equb cycles advance.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={[
                      'group relative rounded-2xl border p-4 transition-all duration-200',
                      notification.read
                        ? 'border-slate-200/70 bg-slate-50/70 opacity-80 dark:border-white/5 dark:bg-white/[0.02]'
                        : 'border-emerald-400/60 bg-emerald-50/80 shadow-md shadow-emerald-500/5 dark:border-emerald-500/30 dark:bg-emerald-500/[0.05]',
                    ].join(' ')}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-xl min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="inline-flex items-center rounded-full bg-linear-to-r from-emerald-500 to-teal-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                              New
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                          {notification.message}
                        </p>
                        <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(notification.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge status={notification.read ? 'COMPLETED' : 'PENDING'} />
                        {!notification.read && (
                          <button
                            type="button"
                            onClick={() => markRead(notification.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-emerald-500/40 hover:bg-emerald-50 hover:text-emerald-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:shadow-none dark:hover:bg-emerald-500/20 dark:hover:text-emerald-400"
                          >
                            <CheckCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Mark read</span>
                          </button>
                        )}
                        {notification.equbId && (
                          <Link href={`/equbs/${notification.equbId}`}>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-500 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:shadow-none dark:hover:bg-white/10 dark:hover:text-white"
                              title="Go to Equb"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
