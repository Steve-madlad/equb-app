"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { onIdTokenChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { EqubLoading } from "@/components/ui/EqubLoading";
import { CheckCircle2, XCircle, ArrowRight, RefreshCw, Users } from "lucide-react";
import Link from "next/link";

function ChapaCompleteContent() {
  const searchParams = useSearchParams();
  const txRef = searchParams.get("tx_ref") ?? searchParams.get("trx_ref") ?? "";
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("Verifying payment with Chapa...");
  const [equbId, setEqubId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        window.location.href = "/login";
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
        const res = await fetch("/api/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            action: "verify",
            providerTransactionId: txRef,
          }),
        });

        const data = await res.json().catch(() => null);

        if (res.ok && data?.payment?.status === "SUCCESS") {
          setStatus("success");
          setMessage("Your contribution was successfully verified and recorded.");
          if (data.payment.equbId) {
            setEqubId(data.payment.equbId);
          }
        } else if (res.ok && (data?.payment?.status === "PENDING" || data?.payment?.status === "INITIATED")) {
          if (attempt < 4) {
            setMessage(`Payment is processing on Chapa (checking attempt ${attempt}/3)...`);
            setTimeout(() => {
              verifyPayment(authToken, attempt + 1);
            }, 3000);
          } else {
            setStatus("failed");
            setMessage("Payment is still pending on provider. You can check again shortly.");
            if (data?.payment?.equbId) {
              setEqubId(data.payment.equbId);
            }
          }
        } else {
          setStatus("failed");
          setMessage(data?.error ?? "Payment verification failed or was cancelled.");
        }
      } catch (err) {
        setStatus("failed");
        setMessage(err instanceof Error ? err.message : "Unable to verify payment.");
      }
    },
    [txRef]
  );

  useEffect(() => {
    if (txRef && token) {
      verifyPayment(token, 1);
    }
  }, [txRef, token, verifyPayment]);

  const handleManualRetry = async () => {
    if (!token) return;
    setRetrying(true);
    setStatus("loading");
    setMessage("Re-checking payment status with Chapa...");
    await verifyPayment(token, 1);
    setRetrying(false);
  };

  if (!txRef) {
    return (
      <div className="min-h-screen bg-slate-100/70 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
        <Navbar links={[]} />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-slate-500 dark:text-slate-400">Invalid transaction reference.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 transition-colors duration-300">
      <Navbar links={[]} />
      <main className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.04] backdrop-blur-xl p-8 shadow-xl text-center space-y-6">
          {status === "loading" ? (
            <div className="space-y-4 py-6">
              <EqubLoading />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verifying Transaction</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{message}</p>
            </div>
          ) : status === "success" ? (
            <div className="space-y-4 py-4">
              <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Payment Successful!</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 text-xs text-slate-500 font-mono">
                Ref: {txRef}
              </div>
              <div className="pt-2 flex flex-col gap-2">
                {equbId && (
                  <Button
                    asChild
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold px-6 py-2.5 shadow-lg shadow-emerald-500/20 w-full"
                  >
                    <Link href={`/equbs/${equbId}`}>
                      <Users className="w-4 h-4 mr-1.5" />
                      Return to Equb Group
                    </Link>
                  </Button>
                )}
                <Button
                  asChild
                  variant={equbId ? "secondary" : "default"}
                  className="rounded-xl font-bold px-6 py-2.5 w-full"
                >
                  <Link href="/dashboard">
                    Return to Dashboard
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="inline-flex p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                <XCircle className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Payment Status</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 text-xs text-slate-500 font-mono">
                Ref: {txRef}
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={handleManualRetry}
                  loading={retrying}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold px-6 py-2.5 shadow-md shadow-emerald-500/20 w-full"
                >
                  {!retrying && <RefreshCw className="w-4 h-4 mr-1.5" />}
                  Check Status Again
                </Button>
                {equbId && (
                  <Button asChild variant="secondary" className="rounded-xl font-bold px-6 py-2.5 w-full">
                    <Link href={`/equbs/${equbId}`}>Return to Equb Group</Link>
                  </Button>
                )}
                <Button asChild variant="ghost" className="rounded-xl font-bold px-6 py-2.5 w-full text-xs">
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
    <Suspense fallback={<EqubLoading />}>
      <ChapaCompleteContent />
    </Suspense>
  );
}
