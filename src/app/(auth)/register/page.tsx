"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createUserWithEmailAndPassword, onIdTokenChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { Building2, CreditCard, Lock, Mail, ShieldCheck, User, UserCheck, Wallet } from "lucide-react";
import type { SupportedBank } from "@/lib/services/chapaTransferService";

const DEFAULT_BANKS: SupportedBank[] = [
  { id: "cbe", name: "Commercial Bank of Ethiopia (CBE)", code: "cbe" },
  { id: "telebirr", name: "Telebirr", code: "telebirr" },
  { id: "cbebirr", name: "CBE Birr", code: "cbebirr" },
  { id: "abyssinia", name: "Bank of Abyssinia (BOA)", code: "abyssinia" },
  { id: "awash", name: "Awash Bank", code: "awash" },
  { id: "dashen", name: "Dashen Bank", code: "dashen" },
  { id: "mpesa", name: "M-Pesa (Safaricom)", code: "mpesa" },
  { id: "coop", name: "Cooperative Bank of Oromia (COOP)", code: "coop" },
  { id: "amhara", name: "Amhara Bank", code: "amhara" },
  { id: "enat", name: "Enat Bank", code: "enat" },
];

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Payout Bank Account Details
  const [banks, setBanks] = useState<SupportedBank[]>(DEFAULT_BANKS);
  const [selectedBankCode, setSelectedBankCode] = useState<string>("cbe");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), (user) => {
      if (user) {
        window.location.href = "/dashboard";
      }
    });

    // Fetch dynamic Chapa supported banks list
    fetch("/api/banks")
      .then((res) => res.json())
      .then((data) => {
        if (data.banks && Array.isArray(data.banks) && data.banks.length > 0) {
          setBanks(data.banks);
          if (!selectedBankCode && data.banks[0]?.code) {
            setSelectedBankCode(data.banks[0].code);
          }
        }
      })
      .catch((err) => {
        console.warn("Failed to load dynamic bank list, using fallback:", err);
      });

    return unsub;
  }, [selectedBankCode]);

  // Auto-fill account name if user hasn't typed a custom one yet
  const handleNameChange = (val: string) => {
    setDisplayName(val);
    if (!accountName || accountName === displayName) {
      setAccountName(val);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedBankCode) {
      setError("Please select your payout bank or mobile money provider.");
      return;
    }
    if (!accountNumber.trim()) {
      setError("Please enter your account number or mobile money number.");
      return;
    }
    if (!accountName.trim()) {
      setError("Please enter your account holder name as registered with the bank.");
      return;
    }

    setLoading(true);
    try {
      const selectedBank = banks.find((b) => b.code === selectedBankCode) ?? {
        code: selectedBankCode,
        name: selectedBankCode.toUpperCase(),
      };

      const cred = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password
      );
      const token = await cred.user.getIdToken();

      const profilePayload = {
        displayName: displayName.trim(),
        payoutAccount: {
          bankCode: selectedBank.code,
          bankName: selectedBank.name,
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
        },
      };

      const res = await fetch("/api/users/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profilePayload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to initialize user profile");
      }

      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-4 py-12">
      {/* Subtle background glow circles */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xl">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20 mb-3">
            <Wallet className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Create your Equb Account</h1>
          <p className="text-slate-400 text-sm mt-1">Join trusted rotating savings groups across Ethiopia</p>
        </div>

        {/* Card Container with Glassmorphism */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl p-8 sm:p-10 text-slate-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                <ShieldCheck className="w-5 h-5 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: Account Credentials */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                <UserCheck className="w-4 h-4" />
                <span>Personal Credentials</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Abebe Bikila"
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-xl border border-white/10 bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full rounded-xl border border-white/10 bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-white/10 my-6" />

            {/* Section 2: Payout & Disbursement Bank Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  <Building2 className="w-4 h-4" />
                  <span>Payout Bank / Wallet Details</span>
                </div>
                <span className="text-[11px] text-slate-400">For winning disbursements</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Payout Destination Bank / Wallet
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedBankCode}
                    onChange={(e) => setSelectedBankCode(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-900/80 pl-10 pr-8 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
                  >
                    {banks.map((bank) => (
                      <option key={bank.id || bank.code} value={bank.code} className="bg-slate-900 text-white">
                        {bank.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Account / Phone Number
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="1000... or 09..."
                      required
                      className="w-full rounded-xl border border-white/10 bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Account Holder Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Must match bank record"
                      required
                      className="w-full rounded-xl border border-white/10 bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                ⚠️ Account name must match your official bank registration to avoid transfer settlement delays.
              </p>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all text-sm mt-4"
            >
              Complete Registration
            </Button>

            <p className="text-center text-xs text-slate-400 pt-2">
              Already have an account?{" "}
              <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
