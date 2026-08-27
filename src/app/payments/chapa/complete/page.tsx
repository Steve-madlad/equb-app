"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { onIdTokenChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { EqubLoading } from "@/components/ui/EqubLoading";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

function ChapaCompleteContent() {
  const searchParams = useSearchParams();
  const txRef = searchParams.get("tx_ref") ?? searchParams.get("trx_ref") ?? "";
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("Verifying payment with Chapa...");

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

  useEffect(() => {
    if (!txRef || !token) return;

    let isMounted = true;
    async function verify() {
      try {
        const res = await fetch("/api/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "verify",
            providerTransactionId: txRef,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!isMounted) return;

        if (res.ok && data?.payment?.status === "SUCCESS") {
          setStatus("success");
          setMessage("Your contribution was successfully verified and recorded.");
        } else {
          setStatus("failed");
          setMessage(data?.error ?? "Payment verification failed or was cancelled.");
        }
      } catch (err) {
        if (!isMounted) return;
        setStatus("failed");
        setMessage(err instanceof Error ? err.message : "Unable to verify payment.");
      }
    }

    verify();
    return () => {
      isMounted = false;
    };
  }, [txRef, token]);

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
              <div className="pt-2">
                <Button
                  asChild
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold px-6 py-2.5 shadow-lg shadow-emerald-500/20 w-full"
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
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Payment Incomplete</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 text-xs text-slate-500 font-mono">
                Ref: {txRef}
              </div>
              <div className="pt-2">
                <Button
                  asChild
                  variant="secondary"
                  className="rounded-xl font-bold px-6 py-2.5 w-full"
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
    <Suspense fallback={<EqubLoading />}>
      <ChapaCompleteContent />
    </Suspense>
  );
}
