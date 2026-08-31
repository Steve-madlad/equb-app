'use client';

import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatMoney } from '@/lib/domain/money';
import { formatDate } from '@/lib/utils';
import {
  ArrowRightLeft,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

type PaymentConfirmModalProps = {
  open: boolean;
  loading: boolean;
  status: string;
  transactionId: string;
  amountMinor: number;
  dueDate: string;
  equbName: string;
  obligationLabel?: string;
  provider?: 'mock' | 'chapa';
  redirectUrl?: string;
  onChapaSuccess?: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onOutcome: (outcome: 'SUCCESS' | 'FAILED') => Promise<void>;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="max-w-[60%] truncate font-semibold text-slate-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}

export function PaymentConfirmModal({
  open,
  loading,
  status,
  transactionId,
  amountMinor,
  dueDate,
  equbName,
  obligationLabel,
  provider = 'mock',
  redirectUrl,
  onChapaSuccess,
  onOpenChange,
  onOutcome,
}: PaymentConfirmModalProps) {
  const [verifying, setVerifying] = useState(false);
  const isFinal = status === 'SUCCESS' || status === 'FAILED' || status === 'CANCELLED';

  const handleManualVerify = async () => {
    if (!onChapaSuccess) return;
    setVerifying(true);
    try {
      await onChapaSuccess();
    } catch {
      toast.error('Payment not yet confirmed by Chapa. Please complete checkout.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100vw-1rem),72rem)] max-w-none overflow-hidden rounded-[2rem] border-slate-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-slate-950">
        <div className="grid max-h-[90vh] overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex min-h-0 flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-6 py-6 text-white sm:px-8">
            <DialogHeader className="gap-4 border-b border-white/10 pb-5 text-left">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold tracking-[0.24em] text-emerald-200 uppercase">
                    <CreditCard className="size-3.5" />
                    {provider === 'chapa' ? 'Chapa Payment' : 'Sandbox Payment'}
                  </div>
                  <DialogTitle className="max-w-xl text-2xl leading-tight font-black tracking-tight text-white sm:text-3xl">
                    {provider === 'chapa'
                      ? 'Complete your contribution securely'
                      : 'Review and test the payment flow'}
                  </DialogTitle>
                  <DialogDescription className="max-w-2xl text-sm leading-relaxed text-slate-300">
                    {provider === 'chapa'
                      ? "Continue to Chapa's hosted checkout, then return here while we verify and record your contribution."
                      : 'This dialog simulates the final payment outcome so we can verify the contribution experience end to end.'}
                  </DialogDescription>
                </div>
                <div className="shrink-0 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-300">
                  <CreditCard className="size-7" />
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 space-y-5 overflow-y-auto py-6 pr-1">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-5 shadow-lg shadow-black/10 backdrop-blur">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold tracking-[0.24em] text-emerald-200 uppercase">
                    Contribution Total
                  </span>
                  <p className="text-4xl font-black tracking-tight text-white">
                    {formatMoney(amountMinor)}
                  </p>
                </div>
                <div className="my-5 h-px bg-white/10" />
                <div className="space-y-2.5">
                  <DetailRow label="Equb Group" value={equbName} />
                  <DetailRow label="Due Date" value={formatDate(dueDate)} />
                  <DetailRow label="Transaction Ref" value={transactionId} />
                  {obligationLabel ? <DetailRow label="Reference" value={obligationLabel} /> : null}
                </div>
              </div>

              {isFinal ? (
                <div
                  className={[
                    'rounded-[1.5rem] border p-4',
                    status === 'SUCCESS'
                      ? 'border-emerald-400/25 bg-emerald-400/10'
                      : 'border-rose-400/25 bg-rose-400/10',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    {status === 'SUCCESS' ? (
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" />
                    ) : (
                      <XCircle className="mt-0.5 size-5 shrink-0 text-rose-300" />
                    )}
                    <div className="space-y-1">
                      <p
                        className={[
                          'text-sm font-bold',
                          status === 'SUCCESS' ? 'text-emerald-200' : 'text-rose-200',
                        ].join(' ')}
                      >
                        {status === 'SUCCESS' ? 'Payment verified' : 'Payment not completed'}
                      </p>
                      <p className="text-xs leading-relaxed text-slate-300">
                        {status === 'SUCCESS'
                          ? 'The contribution has been recorded and the pool will update after refresh.'
                          : 'You can retry the payment flow from the Equb details page.'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-0 flex-col bg-slate-50 px-6 py-6 sm:px-8 dark:bg-slate-950">
            <div className="space-y-4 overflow-y-auto pr-1">
              {provider === 'chapa' && redirectUrl && !isFinal ? (
                <div className="rounded-[1.5rem] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-[11px] font-bold tracking-[0.24em] text-emerald-700 uppercase dark:text-emerald-300">
                      <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                      Official Hosted Checkout
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Continue on Chapa&apos;s hosted checkout for the full mobile-money and banking
                    experience. The page should open automatically; use the button below if your
                    browser blocked the new tab.
                  </p>
                  <a
                    href={redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-500 hover:to-teal-500"
                  >
                    <span>Continue to Chapa Checkout</span>
                    <ExternalLink className="size-4" />
                  </a>
                </div>
              ) : null}

              <div className="grid gap-3 rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/5 p-4 sm:grid-cols-[auto,1fr] sm:items-start">
                <div className="shrink-0 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold tracking-[0.24em] text-emerald-800 uppercase dark:text-emerald-300">
                    {provider === 'chapa' ? 'Secure Chapa Checkout' : 'Safe Sandbox Verification'}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {provider === 'chapa'
                      ? 'Chapa securely handles the payment details on its hosted page. We only record the contribution after verification.'
                      : 'This screen simulates a provider verification flow. Use the outcome buttons below to record success or failure.'}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={loading || verifying}
                className="rounded-xl text-xs"
              >
                Close
              </Button>

              {provider === 'chapa' && !isFinal ? (
                <Button
                  type="button"
                  onClick={handleManualVerify}
                  loading={verifying}
                  className="rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-500"
                >
                  {!verifying && <RefreshCw className="mr-1.5 size-3.5" />}I Have Paid - Verify
                  Status
                </Button>
              ) : null}

              {provider === 'mock' ? (
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onOutcome('FAILED')}
                    loading={loading}
                    disabled={isFinal}
                    className="rounded-xl text-xs hover:bg-rose-50 hover:text-rose-600 sm:min-w-36 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  >
                    {!loading && <XCircle className="mr-1.5 size-3.5" />}
                    Fail payment
                  </Button>
                  <Button
                    type="button"
                    onClick={() => onOutcome('SUCCESS')}
                    loading={loading}
                    disabled={isFinal}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 sm:min-w-36"
                  >
                    {!loading && <ArrowRightLeft className="mr-1.5 size-3.5" />}
                    Pay successfully
                  </Button>
                </div>
              ) : null}
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
