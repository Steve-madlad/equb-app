import { getPaymentProvider } from "@/lib/payments";
import { verifyAndRecordPayment } from "@/lib/services/paymentService";
import {
  completePayout,
  getPayoutByTransferReference,
} from "@/lib/services/payoutService";
import { createAuditLog } from "@/lib/services/auditService";
import { createNotification } from "@/lib/services/notificationService";
import { COLLECTIONS, getAdminDb } from "@/lib/firebase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const providerTransactionId =
    request.nextUrl.searchParams.get("tx_ref") ??
    request.nextUrl.searchParams.get("trx_ref");
  if (!providerTransactionId) {
    return NextResponse.json({ error: "tx_ref required" }, { status: 400 });
  }

  try {
    // Check if this reference belongs to an outbound payout transfer
    const payout = await getPayoutByTransferReference(providerTransactionId);
    if (payout) {
      if (payout.status !== "COMPLETED") {
        await completePayout(payout.id, "chapa-callback", {
          transferReference: providerTransactionId,
        });
      }
      return NextResponse.json({ received: true, processed: true, type: "transfer" });
    }

    // Otherwise treat as incoming collection contribution
    await verifyAndRecordPayment(providerTransactionId, "chapa-callback");
    return NextResponse.json({ received: true, processed: true, type: "collection" });
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
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const event = typeof payload.event === "string" ? payload.event.toLowerCase() : "";
    const eventType = typeof payload.type === "string" ? payload.type.toLowerCase() : "";

    // ─── 1. Outbound Transfer Discrimination ─────────────────────────────────
    const isTransferEvent =
      event.startsWith("transfer.") ||
      eventType.startsWith("transfer.") ||
      Boolean(payload.bank_code) ||
      (typeof payload.reference === "string" && payload.reference.startsWith("payout-"));

    if (isTransferEvent) {
      const transferRef =
        (typeof payload.reference === "string" ? payload.reference : null) ??
        (payload.data && typeof (payload.data as Record<string, unknown>).reference === "string"
          ? ((payload.data as Record<string, unknown>).reference as string)
          : null) ??
        (typeof payload.tx_ref === "string" ? payload.tx_ref : null);

      if (!transferRef) {
        return NextResponse.json({ received: true, processed: false, reason: "Missing transfer reference" });
      }

      const payout = await getPayoutByTransferReference(transferRef);
      if (!payout) {
        return NextResponse.json({ received: true, processed: false, reason: "Payout not found" });
      }

      const status = (
        (typeof payload.status === "string" ? payload.status : "") ||
        (payload.data && typeof (payload.data as Record<string, unknown>).status === "string"
          ? ((payload.data as Record<string, unknown>).status as string)
          : "") ||
        (event === "transfer.success" ? "success" : "") ||
        (event === "transfer.failed" ? "failed" : "")
      ).toLowerCase();

      if (status === "success" || status === "completed" || status === "paid" || event === "transfer.success") {
        if (payout.status !== "COMPLETED") {
          await completePayout(payout.id, "webhook:chapa", {
            transferReference: transferRef,
            bankName: payout.bankName,
          });
        }
        return NextResponse.json({ received: true, processed: true, type: "transfer_success" });
      }

      if (status === "failed" || status === "cancelled" || status === "rejected" || event === "transfer.failed") {
        const failureReason =
          (typeof payload.message === "string" ? payload.message : null) ??
          "Transfer rejected by provider";

        await getAdminDb()
          .collection(COLLECTIONS.payouts)
          .doc(payout.id)
          .update({
            status: "FAILED",
            failureReason,
            updatedAt: new Date().toISOString(),
          });

        await createAuditLog({
          action: "PAYOUT_TRANSFER_FAILED",
          actorId: "webhook:chapa",
          equbId: payout.equbId,
          affectedUserId: payout.userId,
          entityId: payout.id,
          metadata: { reason: failureReason },
        });

        const admins = await getAdminDb()
          .collection(COLLECTIONS.users)
          .where("role", "==", "ADMIN")
          .get();

        for (const adminDoc of admins.docs) {
          await createNotification({
            userId: adminDoc.id,
            type: "GENERAL",
            title: "Payout Transfer Failed",
            message: `Chapa transfer failed for payout ${payout.id} (Ref: ${transferRef}): ${failureReason}.`,
            equbId: payout.equbId,
          });
        }

        return NextResponse.json({ received: true, processed: true, type: "transfer_failed" });
      }

      return NextResponse.json({ received: true, processed: true, type: "transfer_pending" });
    }

    // ─── 2. Inbound Collection Contribution Handling ─────────────────────────
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

    return NextResponse.json({ received: true, processed: true, type: "collection" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 500 },
    );
  }
}
