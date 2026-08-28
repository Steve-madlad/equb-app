import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/firebase/auth';
import { createUserProfile, getUserProfile, updateUserProfile } from '@/lib/firebase/auth';
import type { PayoutAccount } from '@/lib/domain/types';

function sanitizePayoutAccount(raw: unknown): PayoutAccount | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const p = raw as Record<string, unknown>;
  if (
    typeof p.bankCode === 'string' &&
    typeof p.bankName === 'string' &&
    typeof p.accountNumber === 'string' &&
    typeof p.accountName === 'string' &&
    p.accountNumber.trim() &&
    p.accountName.trim()
  ) {
    return {
      bankCode: p.bankCode.trim(),
      bankName: p.bankName.trim(),
      accountNumber: p.accountNumber.trim(),
      accountName: p.accountName.trim(),
    };
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const { uid, email } = await verifyAuthToken(request.headers.get('authorization'));
    const body = await request.json();
    const { displayName, phone, payoutAccount: rawAccount } = body;

    const payoutAccount = sanitizePayoutAccount(rawAccount);

    const existing = await getUserProfile(uid);
    if (existing) {
      if (payoutAccount && !existing.payoutAccount) {
        const updated = await updateUserProfile(uid, { payoutAccount });
        return NextResponse.json({ profile: updated });
      }
      return NextResponse.json({ profile: existing });
    }

    const profile = await createUserProfile({
      id: uid,
      email: email ?? '',
      displayName: displayName ?? email ?? 'User',
      phone: typeof phone === 'string' ? phone : undefined,
      payoutAccount,
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { uid } = await verifyAuthToken(request.headers.get('authorization'));
    const body = await request.json();
    const { displayName, phone, payoutAccount: rawAccount } = body;

    const updates: Parameters<typeof updateUserProfile>[1] = {};
    if (typeof displayName === 'string' && displayName.trim()) {
      updates.displayName = displayName.trim();
    }
    if (typeof phone === 'string') {
      updates.phone = phone.trim();
    }
    if (rawAccount !== undefined) {
      updates.payoutAccount = sanitizePayoutAccount(rawAccount);
    }

    const profile = await updateUserProfile(uid, updates);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Profile update failed' },
      { status: 400 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await verifyAuthToken(request.headers.get('authorization'));
    const profile = await getUserProfile(uid);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unauthorized' },
      { status: 401 },
    );
  }
}
