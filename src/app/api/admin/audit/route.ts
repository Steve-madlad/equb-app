import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getUserProfile } from "@/lib/firebase/auth";
import { getEqub } from "@/lib/services/equbService";
import { getAllAuditLogs } from "@/lib/services/auditService";
import type { AuditLogEntry } from "@/lib/domain/types";

type EnrichedAuditLog = AuditLogEntry & {
  equbName: string;
  actorName: string;
  actorEmail: string;
};

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request.headers.get("authorization"));
    const logs = await getAllAuditLogs(300);

    const equbIds = Array.from(
      new Set(logs.map((log) => log.equbId).filter(Boolean) as string[]),
    );
    const actorIds = Array.from(
      new Set(logs.map((log) => log.actorId).filter((actorId) => actorId !== "system")),
    );

    const actorProfiles = await Promise.all(
      actorIds.map(async (actorId) => {
        const profile = await getUserProfile(actorId);
        return [actorId, profile] as const;
      }),
    );

    const actorMap = new Map(actorProfiles);
    const equbProfiles = await Promise.all(
      equbIds.map(async (equbId) => {
        const equb = await getEqub(equbId);
        return [equbId, equb] as const;
      }),
    );
    const equbMap = new Map(equbProfiles);

    const enrichedLogs: EnrichedAuditLog[] = logs.map((log) => {
      const actor = actorMap.get(log.actorId);
      const equb = log.equbId ? equbMap.get(log.equbId) : null;
      return {
        ...log,
        equbName: equb?.name ?? "System",
        actorName:
          actor?.displayName ?? (log.actorId === "system" ? "System" : log.actorId),
        actorEmail: actor?.email ?? "",
      };
    });

    return NextResponse.json({
      logs: enrichedLogs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
