# Equb (እቁብ) — Production-Ready Rotating Savings Platform

A modern web application for managing Ethiopian Equb rotating savings groups. Built with Next.js, TypeScript, and Firebase.

## Project Structure

```
equb-app/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── api/                # Server-side API (auth, equbs, payments, webhooks)
│   │   ├── admin/              # Admin dashboard, audit, and Equb management
│   │   ├── dashboard/          # User dashboard with member/discovery sections
│   │   ├── search/             # User-facing Equb search with filters
│   │   ├── equbs/              # Admin Equb search & Equb detail pages
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

| Variable                                   | Description                                               |
| ------------------------------------------ | --------------------------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Firebase client API key                                   |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Auth domain                                               |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Project ID                                                |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Storage bucket                                            |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID                                       |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | App ID                                                    |
| `FIREBASE_PROJECT_ID`                      | Admin SDK project ID                                      |
| `FIREBASE_CLIENT_EMAIL`                    | Service account email                                     |
| `FIREBASE_PRIVATE_KEY`                     | Service account private key (with `\n` for newlines)      |
| `NEXT_PUBLIC_APP_URL`                      | App URL (default: http://localhost:3000)                  |
| `PAYMENT_PROVIDER`                         | `mock` (default) or `chapa`                               |
| `NEXT_PUBLIC_PAYMENT_PROVIDER`             | Must match `PAYMENT_PROVIDER` for the browser checkout UI |
| `NEXT_PUBLIC_CHAPA_PUBLIC_KEY`             | Chapa public key used by Inline JS                        |
| `CHAPA_SECRET_KEY`                         | Chapa secret key, server-only                             |
| `CHAPA_WEBHOOK_SECRET`                     | Secret hash configured for the Chapa webhook              |

### Chapa payments

Install the dependencies, then set `PAYMENT_PROVIDER=chapa` and
`NEXT_PUBLIC_PAYMENT_PROVIDER=chapa`. The contribution sheet renders Chapa
Inline JS with CBE Birr, BOA Card, Telebirr, and M-Pesa enabled. Configure
`https://your-domain/api/webhooks/payments` as the Chapa webhook URL and set the
same webhook secret in `CHAPA_WEBHOOK_SECRET`.

The app initializes each transaction server-side, verifies the callback or
webhook with Chapa's verification API, and checks the verified amount against
the stored obligation before writing the ledger entry. Chapa credentials must
never be exposed to the browser.

## Firestore Collections / Schema

| Collection      | Purpose                    | Key Fields                                                                        |
| --------------- | -------------------------- | --------------------------------------------------------------------------------- |
| `users`         | User profiles & roles      | `id`, `email`, `displayName`, `role` (ADMIN/USER)                                 |
| `equbs`         | Equb configurations        | `status`, `contributionAmountMinor`, `frequency`, `memberLimit`, `numberOfCycles` |
| `memberships`   | Member-Equb relationships  | `equbId`, `userId`, `status`, `hasReceivedPayout`                                 |
| `cycles`        | Scheduled payout cycles    | `equbId`, `cycleNumber`, `dueDate`, `status`, `poolAmountMinor`, `drawId`         |
| `obligations`   | Contribution obligations   | `cycleId`, `membershipId`, `amountMinor`, `status`, `dueDate`                     |
| `payments`      | Payment attempts & records | `providerTransactionId`, `idempotencyKey`, `status`                               |
| `payouts`       | Payout records             | `cycleId`, `membershipId`, `amountMinor`, `drawId`                                |
| `draws`         | Random draw audit records  | `eligibleMemberIds`, `selectedMemberId`, `randomSeed`                             |
| `ledger`        | Immutable financial ledger | `type`, `amountMinor`, `referenceId`, `referenceType`                             |
| `auditLogs`     | System audit trail         | `action`, `actorId`, `equbId`, `metadata`                                         |
| `notifications` | User notifications         | `userId`, `type`, `title`, `message`, `read`                                      |

**Money representation:** All amounts stored as integer minor units (1 ETB = 100 minor units). Never use floating-point for financial calculations.

**Current pool:** The Equb detail page shows the live pool balance derived from ledger entries, so it reflects posted contributions and completed payouts.
**Dashboard layout:** The user dashboard separates Equbs you are part of from the discoverable list, so your memberships are easier to scan at a glance.

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

| State                | What happens                                    |
| -------------------- | ----------------------------------------------- |
| **DRAFT**            | Admin creates Equb configuration                |
| **OPEN_FOR_MEMBERS** | Users can request membership                    |
| **LOCKED**           | Membership closed, preparing to start           |
| **ACTIVE**           | Cycles running, contributions due, draws happen |
| **PAUSED**           | Temporarily halted (admin action)               |
| **COMPLETED**        | All cycles finished, all payouts done           |
| **CANCELLED**        | Equb terminated                                 |

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

## Payment Providers

### Chapa

The Chapa provider initializes transactions server-side and the Equb details
page renders Chapa Inline JS in the existing payment sheet. The checkout
enables CBE Birr, BOA Card, Telebirr, and M-Pesa. Chapa callbacks and signed
webhooks are verified server-side, and the verified amount must match the
stored contribution obligation before the ledger is updated.

