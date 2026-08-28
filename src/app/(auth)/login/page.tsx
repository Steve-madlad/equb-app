'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signInWithEmailAndPassword, onIdTokenChanged } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/Button';
import { Lock, Mail, Moon, ShieldCheck, Sun, Wallet } from 'lucide-react';
import { useTheme } from 'next-themes';
import { TeferLogo } from '@/components/svg/TeferLogo';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm transition-all hover:bg-slate-100 hover:text-emerald-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-emerald-400"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), (user) => {
      if (user) {
        window.location.href = '/dashboard';
      }
    });
    return unsub;
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-slate-50 px-4 py-12 transition-colors duration-300 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
      {/* Top Bar with Logo link & Theme Toggle */}
      <div className="absolute top-6 right-6 left-6 z-10 mx-auto flex max-w-5xl items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white">
            <Wallet className="h-3.5 w-3.5" />
          </span>
          <span>Equb</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Background glow circles bounded within overflow-hidden container */}
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600/15 opacity-0 blur-3xl dark:opacity-100" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-teal-600/15 opacity-0 blur-3xl dark:opacity-100" />
      </div>

      <div className="relative z-10 my-auto w-full max-w-md">
        {/* Header Branding */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sign in to manage your Equbs & payouts
          </p>
        </div>

        {/* Card Container */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-slate-900 shadow-xl shadow-slate-200/60 backdrop-blur-xl transition-all sm:p-10 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:shadow-2xl dark:shadow-black/25">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
                <ShieldCheck className="h-5 w-5 flex-shrink-0 text-red-500 dark:text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900/80"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900/80"
                />
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="mt-2 w-full cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-400 hover:to-teal-500"
            >
              Sign In
            </Button>

            <p className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              Don&apos;t have an account yet?{' '}
              <Link
                href="/register"
                className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
              >
                Create one now
              </Link>
            </p>
          </form>
        </div>

        {/* Powered by Tefer Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="text-[11px] font-medium tracking-wider uppercase">Powered by</span>
          <div className="inline-flex items-center text-slate-700 dark:text-slate-200">
            <TeferLogo className="h-5 w-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
