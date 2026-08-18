# Equb (እቁብ) — Production-Ready Rotating Savings Platform

A modern web application for managing Ethiopian Equb rotating savings groups. Built with Next.js, TypeScript, and Firebase.

## Project Structure

```
equb-app/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── api/                # Server-side API (auth, equbs, payments, webhooks)
│   │   ├── admin/              # Admin dashboard & Equb management
│   │   ├── dashboard/          # User dashboard
│   │   ├── equbs/              # Equb browse & detail pages
│   │   ├── payments/mock/      # Mock payment provider UI
│   │   ├── login/ & register/  # Authentication pages
│   │   └── how-it-works/       # Public explainer
│   ├── components/
│   │   ├── ui/                 # Button, Card, StatusBadge
│   │   └── layout/             # Navbar
│   └── lib/
│       ├── domain/             # Types, money, lifecycle, eligibility rules
│       ├── firebase/           # Client & Admin SDK setup, auth helpers
│       ├── payments/           # PaymentProvider interface + MockPaymentProvider
│       ├── payout/             # PayoutSelectionStrategy + RandomSelectionStrategy
│       └── services/           # Equb, payment, payout, ledger, audit services
├── tests/                      # Vitest unit tests
├── firestore.rules             # Security rules (no client financial writes)
├── firestore.indexes.json      # Required composite indexes
└── firebase.json               # Firebase project configuration
```

## Firebase Configuration Requirements

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password provider)
3. Create a **Cloud Firestore** database
4. Generate a **Service Account** key for Admin SDK (Project Settings → Service Accounts)
5. Install Firebase CLI: `npm install -g firebase-tools`
6. Login and init: `firebase login && firebase use --add`
7. Deploy rules: `firebase deploy --only firestore:rules,firestore:indexes`
   
Firebase Cloud Functions are intentionally not used because they require a paid Firebase plan. Server-authoritative actions run through Next.js API routes instead.

### Emulators (local development)

```bash
npm run firebase:emulators
```

