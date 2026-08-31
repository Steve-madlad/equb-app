import type { PaymentStatus } from '@/lib/domain/types';
import { getUserProfile } from '@/lib/firebase/auth';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatusResult,
  WebhookPayload,
} from './PaymentProvider';

const CHAPA_API_URL = 'https://api.chapa.co/v1';

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
  if (!key) throw new Error('CHAPA_SECRET_KEY is not set');
  return key;
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

function toMinorUnits(amount: string | number | undefined): number | undefined {
  if (amount === undefined) return undefined;
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : undefined;
}

function mapStatus(status: string | undefined): PaymentStatus {
  switch (status?.toLowerCase()) {
    case 'success':
      return 'SUCCESS';
    case 'failed':
    case 'cancelled':
    case 'canceled':
      return 'FAILED';
    case 'pending':
      return 'PENDING';
    default:
      return 'INITIATED';
  }
}

function formatChapaError(body: any, status: number): string {
  if (!body) return `Chapa request failed with status ${status}`;
  if (typeof body.message === 'string') return body.message;
  if (body.message && typeof body.message === 'object') {
    const fieldErrors = Object.entries(body.message)
      .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
      .join('; ');
    if (fieldErrors) return `Chapa validation error - ${fieldErrors}`;
  }
  if (body.data && typeof body.data === 'object') {
    const fieldErrors = Object.entries(body.data)
      .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
      .join('; ');
    if (fieldErrors) return `Chapa error - ${fieldErrors}`;
  }
  try {
    return JSON.stringify(body);
  } catch {
    return `Chapa request failed (${status})`;
  }
}

async function chapaRequest(path: string, init: RequestInit): Promise<ChapaResponse> {
  const url = `${CHAPA_API_URL}${path}`;
  console.log(`[Chapa] Sending ${init.method || 'GET'} to ${url}:`, init.body);

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  const body = (await response.json().catch(() => null)) as ChapaResponse | null;

  console.log(
    `[Chapa] Response status ${response.status} from ${url}:`,
    JSON.stringify(body, null, 2),
  );

  if (!response.ok || !body || body.status === 'failed') {
    const errorMsg = formatChapaError(body, response.status);
    console.error(`[Chapa Error] ${errorMsg}`, {
      status: response.status,
      body,
    });
    throw new Error(errorMsg);
  }
  return body;
}

export class ChapaPaymentProvider implements PaymentProvider {
  readonly name = 'chapa';

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const providerTransactionId = `equb-${Date.now()}-${randomBytes(6).toString('hex')}`;
    const profile = await getUserProfile(input.userId).catch(() => null);
    const names = (profile?.displayName || 'Equb Member').trim().split(' ');
    const firstName = names[0] || 'Equb';
    const lastName = names.slice(1).join(' ') || 'Member';
    let email = profile?.email?.trim();
    if (!email || !email.includes('@')) {
      email = `${input.userId}@equb.app`;
    }

    // Clean phone number format for Chapa (e.g. 0912345678 or 251912345678)
    let phoneNumber: string | undefined = profile?.phone?.trim();
    if (phoneNumber) {
      phoneNumber = phoneNumber.replace(/[\s\-()]/g, '');
      if (phoneNumber.startsWith('+')) {
        phoneNumber = phoneNumber.slice(1);
      }
      // If not valid Ethiopian phone format, omit to avoid Chapa rejecting the transaction
      if (!/^(\+?251|0)?[79]\d{8}$/.test(phoneNumber)) {
        console.warn(`[Chapa] Omitting non-standard phone number: ${phoneNumber}`);
        phoneNumber = undefined;
      }
    }

    const payload: Record<string, unknown> = {
      amount: (input.amountMinor / 100).toFixed(2),
      currency: input.currency || 'ETB',
      email,
      first_name: firstName,
      last_name: lastName,
      tx_ref: providerTransactionId,
      callback_url: `${getAppUrl()}/api/webhooks/payments`,
      return_url: `${getAppUrl()}/payments/chapa/complete?tx_ref=${encodeURIComponent(providerTransactionId)}`,
      customization: {
        title: 'Equb Payment',
        description: 'Contribution',
      },
    };

    if (phoneNumber) {
      payload.phone_number = phoneNumber;
    }
    if (input.metadata) {
      payload.meta = input.metadata;
    }

    const response = await chapaRequest('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const redirectUrl = response.data?.checkout_url;
    if (!redirectUrl) {
      throw new Error('Chapa did not return a hosted checkout URL');
    }

    return {
      providerTransactionId,
      status: 'INITIATED',
      redirectUrl,
    };
  }

  async getPaymentStatus(providerTransactionId: string): Promise<PaymentStatusResult> {
    return this.verifyPayment(providerTransactionId);
  }

  async verifyPayment(providerTransactionId: string): Promise<PaymentStatusResult> {
    const response = await chapaRequest(
      `/transaction/verify/${encodeURIComponent(providerTransactionId)}`,
      { method: 'GET' },
    );
    const status = mapStatus(response.data?.status ?? response.status);
    return {
      providerTransactionId,
      status,
      verifiedAmountMinor: toMinorUnits(response.data?.amount),
      failureReason: status === 'FAILED' ? (response.message ?? 'Chapa payment failed') : undefined,
    };
  }

  async handleWebhook(
    payload: unknown,
    headers: Record<string, string>,
  ): Promise<WebhookPayload | null> {
    const secret = process.env.CHAPA_WEBHOOK_SECRET;
    const signature = headers['x-chapa-signature'] ?? headers['chapa-signature'];
    if (!secret || !signature) return null;

    const expected = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
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
    throw new Error('Chapa refunds are not implemented');
  }
}

let chapaProviderInstance: ChapaPaymentProvider | null = null;

export function getChapaPaymentProvider(): ChapaPaymentProvider {
  if (!chapaProviderInstance) chapaProviderInstance = new ChapaPaymentProvider();
  return chapaProviderInstance;
}
