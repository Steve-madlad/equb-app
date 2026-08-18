import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { verifyAndRecordPayment } from "@/lib/services/paymentService";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const provider = getPaymentProvider();
    const webhookData = await provider.handleWebhook(payload, headers);

    if (!webhookData) {
      return NextResponse.json({ received: true, processed: false });
    }

    if (webhookData.status === "SUCCESS") {
      await verifyAndRecordPayment(webhookData.providerTransactionId, "webhook");
    }

    return NextResponse.json({ received: true, processed: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 500 }
    );
  }
}
