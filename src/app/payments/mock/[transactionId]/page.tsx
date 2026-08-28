'use client';

import { useEffect, useState } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { EqubLoading } from '@/components/ui/EqubLoading';
import { MockPaymentSheet } from '@/components/payments/MockPaymentSheet';

export default function MockPaymentPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const [transactionId, setTransactionId] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<string>('INITIATED');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    params.then((p) => setTransactionId(p.transactionId));
  }, [params]);

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

  async function simulatePayment(outcome: 'SUCCESS' | 'FAILED' | 'CANCELLED') {
    setLoading(true);
    await fetch('/api/payments/mock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerTransactionId: transactionId, outcome }),
    });

    if (outcome === 'SUCCESS' && token) {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'verify',
          providerTransactionId: transactionId,
        }),
      });
      if (res.ok) {
        setStatus('SUCCESS');
      }
    } else {
      setStatus(outcome);
    }
    setLoading(false);
  }

  if (!transactionId) {
    return <EqubLoading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar links={[]} />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <MockPaymentSheet
          open
          loading={loading}
          status={status}
          transactionId={transactionId}
          amountMinor={1000}
          dueDate={new Date().toISOString().slice(0, 10)}
          equbName="Mock payment provider"
          obligationLabel="Standalone test flow"
          onOpenChange={(open) => {
            if (!open) {
              window.location.href = '/dashboard';
            }
          }}
          onOutcome={async (outcome) => {
            await simulatePayment(outcome);
          }}
        />
        <div className="sr-only">
          <Button variant="secondary">Return to Dashboard</Button>
        </div>
      </main>
    </div>
  );
}
