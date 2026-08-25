import { requireAdmin } from "@/lib/firebase/auth";
import { Client } from "@upstash/qstash";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request.headers.get("authorization"));
    const token = process.env.QSTASH_TOKEN;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!token || !appUrl) {
      throw new Error("QSTASH_TOKEN and NEXT_PUBLIC_APP_URL are required");
    }

    const client = new Client({ token });
    const scheduleId =
      process.env.QSTASH_PAYOUT_SCHEDULE_ID ?? "equb-payout-sweep";
    const cron = process.env.QSTASH_PAYOUT_CRON ?? "0 0 * * *";
    const destination = `${appUrl.replace(/\/$/, "")}/api/admin/maintenance/payouts`;
    const schedule = await client.schedules.create({
      scheduleId,
      destination,
      cron,
      body: JSON.stringify({
        source: "equb-payout-sweep",
        configuredBy: admin.id,
      }),
      headers: { "Content-Type": "application/json" },
    });

    return NextResponse.json({ scheduleId, destination, cron, schedule });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create schedule",
      },
      { status: 400 },
    );
  }
}
