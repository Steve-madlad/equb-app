import type { PaymentRecord, PaymentStatus } from "@/lib/domain/types";
import { COLLECTIONS, getAdminDb } from "@/lib/firebase/admin";
import { randomBytes } from "crypto";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatusResult,
  WebhookPayload,
} from "./PaymentProvider";

interface MockPaymentState {
  providerTransactionId: string;
  amountMinor: number;
  currency: string;
  userId: string;
  obligationId: string;
  equbId: string;
  status: PaymentStatus;
  idempotencyKey: string;
  createdAt: string;
  failureReason?: string;
}

/** Local cache backed by Firestore so separate route runtimes share state. */
const mockPaymentStore = new Map<string, MockPaymentState>();

let mockCounter = 0;

function generateMockTransactionId(): string {
  mockCounter += 1;
  const year = new Date().getFullYear();
  return `MOCK-${year}-${String(mockCounter).padStart(6, "0")}`;
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const existing = [...mockPaymentStore.values()].find(
      (p) => p.idempotencyKey === input.idempotencyKey,
    );
    if (existing) {
      return {
        providerTransactionId: existing.providerTransactionId,
        status: existing.status,
        redirectUrl: `/payments/mock/${existing.providerTransactionId}`,
      };
    }

    const providerTransactionId = generateMockTransactionId();
    const state: MockPaymentState = {
      providerTransactionId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      userId: input.userId,
      obligationId: input.obligationId,
      equbId: input.equbId,
      status: "INITIATED",
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date().toISOString(),
    };
    mockPaymentStore.set(providerTransactionId, state);
    await this.saveState(state);

    return {
      providerTransactionId,
      status: "INITIATED",
      redirectUrl: `/payments/mock/${providerTransactionId}`,
    };
  }

  async getPaymentStatus(
    providerTransactionId: string,
  ): Promise<PaymentStatusResult> {
    const state = await this.getState(providerTransactionId);
    if (!state)
      throw new Error(`Mock payment not found: ${providerTransactionId}`);
    return this.toStatusResult(state);
  }

  async verifyPayment(
    providerTransactionId: string,
  ): Promise<PaymentStatusResult> {
    const state = await this.getState(providerTransactionId);
    if (!state)
      throw new Error(`Mock payment not found: ${providerTransactionId}`);

    if (state.status === "INITIATED" || state.status === "PENDING") {
      state.status = "SUCCESS";
      mockPaymentStore.set(providerTransactionId, state);
      await this.saveState(state);
    }

    return this.toStatusResult(state);
  }

  async handleWebhook(
    payload: unknown,
    _headers: Record<string, string>,
  ): Promise<WebhookPayload | null> {
    const data = payload as {
      providerTransactionId?: string;
      status?: PaymentStatus;
    };
    if (!data.providerTransactionId) return null;

    const state = await this.getState(data.providerTransactionId);
    if (!state) return null;

    if (data.status) {
      state.status = data.status;
      mockPaymentStore.set(data.providerTransactionId, state);
      await this.saveState(state);
    }

    return {
      providerTransactionId: state.providerTransactionId,
      status: state.status,
      amountMinor: state.amountMinor,
      rawPayload: payload,
    };
  }

  async refundPayment(providerTransactionId: string): Promise<void> {
    const state = await this.getState(providerTransactionId);
    if (!state)
      throw new Error(`Mock payment not found: ${providerTransactionId}`);
    state.status = "CANCELLED";
    mockPaymentStore.set(providerTransactionId, state);
    await this.saveState(state);
  }

  /** Mock-specific: simulate user confirming payment in UI */
  async simulatePayment(
    providerTransactionId: string,
    outcome: "SUCCESS" | "FAILED" | "CANCELLED",
  ): Promise<PaymentStatusResult> {
    const state = await this.getState(providerTransactionId);
    if (!state)
      throw new Error(`Mock payment not found: ${providerTransactionId}`);

    state.status = outcome;
    if (outcome === "FAILED") state.failureReason = "Simulated payment failure";
    mockPaymentStore.set(providerTransactionId, state);
    await this.saveState(state);

    return this.toStatusResult(state);
  }

  getPaymentForRedirect(
    providerTransactionId: string,
  ): MockPaymentState | undefined {
    return mockPaymentStore.get(providerTransactionId);
  }

  private async getState(
    providerTransactionId: string,
  ): Promise<MockPaymentState | undefined> {
    const cached = mockPaymentStore.get(providerTransactionId);
    if (cached) return cached;

    const doc = await getAdminDb()
      .collection(COLLECTIONS.mockPayments)
      .doc(`mock-${providerTransactionId}`)
      .get();
    if (doc.exists) {
      const state = doc.data() as MockPaymentState;
      mockPaymentStore.set(providerTransactionId, state);
      return state;
    }

    const paymentSnapshot = await getAdminDb()
      .collection(COLLECTIONS.payments)
      .where("providerTransactionId", "==", providerTransactionId)
      .limit(1)
      .get();
    if (paymentSnapshot.empty) return undefined;

    const payment = paymentSnapshot.docs[0].data() as PaymentRecord;
    const state: MockPaymentState = {
      providerTransactionId: payment.providerTransactionId,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      userId: payment.userId,
      obligationId: payment.obligationId,
      equbId: payment.equbId,
      status: payment.status,
      idempotencyKey: payment.idempotencyKey,
      createdAt: payment.initiatedAt,
    };
    mockPaymentStore.set(providerTransactionId, state);
    await this.saveState(state);
    return state;
  }

  private async saveState(state: MockPaymentState): Promise<void> {
    await getAdminDb()
      .collection(COLLECTIONS.mockPayments)
      .doc(`mock-${state.providerTransactionId}`)
      .set(state);
  }

  private toStatusResult(state: MockPaymentState): PaymentStatusResult {
    return {
      providerTransactionId: state.providerTransactionId,
      status: state.status,
      verifiedAmountMinor:
        state.status === "SUCCESS" ? state.amountMinor : undefined,
      failureReason: state.failureReason,
    };
  }
}

/** Singleton for development. In production, inject via factory. */
let mockProviderInstance: MockPaymentProvider | null = null;

export function getMockPaymentProvider(): MockPaymentProvider {
  if (!mockProviderInstance) {
    mockProviderInstance = new MockPaymentProvider();
  }
  return mockProviderInstance;
}

export function generateIdempotencyKey(): string {
  return randomBytes(16).toString("hex");
}
