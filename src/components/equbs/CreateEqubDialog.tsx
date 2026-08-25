"use client";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getBrowserTestDate, getTodayIsoDate } from "@/lib/testClock";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function CreateEqubDialog({
  token,
  onCreated,
}: {
  token: string;
  onCreated: (equbId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    contributionAmount: 1000,
    frequency: "MONTHLY" as "WEEKLY" | "MONTHLY",
    memberLimit: 10,
    minimumMemberCount: 2,
    startDate: getTodayIsoDate(),
  });

  useEffect(() => {
    const testDate = getBrowserTestDate();
    if (testDate) {
      setForm((current) => ({ ...current, startDate: testDate }));
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/equbs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...form,
        numberOfCycles: form.memberLimit,
        penaltyEnabled: false,
      }),
    });

    if (res.ok) {
      const { equb } = await res.json();
      setOpen(false);
      toast.success("Equb created");
      onCreated(equb.id);
    } else {
      const body = await res.json().catch(() => null);
      const message = body?.error ?? "Unable to create Equb.";
      setError(message);
      toast.error(message);
    }

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus className="mr-2 size-4" />
          Create Equb
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Equb</DialogTitle>
          <DialogDescription>
            Create a new rotating savings group from the dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
                placeholder="Name the group"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
                placeholder="Short details about the Equb"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contribution (ETB)</label>
              <Input
                type="number"
                min="1"
                value={form.contributionAmount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contributionAmount: Number(event.target.value),
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Frequency</label>
              <Select
                value={form.frequency}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    frequency: value as "WEEKLY" | "MONTHLY",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Member limit</label>
              <Input
                type="number"
                min="2"
                value={form.memberLimit}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setForm((current) => ({
                    ...current,
                    memberLimit: next,
                    minimumMemberCount: Math.min(
                      current.minimumMemberCount,
                      next,
                    ),
                  }));
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Minimum members to start
              </label>
              <Input
                type="number"
                min="2"
                max={form.memberLimit}
                value={form.minimumMemberCount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    minimumMemberCount: Number(event.target.value),
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Start date</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Equb
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
