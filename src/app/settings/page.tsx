'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { onIdTokenChanged, updatePassword, signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { EqubLoading } from '@/components/ui/EqubLoading';
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
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import type { UserProfile } from '@/lib/domain/types';
import type { SupportedBank } from '@/lib/services/chapaTransferService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DEFAULT_BANKS: SupportedBank[] = [
  { id: 'cbe', name: 'Commercial Bank of Ethiopia (CBE)', code: 'cbe' },
  { id: 'telebirr', name: 'Telebirr', code: 'telebirr' },
  { id: 'cbebirr', name: 'CBE Birr', code: 'cbebirr' },
  { id: 'abyssinia', name: 'Bank of Abyssinia (BOA)', code: 'abyssinia' },
  { id: 'awash', name: 'Awash Bank', code: 'awash' },
  { id: 'dashen', name: 'Dashen Bank', code: 'dashen' },
  { id: 'mpesa', name: 'M-Pesa (Safaricom)', code: 'mpesa' },
  { id: 'coop', name: 'Cooperative Bank of Oromia (COOP)', code: 'coop' },
  { id: 'amhara', name: 'Amhara Bank', code: 'amhara' },
  { id: 'enat', name: 'Enat Bank', code: 'enat' },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  // Profile Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Payout Bank Form States
  const [banks, setBanks] = useState<SupportedBank[]>(DEFAULT_BANKS);
  const [selectedBankCode, setSelectedBankCode] = useState<string | undefined>();
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [payoutSaving, setPayoutSaving] = useState(false);

  // Password Update Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const loadProfile = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/users/profile', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const prof: UserProfile = data.profile;
        setProfile(prof);

        // Split name into first and last
        const parts = (prof.displayName || '').trim().split(' ');
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
        setPhone(prof.phone || '');

        // Payout info
        if (prof.payoutAccount) {
          setSelectedBankCode(prof.payoutAccount.bankCode || 'cbe');
          setAccountNumber(prof.payoutAccount.accountNumber || '');
          setAccountName(prof.payoutAccount.accountName || '');
        } else {
          setAccountName(prof.displayName || '');
        }
      } else {
        toast.error('Failed to load profile details.');
      }
    } catch {
      toast.error('Error connecting to profile service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.href = '/login';
        return;
      }
      const t = await user.getIdToken();
      setToken(t);
      loadProfile(t);

      // Fetch notification count for navbar
      fetch('/api/notifications', { headers: { Authorization: `Bearer ${t}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.unreadCount != null) setNotificationCount(d.unreadCount);
        });
    });

    fetch('/api/banks')
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
      toast.error('First name is required.');
      return;
    }

    setProfileSaving(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
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
        toast.success('Profile updated successfully.');
      } else {
        const errData = await res.json().catch(() => null);
        toast.error(errData?.error ?? 'Failed to update profile.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBankCode || !accountNumber.trim() || !accountName.trim()) {
      toast.error('Please fill in all payout account fields.');
      return;
    }

    setPayoutSaving(true);
    try {
      const selectedBank = banks.find((b) => b.code === selectedBankCode) ?? {
        code: selectedBankCode,
        name: selectedBankCode.toUpperCase(),
      };

      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
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
        toast.success('Payout account details updated successfully.');
      } else {
        const errData = await res.json().catch(() => null);
        toast.error(errData?.error ?? 'Failed to update payout account.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payout update failed.');
    } finally {
      setPayoutSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth.currentUser) {
        throw new Error('No authenticated session found.');
      }
      await updatePassword(auth.currentUser, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Password change failed';
      if (msg.includes('requires-recent-login')) {
        toast.error('For security, please sign out and sign back in before changing password.');
      } else {
        toast.error(msg);
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const isMobileWallet = selectedBankCode
    ? ['telebirr', 'cbebirr', 'mpesa'].includes(selectedBankCode)
    : false;

  const handleUsePhoneForAccount = () => {
    if (phone.trim()) {
      setAccountNumber(phone.trim());
    }
  };

  if (loading) {
    return <EqubLoading />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 transition-colors duration-300 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-0 dark:opacity-100">
        <div className="absolute top-1/4 right-1/3 h-96 w-96 rounded-full bg-emerald-600/10 blur-[140px]" />
        <div className="absolute bottom-1/3 left-1/4 h-72 w-72 rounded-full bg-teal-600/8 blur-[120px]" />
      </div>

      <Navbar
        links={[]}
        userName={profile?.displayName || 'Account'}
        isAdmin={profile?.role === 'ADMIN'}
        searchHref="/search"
        notificationsHref="/notifications"
        notificationCount={notificationCount}
        onSignOut={() => signOut(getFirebaseAuth()).then(() => (window.location.href = '/'))}
      />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Hero Header */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/60 backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-xl dark:shadow-black/25">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                  Account Management
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-300/50 bg-slate-200/70 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-700 uppercase dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                  {profile?.role === 'ADMIN' ? 'Administrator' : 'Member'}
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Account & Payout Settings
              </h1>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                Manage your personal profile, Chapa payout bank accounts, and security preferences.
              </p>
            </div>

            {/* User Trust Rating Badge */}
            {profile && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Star className="h-5 w-5 fill-emerald-500/20 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
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

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Card 1: Personal & Contact Information */}
          <div className="space-y-6 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/60 backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-xl dark:shadow-black/25">
            <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-4 dark:border-white/10">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                <UserCheck className="h-5 w-5" />
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Abebe"
                      required
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900/80"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Last / Father Name
                  </label>
                  <div className="relative">
                    <User className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Bikila"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900/80"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912345678 or +251..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900/80"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 py-2.5 pr-4 pl-10 text-sm text-slate-500 dark:border-white/5 dark:bg-slate-900/40 dark:text-slate-400"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                  Primary authentication email cannot be modified.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  loading={profileSaving}
                  className="cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500"
                >
                  {!profileSaving && <Save className="mr-1.5 h-3.5 w-3.5" />}
                  Save Profile
                </Button>
              </div>
            </form>
          </div>

          {/* Card 2: Payout Destination Bank & Mobile Wallet */}
          <div className="space-y-6 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/60 backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-xl dark:shadow-black/25">
            <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-4 dark:border-white/10">
              <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-2 text-teal-600 dark:text-teal-400">
                <Building2 className="h-5 w-5" />
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
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Payout Destination Bank / Wallet
                </label>
                <div className="relative">
                  <Select value={selectedBankCode} onValueChange={setSelectedBankCode} required>
                    <SelectTrigger className="relative w-full">
                      {!selectedBankCode && <p className="absolute left-3">Select Bank</p>}{' '}
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((bank) => (
                        <SelectItem key={bank.id || bank.code} value={bank.code}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Account / Phone Number
                  </label>
                  {isMobileWallet && phone && accountNumber !== phone && (
                    <button
                      type="button"
                      onClick={handleUsePhoneForAccount}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      <Sparkles className="h-3 w-3" />
                      Use phone number
                    </button>
                  )}
                </div>
                <div className="relative">
                  <CreditCard className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder={isMobileWallet ? '09... or +251...' : '1000...'}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900/80"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Account Holder Full Name
                </label>
                <div className="relative">
                  <User className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Must match bank record"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900/80"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                  Name must match your bank or wallet record for automated transfer approval.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  loading={payoutSaving}
                  className="cursor-pointer rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-teal-500/20 hover:from-teal-400 hover:to-emerald-500"
                >
                  {!payoutSaving && <Building2 className="mr-1.5 h-3.5 w-3.5" />}
                  Update Payout Account
                </Button>
              </div>
            </form>
          </div>

          {/* Card 3: Security & Password */}
          <div className="space-y-6 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/60 backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-xl dark:shadow-black/25">
            <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-4 dark:border-white/10">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                <KeyRound className="h-5 w-5" />
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
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900/80"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900/80"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  loading={passwordSaving}
                  variant="secondary"
                  className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2 text-xs font-bold dark:border-white/10"
                >
                  Change Password
                </Button>
              </div>
            </form>
          </div>

          {/* Card 4: Appearance & Interface Preferences */}
          <div className="space-y-6 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/60 backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-xl dark:shadow-black/25">
            <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-4 dark:border-white/10">
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2 text-sky-600 dark:text-sky-400">
                <Sun className="h-5 w-5" />
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
                onClick={() => setTheme('dark')}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  theme === 'dark'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                    : 'border-slate-200/80 bg-slate-50/50 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <Moon className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                  {theme === 'dark' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Dark Mode</p>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  Sleek emerald glassmorphism
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  theme === 'light'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                    : 'border-slate-200/80 bg-slate-50/50 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <Sun className="h-5 w-5 text-amber-500" />
                  {theme === 'light' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Light Mode</p>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
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
