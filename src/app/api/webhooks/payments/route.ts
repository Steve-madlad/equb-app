import { getPaymentProvider } from "@/lib/payments";
import { verifyAndRecordPayment } from "@/lib/services/paymentService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const providerTransactionId =
    request.nextUrl.searchParams.get("tx_ref") ??
    request.nextUrl.searchParams.get("trx_ref");
  if (!providerTransactionId) {
    return NextResponse.json({ error: "tx_ref required" }, { status: 400 });
  }

  try {
    await verifyAndRecordPayment(providerTransactionId, "chapa-callback");
    return NextResponse.json({ received: true, processed: true });
  } catch (error) {
    console.error("Chapa callback error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Callback failed" },
      { status: 400 },
    );
  }
}

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
      await verifyAndRecordPayment(
        webhookData.providerTransactionId,
        "webhook",
      );
    }

    return NextResponse.json({ received: true, processed: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 500 },
    );
  }
}