Set both `PAYMENT_PROVIDER=chapa` and `NEXT_PUBLIC_PAYMENT_PROVIDER=chapa`,
then configure `https://your-domain/api/webhooks/payments` in Chapa. The
browser receives only the public key; `CHAPA_SECRET_KEY` remains server-only.

### Mock

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

## Adding Another Payment Provider

Replace `MockPaymentProvider` with minimal changes:

1. Create `src/lib/payments/{Provider}PaymentProvider.ts`
2. Implement the `PaymentProvider` interface
3. Add case in `src/lib/payments/index.ts`:

```typescript
case "provider":
  return new ProviderPaymentProvider();
```

4. Set `PAYMENT_PROVIDER=provider` in environment
5. Configure webhook URL: `https://yourdomain.com/api/webhooks/payments`
6. **No changes needed** to equbService, paymentService, ledgerService, or payoutService

```
Equb System → PaymentProvider interface → MockPaymentProvider
                                         → ChapaPaymentProvider
                                         → Future providers
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

- **Chapa payment methods require a configured Chapa account** — availability and limits are controlled by Chapa
- **Mock payment store is in-memory** — resets on server restart (use Firestore-backed store for persistence)
- **No email/SMS notifications** — in-app notifications only
- **No member replacement** — architecture supports it, not implemented
- **Penalties configured but not auto-applied** — architecture ready, default is no penalties
- **Single currency** — ETB only (extensible)
- **Admin role assignment** — manual via Firestore console
- **Admin audit viewer** — available in the app at `/admin/audit`
- **User dashboard split** — active membership Equbs are grouped separately from discoverable Equbs
- **User/admin search pages** — `/search` is user-facing, `/equbs` is admin-facing
- **Automated cycle advancement is not implemented yet** — admin triggers draws manually
- **Scheduler integration is not implemented yet** — the recommended free option is documented below

## Future Integration Points

| Feature                    | Integration Point                                                      |
| -------------------------- | ---------------------------------------------------------------------- |
| Real payments              | `src/lib/payments/index.ts` → new provider class                       |
| Payment webhooks           | `src/app/api/webhooks/payments/route.ts`                               |
| SMS notifications          | `src/lib/services/notificationService.ts`                              |
| Member replacement         | New service + membership status transitions                            |
| Penalty auto-application   | `markOverdueObligations()` + ledger entries                            |
| Additional frequencies     | `src/lib/domain/cycleUtils.ts`                                         |
| Multi-currency             | `src/lib/domain/money.ts`                                              |
| Additional draw strategies | `src/lib/payout/PayoutSelectionStrategy.ts`                            |
| Automated cycle scheduler  | Upstash QStash schedule invoking a protected Next.js maintenance route |
| Financial reports          | Query `ledger` collection with aggregation                             |

## Automated Cycle Jobs

### Recommendation: Upstash QStash

QStash is the preferred free scheduler for this project. It can deliver a
signed HTTP request to a public Next.js route, retry failed deliveries, and
schedule recurring jobs. The current free tier documents 1,000 messages per
day, 10 active schedules, 50 GB bandwidth, a 1 MB message size, and a maximum
7-day delay. One daily schedule is enough for an initial Equb sweep, so the
free limits should be comfortable for a small deployment.

The intended design is one QStash schedule, for example once per day in UTC,
calling a protected route such as `/api/admin/maintenance/cycles`. That route
should:

1. Verify the `Upstash-Signature` using QStash signing keys.
2. Query Firestore for due cycles and overdue obligations.
3. Advance only eligible cycles using Firestore transactions.
4. Use stable cycle IDs and existing draw IDs for idempotency.
5. Return `200` only after the work is complete; leave failed work retryable.

QStash schedules the job and retries delivery; it must never decide payout
eligibility or write financial records. Those decisions belong in the service
layer and Firestore transactions. A separate admin-only manual trigger should
remain available for recovery and operational review.

### Alternatives

| Option                       | Free capability                                                                                         | Assessment                                                                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloudflare Cron Triggers** | Workers Free includes 100,000 requests/day and up to 5 cron triggers/account                            | Strong alternative, but requires a separate Worker and a very small edge adapter; the free Worker CPU limit is 10 ms per invocation.                                                                            |
| **Vercel Cron**              | Included with plans, but Hobby is limited to once per day with timing that may vary by up to 59 minutes | Convenient if deployed on Vercel, but less suitable when payout timing needs stronger delivery behavior.                                                                                                        |
| **GitHub Actions schedule**  | Free for standard runners in public repositories                                                        | Useful for CI or a non-critical daily sweep, but GitHub documents delays under load, possible dropped runs, default-branch-only execution, and automatic disablement after 60 days without repository activity. |

For a financial workflow, use QStash or Cloudflare only as the trigger. Keep
authentication, eligibility, transaction boundaries, audit logging, and
idempotency in the application backend.

Research checked on 2026-08-25:

- [Upstash QStash pricing](https://upstash.com/docs/qstash/overall/pricing)
- [QStash schedules](https://upstash.com/docs/qstash/features/schedules)
- [QStash signature verification](https://upstash.com/docs/qstash/howto/signature)
- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Cloudflare Workers limits and pricing](https://developers.cloudflare.com/workers/platform/limits/)
- [Vercel Cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [GitHub Actions schedule events](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)

---

Built with financial correctness as the top priority. When in doubt, the system **blocks + explains + requires admin action** rather than silently performing potentially incorrect financial operations.
