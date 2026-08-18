import type { PaymentStatus } from "@/lib/domain/types";
import type { Currency, MoneyMinor } from "@/lib/domain/money";

export interface CreatePaymentInput {
  amountMinor: MoneyMinor;
  currency: Currency;
  userId: string;
  obligationId: string;
  equbId: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentResult {
  providerTransactionId: string;
  status: PaymentStatus;
  redirectUrl?: string;
  clientSecret?: string;
}

export interface PaymentStatusResult {
  providerTransactionId: string;
  status: PaymentStatus;
  verifiedAmountMinor?: MoneyMinor;
  failureReason?: string;
}

export interface WebhookPayload {
  providerTransactionId: string;
  status: PaymentStatus;
  amountMinor: MoneyMinor;
  rawPayload: unknown;
}

export interface PaymentProvider {
  readonly name: string;

  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;

  getPaymentStatus(providerTransactionId: string): Promise<PaymentStatusResult>;

  verifyPayment(providerTransactionId: string): Promise<PaymentStatusResult>;

  handleWebhook(payload: unknown, headers: Record<string, string>): Promise<WebhookPayload | null>;

  refundPayment(providerTransactionId: string, amountMinor?: MoneyMinor): Promise<void>;
}
