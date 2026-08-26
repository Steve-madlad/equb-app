"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { EqubLoading } from "@/components/ui/EqubLoading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type {
  Equb,
  Membership,
  Notification,
  UserProfile,
} from "@/lib/domain/types";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { PendingMembershipRequest } from "@/lib/services/equbService";
import { formatDateTime } from "@/lib/utils";
import { onIdTokenChanged, signOut } from "firebase/auth";
import {
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  MailCheck,
  MailOpen,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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
    NotificationFeedResponse["membershipStatuses"]
  >([]);
  const [adminRequests, setAdminRequests] = useState<
    PendingMembershipRequest[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const token = await user.getIdToken();
      const res = await fetch("/api/notifications", {
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
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    }
  }

  async function markAllRead() {
    const user = getFirebaseAuth().currentUser;
    if (!user || unreadCount === 0) return;
    const token = await user.getIdToken();
    const res = await fetch("/api/notifications", {
      method: "PATCH",
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
        searchHref="/search"
        notificationCount={unreadCount}
        onSignOut={() =>
          signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))
        }
      />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Notifications & Requests
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Your latest Equb draw alerts, admission requests, and settlement
              updates.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.04] backdrop-blur-xl px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm dark:shadow-none">
              <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{unreadCount} unread</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 disabled:opacity-30 transition-all text-sm font-semibold px-4 py-4.5 shadow-sm dark:shadow-none"
            >
              <CheckCheck className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Mark all as read
            </Button>
          </div>
        </div>

        {/* Admin Admission Requests */}
        {profile?.role === "ADMIN" && (
          <section className="mb-8">
            <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl p-6 shadow-md shadow-slate-200/60 dark:shadow-black/25 dark:shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Admission Requests
                </h2>
                {adminRequests.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold">
                    {adminRequests.length} pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Requests for the Equbs you created. Review them directly from
                the Equb workspace.
              </p>

              {adminRequests.length === 0 ? (
                <div className="rounded-2xl border border-slate-200/60 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  No pending admission requests right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {adminRequests.map(({ membership, equb, requester }) => (
                    <div
                      key={membership.id}
                      className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/90 dark:bg-slate-900/50 p-4 transition-all hover:border-emerald-500/40"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 dark:text-white text-sm">
                              {requester?.displayName ?? "Unknown user"}
                            </p>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              ({requester?.email ?? ""})
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                            Requested to join{" "}
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {equb.name}
                            </span>
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Submitted {formatDateTime(membership.joinedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={membership.status} />
                          <Link href={`/equbs/${equb.id}`}>
                            <Button
                              size="sm"
                              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-semibold px-3 py-1.5"
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
        {profile?.role !== "ADMIN" && (
          <section className="mb-8">
            <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl p-6 shadow-md shadow-slate-200/60 dark:shadow-black/25 dark:shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <MailCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Membership Approval Status
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Your membership applications and current standing in each Equb.
              </p>

              {membershipStatuses.length === 0 ? (
                <div className="rounded-2xl border border-slate-200/60 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  You have no active or pending membership records.
                </div>
              ) : (
                <div className="space-y-3">
                  {membershipStatuses.map(({ membership, equb }) => (
                    <div
                      key={membership.id}
                      className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/90 dark:bg-slate-900/50 p-4 transition-all hover:border-emerald-500/40"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">
                            {equb?.name ?? "Equb Group"}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                            {membership.status === "PENDING"
                              ? "Your application is waiting for administrator approval."
                              : membership.status === "APPROVED"
                                ? "Your request was approved! You are ready to participate."
                                : `Current status: ${membership.status.toLowerCase()}.`}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
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
                                className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-xs text-slate-700 dark:text-slate-300"
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
          <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl p-6 shadow-md shadow-slate-200/60 dark:shadow-black/25 dark:shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Recent Feed
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Actionable messages and system events, ordered newest first.
            </p>

            {notifications.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/60 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-10 text-center">
                <MailOpen className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-400">
                  No notifications yet
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  You will receive updates here as Equb cycles advance.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={[
                      "group relative rounded-2xl border p-4 transition-all duration-200",
                      notification.read
                        ? "border-slate-200/70 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] opacity-80"
                        : "border-emerald-400/60 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/[0.05] shadow-md shadow-emerald-500/5",
                    ].join(" ")}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                              New
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(notification.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge
                          status={notification.read ? "COMPLETED" : "PENDING"}
                        />
                        {!notification.read && (
                          <button
                            type="button"
                            onClick={() => markRead(notification.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 hover:border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all shadow-sm dark:shadow-none"
                          >
                            <CheckCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Mark read</span>
                          </button>
                        )}
                        {notification.equbId && (
                          <Link href={`/equbs/${notification.equbId}`}>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm dark:shadow-none"
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
