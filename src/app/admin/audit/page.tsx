"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
  "PAYMENT_INITIATED",
  "PAYMENT_VERIFIED",
  "PAYMENT_FAILED",
] as const;

const PAGE_SIZE_OPTIONS = [10, 20, 50];

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
    <div className="min-h-screen bg-gray-50">
      <Navbar
        links={[]}
        userName={userName}
        isAdmin
        searchHref="/equbs"
        onSignOut={() =>
          signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))
        }
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="mt-1 text-sm text-gray-600">
              Review the server-side record of Equb actions for the Equbs you
              manage.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-white p-4">
          <div className="grid gap-4 md:grid-cols-5">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search action, actor, reason, metadata"
              aria-label="Search audit logs"
              className="md:col-span-2"
            />

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
            >
              Clear filters
            </Button>
          </div>
        </div>

        <Card className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-4">
            <p className="text-sm text-gray-600">
              {filteredLogs.length} log{filteredLogs.length === 1 ? "" : "s"}{" "}
              shown
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger className="w-24">
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

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-3">Timestamp</TableHead>
                <TableHead className="px-4 py-3">Equb</TableHead>
                <TableHead className="px-4 py-3">Action</TableHead>
                <TableHead className="px-4 py-3">Actor</TableHead>
                <TableHead className="px-4 py-3">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="px-4 py-10">
                    <Empty className="border-0 py-4">
                      <EmptyContent>
                        <EmptyHeader>
                          <EmptyMedia />
                          <EmptyTitle>No audit logs found</EmptyTitle>
                          <EmptyDescription>
                            Try adjusting your filters or search terms.
                          </EmptyDescription>
                        </EmptyHeader>
                      </EmptyContent>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : (
                visibleLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {formatDateTime(log.timestamp)}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-medium text-gray-900">
                      {log.equbId ? (
                        <Link
                          href={`/equbs/${log.equbId}`}
                          className="text-emerald-700 hover:underline"
                        >
                          {log.equbName}
                        </Link>
                      ) : (
                        log.equbName
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="secondary" className="font-normal">
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        {log.actorName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {log.actorEmail || log.actorId}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md px-4 py-3 text-sm text-gray-600">
                      <div className="space-y-1">
                        {log.reason && <div>{log.reason}</div>}
                        {log.entityId && (
                          <div className="text-xs text-gray-500">
                            Entity: {log.entityId}
                          </div>
                        )}
                        {log.metadata &&
                          Object.keys(log.metadata).length > 0 && (
                            <pre className="whitespace-pre-wrap wrap-break-word rounded bg-gray-50 p-2 text-xs text-gray-600">
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-4">
            <p className="text-sm text-gray-600">
              {filteredLogs.length === 0
                ? "Showing 0 of 0"
                : `Showing ${pageStart}-${pageEnd} of ${filteredLogs.length}`}
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage === pageCount}
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
