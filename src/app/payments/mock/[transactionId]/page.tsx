"use client";

import { useEffect, useState } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function MockPaymentPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const [transactionId, setTransactionId] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<string>("INITIATED");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    params.then((p) => setTransactionId(p.transactionId));
  }, [params]);

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

  async function simulatePayment(outcome: "SUCCESS" | "FAILED" | "CANCELLED") {
    setLoading(true);
    await fetch("/api/payments/mock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerTransactionId: transactionId, outcome }),
    });

    if (outcome === "SUCCESS" && token) {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "verify",
          providerTransactionId: transactionId,
        }),
      });
      if (res.ok) {
        setStatus("SUCCESS");
      }
    } else {
      setStatus(outcome);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar links={[{ href: "/dashboard", label: "Dashboard" }]} />
      <main className="mx-auto max-w-lg px-4 py-12">
        <Card title="Mock Payment Provider">
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-100 p-4 font-mono text-sm">
              {transactionId}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status</span>
              <StatusBadge status={status} />
            </div>
            <p className="text-sm text-gray-500">
              This simulates a real payment provider flow. Select an outcome below.
            </p>
            {status === "INITIATED" && (
              <div className="flex gap-3">
                <Button onClick={() => simulatePayment("SUCCESS")} loading={loading} className="flex-1">
                  Pay Successfully
                </Button>
                <Button onClick={() => simulatePayment("FAILED")} loading={loading} variant="danger" className="flex-1">
                  Fail Payment
                </Button>
              </div>
            )}
            {status === "SUCCESS" && (
              <div className="rounded-lg bg-green-50 p-4 text-center">
                <p className="font-semibold text-green-800">Payment verified!</p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => (window.location.href = "/dashboard")}
                >
                  Return to Dashboard
                </Button>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
