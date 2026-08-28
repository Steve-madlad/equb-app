import { NextRequest, NextResponse } from 'next/server';
import { getMockPaymentProvider } from '@/lib/payments/MockPaymentProvider';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerTransactionId, outcome } = body;

    if (!providerTransactionId || !outcome) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const provider = getMockPaymentProvider();
    const result = await provider.simulatePayment(providerTransactionId, outcome);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 400 },
    );
  }
}
