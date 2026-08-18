"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import type { Equb, Membership, UserProfile } from "@/lib/domain/types";

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [equbs, setEqubs] = useState<Equb[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }
      const token = await user.getIdToken();
      const [profileRes, equbsRes] = await Promise.all([
        fetch("/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/equbs", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (profileRes.ok) {
        const { profile: p } = await profileRes.json();
        setProfile(p);
      }
      if (equbsRes.ok) {
        const { equbs: e } = await equbsRes.json();
        setEqubs(e);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const userLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/equbs", label: "Browse Equbs" },
    { href: "/notifications", label: "Notifications" },
  ];

  const adminLinks = profile?.role === "ADMIN"
    ? [{ href: "/admin", label: "Admin" }]
    : [];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        links={[...userLinks, ...adminLinks]}
        userName={profile?.displayName}
        dashboardHref="/dashboard"
        notificationsHref="/notifications"
        onSignOut={() => signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))}
      />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold">Welcome, {profile?.displayName}</h1>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card title="Available Equbs">
            {equbs.filter((e) => e.status === "OPEN_FOR_MEMBERS").length === 0 ? (
              <p className="text-gray-500">No Equbs currently open for members.</p>
            ) : (
              <div className="space-y-3">
                {equbs
                  .filter((e) => e.status === "OPEN_FOR_MEMBERS")
                  .map((equb) => (
                    <Link
                      key={equb.id}
                      href={`/equbs/${equb.id}`}
                      className="block rounded-lg border p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{equb.name}</span>
                        <StatusBadge status={equb.status} />
                      </div>
                    </Link>
                  ))}
              </div>
            )}
            <Link href="/equbs" className="mt-4 inline-block">
              <Button variant="secondary" size="sm">
                Browse all Equbs
              </Button>
            </Link>
          </Card>
          <Card title="Quick actions">
            <div className="space-y-3">
              <Link href="/equbs">
                <Button variant="secondary" className="w-full">
                  Browse Equbs
                </Button>
              </Link>
              {profile?.role === "ADMIN" && (
                <Link href="/admin/equbs/new">
                  <Button className="w-full">Create new Equb</Button>
                </Link>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
