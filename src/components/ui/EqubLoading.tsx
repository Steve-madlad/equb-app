'use client';

import { cn } from '@/lib/utils';
import { Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TeferLogo } from '../svg/TeferLogo';

const EQUB_SLOGANS = [
  'Empowering community savings…',
  'Smart, automated rotating funds…',
  'Building financial trust together…',
  'Your savings circle, elevated…',
  'Seamless digital rotating payouts…',
  'Modernizing Ethiopian Equb funds…',
  'Transparent financial circles…',
  'Savings made simple and secure…',
];

export function EqubLoading({ className, subtitle }: { className?: string; subtitle?: string }) {
  const [selectedPhrase, setSelectedPhrase] = useState<string>(EQUB_SLOGANS[0]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * EQUB_SLOGANS.length);
    setSelectedPhrase(EQUB_SLOGANS[randomIndex]);
  }, []);

  return (
    <div
      className={cn(
        'flex min-h-screen items-center justify-center bg-slate-50 px-4 transition-colors duration-300 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-5">
        {/* Animated logo pulse with outer spinning accent */}
        <div className="relative flex items-center justify-center">
          <div className="absolute h-24 w-24 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500" />
          <div className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-xl shadow-emerald-500/25">
            <Wallet className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Brand Text */}
        <div className="space-y-1 text-center">
          <span className="animate-[equb-text-wave_3.2s_linear_infinite] bg-linear-to-r from-emerald-600 via-teal-400 to-emerald-600 bg-size-[220%_100%] bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl dark:from-emerald-400 dark:via-slate-300 dark:to-emerald-400">
            Equb
          </span>
          <p className="mt-3 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 bg-clip-text text-sm font-semibold tracking-wide text-transparent dark:from-emerald-300 dark:via-teal-300 dark:to-emerald-400">
            {subtitle || selectedPhrase}
          </p>
        </div>
      </div>

      {/* Powered by Tefer Footer */}
      <div className="align-center absolute bottom-10 mt-8 gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="translate-y-0.5 text-[11px] font-medium tracking-wider uppercase">
          Powered by
        </span>
        <div className="inline-flex items-center text-slate-700 dark:text-slate-200">
          <TeferLogo className="h-5 w-auto" />
        </div>
      </div>
    </div>
  );
}
