"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LayoutDashboard, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
}

interface NavbarProps {
  links: NavLink[];
  userName?: string;
  dashboardHref?: string;
  notificationsHref?: string;
  notificationCount?: number;
  onSignOut?: () => void;
}

export function Navbar({
  links,
  userName,
  dashboardHref,
  notificationsHref = "/notifications",
  notificationCount,
  onSignOut,
}: NavbarProps) {
  const pathname = usePathname();
  const authenticated = Boolean(userName);

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-emerald-700">
            እቁብ Equb
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {authenticated && dashboardHref && (
            <Link
              href={dashboardHref}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
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
              {typeof notificationCount === "number" && notificationCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </Link>
          )}
          {authenticated && (
            <details className="relative">
              <summary
                aria-label="Profile menu"
                title={userName}
                className={cn(
                  "flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900",
                  "[&::-webkit-details-marker]:hidden"
                )}
              >
                <UserRound className="h-4 w-4" />
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                <div className="px-3 py-2 text-sm font-medium text-gray-900">{userName}</div>
                {dashboardHref && (
                  <Link
                    href={dashboardHref}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                )}
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <span>Sign out</span>
                  </button>
                )}
              </div>
            </details>
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
