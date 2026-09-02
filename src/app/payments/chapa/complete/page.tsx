'use client';

import { TeferLogo } from '@/components/svg/TeferLogo';
import { Button } from '@/components/ui/Button';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { onIdTokenChanged } from 'firebase/auth';
import { ArrowRight, CheckCircle2, RefreshCw, Users, Wallet, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

function ChapaLoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex h-[100svh] max-h-screen flex-col overflow-hidden bg-slate-50 px-6 text-slate-900 dark:bg-linear-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 dark:text-white">
      <main className="flex flex-1 items-center justify-center">
        <div className="flex w-full max-w-sm flex-col items-center text-center">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-tr from-emerald-600 to-teal-500 shadow-xl shadow-emerald-500/25">
              <Wallet className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="mt-7 text-2xl font-black tracking-tight sm:text-3xl">
            Verifying transaction
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-300">
            {message}
          </p>
        </div>
      </main>

      <footer className="flex shrink-0 flex-col items-center gap-2 pb-8 text-center text-slate-500 dark:text-slate-400">
        <span className="text-[10px] font-semibold tracking-[0.2em] uppercase">Powered by</span>
        <TeferLogo className="h-5 w-auto text-slate-700 dark:text-slate-200" />
      </footer>
    </div>
  );
}

function ChapaCompleteContent() {
  const searchParams = useSearchParams();
  const txRef = searchParams.get('tx_ref') ?? searchParams.get('trx_ref') ?? '';
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Verifying payment with Chapa...');
  const [equbId, setEqubId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.href = '/login';
        return;
      }
      setToken(await user.getIdToken());
    });
    return unsub;
  }, []);

  const verifyPayment = useCallback(
    async (authToken: string, attempt = 1) => {
      if (!txRef || !authToken) return;

      try {
        const res = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            action: 'verify',
            providerTransactionId: txRef,
          }),
        });

        const data = await res.json().catch(() => null);

        if (res.ok && data?.payment?.status === 'SUCCESS') {
          setStatus('success');
          setMessage('Your contribution was successfully verified and recorded.');
          if (data.payment.equbId) {
            setEqubId(data.payment.equbId);
          }
        } else if (
          res.ok &&
          (data?.payment?.status === 'PENDING' || data?.payment?.status === 'INITIATED')
        ) {
          if (attempt < 4) {
            setMessage(`Payment is processing on Chapa (checking attempt ${attempt}/3)...`);
            setTimeout(() => {
              verifyPayment(authToken, attempt + 1);
            }, 3000);
          } else {
            setStatus('failed');
            setMessage('Payment is still pending on provider. You can check again shortly.');
            if (data?.payment?.equbId) {
              setEqubId(data.payment.equbId);
            }
          }
        } else {
          setStatus('failed');
          setMessage(data?.error ?? 'Payment verification failed or was cancelled.');
        }
      } catch (err) {
        setStatus('failed');
        setMessage(err instanceof Error ? err.message : 'Unable to verify payment.');
      }
    },
    [txRef],
  );

  useEffect(() => {
    if (txRef && token) {
      verifyPayment(token, 1);
    }
  }, [txRef, token, verifyPayment]);

  const handleManualRetry = async () => {
    if (!token) return;
    setRetrying(true);
    setStatus('loading');
    setMessage('Re-checking payment status with Chapa...');
    await verifyPayment(token, 1);
    setRetrying(false);
  };

  if (!txRef) {
    return (
      <div className="min-h-screen bg-slate-100/70 dark:bg-linear-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-slate-500 dark:text-slate-400">Invalid transaction reference.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </main>
      </div>
    );
  }

  if (status === 'loading') {
    return <ChapaLoadingScreen message={message} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 transition-colors duration-300 dark:bg-linear-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
      <main className="flex-center min-h-screen px-4 py-16">
        <div className="space-y-6 rounded-3xl border border-slate-200/90 bg-white p-8 text-center shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
          {status === 'success' ? (
            <div className="space-y-4 py-4">
              <div className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Payment Successful!
              </h2>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {message}
              </p>
              <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-3 font-mono text-xs text-slate-500 dark:border-white/5 dark:bg-slate-900/50">
                Ref: {txRef}
              </div>
              <div className="flex flex-col gap-2 pt-2">
                {equbId && (
                  <Button
                    asChild
                    className="w-full rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 px-6 py-2.5 font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500"
                  >
                    <Link href={`/equbs/${equbId}`}>
                      <Users className="mr-1.5 h-4 w-4" />
                      Return to Equb Group
                    </Link>
                  </Button>
                )}
                <Button
                  asChild
                  variant={equbId ? 'secondary' : 'default'}
                  className="w-full rounded-xl px-6 py-2.5 font-bold"
                >
                  <Link href="/dashboard">
                    Return to Dashboard
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="inline-flex rounded-full border border-rose-500/20 bg-rose-500/10 p-4 text-rose-600 dark:text-rose-400">
                <XCircle className="h-12 w-12" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Payment Status</h2>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {message}
              </p>
              <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-3 font-mono text-xs text-slate-500 dark:border-white/5 dark:bg-slate-900/50">
                Ref: {txRef}
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleManualRetry}
                  loading={retrying}
                  className="w-full rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 px-6 py-2.5 font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500"
                >
                  {!retrying && <RefreshCw className="mr-1.5 h-4 w-4" />}
                  Check Status Again
                </Button>
                {equbId && (
                  <Button
                    asChild
                    variant="secondary"
                    className="w-full rounded-xl px-6 py-2.5 font-bold"
                  >
                    <Link href={`/equbs/${equbId}`}>Return to Equb Group</Link>
                  </Button>
                )}
                <Button
                  asChild
                  variant="ghost"
                  className="w-full rounded-xl px-6 py-2.5 text-xs font-bold"
                >
                  <Link href="/dashboard">Return to Dashboard</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ChapaCompletePage() {
  return (
    <Suspense fallback={<ChapaLoadingScreen message="Verifying payment with Chapa..." />}>
      <ChapaCompleteContent />
    </Suspense>
  );
}
