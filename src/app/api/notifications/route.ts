import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/firebase/auth";
import { getNotificationsForUser } from "@/lib/services/notificationService";
import {
  getMembershipsForUser,
  getPendingMembershipRequestsForAdmin,
  getEqub,
} from "@/lib/services/equbService";

export async function GET(request: NextRequest) {
  try {
    const profile = await requireAuth(request.headers.get("authorization"));
    const [notifications, memberships] = await Promise.all([
      getNotificationsForUser(profile.id),
      getMembershipsForUser(profile.id),
    ]);

    const unreadCount = notifications.filter((notification) => !notification.read).length;

    const membershipStatuses = await Promise.all(
      memberships.map(async (membership) => ({
        membership,
        equb: await getEqub(membership.equbId),
      }))
    );

    const adminRequests =
      profile.role === "ADMIN"
        ? await getPendingMembershipRequestsForAdmin(profile.id)
        : [];

    return NextResponse.json({
      profile,
      unreadCount,
      notifications,
      membershipStatuses: membershipStatuses.filter((item) => item.equb),
      adminRequests,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}
