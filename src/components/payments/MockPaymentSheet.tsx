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
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
  redirectUrl?: string;
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
  redirectUrl,
  onChapaSuccess,
  onOpenChange,
  onOutcome,
}: MockPaymentSheetProps) {
  const chapaContainerRef = useRef<HTMLDivElement>(null);
  const [verifying, setVerifying] = useState(false);
  const isFinal =
    status === "SUCCESS" || status === "FAILED" || status === "CANCELLED";

  useEffect(() => {
    if (!open || provider !== "chapa" || isFinal) {
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

        // Use a unique tx_ref for inline charge so it doesn't collide with the initialized transaction
        const inlineTxRef = `${transactionId}-inline-${Date.now().toString(36)}`;

        const chapa = new ChapaConstructor({
          publicKey,
          amount: (amountMinor / 100).toFixed(2),
          currency: "ETB",
          tx_ref: inlineTxRef,
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
          onSuccessfulPayment: () => {
            if (onChapaSuccess) {
              onChapaSuccess();
            }
          },
          onPaymentFailure: (err: any) => {
            console.error("[Chapa inline error]", err);
            toast.error(typeof err === "string" ? err : "Chapa payment attempt failed");
          },
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

  const handleManualVerify = async () => {
    if (!onChapaSuccess) return;
    setVerifying(true);
    try {
      await onChapaSuccess();
    } catch {
      toast.error("Payment not yet confirmed by Chapa. Please complete checkout.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10" side="right">
        <SheetHeader className="border-b border-slate-200 dark:border-white/10 pb-5">
          <div className="flex items-start justify-between gap-4 pr-10">
            <div className="space-y-1">
              <SheetTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {provider === "chapa"
                  ? "Pay via Chapa"
                  : "Simulated Provider Payment"}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500 dark:text-slate-400">
                {provider === "chapa"
                  ? "Select Telebirr, CBE Birr, or M-Pesa below, or use Chapa's full hosted checkout."
                  : "Review the contribution details and trigger a sandbox payment result."}
              </SheetDescription>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CreditCard className="size-6" />
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-6 overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
          {/* Amount and Equb Summary */}
          <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-slate-50 dark:bg-slate-950/60 p-6 space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Contribution Total
              </span>
              <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {formatMoney(amountMinor)}
              </p>
            </div>
            <div className="h-px bg-slate-200 dark:bg-white/10" />
            <div className="space-y-2.5">
              <DetailRow label="Equb Group" value={equbName} />
              <DetailRow label="Due Date" value={formatDate(dueDate)} />
              <DetailRow label="Transaction Ref" value={transactionId} />
              {obligationLabel ? (
                <DetailRow label="Reference" value={obligationLabel} />
              ) : null}
            </div>
          </div>

          {/* Chapa Hosted Link Callout */}
          {provider === "chapa" && redirectUrl && !isFinal ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                  Official Chapa Hosted Checkout
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                You can also pay directly on Chapa’s checkout page with simulated OTPs and all banking options.
              </p>
              <a
                href={redirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <span>Open Chapa Hosted Checkout</span>
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          ) : null}

          {/* Inline Form */}
          {provider === "chapa" && !isFinal ? (
            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/60 p-5 shadow-sm space-y-3">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Or Pay In-App via Mobile Money:
              </p>
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
                  ? "Choose Telebirr, CBE Birr, or M-Pesa and complete the payment securely."
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
            disabled={loading || verifying}
            className="rounded-xl text-xs"
          >
            Close
          </Button>

          {provider === "chapa" && !isFinal ? (
            <Button
              type="button"
              onClick={handleManualVerify}
              loading={verifying}
              className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20"
            >
              {!verifying && <RefreshCw className="mr-1.5 size-3.5" />}
              I Have Paid - Verify Status
            </Button>
          ) : null}

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
