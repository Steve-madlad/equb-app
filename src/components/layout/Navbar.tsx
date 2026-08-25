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
  Search,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
          className="h-10 w-10"
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
          <p className="text-xs text-gray-500">
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
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" className="text-xl font-bold text-emerald-700 mr-5">
            እቁብ Equb
          </Link>

          <div className="flex gap-2">
            {authenticated && (
              <Link
                href="/dashboard"
                className="flex-center gap-2 py-1 px-2 rounded-lg text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                aria-label="Dashboard"
                title="Dashboard"
              >
                <LayoutDashboard className="size-4!" />
                Dashboard
              </Link>
            )}
            {authenticated && showAuditLogs && (
              <Link
                href="/admin/audit"
                className="flex-center gap-2 py-1 px-2 rounded-lg text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                aria-label="Audit logs"
                title="Audit logs"
              >
                <FileClock className="h-4 w-4" />
                Audit logs
              </Link>
            )}
            {authenticated && !isAdmin && (
              <Link
                href="/financial-activities"
                className="flex-center gap-2 py-1 px-2 rounded-lg text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                aria-label="Financial activities"
                title="Financial activities"
              >
                <WalletCards className="h-4 w-4" />
                Financial activities
              </Link>
            )}
          </div>

          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                {link.label}
                {link.icon && <link.icon />}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {authenticated && process.env.NODE_ENV !== "production" ? (
            <TestDateDialog />
          ) : null}

          {authenticated && searchHref && (
            <Link
              href={searchHref}
              className="inline-flex max-w-[min(18rem,48vw)] items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-white hover:text-gray-900"
            >
              <Search className="h-4 w-4" />
              <span className="truncate">{searchLabel}</span>
            </Link>
          )}

          {authenticated && notificationsHref && (
            <Link
              href={notificationsHref}
              aria-label="Notifications"
              title="Notifications"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              <Bell className="h-4 w-4" />
              {typeof notificationCount === "number" &&
                notificationCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
            </Link>
          )}

          {authenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Profile menuu"
                title={userName}
                className="px-0"
              >
                <Avatar size="lg">
                  <AvatarFallback className="rounded-lg px-0! bg-emerald-600 text-white">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuLabel className="flex items-center justify-start gap-2 text-sm">
                  <Avatar size="lg" className="h-8 w-8">
                    <AvatarFallback className="rounded-full bg-emerald-600 text-white">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 truncate">{userName}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {showDashboard && (
                  <DropdownMenuItem
                    onClick={() => {
                      window.location.href = "/dashboard";
                    }}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    window.location.href = "/notifications";
                  }}
                >
                  <Bell className="h-4 w-4" />
                  Notifications
                </DropdownMenuItem>
                {showAuditLogs && (
                  <DropdownMenuItem
                    onClick={() => {
                      window.location.href = "/admin/audit";
                    }}
                  >
                    <FileClock className="h-4 w-4" />
                    Audit Logs
                  </DropdownMenuItem>
                )}
                {onSignOut && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onSignOut}>
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!authenticated && (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
