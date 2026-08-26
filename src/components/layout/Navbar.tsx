"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/Input";
import {
  getBrowserTestDate,
  getTodayIsoDate,
  setBrowserTestDate,
} from "@/lib/testClock";
import { cn } from "@/lib/utils";
import {
  Bell,
  CalendarRange,
  FileClock,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  Sun,
  Wallet,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ComponentType, useEffect, useState } from "react";
import { toast } from "sonner";

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
  if (!name) return "U";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="h-9 w-9 rounded-xl border border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:border-emerald-500/40 hover:text-emerald-500" aria-label="Toggle theme">
        <span className="w-4 h-4 rounded-full" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="h-9 w-9 cursor rounded-xl border border-slate-200/60 dark:border-white/10 border-slate-200/60 bg-slate-50 dark:bg-white/5 hover:border-emerald-500/40! hover:text-emerald-500! hover:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-400 transition-all duration-200"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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
          className="h-9 w-9 rounded-xl border border-slate-200/60 bg-slate-50 dark:border-white/15 dark:bg-white/5 hover:bg-white/10! text-slate-500 dark:text-slate-400 hover:border-emerald-500/40! hover:text-emerald-500! transition-all"
          aria-label="Set test date"
          title={activeDate ? `Test date: ${activeDate}` : "Set test date"}
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
          <Input
            type="date"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Current override: {activeDate ?? "Using the real date"}
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
              toast.success("Test date cleared");
              window.location.reload();
            }}
          >
            Clear
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!value) {
                toast.error("Pick a date first");
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
  searchLabel = "Search Equbs",
  notificationsHref = "/notifications",
  notificationCount,
  onSignOut,
}: NavbarProps) {
  const pathname = usePathname();
  const authenticated = Boolean(userName);
  const showDashboard = authenticated && pathname !== "/";
  const showAuditLogs = authenticated && isAdmin;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 dark:border-white/10 border-slate-200/60 bg-white/85 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm shadow-black/5">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo + Nav Links */}
        <div className="flex min-w-0 items-center gap-5">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white tracking-tight mr-2 shrink-0"
          >
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-sm">
              <Wallet className="w-4 h-4" />
            </span>
            <span className="hidden sm:inline">Equb</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {authenticated && (
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200",
                  pathname === "/dashboard"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            )}
            {showAuditLogs && (
              <Link
                href="/admin/audit"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200",
                  pathname === "/admin/audit"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <FileClock className="w-4 h-4" />
                Audit Logs
              </Link>
            )}
            {authenticated && !isAdmin && (
              <Link
                href="/financial-activities"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200",
                  pathname === "/financial-activities"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <WalletCards className="w-4 h-4" />
                Finances
              </Link>
            )}
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200",
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
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
          {authenticated && process.env.NODE_ENV !== "production" && (
            <TestDateDialog />
          )}

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Search */}
          {authenticated && searchHref && (
            <Link
              href={searchHref}
              className="hidden sm:inline-flex max-w-[min(14rem,40vw)] items-center gap-2 rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3.5 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 transition-all hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400"
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
              className="relative hover:bg-white/10! inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:border-emerald-500/40! hover:text-emerald-500! transition-all"
            >
              <Bell className="h-4 w-4" />
              {typeof notificationCount === "number" && notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                  {notificationCount > 99 ? "99+" : notificationCount}
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
                className="px-0"
              >
                <Avatar size="lg">
                  <AvatarFallback className="rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-sm px-0!">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="flex items-center gap-2 text-sm">
                  <Avatar size="lg" className="h-8 w-8">
                    <AvatarFallback className="rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white text-xs font-bold">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 truncate">{userName}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {showDashboard && (
                  <DropdownMenuItem onClick={() => { window.location.href = "/dashboard"; }}>
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => { window.location.href = "/notifications"; }}>
                  <Bell className="h-4 w-4" />
                  Notifications
                </DropdownMenuItem>
                {authenticated && !isAdmin && (
                  <DropdownMenuItem onClick={() => { window.location.href = "/financial-activities"; }}>
                    <WalletCards className="h-4 w-4" />
                    Finances
                  </DropdownMenuItem>
                )}
                {showAuditLogs && (
                  <DropdownMenuItem onClick={() => { window.location.href = "/admin/audit"; }}>
                    <FileClock className="h-4 w-4" />
                    Audit Logs
                  </DropdownMenuItem>
                )}
                {onSignOut && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onSignOut} className="text-red-500 dark:text-red-400 focus:text-red-500">
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
                className="rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 transition-all"
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
