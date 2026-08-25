import type { PayoutAccount } from "@/lib/domain/types";
import { getPaymentProvider } from "@/lib/payments";

export interface SupportedBank {
  id: string;
  name: string;
  code: string;
  slug?: string;
  country?: string;
}

export const FALLBACK_ETHIOPIAN_BANKS: SupportedBank[] = [
  { id: "cbe", name: "Commercial Bank of Ethiopia (CBE)", code: "cbe", slug: "cbe" },
  { id: "telebirr", name: "Telebirr", code: "telebirr", slug: "telebirr" },
  { id: "cbebirr", name: "CBE Birr", code: "cbebirr", slug: "cbebirr" },
  { id: "abyssinia", name: "Bank of Abyssinia (BOA)", code: "abyssinia", slug: "abyssinia" },
  { id: "awash", name: "Awash Bank", code: "awash", slug: "awash" },
  { id: "dashen", name: "Dashen Bank", code: "dashen", slug: "dashen" },
  { id: "mpesa", name: "M-Pesa (Safaricom)", code: "mpesa", slug: "mpesa" },
  { id: "coop", name: "Cooperative Bank of Oromia (COOP)", code: "coop", slug: "coop" },
  { id: "amhara", name: "Amhara Bank", code: "amhara", slug: "amhara" },
  { id: "enat", name: "Enat Bank", code: "enat", slug: "enat" },
];

const CHAPA_API_URL = "https://api.chapa.co/v1";

let cachedBanks: { data: SupportedBank[]; expiresAt: number } | null = null;

function getSecretKey(): string | null {
  return process.env.CHAPA_SECRET_KEY ?? null;
}

/**
 * Dynamically retrieves the list of supported payout banks from Chapa.
 * Falls back safely to the top 10 Ethiopian institutions if Chapa API is unreachable
 * or running in mock/local mode without API keys.
 */
export async function fetchSupportedBanks(): Promise<SupportedBank[]> {
  const now = Date.now();
  if (cachedBanks && cachedBanks.expiresAt > now) {
    return cachedBanks.data;
  }

  const secretKey = getSecretKey();
  if (!secretKey) {
    return FALLBACK_ETHIOPIAN_BANKS;
  }

  try {
    const response = await fetch(`${CHAPA_API_URL}/banks`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });


    if (!response.ok) {
      console.warn(`Chapa bank list fetch returned ${response.status}. Using fallback.`);
      return FALLBACK_ETHIOPIAN_BANKS;
    }

    const json = (await response.json()) as {
      status?: string;
      data?: Array<{
        id?: string | number;
        name?: string;
        code?: string;
        slug?: string;
        country?: string;
      }>;
    };

    if (json.data && Array.isArray(json.data) && json.data.length > 0) {
      const mapped: SupportedBank[] = json.data.map((bank) => ({
        id: String(bank.id ?? bank.code ?? bank.slug ?? bank.name),
        name: bank.name ?? "Unknown Bank",
        code: String(bank.code ?? bank.slug ?? bank.id),
        slug: bank.slug,
        country: bank.country ?? "ET",
      }));

      cachedBanks = {
        data: mapped,
        expiresAt: now + 1000 * 60 * 60, // 1 hour cache
      };
      return mapped;
    }

    return FALLBACK_ETHIOPIAN_BANKS;
  } catch (error) {
    console.warn("Failed to fetch Chapa banks:", error);
    return FALLBACK_ETHIOPIAN_BANKS;
  }
}

export interface InitiatePayoutTransferInput {
  payoutId: string;
  amountMinor: number;
  currency: string;
  account: PayoutAccount;
  reference?: string;
}

export interface InitiatePayoutTransferResult {
  status: "PROCESSING" | "AWAITING_ADMIN_APPROVAL" | "COMPLETED" | "FAILED";
  transferReference: string;
  message?: string;
  rawResponse?: unknown;
}

/**
 * Initiates an outbound payout transfer using Chapa's Transfer API:
 * POST https://api.chapa.co/v1/transfers
 *
 * Payload mapping strictly adheres to Chapa specifications:
 * - account_name: string (Account holder full name)
 * - account_number: string (Account number or mobile wallet number)
 * - amount: number (Amount in major ETB units)
 * - currency: "ETB"
 * - reference: string (Unique transaction reference)
 * - bank_code: string (Bank slug or code)
 */
