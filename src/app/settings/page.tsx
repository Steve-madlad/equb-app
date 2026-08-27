"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { onIdTokenChanged, updatePassword, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { EqubLoading } from "@/components/ui/EqubLoading";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  KeyRound,
  Lock,
  Mail,
  Moon,
  Phone,
  Save,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  User,
  UserCheck,
  Wallet,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import type { UserProfile } from "@/lib/domain/types";
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

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  // Profile Form States
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Payout Bank Form States
  const [banks, setBanks] = useState<SupportedBank[]>(DEFAULT_BANKS);
  const [selectedBankCode, setSelectedBankCode] = useState("cbe");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [payoutSaving, setPayoutSaving] = useState(false);

  // Password Update Form States
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const loadProfile = useCallback(async (authToken: string) => {
    try {
      const res = await fetch("/api/users/profile", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const prof: UserProfile = data.profile;
        setProfile(prof);

        // Split name into first and last
        const parts = (prof.displayName || "").trim().split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
        setPhone(prof.phone || "");

        // Payout info
        if (prof.payoutAccount) {
          setSelectedBankCode(prof.payoutAccount.bankCode || "cbe");
          setAccountNumber(prof.payoutAccount.accountNumber || "");
          setAccountName(prof.payoutAccount.accountName || "");
        } else {
          setAccountName(prof.displayName || "");
        }
      } else {
        toast.error("Failed to load profile details.");
      }
    } catch {
      toast.error("Error connecting to profile service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }
      const t = await user.getIdToken();
      setToken(t);
      loadProfile(t);

      // Fetch notification count for navbar
      fetch("/api/notifications", { headers: { Authorization: `Bearer ${t}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.unreadCount != null) setNotificationCount(d.unreadCount);
        });
    });

    fetch("/api/banks")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.banks && Array.isArray(data.banks) && data.banks.length > 0) {
          setBanks(data.banks);
        }
      })
      .catch(() => undefined);

    return unsub;
  }, [loadProfile]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.error("First name is required.");
      return;
    }

    setProfileSaving(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: fullName,
          phone: phone.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        toast.success("Profile updated successfully.");
      } else {
        const errData = await res.json().catch(() => null);
        toast.error(errData?.error ?? "Failed to update profile.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBankCode || !accountNumber.trim() || !accountName.trim()) {
      toast.error("Please fill in all payout account fields.");
      return;
    }

    setPayoutSaving(true);
    try {
      const selectedBank = banks.find((b) => b.code === selectedBankCode) ?? {
        code: selectedBankCode,
        name: selectedBankCode.toUpperCase(),
      };

      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payoutAccount: {
            bankCode: selectedBank.code,
            bankName: selectedBank.name,
            accountNumber: accountNumber.trim(),
            accountName: accountName.trim(),
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        toast.success("Payout account details updated successfully.");
      } else {
        const errData = await res.json().catch(() => null);
        toast.error(errData?.error ?? "Failed to update payout account.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payout update failed.");
    } finally {
      setPayoutSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth.currentUser) {
        throw new Error("No authenticated session found.");
      }
      await updatePassword(auth.currentUser, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Password change failed";
      if (msg.includes("requires-recent-login")) {
        toast.error("For security, please sign out and sign back in before changing password.");
      } else {
        toast.error(msg);
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const isMobileWallet = ["telebirr", "cbebirr", "mpesa"].includes(selectedBankCode);

  const handleUsePhoneForAccount = () => {
    if (phone.trim()) {
      setAccountNumber(phone.trim());
    }
  };

  if (loading) {
    return (
      <EqubLoading />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 transition-colors duration-300">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10 opacity-0 dark:opacity-100">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-teal-600/8 rounded-full blur-[120px]" />
      </div>

      <Navbar
        links={[]}
        userName={profile?.displayName || "Account"}
        isAdmin={profile?.role === "ADMIN"}
        searchHref="/search"
        notificationsHref="/notifications"
        notificationCount={notificationCount}
        onSignOut={() =>
          signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))
        }
      />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Hero Header */}
        <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8 shadow-md shadow-slate-200/60 dark:shadow-black/25 dark:shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Account Management
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-300/50 dark:border-white/10">
                  {profile?.role === "ADMIN" ? "Administrator" : "Member"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Account & Payout Settings
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Manage your personal profile, Chapa payout bank accounts, and security preferences.
              </p>
            </div>

            {/* User Trust Rating Badge */}
            {profile && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Star className="w-5 h-5 fill-emerald-500/20 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Trust Rating
                  </p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">
                    {profile.rating} / 100
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: Personal & Contact Information */}
          <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 shadow-md shadow-slate-200/60 dark:shadow-black/25 dark:shadow-xl space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200/80 dark:border-white/10">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Personal Information
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your identity details for Equb participation and receipts
                </p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Abebe"
                      required
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Last / Father Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Bikila"
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912345678 or +251..."
                    className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-900/40 pl-10 pr-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Primary authentication email cannot be modified.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  loading={profileSaving}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold px-5 py-2 text-xs shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  {!profileSaving && <Save className="w-3.5 h-3.5 mr-1.5" />}
                  Save Profile
                </Button>
              </div>
            </form>
          </div>

          {/* Card 2: Payout Destination Bank & Mobile Wallet */}
          <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 shadow-md shadow-slate-200/60 dark:shadow-black/25 dark:shadow-xl space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200/80 dark:border-white/10">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Payout Bank / Mobile Money
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Where winning round payouts will be disbursed via Chapa
                </p>
              </div>
            </div>

            <form onSubmit={handlePayoutSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                      <option
                        key={bank.id || bank.code}
                        value={bank.code}
                        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        {bank.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Account / Phone Number
                  </label>
                  {isMobileWallet && phone && accountNumber !== phone && (
                    <button
                      type="button"
                      onClick={handleUsePhoneForAccount}
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      <Sparkles className="w-3 h-3" />
                      Use phone number
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                    className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Name must match your bank or wallet record for automated transfer approval.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  loading={payoutSaving}
                  className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold px-5 py-2 text-xs shadow-md shadow-teal-500/20 cursor-pointer"
                >
                  {!payoutSaving && <Building2 className="w-3.5 h-3.5 mr-1.5" />}
                  Update Payout Account
                </Button>
              </div>
            </form>
          </div>

          {/* Card 3: Security & Password */}
          <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 shadow-md shadow-slate-200/60 dark:shadow-black/25 dark:shadow-xl space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200/80 dark:border-white/10">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Security & Password
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update your authentication credentials
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  loading={passwordSaving}
                  variant="secondary"
                  className="rounded-xl font-bold px-5 py-2 text-xs cursor-pointer border border-slate-200 dark:border-white/10"
                >
                  Change Password
                </Button>
              </div>
            </form>
          </div>

          {/* Card 4: Appearance & Interface Preferences */}
          <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 shadow-md shadow-slate-200/60 dark:shadow-black/25 dark:shadow-xl space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200/80 dark:border-white/10">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Appearance & Theme
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select your preferred interface color theme
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  theme === "dark"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                    : "border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  {theme === "dark" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Dark Mode
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Sleek emerald glassmorphism
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  theme === "light"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                    : "border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Sun className="w-5 h-5 text-amber-500" />
                  {theme === "light" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Light Mode
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Clean high-contrast cards
                </p>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
