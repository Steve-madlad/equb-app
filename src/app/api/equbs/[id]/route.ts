import {
  getEligibleMembers,
  getIneligibilityReason,
} from "@/lib/domain/eligibility";
import { formatMoney, toMinorUnits } from "@/lib/domain/money";
import { getUserProfile, requireAdmin, requireAuth } from "@/lib/firebase/auth";
import {
  approveMembership,
  approveMemberships,
  deleteEqub,
  getCyclesForEqub,
  getEqub,
  getMembershipsForEqub,
  lockEqub,
  openEqubForMembers,
  updateEqub,
} from "@/lib/services/equbService";
import {
  getObligationsForCycle,
  getObligationsForUser,
} from "@/lib/services/paymentService";
import {
  getDrawForCycle,
  getPayoutsForEqub,
} from "@/lib/services/payoutService";
import { getCurrentPoolForEqub } from "@/lib/services/ledgerService";
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
  minimumMemberCount: z.number().int().min(1),
  startDate: z.string(),
  penaltyEnabled: z.boolean().default(false),
  penaltyType: z.enum(["FIXED_AMOUNT", "PERCENTAGE"]).nullable().optional(),
  penaltyAmount: z.number().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request.headers.get("authorization"));
    const { id } = await params;
    const equb = await getEqub(id);
    if (!equb)
      return NextResponse.json({ error: "Equb not found" }, { status: 404 });

    const memberships = await getMembershipsForEqub(id);
    const cycles = await getCyclesForEqub(id);
    const payouts = await getPayoutsForEqub(id);

    const userMembership = memberships.find((m) => m.userId === user.id);
    let userObligations: Awaited<ReturnType<typeof getObligationsForUser>> = [];
    let eligibility: { eligible: boolean; reason: string | null } | null = null;
    let pendingRequests: Array<
      import("@/lib/domain/types").Membership & {
        requesterName: string;
        requesterEmail: string;
        requesterRating: number;
      }
    > = [];
    let memberSummaries: Array<{
      membership: import("@/lib/domain/types").Membership;
      user: {
        id: string;
        displayName: string;
        email: string;
        rating: number;
      };
    }> = [];

    if (userMembership) {
      userObligations = await getObligationsForUser(user.id, id);
      const currentCycle = cycles.find((c) =>
        ["ACTIVE", "DRAW_PENDING", "WAITING_FOR_ELIGIBILITY"].includes(
          c.status,
        ),
      );
      if (currentCycle) {
        const cycleObligations = await getObligationsForCycle(currentCycle.id);
        const allObligations = userObligations;
        const eligible =
          getEligibleMembers([userMembership], cycleObligations, allObligations)
            .length > 0;
        eligibility = {
          eligible,
          reason: getIneligibilityReason({
            membership: userMembership,
            obligationsForCycle: cycleObligations,
            allObligations,
          }),
        };
      }
    }

    if (user.role === "ADMIN") {
      const pendingMemberships = memberships.filter(
        (m) => m.status === "PENDING",
      );
      pendingRequests = await Promise.all(
        pendingMemberships.map(async (membership) => {
          const requester = await getUserProfile(membership.userId);
          return {
            ...membership,
            requesterName: requester?.displayName ?? membership.userId,
            requesterEmail: requester?.email ?? "",
            requesterRating: requester?.rating ?? 100,
          };
        }),
      );

      memberSummaries = await Promise.all(
        memberships.map(async (membership) => {
          const profile = await getUserProfile(membership.userId);
          return {
            membership,
            user: {
              id: profile?.id ?? membership.userId,
              displayName: profile?.displayName ?? membership.userId,
              email: profile?.email ?? "",
              rating: profile?.rating ?? 100,
            },
          };
        }),
      );
    }

    const draws = await Promise.all(
      cycles.filter((c) => c.drawId).map((c) => getDrawForCycle(c.id)),
    );

    const currentPoolMinor = await getCurrentPoolForEqub(id);

    return NextResponse.json({
      equb,
      memberships,
      cycles,
      payouts,
      draws: draws.filter(Boolean),
      userMembership,
      userObligations,
      eligibility,
      pendingRequests,
      memberSummaries,
      currentPoolMinor,
      currentPoolDisplay: formatMoney(currentPoolMinor),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin(request.headers.get("authorization"));
    const { id } = await params;
    const body = await request.json();
    const { action, membershipId, membershipIds } = body;

    switch (action) {
      case "open":
        const opened = await openEqubForMembers(id, admin.id);
        return NextResponse.json({ equb: opened });
      case "lock":
        const locked = await lockEqub(id, admin.id);
        return NextResponse.json({ equb: locked });
      case "update": {
        const parsed = createEqubSchema.parse(body);
        const updated = await updateEqub(
          id,
          {
            name: parsed.name,
            description: parsed.description,
            contributionAmountMinor: toMinorUnits(parsed.contributionAmount),
            currency: "ETB",
            frequency: parsed.frequency,
            customIntervalDays: parsed.customIntervalDays,
            numberOfCycles: parsed.numberOfCycles,
            memberLimit: parsed.memberLimit,
            minimumMemberCount: parsed.minimumMemberCount,
            startDate: parsed.startDate,
            penaltyEnabled: parsed.penaltyEnabled,
            penaltyType: parsed.penaltyType ?? null,
            penaltyAmount: parsed.penaltyAmount ?? null,
          },
          admin.id,
        );
        return NextResponse.json({ equb: updated });
      }
      case "approve_member":
        if (!membershipId)
          return NextResponse.json(
            { error: "membershipId required" },
            { status: 400 },
          );
        const membership = await approveMembership(membershipId, admin.id);
        return NextResponse.json({ membership });
      case "approve_members": {
        if (!Array.isArray(membershipIds) || membershipIds.length === 0) {
          return NextResponse.json(
            { error: "membershipIds required" },
            { status: 400 },
          );
        }
        const result = await approveMemberships(membershipIds, admin.id);
        return NextResponse.json({ result });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin(request.headers.get("authorization"));
    const { id } = await params;
    await deleteEqub(id, admin.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message.includes("members have joined") ? 400 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