export async function initiatePayoutTransfer(
  input: InitiatePayoutTransferInput
): Promise<InitiatePayoutTransferResult> {
  const transferReference =
    input.reference ?? `payout-${input.payoutId}-${Date.now().toString(36)}`;
  const secretKey = getSecretKey();
  const providerName = getPaymentProvider().name;

  // Mock / simulation mode if running mock payment provider or no secret key
  if (providerName === "mock" || !secretKey) {
    // Check for simulated test triggers
    if (input.account.accountName.toLowerCase().includes("mock-2fa") ||
        input.account.accountName.toLowerCase().includes("mock-otp")) {
      return {
        status: "AWAITING_ADMIN_APPROVAL",
        transferReference,
        message: "Simulated 2FA / OTP approval required on Chapa Dashboard",
      };
    }

    if (input.account.accountName.toLowerCase().includes("mock-fail")) {
      return {
        status: "FAILED",
        transferReference,
        message: "Simulated transfer failure",
      };
    }

    return {
      status: "PROCESSING",
      transferReference,
      message: "Transfer initiated (Mock Mode). Awaiting bank clearance.",
    };
  }

  // Live Chapa Transfers API request
  try {
    const payload = {
      account_name: input.account.accountName.trim(),
      account_number: input.account.accountNumber.trim(),
      amount: Number((input.amountMinor / 100).toFixed(2)),
      currency: input.currency || "ETB",
      reference: transferReference,
      bank_code: input.account.bankCode.trim(),
    };

    const response = await fetch(`${CHAPA_API_URL}/transfers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });


    const body = (await response.json().catch(() => null)) as {
      status?: string;
      message?: string;
      data?: {
        status?: string;
        reference?: string;
        id?: string;
      };
    } | null;

    if (!response.ok || !body) {
      const errorMsg = body?.message ?? `Chapa transfer failed with HTTP ${response.status}`;
      return {
        status: "FAILED",
        transferReference,
        message: errorMsg,
        rawResponse: body,
      };
    }

    const responseMessage = (body.message ?? "").toLowerCase();
    const dataStatus = (body.data?.status ?? body.status ?? "").toLowerCase();

    // Discriminate manual approval / 2FA / OTP requirement
    if (
      responseMessage.includes("approval") ||
      responseMessage.includes("otp") ||
      responseMessage.includes("2fa") ||
      dataStatus === "awaiting_approval" ||
      dataStatus === "pending_approval"
    ) {
      return {
        status: "AWAITING_ADMIN_APPROVAL",
        transferReference,
        message: body.message ?? "Transfer requires manual dashboard/OTP authorization on Chapa.",
        rawResponse: body,
      };
    }

    if (dataStatus === "success" || dataStatus === "completed" || dataStatus === "paid") {
      return {
        status: "COMPLETED",
        transferReference,
        message: "Transfer completed and confirmed immediately.",
        rawResponse: body,
      };
    }

    if (dataStatus === "failed" || dataStatus === "rejected") {
      return {
        status: "FAILED",
        transferReference,
        message: body.message ?? "Chapa rejected the transfer.",
        rawResponse: body,
      };
    }

    // Default initiated state awaiting bank settlement
    return {
      status: "PROCESSING",
      transferReference,
      message: body.message ?? "Transfer queued on Chapa. Awaiting bank clearance.",
      rawResponse: body,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Chapa transfer network error";
    return {
      status: "FAILED",
      transferReference,
      message: errorMsg,
    };
  }
}

export interface VerifyTransferResult {
  status: "SUCCESS" | "FAILED" | "PENDING";
  verifiedAmountMinor?: number;
  message?: string;
  rawResponse?: unknown;
}

/**
 * Queries Chapa's transfer verification endpoint:
 * GET https://api.chapa.co/v1/transfers/verify/{reference}
 */
export async function verifyPayoutTransfer(
  transferReference: string
): Promise<VerifyTransferResult> {
  const secretKey = getSecretKey();
  const providerName = getPaymentProvider().name;

  if (providerName === "mock" || !secretKey) {
    return {
      status: "SUCCESS",
      message: "Mock transfer auto-verified",
    };
  }

  try {
    const response = await fetch(
      `${CHAPA_API_URL}/transfers/verify/${encodeURIComponent(transferReference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const body = (await response.json().catch(() => null)) as {
      status?: string;
      message?: string;
      data?: {
        status?: string;
        amount?: string | number;
        currency?: string;
        account_name?: string;
        account_number?: string;
      };
    } | null;

    if (!response.ok || !body) {
      return {
        status: "PENDING",
        message: body?.message ?? `Verification HTTP ${response.status}`,
        rawResponse: body,
      };
    }

    const transferStatus = (body.data?.status ?? body.status ?? "").toLowerCase();

    if (transferStatus === "success" || transferStatus === "paid" || transferStatus === "completed") {
      const parsedAmount = body.data?.amount ? Math.round(Number(body.data.amount) * 100) : undefined;
      return {
        status: "SUCCESS",
        verifiedAmountMinor: parsedAmount,
        message: body.message ?? "Transfer successfully verified",
        rawResponse: body,
      };
    }

    if (transferStatus === "failed" || transferStatus === "cancelled" || transferStatus === "rejected") {
      return {
        status: "FAILED",
        message: body.message ?? "Transfer marked as failed by provider",
        rawResponse: body,
      };
    }

    return {
      status: "PENDING",
      message: body.message ?? "Transfer still processing",
      rawResponse: body,
    };
  } catch (error) {
    return {
      status: "PENDING",
      message: error instanceof Error ? error.message : "Verification request failed",
    };
  }
}
