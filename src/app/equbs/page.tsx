"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/domain/money";
import type { Equb } from "@/lib/domain/types";

export default function EqubsPage() {
  const [equbs, setEqubs] = useState<Equb[]>([]);
  const [userName, setUserName] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setUserName(user.displayName ?? user.email ?? "Account");
      const token = await user.getIdToken();
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

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        links={[{ href: "/dashboard", label: "Dashboard" }, { href: "/equbs", label: "Equbs" }]}
        userName={userName}
        dashboardHref="/dashboard"
        notificationsHref="/notifications"
        onSignOut={() => signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))}
      />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold">Browse Equbs</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {equbs.map((equb) => (
            <Link key={equb.id} href={`/equbs/${equb.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{equb.name}</h3>
                  <StatusBadge status={equb.status} />
                </div>
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">{equb.description}</p>
                <dl className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Contribution</dt>
                    <dd>{formatMoney(equb.contributionAmountMinor)}/{equb.frequency.toLowerCase()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Members</dt>
                    <dd>{equb.memberLimit}</dd>
                  </div>
                </dl>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
