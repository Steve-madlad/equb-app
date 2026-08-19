"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { onIdTokenChanged } from "firebase/auth";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function CreateEqubPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    contributionAmount: 1000,
    frequency: "MONTHLY" as const,
    numberOfCycles: 10,
    memberLimit: 10,
    startDate: new Date().toISOString().split("T")[0],
    penaltyEnabled: false,
    minimumMemberCount: 2,
  });

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) window.location.href = "/login";
      else setToken(await user.getIdToken());
    });
    return unsub;
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/equbs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const { equb } = await res.json();
      window.location.href = `/equbs/${equb.id}`;
    } else {
      const data = await res.json();
      setError(data.error);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar links={[{ href: "/admin", label: "Admin" }]} isAdmin />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold">Create Equb</h1>
        <Card className="mt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">
                  Contribution (ETB)
                </label>
                <input
                  type="number"
                  value={form.contributionAmount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      contributionAmount: Number(e.target.value),
                    })
                  }
                  required
                  min={1}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) =>
                    setForm({ ...form, frequency: e.target.value as "MONTHLY" })
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">
                  Member limit
                </label>
                <input
                  type="number"
                  value={form.memberLimit}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setForm({ ...form, memberLimit: v, numberOfCycles: v });
                  }}
                  required
                  min={2}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Minimum members to start
                </label>
                <input
                  type="number"
                  value={form.minimumMemberCount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      minimumMemberCount: Number(e.target.value),
                    })
                  }
                  required
                  min={1}
                  max={form.memberLimit || 1}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Start date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
                required
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
            <p className="text-xs text-gray-500">
              Number of cycles will equal member limit (one payout per member).
              The Equb will not start until it reaches the minimum member count.
              No administrator fees. Penalties disabled by default.
            </p>
            <div className="flex gap-3">
              <Button type="submit" loading={loading}>
                Create Equb
              </Button>
              <Link href="/admin">
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
