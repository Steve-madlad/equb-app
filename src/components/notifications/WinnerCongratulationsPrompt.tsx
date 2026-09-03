'use client';

import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Notification } from '@/lib/domain/types';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { onIdTokenChanged } from 'firebase/auth';
import { ArrowRight, PartyPopper, Sparkles, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function WinnerCongratulationsPrompt({ disabled = false }: { disabled?: boolean }) {
  const [queue, setQueue] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (disabled) return;

    let cancelled = false;
    const unsubscribe = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) return;
      const token = await user.getIdToken();
      const response = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok || cancelled) return;

      const body = (await response.json()) as { notifications?: Notification[] };
      const candidates = (body.notifications ?? []).filter(
        (notification) =>
          ['PAYOUT_DRAW_WINNER', 'PAYOUT_PROCESSING'].includes(notification.type) &&
          !notification.read,
      );

      const claimed: Notification[] = [];
      for (const notification of candidates) {
        const claimResponse = await fetch(`/api/notifications/${notification.id}?claim=true`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!claimResponse.ok) continue;
        const claimBody = (await claimResponse.json()) as { claimed?: boolean };
        if (claimBody.claimed !== false) claimed.push(notification);
      }

      if (!cancelled && claimed.length > 0) {
        setQueue(claimed);
        setOpen(true);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [disabled]);

  const current = queue[0];
  if (!current) return null;

  function closeCurrent() {
    setOpen(false);
    setQueue((items) => {
      const remaining = items.slice(1);
      if (remaining.length > 0) {
        window.setTimeout(() => setOpen(true), 150);
      }
      return remaining;
    });
  }

  // Safely parse payout numbers dynamically from backend notification messages
  const payoutMatch = current.message?.match(/(\d[\d,.]*)\s*(ETB|USD|EUR)?/i);
  const amount = payoutMatch ? payoutMatch[1] : null;
  const currency = payoutMatch?.[2] ? payoutMatch[2].toUpperCase() : 'ETB';

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && closeCurrent()}>
      <DialogContent className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-emerald-500/20 bg-linear-to-b from-slate-900/95 via-slate-900 to-slate-950 p-0 shadow-2xl shadow-emerald-950/50 backdrop-blur-xl sm:max-w-lg">
        {/* Animated Confetti Effect */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 32 }, (_, index) => (
            <span
              key={index}
              className="absolute top-0 h-3 w-1.5 animate-[confetti-fall_3s_ease-in-out_infinite] rounded-full opacity-80"
              style={{
                left: `${3 + ((index * 13) % 94)}%`,
                backgroundColor: ['#10b981', '#34d399', '#fbbf24', '#f43f5e', '#38bdf8', '#a855f7'][
                  index % 6
                ],
                animationDelay: `${(index % 10) * -0.3}s`,
                transform: `rotate(${index * 43}deg)`,
              }}
            />
          ))}
        </div>

        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 -bottom-24 h-48 w-48 rounded-full bg-teal-500/15 blur-3xl" />

        <div className="relative px-6 pt-10 pb-8 sm:px-10">
          <DialogHeader className="flex flex-col items-center text-center">
            {/* Header Badge */}
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 backdrop-blur-md">
              <PartyPopper className="h-3.5 w-3.5" />
              <span>Winner Announcement</span>
            </div>

            {/* Glowing Trophy Badge */}
            <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 animate-pulse rounded-full bg-linear-to-tr from-emerald-500 to-teal-400 opacity-40 blur-xl" />
              <div className="relative flex h-full w-full items-center justify-center rounded-3xl bg-linear-to-br from-emerald-400 via-teal-500 to-emerald-700 text-white shadow-xl ring-1 shadow-emerald-900/40 ring-white/20">
                <Sparkles className="absolute -top-2 -right-2 h-7 w-7 text-amber-300 drop-shadow-md" />
                <Trophy className="h-11 w-11 drop-shadow-md" />
              </div>
            </div>

            {/* Title */}
            <DialogTitle className="bg-linear-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
              Congratulations!
            </DialogTitle>

            {/* Highlighted Metric Card */}
            <DialogDescription asChild>
              <div className="mt-5 w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 text-center shadow-inner">
                <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  Round Winner Selected
                </p>

                {amount ? (
                  <div className="my-2 flex items-baseline justify-center gap-1.5">
                    <span className="text-3xl font-black tracking-tight text-emerald-400 sm:text-4xl">
                      {amount}
                    </span>
                    <span className="text-sm font-bold text-emerald-500/80">{currency}</span>
                  </div>
                ) : null}

                <p className="mb-3 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  {current.message}
                </p>

                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Payout Ready for Processing
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          {/* Action Footer */}
          <DialogFooter className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={closeCurrent}
              className="w-full border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white sm:w-auto"
            >
              Dismiss
            </Button>

            {current.equbId ? (
              <Button
                asChild
                className="group relative w-full overflow-hidden bg-linear-to-r from-emerald-500 to-teal-600 font-semibold text-white shadow-lg shadow-emerald-600/30 hover:from-emerald-400 hover:to-teal-500 sm:w-auto"
              >
                <Link href={`/equbs/${current.equbId}`} onClick={closeCurrent}>
                  <span>View Equb Details</span>
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={closeCurrent}
                className="w-full bg-linear-to-r from-emerald-500 to-teal-600 font-semibold text-white shadow-lg shadow-emerald-600/30 hover:from-emerald-400 hover:to-teal-500 sm:w-auto"
              >
                Continue
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
