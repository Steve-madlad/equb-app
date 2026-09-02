'use client';

import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fromMinorUnits } from '@/lib/domain/money';
import type { Equb } from '@/lib/domain/types';
import { PencilLine } from 'lucide-react';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type FormState = {
  name: string;
  description: string;
  contributionAmount: number;
  frequency: 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  customIntervalDays: number | '';
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
  disabled,
}: {
  token: string;
  equb: Equb;
  membersCount: number;
  onSaved: () => Promise<void> | void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>({
    name: equb.name,
    description: equb.description ?? '',
    contributionAmount: Number(fromMinorUnits(equb.contributionAmountMinor)),
    frequency: equb.frequency,
    customIntervalDays: equb.customIntervalDays ?? '',
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
      description: equb.description ?? '',
      contributionAmount: Number(fromMinorUnits(equb.contributionAmountMinor)),
      frequency: equb.frequency,
      customIntervalDays: equb.customIntervalDays ?? '',
      numberOfCycles: equb.numberOfCycles,
      memberLimit: equb.memberLimit,
      minimumMemberCount: equb.minimumMemberCount,
      startDate: equb.startDate,
      penaltyEnabled: equb.penaltyEnabled,
    });
    setError('');
  }, [equb, open]);

  const startDateOnly = membersCount > 0;
  const canEdit =
    equb.status === 'DRAFT' || equb.status === 'OPEN_FOR_MEMBERS' || equb.status === 'LOCKED';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    setError('');

    const res = await fetch(`/api/equbs/${equb.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'update',
        name: form.name,
        description: form.description,
        contributionAmount: form.contributionAmount,
        frequency: form.frequency,
        customIntervalDays:
          form.frequency === 'CUSTOM' && form.customIntervalDays !== ''
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
      toast.success(startDateOnly ? 'Start date updated.' : 'Equb updated.');
      setOpen(false);
      await onSaved();
    } else {
      const data = await res.json().catch(() => null);
      const message = data?.error ?? 'Failed to update Equb';
      setError(message);
      toast.error(message);
    }

    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild disabled={disabled}>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          className="rounded-xl border border-white/10 text-xs font-semibold"
        >
          <PencilLine className="mr-1 h-3.5 w-3.5" />
          {startDateOnly ? 'Postpone start date' : 'Edit Group'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl border-white/10 bg-slate-900 text-white shadow-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-white">
            {startDateOnly ? 'Postpone Start Date' : 'Edit Equb Details'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            {startDateOnly
              ? 'Members have already joined, so only the start date can be changed.'
              : 'Update group configuration and parameters.'}
          </DialogDescription>
        </DialogHeader>

        {!canEdit ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            This Equb can no longer be edited because it has already started.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-300">Group Name</label>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                  disabled={startDateOnly}
                  className="rounded-xl border-white/10 bg-slate-800/60 text-sm disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-300">Description</label>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="min-h-20 w-full rounded-xl border border-white/10 bg-slate-800/60 px-3.5 py-2.5 text-xs text-white transition-all outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                  disabled={startDateOnly}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Contribution (ETB)</label>
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
                  className="rounded-xl border-white/10 bg-slate-800/60 text-sm disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Frequency</label>
                <Select
                  value={form.frequency}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      frequency: value as FormState['frequency'],
                    }))
                  }
                  disabled={startDateOnly}
                >
                  <SelectTrigger className="w-full rounded-xl border-white/10 bg-slate-800/60 text-sm disabled:opacity-50">
                    <SelectValue placeholder="Choose frequency" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-slate-900 text-white">
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.frequency === 'CUSTOM' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Custom interval (days)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={form.customIntervalDays}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        customIntervalDays:
                          event.target.value === '' ? '' : Number(event.target.value),
                      }))
                    }
                    disabled={startDateOnly}
                    className="rounded-xl border-white/10 bg-slate-800/60 text-sm disabled:opacity-50"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Member Limit</label>
                <Input
                  type="number"
                  min="2"
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
                  className="rounded-xl border-white/10 bg-slate-800/60 text-sm disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Minimum Members to Start
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
                  disabled={startDateOnly}
                  className="rounded-xl border-white/10 bg-slate-800/60 text-sm disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-300">Start Date</label>
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
                  className="rounded-xl border-white/10 bg-slate-800/60 text-sm"
                />
              </div>
            </div>

            <p className="pt-1 text-[11px] text-slate-400">
              {startDateOnly
                ? '⚠️ Only the start date is editable because members have already joined.'
                : 'Cycles automatically adjust to member limit.'}
            </p>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={saving}
                className="rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 px-5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
