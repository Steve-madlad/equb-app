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
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
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
      isFinal
    ) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const publicKey =
        process.env.NEXT_PUBLIC_CHAPA_PUBLIC_KEY ||
        "CHAPUBK_TEST-jXkTlp1Ppz2eosDZxHwi7g33NMisHZ7k";
      const container = document.getElementById("chapa-inline-form");
      if (!publicKey || !container) return;

      try {
        // @ts-ignore
        await import("@chapa_et/inline.js/lib/inline.js");
        if (cancelled) return;

        const ChapaConstructor = (window as any).ChapaCheckout;
        if (!ChapaConstructor) {
          console.error("ChapaCheckout constructor not found on window");
          return;
        }

        container.replaceChildren();

        const chapa = new ChapaConstructor({
          publicKey,
          amount: (amountMinor / 100).toFixed(2),
          currency: "ETB",
          tx_ref: transactionId,
          availablePaymentMethods: ["telebirr", "cbebirr", "ebirr", "mpesa"],
          customizations: {
            buttonText: `Pay ${formatMoney(amountMinor)}`,
            successMessage: "Your contribution was verified.",
            styles: `
              .chapa-pay-button { 
                background: linear-gradient(to right, #10b981, #0d9488) !important; 
                color: #ffffff !important; 
                border-radius: 0.75rem !important; 
                font-weight: 700 !important; 
                font-size: 0.875rem !important;
                min-height: 2.75rem !important; 
                border: none !important;
                cursor: pointer !important;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25) !important;
                margin-top: 1rem !important;
                transition: all 0.2s !important;
              }
              .chapa-pay-button:hover { 
                opacity: 0.95 !important;
                transform: translateY(-1px) !important;
              }
              .chapa-phone-input-wrapper {
                border-radius: 0.75rem !important;
                border: 1px solid rgba(148, 163, 184, 0.3) !important;
                background: rgba(241, 245, 249, 0.8) !important;
              }
              .dark .chapa-phone-input-wrapper {
                background: rgba(15, 23, 42, 0.6) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
              }
              .chapa-phone-input {
                background: transparent !important;
                color: inherit !important;
              }
              .chapa-phone-prefix {
                background: transparent !important;
              }
              .chapa-payment-methods-grid {
                display: flex !important;
                gap: 8px !important;
                justify-content: space-between !important;
                margin: 12px 0 !important;
              }
              .chapa-payment-method {
                border-radius: 0.75rem !important;
                cursor: pointer !important;
                transition: all 0.2s !important;
                border: 1px solid rgba(148, 163, 184, 0.3) !important;
                background: rgba(255, 255, 255, 0.5) !important;
              }
              .dark .chapa-payment-method {
                background: rgba(15, 23, 42, 0.6) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
              }
              .chapa-selected {
                border-color: #10b981 !important;
                background: rgba(16, 185, 129, 0.1) !important;
              }
            `,
          },
          callbackUrl: `${window.location.origin}/api/webhooks/payments`,
          returnUrl: `${window.location.origin}/payments/chapa/complete?tx_ref=${encodeURIComponent(transactionId)}`,
          onSuccessfulPayment: onChapaSuccess,
          onPaymentFailure: (err: any) => console.error("[Chapa inline error]", err),
          onClose: () => undefined,
        });

        chapa.initialize("chapa-inline-form");
      } catch (err) {
        console.error("Failed to initialize Chapa inline checkout:", err);
      }
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [amountMinor, isFinal, onChapaSuccess, open, provider, transactionId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10" side="right">
        <SheetHeader className="border-b border-slate-200 dark:border-white/10 pb-5">
          <div className="flex items-start justify-between gap-4 pr-10">
            <div className="space-y-1">
              <SheetTitle className="text-slate-900 dark:text-white">Pay contribution</SheetTitle>
              <SheetDescription className="text-slate-500 dark:text-slate-400 text-xs">
                Complete the contribution without leaving the Equb details page.
              </SheetDescription>
            </div>
            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {provider === "chapa" ? "Chapa" : "Mock Checkout"}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 overflow-y-auto px-6 py-6">
          <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {equbName}
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {formatMoney(amountMinor)}
                </h3>
              </div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-600 dark:text-emerald-400">
                <CreditCard className="size-5" />
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-xl bg-white dark:bg-slate-950/50 p-4 border border-slate-200/60 dark:border-white/5">
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
            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/60 p-5 shadow-sm">
              <div
                id="chapa-inline-form"
                ref={chapaContainerRef}
                className="min-h-[120px] flex items-center justify-center text-xs text-slate-500 dark:text-slate-400"
              >
                <div className="flex items-center gap-2">
                  <div className="size-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading payment channels...</span>
                </div>
              </div>
              {!process.env.NEXT_PUBLIC_CHAPA_PUBLIC_KEY ? (
                <p className="text-sm text-rose-600 dark:text-rose-400 mt-2">
                  Chapa is not configured. Add NEXT_PUBLIC_CHAPA_PUBLIC_KEY to
                  the environment.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:grid-cols-[auto,1fr] sm:items-start">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">
                {provider === "chapa"
                  ? "Secure Chapa Checkout"
                  : "Safe Sandbox Verification"}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {provider === "chapa"
                  ? "Choose CBE, BOA, Telebirr, or M-Pesa and complete the payment securely."
                  : "This screen simulates a provider verification flow. Click either button below to record the outcome."}
              </p>
            </div>
          </div>

          {isFinal ? (
            <div
              className={[
                "rounded-2xl border p-4",
                status === "SUCCESS"
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-rose-500/30 bg-rose-500/10",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                {status === "SUCCESS" ? (
                  <CheckCircle2 className="mt-0.5 size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="mt-0.5 size-5 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <div className="space-y-1">
                  <p
                    className={[
                      "font-bold text-sm",
                      status === "SUCCESS"
                        ? "text-emerald-800 dark:text-emerald-300"
                        : "text-rose-800 dark:text-rose-300",
                    ].join(" ")}
                  >
                    {status === "SUCCESS"
                      ? "Payment verified"
                      : "Payment not completed"}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {status === "SUCCESS"
                      ? "The contribution has been recorded and the pool will update after refresh."
                      : "You can retry the payment flow from the Equb details page."}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <SheetFooter className="border-t border-slate-200 dark:border-white/10 gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-xl text-xs"
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
                className="rounded-xl text-xs hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 sm:min-w-36"
              >
                {!loading && <XCircle className="mr-1.5 size-3.5" />}
                Fail payment
              </Button>
              <Button
                type="button"
                onClick={() => onOutcome("SUCCESS")}
                loading={loading}
                disabled={isFinal}
                className="rounded-xl text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold sm:min-w-36 shadow-md shadow-emerald-500/20"
              >
                {!loading && <ArrowRightLeft className="mr-1.5 size-3.5" />}
                Pay successfully
              </Button>
            </div>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
