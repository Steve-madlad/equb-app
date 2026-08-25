"use client";

import { Button } from "@/components/ui/Button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatMoney } from "@/lib/domain/money";
import { formatDate } from "@/lib/utils";
import {
  ArrowRightLeft,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useRef } from "react";

type MockPaymentSheetProps = {
  open: boolean;
  loading: boolean;
  status: string;
  transactionId: string;
  amountMinor: number;
  dueDate: string;
  equbName: string;
  obligationLabel?: string;
  provider?: "mock" | "chapa";
  onChapaSuccess?: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onOutcome: (outcome: "SUCCESS" | "FAILED") => Promise<void>;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

export function MockPaymentSheet({
  open,
  loading,
  status,
  transactionId,
  amountMinor,
  dueDate,
  equbName,
  obligationLabel,
  provider = "mock",
  onChapaSuccess,
  onOpenChange,
  onOutcome,
}: MockPaymentSheetProps) {
  const chapaContainerRef = useRef<HTMLDivElement>(null);
  const isFinal =
    status === "SUCCESS" || status === "FAILED" || status === "CANCELLED";

  useEffect(() => {
    if (
      !open ||
      provider !== "chapa" ||
      isFinal ||
      !chapaContainerRef.current
    ) {
      return;
    }

    let cancelled = false;
    async function initializeChapa() {
      const publicKey = process.env.NEXT_PUBLIC_CHAPA_PUBLIC_KEY;
      if (!publicKey || !chapaContainerRef.current) return;

      // @ts-ignore
      const module = await import("@chapa_et/inline.js/lib/inline.js");
      if (cancelled || !chapaContainerRef.current) return;
      chapaContainerRef.current.replaceChildren();
      const ChapaCheckout = (module.default ?? module) as unknown as new (
        options: Record<string, unknown>,
      ) => {
        initialize: (containerId: string) => void;
      };

      const chapa = new ChapaCheckout({
        publicKey,
        amount: (amountMinor / 100).toFixed(2),
        currency: "ETB",
        tx_ref: transactionId,
        availablePaymentMethods: ["cbebirr", "boa", "telebirr", "mpesa"],
        customizations: {
          buttonText: "Pay contribution",
          successMessage: "Your contribution was verified.",
          styles: `
            .chapa-pay-button { background: #047857; color: white; border-radius: 0.75rem; font-weight: 600; min-height: 2.75rem; }
            .chapa-pay-button:hover { background: #065f46; }
          `,
        },
        callbackUrl: `${window.location.origin}/api/webhooks/payments`,
        returnUrl: `${window.location.origin}/payments/chapa/complete?tx_ref=${encodeURIComponent(transactionId)}`,
        onSuccessfulPayment: onChapaSuccess,
        onPaymentFailure: () => undefined,
        onClose: () => undefined,
      });
      chapa.initialize("chapa-inline-form");
    }

    initializeChapa().catch(() => undefined);
    return () => {
      cancelled = true;
      chapaContainerRef.current?.replaceChildren();
    };
  }, [amountMinor, isFinal, onChapaSuccess, open, provider, transactionId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl" side="right">
        <SheetHeader className="border-b border-border pb-5">
          <div className="flex items-start justify-between gap-4 pr-10">
            <div className="space-y-1">
              <SheetTitle>Pay contribution</SheetTitle>
              <SheetDescription>
                Complete the contribution without leaving the Equb details page.
              </SheetDescription>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {provider === "chapa" ? "Chapa" : "Mock Stripe"}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 overflow-y-auto px-6 py-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {equbName}
                </p>
                <h3 className="text-xl font-semibold text-gray-900">
                  {formatMoney(amountMinor)}
                </h3>
              </div>
              <div className="rounded-full bg-gray-100 p-3 text-gray-700">
                <CreditCard className="size-5" />
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-xl bg-gray-50 p-4">
              <DetailRow label="Due date" value={formatDate(dueDate)} />
              <DetailRow
                label="Transaction"
                value={transactionId.slice(0, 12).toUpperCase()}
              />
              <DetailRow label="Status" value={status} />
              {obligationLabel ? (
                <DetailRow label="Reference" value={obligationLabel} />
              ) : null}
            </div>
          </div>

          {provider === "chapa" && !isFinal ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div id="chapa-inline-form" ref={chapaContainerRef} />
              {!process.env.NEXT_PUBLIC_CHAPA_PUBLIC_KEY ? (
                <p className="text-sm text-rose-700">
                  Chapa is not configured. Add NEXT_PUBLIC_CHAPA_PUBLIC_KEY to
                  the environment.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:grid-cols-[auto,1fr] sm:items-start">
            <div className="rounded-full bg-white p-2 text-emerald-700 shadow-sm">
              <ShieldCheck className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-emerald-900">
                {provider === "chapa"
                  ? "Secure Chapa checkout"
                  : "Safe mock checkout"}
              </p>
              <p className="text-sm text-emerald-800">
                {provider === "chapa"
                  ? "Choose CBE, BOA, Telebirr, or M-Pesa and complete the payment securely."
                  : "This screen simulates a provider verification flow. Use it to mark the contribution as successful or failed during testing."}
              </p>
            </div>
          </div>

          {isFinal ? (
            <div
              className={[
                "rounded-2xl border p-4",
                status === "SUCCESS"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-rose-200 bg-rose-50",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                {status === "SUCCESS" ? (
                  <CheckCircle2 className="mt-0.5 size-5 text-emerald-700" />
                ) : (
                  <XCircle className="mt-0.5 size-5 text-rose-700" />
                )}
                <div className="space-y-1">
                  <p
                    className={[
                      "font-semibold",
                      status === "SUCCESS"
                        ? "text-emerald-800"
                        : "text-rose-800",
                    ].join(" ")}
                  >
                    {status === "SUCCESS"
                      ? "Payment verified"
                      : "Payment not completed"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {status === "SUCCESS"
                      ? "The contribution has been recorded and the pool will update after refresh."
                      : "You can retry the payment flow from the Equb details page."}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <SheetFooter className="border-t border-border">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Close
          </Button>
          {provider === "mock" ? (
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOutcome("FAILED")}
                loading={loading}
                disabled={isFinal}
                className="sm:min-w-40"
              >
                {!loading && <XCircle className="mr-2 size-4" />}
                Fail payment
              </Button>
              <Button
                type="button"
                onClick={() => onOutcome("SUCCESS")}
                loading={loading}
                disabled={isFinal}
                className="sm:min-w-40"
              >
                {!loading && <ArrowRightLeft className="mr-2 size-4" />}
                Pay successfully
              </Button>
            </div>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
