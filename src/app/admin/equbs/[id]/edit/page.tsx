"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fromMinorUnits } from "@/lib/domain/money";
import type { Equb } from "@/lib/domain/types";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { onIdTokenChanged } from "firebase/auth";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type FormState = {
  name: string;
  description: string;
  contributionAmount: number;
  frequency: "WEEKLY" | "MONTHLY" | "CUSTOM";
  customIntervalDays: number | "";
  numberOfCycles: number;
  memberLimit: number;
  minimumMemberCount: number;
  startDate: string;
  penaltyEnabled: boolean;
};

export default function EditEqubPage() {
  const params = useParams<{ id: string }>();
  const equbId = params?.id;

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [membersCount, setMembersCount] = useState(0);
  const [equb, setEqub] = useState<Equb | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    contributionAmount: 1000,
    frequency: "MONTHLY",
    customIntervalDays: "",
    numberOfCycles: 10,
    memberLimit: 10,
    minimumMemberCount: 1,
    startDate: new Date().toISOString().split("T")[0],
    penaltyEnabled: false,
  });

  useEffect(() => {
    if (!equbId) return;

    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const authToken = await user.getIdToken();
      setToken(authToken);

      const res = await fetch(`/api/equbs/${equbId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to load Equb");
        setLoading(false);
        return;
      }

      const data = await res.json();
      const loadedEqub: Equb = data.equb;
      setEqub(loadedEqub);
      setMembersCount((data.memberships ?? []).length);
      setForm({
        name: loadedEqub.name,
        description: loadedEqub.description ?? "",
        contributionAmount: Number(
          fromMinorUnits(loadedEqub.contributionAmountMinor),
        ),
        frequency: loadedEqub.frequency,
        customIntervalDays: loadedEqub.customIntervalDays ?? "",
        numberOfCycles: loadedEqub.numberOfCycles,
        memberLimit: loadedEqub.memberLimit,
        minimumMemberCount: loadedEqub.minimumMemberCount,
        startDate: loadedEqub.startDate,
        penaltyEnabled: loadedEqub.penaltyEnabled,
      });
      setLoading(false);
    });

    return unsub;
  }, [equbId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch(`/api/equbs/${equbId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: "update",
        name: form.name,
        description: form.description,
        contributionAmount: form.contributionAmount,
        frequency: form.frequency,
        customIntervalDays:
          form.frequency === "CUSTOM" && form.customIntervalDays !== ""
            ? form.customIntervalDays
            : undefined,
        numberOfCycles: form.numberOfCycles,
        memberLimit: form.memberLimit,
        minimumMemberCount: form.minimumMemberCount,
        startDate: form.startDate,
        penaltyEnabled: form.penaltyEnabled,
        penaltyType: null,
        penaltyAmount: null,
      }),
    });

    if (res.ok) {
      window.location.href = `/equbs/${equbId}`;
      return;
    }

    const data = await res.json().catch(() => null);
    setError(data?.error ?? "Failed to update Equb");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        links={[
          { href: "/admin", label: "Admin" },
          { href: `/equbs/${equbId}`, label: "Back to Equb" },
        ]}
        isAdmin
      />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold">Edit Equb</h1>
        <p className="mt-2 text-sm text-gray-600">
          {membersCount === 0
            ? "You can edit this Equb because no members have joined yet."
            : "This Equb already has members and cannot be edited."}
        </p>

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
                    setForm({
                      ...form,
                      frequency: e.target.value as FormState["frequency"],
                    })
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
            </div>

            {form.frequency === "CUSTOM" && (
              <div>
                <label className="block text-sm font-medium">
                  Custom interval days
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.customIntervalDays}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customIntervalDays:
                        e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>
            )}

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
              Penalties are currently kept off in this edit form. Cycles still
              stay equal to member limit, and the Equb cannot start below the
              minimum member threshold.
            </p>

            <div className="flex gap-3">
              <Button
                type="submit"
                loading={saving}
                disabled={membersCount > 0}
              >
                Save Changes
              </Button>
              <Link href={`/equbs/${equbId}`}>
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </Card>

        {equb && membersCount > 0 && (
          <p className="mt-3 text-sm text-red-600">
            This Equb already has members, so edits are blocked.
          </p>
        )}
      </main>
    </div>
  );
}
