"use client";

import { useEffect, useMemo, useState } from "react";
import { onIdTokenChanged, signOut } from "firebase/auth";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

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
  "MEMBER_REMOVED",
  "PAYOUT_DRAW_STARTED",
  "PAYOUT_RECIPIENT_SELECTED",
  "PAYMENT_INITIATED",
  "PAYMENT_VERIFIED",
  "PAYMENT_FAILED",
] as const;

export default function AdminAuditPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogView[]>([]);
  const [userName, setUserName] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [equbFilter, setEqubFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState<(typeof ACTION_OPTIONS)[number]>("ALL");

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

  const filteredLogs = useMemo(() => {
    const search = query.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesEqub = equbFilter === "ALL" || log.equbId === equbFilter;
      const matchesAction = actionFilter === "ALL" || log.action === actionFilter;
      const matchesSearch =
        !search ||
        log.action.toLowerCase().includes(search) ||
        log.equbName.toLowerCase().includes(search) ||
        log.actorName.toLowerCase().includes(search) ||
        log.actorId.toLowerCase().includes(search) ||
        (log.reason ?? "").toLowerCase().includes(search) ||
        JSON.stringify(log.metadata ?? {}).toLowerCase().includes(search);
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

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        links={[]}
        userName={userName}
        isAdmin
        searchHref="/equbs"
        onSignOut={() => signOut(getFirebaseAuth()).then(() => (window.location.href = "/"))}
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="mt-1 text-sm text-gray-600">
              Review the server-side record of Equb actions for the Equbs you manage.
            </p>
          </div>
          <Link href="/admin/equbs/new">
            <Button>Create Equb</Button>
          </Link>
        </div>

        <Card className="mt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search action, actor, reason, metadata"
              aria-label="Search audit logs"
            />
            <select
              value={equbFilter}
              onChange={(event) => setEqubFilter(event.target.value)}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="ALL">All Equbs</option>
              {equbOptions.map((equb) => (
                <option key={equb.id} value={equb.id}>
                  {equb.name}
                </option>
              ))}
            </select>
            <select
              value={actionFilter}
              onChange={(event) =>
                setActionFilter(event.target.value as (typeof ACTION_OPTIONS)[number])
              }
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              {ACTION_OPTIONS.map((action) => (
                <option key={action} value={action}>
                  {action === "ALL" ? "All actions" : action.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setQuery("");
                setEqubFilter("ALL");
                setActionFilter("ALL");
              }}
            >
              Clear filters
            </Button>
          </div>
        </Card>

        <Card className="mt-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <p className="text-sm text-gray-600">
              {filteredLogs.length} log{filteredLogs.length === 1 ? "" : "s"} shown
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Equb</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-gray-500">
                    No audit logs matched your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(log.timestamp)}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {log.equbName}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">{log.actorName}</div>
                      <div className="text-xs text-gray-500">{log.actorEmail || log.actorId}</div>
                    </TableCell>
                    <TableCell className="max-w-md text-sm text-gray-600">
                      <div className="space-y-1">
                        {log.reason && <div>{log.reason}</div>}
                        {log.entityId && (
                          <div className="text-xs text-gray-500">Entity: {log.entityId}</div>
                        )}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <pre className="whitespace-pre-wrap break-words rounded bg-gray-50 p-2 text-xs text-gray-600">
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
        </Card>
      </main>
    </div>
  );
}
