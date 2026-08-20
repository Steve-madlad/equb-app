"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fromMinorUnits } from "@/lib/domain/money";
import type { Equb } from "@/lib/domain/types";

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

export function EditEqubDialog({
  token,
  equb,
  membersCount,
  onSaved,
}: {
  token: string;
  equb: Equb;
  membersCount: number;
  onSaved: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({
    name: equb.name,
    description: equb.description ?? "",
    contributionAmount: Number(fromMinorUnits(equb.contributionAmountMinor)),
    frequency: equb.frequency,
    customIntervalDays: equb.customIntervalDays ?? "",
    numberOfCycles: equb.numberOfCycles,
    memberLimit: equb.memberLimit,
    minimumMemberCount: equb.minimumMemberCount,
    startDate: equb.startDate,
    penaltyEnabled: equb.penaltyEnabled,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: equb.name,
      description: equb.description ?? "",
      contributionAmount: Number(fromMinorUnits(equb.contributionAmountMinor)),
      frequency: equb.frequency,
      customIntervalDays: equb.customIntervalDays ?? "",
      numberOfCycles: equb.numberOfCycles,
      memberLimit: equb.memberLimit,
      minimumMemberCount: equb.minimumMemberCount,
      startDate: equb.startDate,
      penaltyEnabled: equb.penaltyEnabled,
    });
    setError("");
  }, [equb, open]);

  const startDateOnly = membersCount > 0;
  const canEdit = equb.status === "DRAFT" || equb.status === "OPEN_FOR_MEMBERS" || equb.status === "LOCKED";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    setError("");

    const res = await fetch(`/api/equbs/${equb.id}`, {
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
      toast.success(startDateOnly ? "Start date updated." : "Equb updated.");
      setOpen(false);
      await onSaved();
    } else {
      const data = await res.json().catch(() => null);
      const message = data?.error ?? "Failed to update Equb";
      setError(message);
      toast.error(message);
    }

    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" type="button">
          {startDateOnly ? "Postpone start date" : "Edit Equb"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{startDateOnly ? "Postpone start date" : "Edit Equb"}</DialogTitle>
          <DialogDescription>
            {startDateOnly
              ? "Members have already joined, so only the start date can be changed right now."
              : "Update the Equb details before it starts."}
          </DialogDescription>
        </DialogHeader>

        {!canEdit ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            This Equb can no longer be edited because it has already started.
          </div>
        ) : (
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
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                  disabled={startDateOnly}
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
                  className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
                  disabled={startDateOnly}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Contribution (ETB)</label>
                <Input
                  type="number"
                  min="2"
                  value={form.contributionAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      contributionAmount: Number(event.target.value),
                    }))
                  }
                  required
                  disabled={startDateOnly}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Frequency</label>
                <Select
                  value={form.frequency}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      frequency: value as FormState["frequency"],
                    }))
                  }
                  disabled={startDateOnly}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.frequency === "CUSTOM" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Custom interval days</label>
                  <Input
                    type="number"
                    min={1}
                    value={form.customIntervalDays}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        customIntervalDays:
                          event.target.value === "" ? "" : Number(event.target.value),
                      }))
                    }
                    disabled={startDateOnly}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Member limit</label>
                <Input
                  type="number"
                  min={2}
                  value={form.memberLimit}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setForm((current) => ({
                      ...current,
                      memberLimit: next,
                      numberOfCycles: next,
                    }));
                  }}
                  required
                  disabled={startDateOnly}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Minimum members to start</label>
                <Input
                  type="number"
                  min={2}
                  max={form.memberLimit}
                  value={form.minimumMemberCount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      minimumMemberCount: Number(event.target.value),
                    }))
                  }
                  required
                  disabled={startDateOnly}
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

            <p className="text-xs text-gray-500">
              {startDateOnly
                ? "Only the start date is editable after members have joined."
                : "Cycles stay equal to member limit, and the Equb cannot start below the minimum member threshold."}
            </p>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
