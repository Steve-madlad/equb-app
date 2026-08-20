import { toMinorUnits } from "@/lib/domain/money";
import { requireAdmin, requireAuth } from "@/lib/firebase/auth";
import {
  createEqub,
  getMembershipsForEqub,
  listEqubs,
} from "@/lib/services/equbService";
import { notifyAdminsOfDuePayoutCycles } from "@/lib/services/paymentService";
import { resolveRequestDate } from "@/lib/testClock";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createEqubSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  contributionAmount: z.number().positive(),
  frequency: z.enum(["WEEKLY", "MONTHLY", "CUSTOM"]),
  customIntervalDays: z.number().positive().optional(),
  numberOfCycles: z.number().int().min(2),
  memberLimit: z.number().int().min(2),
  minimumMemberCount: z.number().int().min(2),
  startDate: z.string(),
  penaltyEnabled: z.boolean().default(false),
  penaltyType: z.enum(["FIXED_AMOUNT", "PERCENTAGE"]).nullable().optional(),
  penaltyAmount: z.number().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request.headers.get("authorization"));
    const requestDateIso = resolveRequestDate(request);
    if (user.role === "ADMIN") {
      await notifyAdminsOfDuePayoutCycles(requestDateIso);
    }
    const status = request.nextUrl.searchParams.get("status") ?? undefined;
    const equbs = await listEqubs(
      status as import("@/lib/domain/types").EqubStatus | undefined,
    );
    const equbSummaries = await Promise.all(
      equbs.map(async (equb) => {
        const memberships = await getMembershipsForEqub(equb.id);
        const activeMemberCount = memberships.filter((membership) =>
          ["ACTIVE", "APPROVED"].includes(membership.status),
        ).length;
        const pendingMemberCount = memberships.filter(
          (membership) => membership.status === "PENDING",
        ).length;

        return {
          ...equb,
          activeMemberCount,
          pendingMemberCount,
        };
      }),
    );
    return NextResponse.json({ equbs: equbSummaries });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request.headers.get("authorization"));
    const body = await request.json();
    const parsed = createEqubSchema.parse(body);

    if (parsed.numberOfCycles !== parsed.memberLimit) {
      return NextResponse.json(
        { error: "Number of cycles must equal member limit" },
        { status: 400 },
      );
    }

    const equb = await createEqub(
      {
        name: parsed.name,
        description: parsed.description,
        contributionAmountMinor: toMinorUnits(parsed.contributionAmount),
        currency: "ETB",
        frequency: parsed.frequency,
        customIntervalDays: parsed.customIntervalDays,
        numberOfCycles: parsed.numberOfCycles,
        memberLimit: parsed.memberLimit,
        startDate: parsed.startDate,
        penaltyEnabled: parsed.penaltyEnabled,
        penaltyType: parsed.penaltyType ?? null,
        penaltyAmount: parsed.penaltyAmount ?? null,
        minimumMemberCount: parsed.minimumMemberCount,
      },
      admin.id,
    );

    return NextResponse.json({ equb }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create Equb";
    const status = message.includes("permissions") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
