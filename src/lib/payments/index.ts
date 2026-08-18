import type { PaymentProvider } from "./PaymentProvider";
import { generateIdempotencyKey, getMockPaymentProvider } from "./MockPaymentProvider";

export { generateIdempotencyKey };

export type PaymentProviderType = "mock" | "telebirr" | "chapa";

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER ?? "mock";

  switch (provider) {
    case "mock":
      return getMockPaymentProvider();
    // Future: case "telebirr": return new TelebirrPaymentProvider();
    // Future: case "chapa": return new ChapaPaymentProvider();
    default:
      return getMockPaymentProvider();
  }
}

/**
 * Integration point for real payment providers.
 *
 * To add a real provider:
 * 1. Implement PaymentProvider interface in src/lib/payments/{Provider}PaymentProvider.ts
 * 2. Add case in getPaymentProvider() above
 * 3. Set PAYMENT_PROVIDER env variable
 * 4. Configure webhook endpoint at /api/webhooks/payments
 *
 * The Equb domain services (paymentService, ledgerService) do NOT need changes.
 */
