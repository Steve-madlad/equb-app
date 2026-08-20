"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { Bell, CheckCheck, MailOpen } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EqubLoading } from "@/components/ui/EqubLoading";
import { formatDateTime } from "@/lib/utils";
import type {
  Membership,
  Notification,
  Equb,
  UserProfile,
} from "@/lib/domain/types";
import type { PendingMembershipRequest } from "@/lib/services/equbService";

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
  const [membershipStatuses, setMembershipStatuses] = useState<NotificationFeedResponse["membershipStatuses"]>([]);
  const [adminRequests, setAdminRequests] = useState<PendingMembershipRequest[]>([]);
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
          notification.id === notificationId ? { ...notification, read: true } : notification
        )
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    }
  }

  if (loading) {
    return <EqubLoading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        links={[]}
        userName={profile?.displayName}
        isAdmin={profile?.role === "ADMIN"}
        searchHref={profile?.role === "ADMIN" ? "/equbs" : "/search"}
        notificationCount={unreadCount}
        onSignOut={() => signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))}
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="mt-1 text-sm text-gray-600">
              Your latest Equb updates, admission requests, and approval status.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
            <Bell className="h-4 w-4" />
            {unreadCount} unread
          </div>
        </div>

        {profile?.role === "ADMIN" ? (
          <section className="mt-8">
            <Card
              title="Admission Requests"
              description="Requests for the Equbs you created. Review them from the Equb page."
            >
              {adminRequests.length === 0 ? (
                <p className="text-sm text-gray-500">No pending admission requests right now.</p>
              ) : (
                <div className="space-y-3">
                  {adminRequests.map(({ membership, equb, requester }) => (
                    <div
                      key={membership.id}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {requester?.displayName ?? "Unknown user"}
                          </p>
                          <p className="text-sm text-gray-600">
                            Requested to join{" "}
                            <span className="font-medium text-gray-900">{equb.name}</span>
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Submitted {formatDateTime(membership.joinedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={membership.status} />
                          <Link href={`/equbs/${equb.id}`}>
                            <Button size="sm" variant="secondary">
                              Review
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>
        ) : (
          <section className="mt-8">
            <Card
              title="Approval Status"
              description="Your membership requests and current standing in each Equb."
            >
              {membershipStatuses.length === 0 ? (
                <p className="text-sm text-gray-500">You have no active or pending membership records.</p>
              ) : (
                <div className="space-y-3">
                  {membershipStatuses.map(({ membership, equb }) => (
                    <div
                      key={membership.id}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{equb?.name ?? "Equb"}</p>
                          <p className="text-sm text-gray-600">
                            {membership.status === "PENDING"
                              ? "Your request is waiting for admin approval."
                              : membership.status === "APPROVED"
                                ? "Your request was approved and you can continue with the Equb."
                                : `Current status: ${membership.status.toLowerCase()}.`}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Joined {formatDateTime(membership.joinedAt)}
                          </p>
                        </div>
                        <StatusBadge status={membership.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>
        )}

        <section className="mt-8">
          <Card
            title="Recent Notifications"
            description="Actionable messages from the system, ordered newest first."
          >
            {notifications.length === 0 ? (
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <MailOpen className="h-4 w-4" />
                No notifications yet.
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={[
                      "rounded-lg border p-4 transition-colors",
                      notification.read ? "border-gray-200 bg-white" : "border-emerald-200 bg-emerald-50",
                    ].join(" ")}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{notification.title}</h3>
                          {!notification.read && (
                            <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                              New
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatDateTime(notification.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={notification.read ? "COMPLETED" : "PENDING"} />
                        {!notification.read && (
                          <button
                            type="button"
                            onClick={() => markRead(notification.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                          >
                            <CheckCheck className="h-4 w-4" />
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}
