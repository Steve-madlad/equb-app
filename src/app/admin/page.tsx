"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Equb } from "@/lib/domain/types";

export default function AdminDashboardPage() {
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

  const adminLinks = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/equbs", label: "Equbs" },
    { href: "/admin/audit", label: "Audit Logs" },
    { href: "/admin/ledger", label: "Ledger" },
  ];

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        links={adminLinks}
        userName={userName}
        dashboardHref="/dashboard"
        notificationsHref="/notifications"
        onSignOut={() => signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))}
      />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <Link href="/admin/equbs/new">
            <Button>Create Equb</Button>
          </Link>
        </div>
        <div className="mt-8 grid gap-4">
          {equbs.map((equb) => (
            <Link key={equb.id} href={`/equbs/${equb.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{equb.name}</h3>
                    <p className="text-sm text-gray-500">
                      {equb.memberLimit} members · {equb.numberOfCycles} cycles
                    </p>
                  </div>
                  <StatusBadge status={equb.status} />
                </div>
              </Card>
            </Link>
          ))}
          {equbs.length === 0 && (
            <Card>
              <p className="text-gray-500">No Equbs yet. Create your first Equb.</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
