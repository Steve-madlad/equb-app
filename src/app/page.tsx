"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { HomeNavbar } from "@/components/layout/HomeNavbar";
import {
  ArrowRight,
  Award,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Coins,
  CreditCard,
  FileCheck2,
  History,
  Landmark,
  Lock,
  Percent,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { TeferLogo } from "@/components/svg/TeferLogo";

export default function HomePage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const institutions = [
    { name: "Commercial Bank of Ethiopia", short: "CBE" },
    { name: "Telebirr", short: "Telebirr" },
    { name: "CBE Birr", short: "CBE Birr" },
    { name: "Bank of Abyssinia", short: "BOA" },
    { name: "Awash Bank", short: "Awash" },
    { name: "Dashen Bank", short: "Dashen" },
    { name: "M-Pesa", short: "M-Pesa" },
    { name: "Coop Bank", short: "COOP" },
  ];

  const features = [
    {
      icon: Zap,
      title: "Automated Payouts & Transfers",
      desc: "Disburse pool winnings directly into winners' CBE, Telebirr, or Ethiopian bank accounts with multi-phase settlement verification.",
      badge: "Chapa & QStash",
    },
    {
      icon: Scale,
      title: "Provably Fair Random Draws",
      desc: "Server-side cryptographic winner selection with immutable SHA-256 random seeds. Eliminates favoritism and human bias.",
      badge: "Cryptographic",
    },
    {
      icon: History,
      title: "Immutable Financial Ledger",
      desc: "Every single contribution, late penalty, and payout is permanently written to a double-entry ledger. Zero hidden deductions.",
      badge: "100% Transparent",
    },
    {
      icon: RefreshCw,
      title: "Customizable Cycles & Pools",
      desc: "Set up weekly, monthly, or custom interval groups with configurable member thresholds, pool amounts, and start dates.",
      badge: "Flexible Rules",
    },
    {
      icon: Award,
      title: "Member Reliability Scores",
      desc: "Dynamic trust ratings (0-100) track on-time contributions. Overdue payments impact reputation while compliant savers thrive.",
      badge: "Smart Trust",
    },
    {
      icon: ShieldCheck,
      title: "48-Hour Fair Grace Period",
      desc: "Built-in protection against premature penalties with automated overdue tracking, admin audit logs, and exception handling.",
      badge: "Safe Savings",
    },
  ];

  const steps = [
    {
      step: "01",
      title: "Create or Join an Equb",
      desc: "Browse vetted rotating savings groups or launch your own with custom contribution amounts, frequencies, and member limits.",
    },
    {
      step: "02",
      title: "Contribute with 1-Click",
      desc: "Pay obligations seamlessly via CBE Birr, Telebirr, BOA, or M-Pesa. Webhooks immediately reconcile obligations in real-time.",
    },
    {
      step: "03",
      title: "Verifiable Autonomous Draw",
      desc: "On cycle due dates, the system evaluates member eligibility and executes an atomic, tamper-proof random draw.",
    },
    {
      step: "04",
      title: "Direct Bank Disbursement",
      desc: "The collected pool is transferred straight to the winner's verified Ethiopian bank or mobile wallet without manual delays.",
    },
  ];

  const faqs = [
    {
      q: "What makes digital Equb safer than traditional cash Equb?",
      a: "Digital Equb replaces manual collection notebooks and informal handoffs with an immutable double-entry ledger, cryptographic winner selection, and direct bank transfers. Every member has real-time visibility into group finances, eliminating hidden fees and dispute risks.",
    },
    {
      q: "How does the random payout selection work?",
      a: "Draws are executed server-side using cryptographic seeds within atomic database transactions. Only active members who have paid all cycle obligations and have not yet won are eligible. The selection seed and audit log are permanently recorded.",
    },
    {
      q: "Which Ethiopian banks and mobile wallets are supported?",
      a: "We support instant transfers and contributions across Commercial Bank of Ethiopia (CBE), Telebirr, CBE Birr, Bank of Abyssinia (BOA), Awash Bank, Dashen Bank, M-Pesa, Cooperative Bank of Oromia (COOP), Amhara Bank, and Enat Bank.",
    },
    {
      q: "Are there any administrator commissions or hidden fees?",
      a: "None. 100% of collected contributions go directly to the cycle winner. There are zero platform deductions or admin cuts from your group's savings pool.",
    },
    {
      q: "What happens if a member is late on their contribution?",
      a: "Members receive automated notifications with a 48-hour grace period before overdue status takes effect. Overdue members are temporarily excluded from payout eligibility until all pending obligations are resolved.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-white transition-colors duration-300">
      <HomeNavbar />

      <main className="relative overflow-hidden">
        {/* Ambient Glow Spheres (Dark Mode Only) */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-emerald-600/20 via-teal-500/15 to-emerald-400/10 rounded-full blur-[140px] pointer-events-none -z-10 opacity-0 dark:opacity-100" />
        <div className="absolute top-[600px] left-10 w-96 h-96 bg-emerald-700/10 rounded-full blur-[120px] pointer-events-none -z-10 opacity-0 dark:opacity-100" />

        {/* ─── Hero Section ──────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24 text-center">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/10 backdrop-blur-md text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-8 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Traditional Ethiopian Savings • Digitally Reimagined</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-[1.15]">
            Transparent, Fair & Automated{" "}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-200 bg-clip-text text-transparent">
              Equb for Ethiopia
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Manage rotating savings groups with complete transparency. Cryptographic random draws, immutable financial ledgers, and automated bank payouts to CBE, Telebirr & more.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all text-base flex items-center justify-center gap-2 group"
              >
                <span>Start an Equb Account</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <a href="#how-it-works" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-slate-200/80 dark:border-white/15 bg-white dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 shadow-sm backdrop-blur-md font-medium text-base transition-all"
              >
                How It Works
              </Button>
            </a>
          </div>

          {/* Interactive Simulation / Preview Card */}
                    <div className="mt-16 mx-auto max-w-4xl rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl p-6 sm:p-8 shadow-2xl text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Addis Tech Innovators Equb</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Cycle 4 of 12 • Monthly Frequency</p>
                </div>
              </div>

              <div className="sm:text-right">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Current Pool Amount</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">50,000.00 ETB</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
              <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 p-4">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Contribution / Member</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">5,000 ETB</div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 p-4">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Total Members</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">10 Verified</div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 p-4">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Next Scheduled Draw</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">In 3 Days</div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 p-4">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Draw Security</div>
                <div className="text-lg font-bold text-teal-600 dark:text-teal-300 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>SHA-256</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 rounded-xl px-4 py-2.5">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Next recipient draw will be automatically deposited to CBE / Telebirr</span>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] hidden sm:inline">Provably Fair Verification ✅</span>
            </div>
          </div>
        </section>

        {/* ─── Supported Banks Strip ──────────────────────────────────────── */}
        <section className="border-y border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-slate-900/40 backdrop-blur-md py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6">
              Connected with Ethiopia&apos;s Leading Financial Institutions
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
              {institutions.map((bank) => (
                <div
                  key={bank.name}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.04] text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm dark:shadow-none hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{bank.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Key Pillars & Capabilities ─────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              Engineered for Fairness & Security
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 tracking-tight">
              Everything you need to run trusted group savings
            </p>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-3">
              Built from the ground up for financial correctness, eliminating the friction, late payments, and disputes of traditional manual Equbs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group relative rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.03] hover:border-emerald-500/40 dark:hover:bg-white/[0.06] backdrop-blur-xl p-7 transition-all duration-300 shadow-lg shadow-slate-200/60 dark:shadow-black/25  flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 uppercase">
                        {item.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 text-sm mt-2.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── How It Works (4 Steps) ──────────────────────────────────────── */}
        <section id="how-it-works" className="border-t border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-slate-900/30 py-24 scroll-mt-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                Simple & Seamless
              </h2>
              <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 tracking-tight">
                How Digital Equb Works
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                A modern rotating credit cycle in four straightforward steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((s) => (
                <div
                  key={s.step}
                  className="relative rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6 backdrop-blur-xl hover:border-emerald-500/40 shadow-sm dark:shadow-none transition-all"
                >
                  <div className="text-3xl font-black text-emerald-600/40 dark:text-emerald-500/40 mb-3 font-mono">
                    {s.step}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{s.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Traditional vs Digital Equb Comparison ──────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              Why Go Digital
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 tracking-tight">
              Traditional Equb vs. Digital Equb Platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Traditional Card */}
            <div className="rounded-3xl border border-rose-200 dark:border-red-500/20 bg-rose-50/60 dark:bg-red-500/[0.02] backdrop-blur-xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-red-500/10 text-rose-600 dark:text-red-400 flex items-center justify-center font-bold">
                  ✕
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Traditional Manual Equb</h3>
              </div>
              <ul className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold mt-0.5">✕</span>
                  <span>Physical cash handling with high theft and miscounting risk</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold mt-0.5">✕</span>
                  <span>Opaque manual paper logs with disputed payment records</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold mt-0.5">✕</span>
                  <span>Subjective draws susceptible to administrator favoritism</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold mt-0.5">✕</span>
                  <span>Ad-hoc delays with no automatic reminder or grace period system</span>
                </li>
              </ul>
            </div>

            {/* Digital Platform Card */}
            <div className="rounded-3xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-500/[0.04] backdrop-blur-xl p-8 shadow-xl shadow-emerald-500/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Modern Digital Equb</h3>
              </div>
              <ul className="space-y-4 text-sm text-slate-800 dark:text-slate-200">
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Direct electronic payments via Telebirr, CBE Birr & mobile wallets</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Immutable double-entry ledger with transparent audit logs for all</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Provably fair cryptographic server-side draws with verifiable seeds</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Automated 48h grace periods, smart member ratings & payout sweeps</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ─── Frequently Asked Questions ─────────────────────────────────── */}
        <section className="border-t border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-slate-900/30 py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                Got Questions?
              </h2>
              <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 tracking-tight">
                Frequently Asked Questions
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={faq.q}
                    className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-xl shadow-sm dark:shadow-none overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full flex items-center justify-between p-5 text-left text-sm sm:text-base font-semibold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-emerald-500" : ""
                          }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-white/5 pt-3">
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
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="relative rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 dark:from-emerald-900/60 dark:via-slate-900/80 dark:to-teal-900/60 backdrop-blur-2xl p-8 sm:p-14 text-center overflow-hidden shadow-2xl text-white">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />

            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Ready to modernize your Equb?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-emerald-100 dark:text-slate-300">
              Join thousands of Ethiopians managing secure, transparent rotating savings groups with automated payouts.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-emerald-900 font-bold shadow-lg transition-all text-base"
                >
                  Create Free Account
                </Button>
              </Link>
              <a href="#how-it-works" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white font-medium text-base transition-all"
                >
                  Learn More
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/80 py-12 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-300 font-bold">
            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Equb Platform Ethiopia</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              How It Works
            </a>
            <Link href="/register" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Register
            </Link>
            <Link href="/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Sign In
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Powered by</span>
            <div className="inline-flex items-center text-slate-700 dark:text-slate-300">
              <TeferLogo className="h-4 w-auto" />
            </div>
          </div>
          <p>© {new Date().getFullYear()} Equb Platform. Built with financial correctness & transparency.</p>
        </div>
      </footer>
    </div>
  );
}
