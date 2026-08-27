import { requireAuth } from "@/lib/firebase/auth";
import {
  initiatePayment,
  verifyAndRecordPayment,
} from "@/lib/services/paymentService";
import { resolveRequestDate } from "@/lib/testClock";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request.headers.get("authorization"));
    const body = await request.json();
    const { obligationId, action, providerTransactionId } = body;

    console.log(`[API /api/payments] User ${user.id} (${user.email}) requested action: ${action}`, body);

    if (action === "verify" && providerTransactionId) {
      const payment = await verifyAndRecordPayment(
        providerTransactionId,
        user.id,
        resolveRequestDate(request),
      );
      console.log(`[API /api/payments] Payment verified successfully:`, payment);
      return NextResponse.json({ payment });
    }

    if (!obligationId) {
      return NextResponse.json(
        { error: "obligationId required" },
        { status: 400 },
      );
    }

    const payment = await initiatePayment(
      obligationId,
      user.id,
      resolveRequestDate(request),
    );
    console.log(`[API /api/payments] Payment initiated successfully:`, payment);
    return NextResponse.json({ payment });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[API /api/payments Error]:`, error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 },
    );
  }
}
