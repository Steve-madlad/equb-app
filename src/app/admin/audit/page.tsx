"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { EqubLoading } from "@/components/ui/EqubLoading";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { formatDateTime } from "@/lib/utils";
import { onIdTokenChanged, signOut } from "firebase/auth";
import {
  Clock,
  Code2,
  FileClock,
  Filter,
  RotateCcw,
  Search,
  ShieldAlert,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AuditLogView = {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  equbId?: string;
  equbName: string;
  entityId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
};

type AuditFeedResponse = {
  logs: AuditLogView[];
};

const ACTION_OPTIONS = [
  "ALL",
  "EQUB_CREATED",
  "EQUB_UPDATED",
  "EQUB_OPENED",
  "EQUB_LOCKED",
  "EQUB_ACTIVATED",
  "EQUB_COMPLETED",
  "MEMBER_JOINED",
  "MEMBER_APPROVED",
  "MEMBER_REJECTED",
  "MEMBER_WITHDRAWN",
  "MEMBER_REMOVED",
  "PAYOUT_DRAW_STARTED",
  "PAYOUT_RECIPIENT_SELECTED",
  "PAYOUT_TRANSFER_INITIATED",
  "PAYOUT_TRANSFER_AWAITING_APPROVAL",
  "PAYOUT_TRANSFER_FAILED",
  "PAYMENT_INITIATED",
  "PAYMENT_VERIFIED",
  "PAYMENT_FAILED",
] as const;

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function getActionBadgeStyle(action: string) {
  if (action.startsWith("PAYOUT_")) {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  }
  if (action.startsWith("PAYMENT_")) {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  }
  if (action.startsWith("MEMBER_")) {
    return "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30";
  }
  return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
}

export default function AdminAuditPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogView[]>([]);
  const [userName, setUserName] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [equbFilter, setEqubFilter] = useState("ALL");
  const [actionFilter, setActionFilter] =
    useState<(typeof ACTION_OPTIONS)[number]>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const token = await user.getIdToken();
      const profileRes = await fetch("/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!profileRes.ok) {
        window.location.href = "/login";
        return;
      }

      const { profile } = await profileRes.json();
      if (profile.role !== "ADMIN") {
        window.location.href = "/dashboard";
        return;
      }
      setUserName(profile.displayName);

      const res = await fetch("/api/admin/audit", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as AuditFeedResponse;
        setLogs(data.logs);
      }
      setLoading(false);
    });

    return unsub;
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, equbFilter, actionFilter, pageSize]);

  const filteredLogs = useMemo(() => {
    const search = query.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesEqub = equbFilter === "ALL" || log.equbId === equbFilter;
      const matchesAction =
        actionFilter === "ALL" || log.action === actionFilter;
      const matchesSearch =
        !search ||
        log.action.toLowerCase().includes(search) ||
        log.equbName.toLowerCase().includes(search) ||
        log.actorName.toLowerCase().includes(search) ||
        log.actorId.toLowerCase().includes(search) ||
        (log.reason ?? "").toLowerCase().includes(search) ||
        JSON.stringify(log.metadata ?? {})
          .toLowerCase()
          .includes(search);
      return matchesEqub && matchesAction && matchesSearch;
    });
  }, [actionFilter, equbFilter, logs, query]);

  const equbOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const log of logs) {
      if (log.equbId) {
        options.set(log.equbId, log.equbName);
      }
    }
    return Array.from(options, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [logs]);

  const pageCount = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart =
    filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, filteredLogs.length);
  const visibleLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [currentPage, page]);

  if (loading) {
    return <EqubLoading />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 transition-colors duration-300">
      {/* Ambient glow (dark mode only) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10 opacity-0 dark:opacity-100">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-teal-600/8 rounded-full blur-[120px]" />
      </div>

      <Navbar
        links={[]}
        userName={userName}
        isAdmin
        searchHref="/search"
        onSignOut={() =>
          signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))
        }
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Security & Compliance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Audit Logs & Ledger Trace
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Immutable server-side audit trails for all draw actions, payments, and member state transitions.
            </p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl p-6 shadow-md shadow-slate-200/60 dark:shadow-black/25 dark:shadow-xl mb-8">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search action, actor, reason, or metadata…"
                aria-label="Search audit logs"
                className="pl-10 rounded-xl border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <Select value={equbFilter} onValueChange={setEqubFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Equbs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Equbs</SelectItem>
                {equbOptions.map((equb) => (
                  <SelectItem key={equb.id} value={equb.id}>
                    {equb.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={actionFilter}
              onValueChange={(value) =>
                setActionFilter(value as (typeof ACTION_OPTIONS)[number])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action === "ALL"
                      ? "All actions"
                      : action.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setQuery("");
                setEqubFilter("ALL");
                setActionFilter("ALL");
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Audit Table Card */}
        <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] backdrop-blur-xl shadow-md shadow-slate-200/60 dark:shadow-black/25 dark:shadow-xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/90 dark:border-white/10 px-6 py-4">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Showing <span className="font-bold text-slate-900 dark:text-white">{filteredLogs.length}</span> audit records
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger className="w-20 h-8 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                  <TableHead className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Timestamp
                  </TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Equb
                  </TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Action
                  </TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Actor
                  </TableHead>
                  <TableHead className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Details & Metadata
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-6 py-12 text-center">
                      <FileClock className="h-10 w-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-400">No audit records found</p>
                      <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search terms.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="border-slate-200/70 dark:border-white/5 hover:bg-slate-50/80 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <TableCell className="whitespace-nowrap px-6 py-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                        {formatDateTime(log.timestamp)}
                      </TableCell>
                      <TableCell className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-sm">
                        {log.equbId ? (
                          <Link
                            href={`/equbs/${log.equbId}`}
                            className="text-emerald-700 dark:text-emerald-400 hover:underline transition-colors"
                          >
                            {log.equbName}
                          </Link>
                        ) : (
                          log.equbName
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${getActionBadgeStyle(
                            log.action,
                          )}`}
                        >
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {log.actorName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {log.actorEmail || log.actorId}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md px-6 py-4 text-xs text-slate-700 dark:text-slate-300">
                        <div className="space-y-1.5">
                          {log.reason && (
                            <div className="font-medium text-slate-900 dark:text-slate-200">
                              Reason: {log.reason}
                            </div>
                          )}
                          {log.entityId && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              Entity: {log.entityId}
                            </div>
                          )}
                          {log.metadata &&
                            Object.keys(log.metadata).length > 0 && (
                              <pre className="whitespace-pre-wrap wrap-break-word rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-950/60 p-2.5 text-[11px] font-mono text-emerald-800 dark:text-emerald-400/90 max-h-32 overflow-y-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/90 dark:border-white/10 px-6 py-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {filteredLogs.length === 0
                ? "Showing 0 of 0"
                : `Showing ${pageStart}–${pageEnd} of ${filteredLogs.length}`}
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-xl text-xs font-semibold"
              >
                ← Previous
              </Button>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Page {currentPage} of {pageCount}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={currentPage === pageCount}
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
                className="rounded-xl text-xs font-semibold"
              >
                Next →
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
