import type { PaymentStatus } from "@/lib/domain/types";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatusResult,
  WebhookPayload,
} from "./PaymentProvider";

const CHAPA_API_URL = "https://api.chapa.co/v1";

type ChapaResponse = {
  status?: string;
  message?: string;
  data?: {
    tx_ref?: string;
    status?: string;
    amount?: string | number;
    checkout_url?: string;
  };
};

function getSecretKey(): string {
  const key = process.env.CHAPA_SECRET_KEY;
  if (!key) throw new Error("CHAPA_SECRET_KEY is not set");
  return key;
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function toMinorUnits(amount: string | number | undefined): number | undefined {
  if (amount === undefined) return undefined;
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : undefined;
}

function mapStatus(status: string | undefined): PaymentStatus {
  switch (status?.toLowerCase()) {
    case "success":
      return "SUCCESS";
    case "failed":
    case "cancelled":
    case "canceled":
      return "FAILED";
    case "pending":
      return "PENDING";
    default:
      return "INITIATED";
  }
}

async function chapaRequest(
  path: string,
  init: RequestInit,
): Promise<ChapaResponse> {
  const response = await fetch(`${CHAPA_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = (await response
    .json()
    .catch(() => null)) as ChapaResponse | null;
  if (!response.ok || !body) {
    throw new Error(
      body?.message ?? `Chapa request failed (${response.status})`,
    );
  }
  return body;
}

export class ChapaPaymentProvider implements PaymentProvider {
  readonly name = "chapa";

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const providerTransactionId = `equb-${Date.now()}-${randomBytes(6).toString("hex")}`;
    const response = await chapaRequest("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        amount: (input.amountMinor / 100).toFixed(2),
        currency: input.currency,
        tx_ref: providerTransactionId,
        callback_url: `${getAppUrl()}/api/webhooks/payments`,
        return_url: `${getAppUrl()}/payments/chapa/complete?tx_ref=${encodeURIComponent(providerTransactionId)}`,
        customization: {
          title: "Equb contribution",
          description: "Contribution payment",
        },
        meta: input.metadata,
      }),
    });

    return {
      providerTransactionId,
      status: "INITIATED",
      redirectUrl: response.data?.checkout_url,
    };
  }

  async getPaymentStatus(
    providerTransactionId: string,
  ): Promise<PaymentStatusResult> {
    return this.verifyPayment(providerTransactionId);
  }

  async verifyPayment(
    providerTransactionId: string,
  ): Promise<PaymentStatusResult> {
    const response = await chapaRequest(
      `/transaction/verify/${encodeURIComponent(providerTransactionId)}`,
      { method: "GET" },
    );
    const status = mapStatus(response.data?.status ?? response.status);
    return {
      providerTransactionId,
      status,
      verifiedAmountMinor: toMinorUnits(response.data?.amount),
      failureReason:
        status === "FAILED"
          ? (response.message ?? "Chapa payment failed")
          : undefined,
    };
  }

  async handleWebhook(
    payload: unknown,
    headers: Record<string, string>,
  ): Promise<WebhookPayload | null> {
    const secret = process.env.CHAPA_WEBHOOK_SECRET;
    const signature =
      headers["x-chapa-signature"] ?? headers["chapa-signature"];
    if (!secret || !signature) return null;

    const expected = createHmac("sha256", secret)
      .update(JSON.stringify(payload))
      .digest("hex");
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);
    if (
      expectedBuffer.length !== signatureBuffer.length ||
      !timingSafeEqual(expectedBuffer, signatureBuffer)
    ) {
      return null;
    }

    const data = payload as {
      tx_ref?: string;
      trx_ref?: string;
      status?: string;
      amount?: string | number;
    };
    const providerTransactionId = data.tx_ref ?? data.trx_ref;
    if (!providerTransactionId) return null;

    return {
      providerTransactionId,
      status: mapStatus(data.status),
      amountMinor: toMinorUnits(data.amount) ?? 0,
      rawPayload: payload,
    };
  }

  async refundPayment(): Promise<void> {
    throw new Error("Chapa refunds are not implemented");
  }
}

let chapaProviderInstance: ChapaPaymentProvider | null = null;

export function getChapaPaymentProvider(): ChapaPaymentProvider {
  if (!chapaProviderInstance)
    chapaProviderInstance = new ChapaPaymentProvider();
  return chapaProviderInstance;
}
