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
import { getBrowserTestDate, getTodayIsoDate } from '@/lib/testClock';
import { Plus, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function CreateEqubDialog({
  token,
  onCreated,
}: {
  token: string;
  onCreated: (equbId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    contributionAmount: 1000,
    frequency: 'MONTHLY' as 'WEEKLY' | 'MONTHLY',
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
    setError('');

    const res = await fetch('/api/equbs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      toast.success('Equb created successfully!');
      onCreated(equb.id);
    } else {
      const body = await res.json().catch(() => null);
      const message = body?.error ?? 'Unable to create Equb.';
      setError(message);
      toast.error(message);
    }

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500"
        >
          <Plus className="mr-1.5 size-4" />
          Create Equb
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-2xl dark:border-white/10 dark:bg-slate-900 dark:text-white">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
            <Sparkles className="h-4 w-4" />
            <span>New Rotating Savings Group</span>
          </div>
          <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-white">
            Launch an Equb
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Configure group rules, contribution amounts, frequency, and member thresholds.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Group Name
              </label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
                placeholder="e.g. Bole Entrepreneurs Monthly Equb"
                className="rounded-xl border-slate-300 bg-white text-sm text-slate-900 dark:border-white/10 dark:bg-slate-800/60 dark:text-white"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description & Purpose
              </label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 transition-all outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-slate-800/60 dark:text-white dark:placeholder:text-slate-500"
                placeholder="Details on member eligibility, rules, and purpose…"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Contribution per Cycle (ETB)
              </label>
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
                className="rounded-xl border-slate-300 bg-white text-sm text-slate-900 dark:border-white/10 dark:bg-slate-800/60 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Cycle Frequency
              </label>
              <Select
                value={form.frequency}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    frequency: value as 'WEEKLY' | 'MONTHLY',
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Member Limit
              </label>
              <Input
                type="number"
                min="2"
                value={form.memberLimit}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setForm((current) => ({
                    ...current,
                    memberLimit: next,
                    minimumMemberCount: Math.min(current.minimumMemberCount, next),
                  }));
                }}
                required
                className="rounded-xl border-slate-300 bg-white text-sm text-slate-900 dark:border-white/10 dark:bg-slate-800/60 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Min Members to Start
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
                className="rounded-xl border-slate-300 bg-white text-sm text-slate-900 dark:border-white/10 dark:bg-slate-800/60 dark:text-white"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Equb Start Date
              </label>
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
                className="rounded-xl border-slate-300 bg-white text-sm text-slate-900 dark:border-white/10 dark:bg-slate-800/60 dark:text-white"
              />
            </div>
          </div>

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
              loading={loading}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500"
            >
              Create Equb Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