Emulator ports: Auth (9099), Firestore (8080), UI (4000)

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase client API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID |
| `FIREBASE_PROJECT_ID` | Admin SDK project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account private key (with `\n` for newlines) |
| `NEXT_PUBLIC_APP_URL` | App URL (default: http://localhost:3000) |
| `PAYMENT_PROVIDER` | `mock` (default) — swap to `telebirr` or `chapa` later |

## Firestore Collections / Schema

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | User profiles & roles | `id`, `email`, `displayName`, `role` (ADMIN/USER) |
| `equbs` | Equb configurations | `status`, `contributionAmountMinor`, `frequency`, `memberLimit`, `numberOfCycles` |
| `memberships` | Member-Equb relationships | `equbId`, `userId`, `status`, `hasReceivedPayout` |
| `cycles` | Scheduled payout cycles | `equbId`, `cycleNumber`, `dueDate`, `status`, `poolAmountMinor`, `drawId` |
| `obligations` | Contribution obligations | `cycleId`, `membershipId`, `amountMinor`, `status`, `dueDate` |
| `payments` | Payment attempts & records | `providerTransactionId`, `idempotencyKey`, `status` |
| `payouts` | Payout records | `cycleId`, `membershipId`, `amountMinor`, `drawId` |
| `draws` | Random draw audit records | `eligibleMemberIds`, `selectedMemberId`, `randomSeed` |
| `ledger` | Immutable financial ledger | `type`, `amountMinor`, `referenceId`, `referenceType` |
| `auditLogs` | System audit trail | `action`, `actorId`, `equbId`, `metadata` |
| `notifications` | User notifications | `userId`, `type`, `title`, `message`, `read` |

**Money representation:** All amounts stored as integer minor units (1 ETB = 100 minor units). Never use floating-point for financial calculations.

## Authentication Setup

1. Enable Email/Password in Firebase Authentication console
2. Users register via `/register` — creates Firebase Auth account + Firestore profile
3. First admin: manually set `role: "ADMIN"` on a user document in Firestore console
4. All API routes verify Firebase ID tokens server-side via Admin SDK
5. Firestore security rules prevent client-side modification of financial data

## Equb Lifecycle

```
DRAFT → OPEN_FOR_MEMBERS → LOCKED → ACTIVE → COMPLETED
                              ↓
                           PAUSED (can resume to ACTIVE)
                              ↓
                          CANCELLED (from most states)
```

| State | What happens |
|-------|-------------|
| **DRAFT** | Admin creates Equb configuration |
| **OPEN_FOR_MEMBERS** | Users can request membership |
| **LOCKED** | Membership closed, preparing to start |
| **ACTIVE** | Cycles running, contributions due, draws happen |
| **PAUSED** | Temporarily halted (admin action) |
| **COMPLETED** | All cycles finished, all payouts done |
| **CANCELLED** | Equb terminated |

**Rules enforced:**
- No new members after LOCKED/ACTIVE
- Members can leave only before LOCKED
- `numberOfCycles` must equal `memberLimit` (one payout per member)
- No administrator fees — ever

## Random Draw System

The payout recipient is **never predetermined**. Each cycle:

1. Admin triggers draw when cycle is ready
2. Server calculates eligible members (paid current cycle, no overdue, hasn't received payout)
3. If zero eligible → cycle set to `WAITING_FOR_ELIGIBILITY`, admin notified
4. `RandomSelectionStrategy` uses `crypto.randomInt()` (NOT `Math.random()`)
5. Result persisted atomically in Firestore transaction
6. Draw audit record created with eligible list, selected member, random seed
7. Duplicate/concurrent draws rejected (cycle already has `drawId`)

**Architecture:**
```
PayoutSelectionStrategy (interface)
  └── RandomSelectionStrategy (implemented)
  └── [Future strategies can be added]
```

Draw can be triggered via:
- Next.js API: `POST /api/equbs/[id]/draw`

Overdue obligations can be marked by an admin via:
- Next.js API: `POST /api/admin/maintenance/overdue`

## Mock Payment Provider

The mock provider implements the full `PaymentProvider` interface:

```
PaymentProvider
  ├── createPayment()      → generates MOCK-YYYY-NNNNNN ID
  ├── getPaymentStatus()
  ├── verifyPayment()
  ├── handleWebhook()      → idempotent processing
  └── refundPayment()
```

**User flow:**
1. User clicks "Pay Contribution" on Equb detail page
2. Server creates payment record (status: INITIATED) via `initiatePayment()`
3. User redirected to `/payments/mock/[transactionId]`
4. User selects Success/Failed outcome
5. Server verifies payment via `verifyAndRecordPayment()`
6. On success: obligation marked PAID, ledger entry created, notification sent

**The frontend never sets `status = PAID` directly.**

## Integrating a Real Payment Provider

Replace `MockPaymentProvider` with minimal changes:

1. Create `src/lib/payments/TelebirrPaymentProvider.ts` (or Chapa, etc.)
2. Implement the `PaymentProvider` interface
3. Add case in `src/lib/payments/index.ts`:

```typescript
case "telebirr":
  return new TelebirrPaymentProvider();
```

4. Set `PAYMENT_PROVIDER=telebirr` in environment
5. Configure webhook URL: `https://yourdomain.com/api/webhooks/payments`
6. **No changes needed** to equbService, paymentService, ledgerService, or payoutService

```
Equb System → PaymentProvider interface → MockPaymentProvider (now)
                                         → TelebirrPaymentProvider (future)
```

## Running Locally

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Fill in Firebase credentials

# Start Firebase emulators (optional, separate terminal)
npm run firebase:emulators

# Start Next.js dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Create first admin

After registering a user, update their Firestore document:
```
users/{userId} → role: "ADMIN"
```

## Running Tests

```bash
npm test          # Run all tests once
npm run test:watch  # Watch mode
```

Tests cover: money utilities, lifecycle transitions, eligibility rules, random selection, cycle date generation.

## Known Limitations

- **Mock payments only** — no real Telebirr/Chapa/bank integration yet
- **Mock payment store is in-memory** — resets on server restart (use Firestore-backed store for persistence)
- **No email/SMS notifications** — in-app notifications only
- **No member replacement** — architecture supports it, not implemented
- **Penalties configured but not auto-applied** — architecture ready, default is no penalties
- **Single currency** — ETB only (extensible)
- **Admin role assignment** — manual via Firestore console
- **No automated cycle advancement scheduler** — admin triggers draws manually
- **No paid Firebase Cloud Functions** — overdue marking is an admin API action instead of a scheduled job

## Future Integration Points

| Feature | Integration Point |
|---------|------------------|
| Real payments | `src/lib/payments/index.ts` → new provider class |
| Payment webhooks | `src/app/api/webhooks/payments/route.ts` |
| SMS notifications | `src/lib/services/notificationService.ts` |
| Member replacement | New service + membership status transitions |
| Penalty auto-application | `markOverdueObligations()` + ledger entries |
| Additional frequencies | `src/lib/domain/cycleUtils.ts` |
| Multi-currency | `src/lib/domain/money.ts` |
| Additional draw strategies | `src/lib/payout/PayoutSelectionStrategy.ts` |
| Automated cycle scheduler | External cron hitting a protected Next.js API route, or a paid scheduler later |
| Financial reports | Query `ledger` collection with aggregation |

---

Built with financial correctness as the top priority. When in doubt, the system **blocks + explains + requires admin action** rather than silently performing potentially incorrect financial operations.
