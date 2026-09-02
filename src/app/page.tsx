'use client';

import { HomeNavbar } from '@/components/layout/HomeNavbar';
import { TeferLogo } from '@/components/svg/TeferLogo';
import { Button } from '@/components/ui/Button';
import {
  ArrowRight,
  Award,
  Building2,
  Check,
  ChevronDown,
  History,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function HomePage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const institutions = [
    { name: 'Commercial Bank of Ethiopia', short: 'CBE' },
    { name: 'Telebirr', short: 'Telebirr' },
    { name: 'CBE Birr', short: 'CBE Birr' },
    { name: 'Bank of Abyssinia', short: 'BOA' },
    { name: 'Awash Bank', short: 'Awash' },
    { name: 'Dashen Bank', short: 'Dashen' },
    { name: 'M-Pesa', short: 'M-Pesa' },
    { name: 'Coop Bank', short: 'COOP' },
  ];

  const features = [
    {
      icon: Zap,
      title: 'Automated Payouts & Transfers',
      desc: "Disburse pool winnings directly into winners' CBE, Telebirr, or Ethiopian bank accounts with multi-phase settlement verification.",
      badge: 'Chapa & QStash',
    },
    {
      icon: Scale,
      title: 'Provably Fair Random Draws',
      desc: 'Server-side cryptographic winner selection with immutable SHA-256 random seeds. Eliminates favoritism and human bias.',
      badge: 'Cryptographic',
    },
    {
      icon: History,
      title: 'Immutable Financial Ledger',
      desc: 'Every single contribution, late penalty, and payout is permanently written to a double-entry ledger. Zero hidden deductions.',
      badge: '100% Transparent',
    },
    {
      icon: RefreshCw,
      title: 'Customizable Cycles & Pools',
      desc: 'Set up weekly, monthly, or custom interval groups with configurable member thresholds, pool amounts, and start dates.',
      badge: 'Flexible Rules',
    },
    {
      icon: Award,
      title: 'Member Reliability Scores',
      desc: 'Dynamic trust ratings (0-100) track on-time contributions. Overdue payments impact reputation while compliant savers thrive.',
      badge: 'Smart Trust',
    },
    {
      icon: ShieldCheck,
      title: '48-Hour Fair Grace Period',
      desc: 'Built-in protection against premature penalties with automated overdue tracking, admin audit logs, and exception handling.',
      badge: 'Safe Savings',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Create or Join an Equb',
      desc: 'Browse vetted rotating savings groups or launch your own with custom contribution amounts, frequencies, and member limits.',
    },
    {
      step: '02',
      title: 'Contribute with 1-Click',
      desc: 'Pay obligations seamlessly via CBE Birr, Telebirr, BOA, or M-Pesa. Webhooks immediately reconcile obligations in real-time.',
    },
    {
      step: '03',
      title: 'Verifiable Autonomous Draw',
      desc: 'On cycle due dates, the system evaluates member eligibility and executes an atomic, tamper-proof random draw.',
    },
    {
      step: '04',
      title: 'Direct Bank Disbursement',
      desc: "The collected pool is transferred straight to the winner's verified Ethiopian bank or mobile wallet without manual delays.",
    },
  ];

  const faqs = [
    {
      q: 'What makes digital Equb safer than traditional cash Equb?',
      a: 'Digital Equb replaces manual collection notebooks and informal handoffs with an immutable double-entry ledger, cryptographic winner selection, and direct bank transfers. Every member has real-time visibility into group finances, eliminating hidden fees and dispute risks.',
    },
    {
      q: 'How does the random payout selection work?',
      a: 'Draws are executed server-side using cryptographic seeds within atomic database transactions. Only active members who have paid all cycle obligations and have not yet won are eligible. The selection seed and audit log are permanently recorded.',
    },
    {
      q: 'Which Ethiopian banks and mobile wallets are supported?',
      a: 'We support instant transfers and contributions across Commercial Bank of Ethiopia (CBE), Telebirr, CBE Birr, Bank of Abyssinia (BOA), Awash Bank, Dashen Bank, M-Pesa, Cooperative Bank of Oromia (COOP), Amhara Bank, and Enat Bank.',
    },
    {
      q: 'Are there any administrator commissions or hidden fees?',
      a: "None. 100% of collected contributions go directly to the cycle winner. There are zero platform deductions or admin cuts from your group's savings pool.",
    },
    {
      q: 'What happens if a member is late on their contribution?',
      a: 'Members receive automated notifications with a 48-hour grace period before overdue status takes effect. Overdue members are temporarily excluded from payout eligibility until all pending obligations are resolved.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 selection:bg-emerald-500 selection:text-white dark:bg-linear-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 dark:text-slate-100">
      <HomeNavbar />

      <main className="relative overflow-hidden">
        {/* Ambient Glow Spheres (Dark Mode Only) */}
        <div className="pointer-events-none absolute top-20 left-1/2 -z-10 h-[450px] w-[800px] -translate-x-1/2 rounded-full bg-linear-to-tr from-emerald-600/20 via-teal-500/15 to-emerald-400/10 opacity-0 blur-[140px] dark:opacity-100" />
        <div className="pointer-events-none absolute top-[600px] left-10 -z-10 h-96 w-96 rounded-full bg-emerald-700/10 opacity-0 blur-[120px] dark:opacity-100" />

        {/* ─── Hero Section ──────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 pt-16 pb-24 text-center sm:px-6 lg:px-8">
          {/* Top Pill Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-emerald-700 uppercase shadow-sm backdrop-blur-md dark:bg-emerald-500/10 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Traditional Ethiopian Savings • Digitally Reimagined</span>
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl leading-[1.15] font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl dark:text-white">
            Transparent, Fair & Automated{' '}
            <span className="bg-linear-to-r from-emerald-600 via-teal-500 to-emerald-700 bg-clip-text text-transparent dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-200">
              Equb for Ethiopia
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
            Manage rotating savings groups with complete transparency. Cryptographic random draws,
            immutable financial ledgers, and automated bank payouts to CBE, Telebirr & more.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-400 hover:to-teal-500 sm:w-auto"
              >
                <span>Start an Equb Account</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>

            <a href="#how-it-works" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="secondary"
                className="w-full rounded-xl border border-slate-200/80 bg-white px-7 py-3.5 text-base font-medium text-slate-800 shadow-sm backdrop-blur-md transition-all hover:bg-slate-100 sm:w-auto dark:border-white/15 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.1]"
              >
                How It Works
              </Button>
            </a>
          </div>

          {/* Interactive Simulation / Preview Card */}
          <div className="mx-auto mt-16 max-w-4xl rounded-3xl border border-white/15 bg-linear-to-b from-white/[0.08] to-white/[0.02] p-6 text-left shadow-2xl backdrop-blur-2xl sm:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Addis Tech Innovators Equb
                    </h3>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      ACTIVE
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Cycle 4 of 12 • Monthly Frequency
                  </p>
                </div>
              </div>

              <div className="sm:text-right">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Current Pool Amount
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  50,000.00 ETB
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/60">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Contribution / Member
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  5,000 ETB
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/60">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Total Members</div>
                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  10 Verified
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/60">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Next Scheduled Draw
                </div>
                <div className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  In 3 Days
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/60">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Draw Security</div>
                <div className="mt-1 flex items-center gap-1 text-lg font-bold text-teal-600 dark:text-teal-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>SHA-256</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-400">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span>Next recipient draw will be automatically deposited to CBE / Telebirr</span>
              </span>
              <span className="hidden font-mono text-[11px] text-emerald-600 sm:inline dark:text-emerald-400">
                Provably Fair Verification ✅
              </span>
            </div>
          </div>
        </section>

        {/* ─── Supported Banks Strip ──────────────────────────────────────── */}
        <section className="border-y border-slate-200 bg-slate-100/70 py-8 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="mb-6 text-center text-xs font-semibold tracking-widest text-slate-500 uppercase dark:text-slate-400">
              Connected with Ethiopia&apos;s Leading Financial Institutions
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
              {institutions.map((bank) => (
                <div
                  key={bank.name}
                  className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-emerald-500/40 hover:text-emerald-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:shadow-none dark:hover:text-emerald-300"
                >
                  <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{bank.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Key Pillars & Capabilities ─────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="text-xs font-semibold tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
              Engineered for Fairness & Security
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Everything you need to run trusted group savings
            </p>
            <p className="mt-3 text-sm text-slate-600 sm:text-base dark:text-slate-300">
              Built from the ground up for financial correctness, eliminating the friction, late
              payments, and disputes of traditional manual Equbs.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-7 shadow-lg shadow-slate-200/60 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/40 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-black/25 dark:hover:bg-white/[0.06]"
                >
                  <div>
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 transition-all group-hover:scale-110 group-hover:bg-emerald-500/20 dark:text-emerald-400">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                        {item.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-300">
                      {item.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── How It Works (4 Steps) ──────────────────────────────────────── */}
        <section
          id="how-it-works"
          className="scroll-mt-16 border-t border-slate-200 bg-slate-100/60 py-24 dark:border-white/10 dark:bg-slate-900/30"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-xs font-semibold tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
                Simple & Seamless
              </h2>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                How Digital Equb Works
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                A modern rotating credit cycle in four straightforward steps.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <div
                  key={s.step}
                  className="relative rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm backdrop-blur-xl transition-all hover:border-emerald-500/40 dark:border-white/10 dark:bg-white/[0.02] dark:shadow-none"
                >
                  <div className="mb-3 font-mono text-3xl font-black text-emerald-600/40 dark:text-emerald-500/40">
                    {s.step}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{s.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Traditional vs Digital Equb Comparison ──────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="text-xs font-semibold tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
              Why Go Digital
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Traditional Equb vs. Digital Equb Platform
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
            {/* Traditional Card */}
            <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-8 shadow-sm backdrop-blur-xl dark:border-red-500/20 dark:bg-red-500/[0.02]">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 font-bold text-rose-600 dark:bg-red-500/10 dark:text-red-400">
                  ✕
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Traditional Manual Equb
                </h3>
              </div>
              <ul className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 font-bold text-rose-500">✕</span>
                  <span>Physical cash handling with high theft and miscounting risk</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 font-bold text-rose-500">✕</span>
                  <span>Opaque manual paper logs with disputed payment records</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 font-bold text-rose-500">✕</span>
                  <span>Subjective draws susceptible to administrator favoritism</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 font-bold text-rose-500">✕</span>
                  <span>Ad-hoc delays with no automatic reminder or grace period system</span>
                </li>
              </ul>
            </div>

            {/* Digital Platform Card */}
            <div className="rounded-3xl border border-emerald-300 bg-emerald-50/70 p-8 shadow-xl shadow-emerald-500/10 backdrop-blur-xl dark:border-emerald-500/40 dark:bg-emerald-500/[0.04]">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 font-bold text-emerald-700 dark:text-emerald-400">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Modern Digital Equb
                </h3>
              </div>
              <ul className="space-y-4 text-sm text-slate-800 dark:text-slate-200">
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Direct electronic payments via Telebirr, CBE Birr & mobile wallets</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Immutable double-entry ledger with transparent audit logs for all</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Provably fair cryptographic server-side draws with verifiable seeds</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Automated 48h grace periods, smart member ratings & payout sweeps</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ─── Frequently Asked Questions ─────────────────────────────────── */}
        <section className="border-t border-slate-200 bg-slate-100/60 py-24 dark:border-white/10 dark:bg-slate-900/30">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 text-center">
              <h2 className="text-xs font-semibold tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
                Got Questions?
              </h2>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                Frequently Asked Questions
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={faq.q}
                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm backdrop-blur-xl transition-all dark:border-white/10 dark:bg-white/[0.02] dark:shadow-none"
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-slate-900 transition-colors hover:text-emerald-600 sm:text-base dark:text-white dark:hover:text-emerald-300"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${
                          isOpen ? 'rotate-180 text-emerald-500' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="border-t border-slate-100 px-5 pt-3 pb-5 text-xs leading-relaxed text-slate-600 sm:text-sm dark:border-white/5 dark:text-slate-300">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── High-Impact Bottom CTA Banner ──────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-linear-to-r from-emerald-600 via-teal-700 to-emerald-800 p-8 text-center text-white shadow-2xl backdrop-blur-2xl sm:p-14 dark:from-emerald-900/60 dark:via-slate-900/80 dark:to-teal-900/60">
            <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />

            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Ready to modernize your Equb?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-emerald-100 sm:text-base dark:text-slate-300">
              Join thousands of Ethiopians managing secure, transparent rotating savings groups with
              automated payouts.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full rounded-xl bg-white px-8 py-3.5 text-base font-bold text-emerald-900 shadow-lg transition-all hover:bg-slate-100 sm:w-auto"
                >
                  Create Free Account
                </Button>
              </Link>
              <a href="#how-it-works" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-base font-medium text-white transition-all hover:bg-white/20 sm:w-auto"
                >
                  Learn More
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-12 text-center text-xs text-slate-500 transition-colors dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-300">
            <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Equb Platform Ethiopia</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#how-it-works"
              className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              How It Works
            </a>
            <Link
              href="/register"
              className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              Register
            </Link>
            <Link
              href="/login"
              className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              Sign In
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium tracking-wider text-slate-400 uppercase dark:text-slate-500">
              Powered by
            </span>
            <div className="inline-flex items-center text-slate-700 dark:text-slate-300">
              <TeferLogo className="h-4 w-auto" />
            </div>
          </div>
          <p>
            © {new Date().getFullYear()} Equb Platform. Built with financial correctness &
            transparency.
          </p>
        </div>
      </footer>
    </div>
  );
}
