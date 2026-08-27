"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createUserWithEmailAndPassword, onIdTokenChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import {
  Building2,
  CreditCard,
  Lock,
  Mail,
  Moon,
  Phone,
  ShieldCheck,
  Sun,
  User,
  UserCheck,
  Wallet,
  Sparkles,
} from "lucide-react";
import { useTheme } from "next-themes";
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

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="h-9 w-9 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-sm"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Payout Bank Account Details
  const [banks, setBanks] = useState<SupportedBank[]>(DEFAULT_BANKS);
  const [selectedBankCode, setSelectedBankCode] = useState<string>("cbe");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNameManuallyEdited, setAccountNameManuallyEdited] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), (user) => {
      if (user) {
        window.location.href = "/dashboard";
      }
    });

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

  // Keep Account Holder Name in sync with first + last name unless user modified it manually
  const updateNames = (first: string, last: string) => {
    const full = `${first.trim()} ${last.trim()}`.trim();
    if (!accountNameManuallyEdited) {
      setAccountName(full);
    }
  };

  const isMobileWallet = ["telebirr", "cbebirr", "mpesa"].includes(selectedBankCode);

  const handleUsePhoneForAccount = () => {
    if (phone.trim()) {
      setAccountNumber(phone.trim());
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter both your first and last name.");
      return;
    }
    if (!phone.trim()) {
      setError("Please enter a valid phone number for transaction processing.");
      return;
    }
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
        email.trim(),
        password
      );
      const token = await cred.user.getIdToken();

      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const profilePayload = {
        displayName: fullName,
        phone: phone.trim(),
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
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 px-4 py-12 transition-colors duration-300">
      {/* Top Bar with Logo link & Theme Toggle */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between max-w-5xl mx-auto">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white"
        >
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white">
            <Wallet className="w-3.5 h-3.5" />
          </span>
          <span>Equb</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Subtle background glow circles (dark mode only) */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none opacity-0 dark:opacity-100" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl pointer-events-none opacity-0 dark:opacity-100" />

      <div className="relative w-full max-w-xl mt-6">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20 mb-3">
            <Wallet className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Create your Equb Account
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Join trusted rotating savings groups with instant Chapa payments
          </p>
        </div>

        {/* Card Container */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.04] backdrop-blur-xl shadow-xl dark:shadow-2xl p-8 sm:p-10 text-slate-900 dark:text-slate-100 transition-all">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
                <ShieldCheck className="w-5 h-5 flex-shrink-0 text-red-500 dark:text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: Account Credentials */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                <UserCheck className="w-4 h-4" />
                <span>Personal & Contact Information</span>
              </div>

              {/* First Name & Last Name (Required by Chapa) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        updateNames(e.target.value, lastName);
                      }}
                      placeholder="e.g. Abebe"
                      required
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Last / Father Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        updateNames(firstName, e.target.value);
                      }}
                      placeholder="e.g. Bikila"
                      required
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912345678 or +251..."
                      required
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-200 dark:bg-white/10 my-6" />

            {/* Section 2: Payout & Disbursement Bank Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  <Building2 className="w-4 h-4" />
                  <span>Payout Bank / Wallet Details</span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">For winning payouts via Chapa</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Payout Destination Bank / Wallet
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedBankCode}
                    onChange={(e) => setSelectedBankCode(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/80 pl-10 pr-8 py-2.5 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
                  >
                    {banks.map((bank) => (
                      <option key={bank.id || bank.code} value={bank.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Account / Phone Number
                    </label>
                    {isMobileWallet && phone && accountNumber !== phone && (
                      <button
                        type="button"
                        onClick={handleUsePhoneForAccount}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        <Sparkles className="w-3 h-3" />
                        Use phone
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder={isMobileWallet ? "09... or +251..." : "1000..."}
                      required
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Account Holder Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => {
                        setAccountName(e.target.value);
                        setAccountNameManuallyEdited(true);
                      }}
                      placeholder="Must match bank record"
                      required
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ⚠️ Payout transfers use Chapa direct settlement. Ensure your account name and number match your bank or mobile money account.
              </p>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all text-sm mt-4 cursor-pointer"
            >
              Complete Registration
            </Button>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
              Already have an account?{" "}
              <Link href="/login" className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
