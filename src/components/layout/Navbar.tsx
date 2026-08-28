'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/Input';
import { getBrowserTestDate, getTodayIsoDate, setBrowserTestDate } from '@/lib/testClock';
import { cn } from '@/lib/utils';
import {
  Bell,
  CalendarRange,
  FileClock,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
  Wallet,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ComponentType, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface NavLink {
  href: string;
  label: string;
  icon?: ComponentType;
}

interface NavbarProps {
  links: NavLink[];
  userName?: string;
  isAdmin?: boolean;
  searchHref?: string;
  searchLabel?: string;
  notificationsHref?: string;
  notificationCount?: number;
  onSignOut?: () => void;
}

function getInitials(name?: string) {
  if (!name) return 'U';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-500 hover:border-emerald-500/40 hover:text-emerald-500 dark:text-slate-400"
        aria-label="Toggle theme"
      >
        <span className="h-4 w-4 rounded-full" />
      </button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="cursor flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/60 bg-slate-50 text-slate-500 transition-all duration-200 hover:border-emerald-500/40! hover:bg-white/10 hover:text-emerald-400 hover:text-emerald-500! dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function TestDateDialog() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(getTodayIsoDate());
  const [activeDate, setActiveDate] = useState<string | null>(null);

  useEffect(() => {
    const current = getBrowserTestDate();
    setActiveDate(current);
    setValue(current ?? getTodayIsoDate());
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-9 w-9 rounded-xl border border-slate-200/60 bg-slate-50 text-slate-500 transition-all hover:border-emerald-500/40! hover:bg-white/10! hover:text-emerald-500! dark:border-white/15 dark:bg-white/5 dark:text-slate-400"
          aria-label="Set test date"
          title={activeDate ? `Test date: ${activeDate}` : 'Set test date'}
        >
          <CalendarRange className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Test date</DialogTitle>
          <DialogDescription>
            Temporarily make the app behave as if today is the date you choose.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">Date</label>
          <Input type="date" value={value} onChange={(event) => setValue(event.target.value)} />
          <p className="text-muted-foreground text-xs">
            Current override: {activeDate ?? 'Using the real date'}
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setBrowserTestDate(null);
              setActiveDate(null);
              setValue(getTodayIsoDate());
              setOpen(false);
              toast.success('Test date cleared');
              window.location.reload();
            }}
          >
            Clear
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!value) {
                toast.error('Pick a date first');
                return;
              }
              setBrowserTestDate(value);
              setActiveDate(value);
              setOpen(false);
              toast.success(`Test date set to ${value}`);
              window.location.reload();
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Navbar({
  links,
  userName,
  isAdmin = false,
  searchHref,
  searchLabel = 'Search Equbs',
  notificationsHref = '/notifications',
  notificationCount,
  onSignOut,
}: NavbarProps) {
  const pathname = usePathname();
  const authenticated = Boolean(userName);
  const showDashboard = authenticated && pathname !== '/';
  const showAuditLogs = authenticated && isAdmin;

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/60 border-white/10 bg-white/85 shadow-sm shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo + Nav Links */}
        <div className="flex min-w-0 items-center gap-5">
          <Link
            href="/"
            className="mr-2 flex shrink-0 items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-sm">
              <Wallet className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Equb</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {authenticated && (
              <Link
                href="/dashboard"
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200',
                  pathname === '/dashboard'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-600 hover:bg-white/10 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white',
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            )}
            {showAuditLogs && (
              <Link
                href="/admin/audit"
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200',
                  pathname === '/admin/audit'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-600 hover:bg-white/10 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white',
                )}
              >
                <FileClock className="h-4 w-4" />
                Audit Logs
              </Link>
            )}
            {authenticated && !isAdmin && (
              <Link
                href="/financial-activities"
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200',
                  pathname === '/financial-activities'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-600 hover:bg-white/10 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white',
                )}
              >
                <WalletCards className="h-4 w-4" />
                Finances
              </Link>
            )}
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200',
                  pathname === link.href || pathname.startsWith(link.href + '/')
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-600 hover:bg-white/10 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white',
                )}
              >
                {link.label}
                {link.icon && <link.icon />}
              </Link>
            ))}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Dev only: test date */}
          {authenticated && process.env.NODE_ENV !== 'production' && <TestDateDialog />}

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Search */}
          {authenticated && searchHref && (
            <Link
              href={searchHref}
              className="hidden max-w-[min(14rem,40vw)] items-center gap-2 rounded-xl border border-slate-200/60 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-500 transition-all hover:border-emerald-500/40 hover:text-emerald-600 sm:inline-flex dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-emerald-400"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">{searchLabel}</span>
            </Link>
          )}

          {/* Notifications bell */}
          {authenticated && notificationsHref && (
            <Link
              href={notificationsHref}
              aria-label="Notifications"
              title="Notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/60 bg-slate-50 text-slate-500 transition-all hover:border-emerald-500/40! hover:bg-white/10! hover:text-emerald-500! dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
            >
              <Bell className="h-4 w-4" />
              {typeof notificationCount === 'number' && notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-1 text-[10px] leading-none font-bold text-white shadow-sm">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </Link>
          )}

          {/* User profile dropdown */}
          {authenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Profile menu"
                title={userName}
                className="rounded-full ring-2 ring-transparent transition-all duration-200 hover:ring-emerald-500/30 focus:outline-hidden"
              >
                <Avatar className="size-9 border border-emerald-500/20 shadow-sm">
                  <AvatarFallback className="bg-gradient-to-tr from-emerald-600 to-teal-500 text-sm font-bold tracking-wider text-white">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-50 translate-y-2.75 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 dark:shadow-black/10"
              >
                <DropdownMenuLabel className="p-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0 border border-emerald-500/20">
                      <AvatarFallback className="bg-gradient-to-tr from-emerald-600 to-teal-500 text-xs font-bold text-white">
                        {getInitials(userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                        {userName}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className={cn(
                            'py-0.2 inline-flex items-center rounded-md px-1.5 text-[10px] font-bold tracking-wider uppercase',
                            isAdmin
                              ? 'border border-amber-500/20 bg-amber-500/15 text-amber-700 dark:text-amber-400'
                              : 'border border-emerald-500/20 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                          )}
                        >
                          {isAdmin ? 'Admin' : 'Member'}
                        </span>
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1.5 border-t border-slate-200/80 dark:border-white/10" />
                {showDashboard && (
                  <DropdownMenuItem
                    onClick={() => {
                      window.location.href = '/dashboard';
                    }}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-emerald-500/10 hover:text-emerald-600 focus:bg-emerald-500/10 focus:text-emerald-600 dark:text-slate-200 dark:hover:text-emerald-400 dark:focus:text-emerald-400"
                  >
                    <LayoutDashboard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    window.location.href = '/notifications';
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-emerald-500/10 hover:text-emerald-600 focus:bg-emerald-500/10 focus:text-emerald-600 dark:text-slate-200 dark:hover:text-emerald-400 dark:focus:text-emerald-400"
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Notifications
                  </div>
                  {typeof notificationCount === 'number' && notificationCount > 0 && (
                    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                      {notificationCount}
                    </span>
                  )}
                </DropdownMenuItem>
                {authenticated && !isAdmin && (
                  <DropdownMenuItem
                    onClick={() => {
                      window.location.href = '/financial-activities';
                    }}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-emerald-500/10 hover:text-emerald-600 focus:bg-emerald-500/10 focus:text-emerald-600 dark:text-slate-200 dark:hover:text-emerald-400 dark:focus:text-emerald-400"
                  >
                    <WalletCards className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Finances
                  </DropdownMenuItem>
                )}
                {showAuditLogs && (
                  <DropdownMenuItem
                    onClick={() => {
                      window.location.href = '/admin/audit';
                    }}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-emerald-500/10 hover:text-emerald-600 focus:bg-emerald-500/10 focus:text-emerald-600 dark:text-slate-200 dark:hover:text-emerald-400 dark:focus:text-emerald-400"
                  >
                    <FileClock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Audit Logs
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    window.location.href = '/settings';
                  }}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-emerald-500/10 hover:text-emerald-600 focus:bg-emerald-500/10 focus:text-emerald-600 dark:text-slate-200 dark:hover:text-emerald-400 dark:focus:text-emerald-400"
                >
                  <Settings className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Settings
                </DropdownMenuItem>
                {onSignOut && (
                  <>
                    <DropdownMenuSeparator className="my-1.5 border-t border-slate-200/80 dark:border-white/10" />
                    <DropdownMenuItem
                      onClick={onSignOut}
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 focus:bg-rose-50 focus:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:focus:bg-rose-500/10 dark:focus:text-rose-400"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Unauthenticated CTAs */}
          {!authenticated && (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-teal-500"
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
