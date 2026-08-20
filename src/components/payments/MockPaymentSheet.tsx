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
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/domain/money";
import { formatDate } from "@/lib/utils";
import { ArrowRightLeft, CheckCircle2, CreditCard, Loader2, ShieldCheck, XCircle } from "lucide-react";

type MockPaymentSheetProps = {
  open: boolean;
  loading: boolean;
  status: string;
  transactionId: string;
  amountMinor: number;
  dueDate: string;
  equbName: string;
  obligationLabel?: string;
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
  onOpenChange,
  onOutcome,
}: MockPaymentSheetProps) {
  const isFinal = status === "SUCCESS" || status === "FAILED" || status === "CANCELLED";

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
              Mock Stripe
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 px-6 py-6">
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

          <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:grid-cols-[auto,1fr] sm:items-start">
            <div className="rounded-full bg-white p-2 text-emerald-700 shadow-sm">
              <ShieldCheck className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-emerald-900">
                Safe mock checkout
              </p>
              <p className="text-sm text-emerald-800">
                This screen simulates a provider verification flow. Use it to
                mark the contribution as successful or failed during testing.
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
                      status === "SUCCESS" ? "text-emerald-800" : "text-rose-800",
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
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOutcome("FAILED")}
              loading={loading}
              disabled={isFinal}
              className="sm:min-w-40"
            >
              <XCircle className="mr-2 size-4" />
              Fail payment
            </Button>
            <Button
              type="button"
              onClick={() => onOutcome("SUCCESS")}
              loading={loading}
              disabled={isFinal}
              className="sm:min-w-40"
            >
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="mr-2 size-4" />
              )}
              Pay successfully
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
