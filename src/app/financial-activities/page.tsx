"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/Card";
import { EqubLoading } from "@/components/ui/EqubLoading";
import { formatMoney } from "@/lib/domain/money";
import type { LedgerEntry, UserProfile } from "@/lib/domain/types";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { formatDateTime } from "@/lib/utils";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";

type Activity = LedgerEntry & { equbName: string; direction: "IN" | "OUT" };

export default function FinancialActivitiesPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }
      const token = await user.getIdToken();
      const [profileRes, activityRes] = await Promise.all([
        fetch("/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/financial-activities", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (profileRes.ok) {
        const nextProfile = (await profileRes.json()).profile as UserProfile;
        if (nextProfile.role === "ADMIN") {
          window.location.href = "/dashboard";
          return;
        }
        setProfile(nextProfile);
      }
      if (activityRes.ok) setActivities((await activityRes.json()).activities);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return <EqubLoading />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        links={[]}
        userName={profile?.displayName}
        isAdmin={profile?.role === "ADMIN"}
        searchHref={profile?.role === "ADMIN" ? "/equbs" : "/search"}
        onSignOut={() =>
          signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))
        }
      />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Financial activities
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Your contribution payments and completed Equb payouts.
        </p>
        <Card className="mt-6 px-5 py-2">
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500">
              No financial activities yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-200">
              {activities.map((activity) => {
                const received = activity.direction === "IN";
                return (
                  <div
                    key={activity.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={
                          received
                            ? "rounded-full bg-emerald-100 p-2 text-emerald-700"
                            : "rounded-full bg-rose-100 p-2 text-rose-700"
                        }
                      >
                        {received ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {received ? "Payout received" : "Contribution paid"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {activity.equbName} · {activity.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p
                      className={
                        received
                          ? "font-semibold text-emerald-700"
                          : "font-semibold text-rose-700"
                      }
                    >
                      {received ? "+" : "-"}
                      {formatMoney(activity.amountMinor)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
