'use client';

import { TeferLogo } from '@/components/svg/TeferLogo';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getFirebaseAuth } from '@/lib/firebase/client';
import type { SupportedBank } from '@/lib/services/chapaTransferService';
import { createUserWithEmailAndPassword, onIdTokenChanged } from 'firebase/auth';
import {
  Building2,
  CreditCard,
  Lock,
  Mail,
  Moon,
  Phone,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useEffect, useState } from 'react';

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

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Payout Bank Account Details
  const [banks, setBanks] = useState<SupportedBank[]>(DEFAULT_BANKS);
  const [selectedBankCode, setSelectedBankCode] = useState<string>('cbe');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNameManuallyEdited, setAccountNameManuallyEdited] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), (user) => {
      if (user) {
        window.location.href = '/dashboard';
      }
    });

    fetch('/api/banks')
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
        console.warn('Failed to load dynamic bank list, using fallback:', err);
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

  const isMobileWallet = ['telebirr', 'cbebirr', 'mpesa'].includes(selectedBankCode);

  const handleUsePhoneForAccount = () => {
    if (phone.trim()) {
      setAccountNumber(phone.trim());
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter both your first and last name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter a valid phone number for transaction processing.');
      return;
    }
    if (!selectedBankCode) {
      setError('Please select your payout bank or mobile money provider.');
      return;
    }
    if (!accountNumber.trim()) {
      setError('Please enter your account number or mobile money number.');
      return;
    }
    if (!accountName.trim()) {
      setError('Please enter your account holder name as registered with the bank.');
      return;
    }

    setLoading(true);
    try {
      const selectedBank = banks.find((b) => b.code === selectedBankCode) ?? {
        code: selectedBankCode,
        name: selectedBankCode.toUpperCase(),
      };

      const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
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

      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profilePayload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Failed to initialize user profile');
      }

      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-slate-50 px-4 py-12 transition-colors duration-300 dark:bg-linear-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
      {/* Top Bar with Logo link & Theme Toggle */}
      <div className="absolute top-6 right-6 left-6 z-10 mx-auto flex max-w-5xl items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-tr from-emerald-600 to-teal-500 text-white">
            <Wallet className="h-3.5 w-3.5" />
          </span>
          <span>Equb</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Subtle background glow circles bounded within overflow-hidden container */}
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600/15 opacity-0 blur-3xl dark:opacity-100" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-teal-600/15 opacity-0 blur-3xl dark:opacity-100" />
      </div>

      <div className="relative z-10 my-auto mt-6 w-full max-w-xl">
        {/* Header Branding */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Create your Equb Account
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Join trusted rotating savings groups with instant Chapa payments
          </p>
        </div>

        {/* Card Container */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-slate-900 shadow-xl backdrop-blur-xl transition-all sm:p-10 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
                <ShieldCheck className="h-5 w-5 flex-shrink-0 text-red-500 dark:text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: Account Credentials */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                <UserCheck className="h-4 w-4" />
                <span>Personal & Contact Information</span>
              </div>

              {/* First Name & Last Name (Required by Chapa) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        updateNames(e.target.value, lastName);
                      }}
                      placeholder="e.g. Abebe"
                      required
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900/80"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Last / Father Name
                  </label>
                  <div className="relative">
                    <User className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        updateNames(firstName, e.target.value);
                      }}
                      placeholder="e.g. Bikila"
                      required
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900/80"
                    />
                  </div>
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912345678 or +251..."
                      required
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900/80"
                    />
                  </div>
                </div>

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
                    minLength={6}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900/80"
                  />
                </div>
              </div>
            </div>

            <div className="my-6 h-px bg-slate-200 dark:bg-white/10" />

            {/* Section 2: Payout & Disbursement Bank Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                  <Building2 className="h-4 w-4" />
                  <span>Payout Bank / Wallet Details</span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  For winning payouts via Chapa
                </span>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Payout Destination Bank / Wallet
                </label>
                <div className="relative">
                  <Select value={selectedBankCode} onValueChange={setSelectedBankCode} required>
                    <SelectTrigger className="relative w-full">
                      {!selectedBankCode && <p className="absolute left-3">Select Bank</p>}
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Select Bank</SelectLabel>
                        {banks.map((bank) => (
                          <SelectItem key={bank.id || bank.code} value={bank.code}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Account / Phone Number
                    </label>
                    {isMobileWallet && phone && accountNumber !== phone && (
                      <button
                        type="button"
                        onClick={handleUsePhoneForAccount}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        <Sparkles className="h-3 w-3" />
                        Use phone
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
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Account Holder Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => {
                        setAccountName(e.target.value);
                        setAccountNameManuallyEdited(true);
                      }}
                      placeholder="Must match bank record"
                      required
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900/80"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ⚠️ Payout transfers use Chapa direct settlement. Ensure your account name and number
                match your bank or mobile money account.
              </p>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="mt-4 w-full cursor-pointer rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-400 hover:to-teal-500"
            >
              Complete Registration
            </Button>

            <p className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
              >
                Sign in
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
