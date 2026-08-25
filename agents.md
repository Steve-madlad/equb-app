# Agent Context

## Project Summary

This is a Next.js 15 + TypeScript app for managing Ethiopian Equb rotating savings groups.
It uses Firebase Auth, Firestore, and the Firebase Admin SDK for server-side operations.

The app is split into public marketing pages, authenticated user pages, and admin pages.
Most business logic lives in `src/lib`, while route handlers in `src/app/api` expose server-side actions.

## Core Architecture

- Client-side Firebase SDK is used for sign-in, sign-up, and reading the current user session.
- Server-side Firebase Admin SDK is used for all trusted reads/writes to Firestore and for verifying ID tokens.
- Firestore is the source of truth for user profiles, Equb records, memberships, cycles, payments, payouts, ledgers, audit logs, and notifications.
- The app relies on Next.js route handlers rather than Firebase Cloud Functions.

## Important Flows

### Authentication and profiles

- Registration happens in `src/app/(auth)/register/page.tsx` with a modern glassmorphic UI.
- Registration collects personal credentials along with payout destination bank details (`bankCode`, `bankName`, `accountNumber`, `accountName`).
- Dynamic bank options are served via `GET /api/banks` backed by Chapa Bank List API and a 10-institution Ethiopian fallback list.
- A user signs up with Firebase Auth, then the client posts the ID token and payout account to `POST /api/users/profile`.
- `src/app/api/users/profile/route.ts` verifies the token and creates a Firestore user profile if one does not already exist.
- New profiles default to `role: "USER"` in `src/lib/firebase/auth.ts`.
- Profile updates (including payout bank account) can be patched via `PATCH /api/users/profile`.

### Admin access

- Admin access is not auto-assigned at registration.
- `requireAdmin()` checks the Firestore user profile role.
- The README says the first admin must be set manually in Firestore by changing a user document to `role: "ADMIN"`.

### Equb management

- Equb creation and status changes are handled in `src/lib/services/equbService.ts`.
- Only admins can create Equbs through `POST /api/equbs`.
- Equb lifecycle rules are enforced in `src/lib/domain/equbLifecycle.ts`.
- Equb config validation and cycle generation live in `src/lib/domain/cycleUtils.ts`.
- Admin-facing Equb search lives at `/equbs`, while user-facing search lives at `/search`.
- The user dashboard groups joined/owned Equbs separately from discoverable Equbs.
- Admin audit logs are surfaced at `/admin/audit` from the existing Firestore `auditLogs` collection.

### Memberships

- Membership requests are created server-side and start in `PENDING`.
- Approval, rejection, leaving, and removal are all handled through service-layer functions.
- Eligibility rules depend on membership status, current-cycle payment state, and overdue obligations.

### Payments and payouts

- Contribution obligations are created in `src/lib/services/paymentService.ts`.
- Payment initiation and verification are also in `paymentService.ts`.
- Payout selection is server-side and random, implemented in `src/lib/services/payoutService.ts`.
- Draws use a selection strategy from `src/lib/payout/RandomSelectionStrategy.ts`.
- Every major action creates audit logs, and many actions create notifications and ledger entries.
- The Equb detail page's `Current pool` value is derived from ledger entries, not a frontend calculation.
- Chapa collection is available through `src/lib/payments/ChapaPaymentProvider.ts` (`PAYMENT_PROVIDER=chapa`).
- Chapa outbound transfer is handled through `src/lib/services/chapaTransferService.ts` (`POST https://api.chapa.co/v1/transfers`), strictly mapping `bankCode`, `accountNumber`, and `accountName`.
- `POST /api/webhooks/payments` discriminates incoming collections from outbound transfer webhooks (`transfer.success`, `transfer.failed`).
- Payout state machine: `PENDING` -> `PROCESSING` | `AWAITING_ADMIN_APPROVAL` -> `COMPLETED` | `FAILED`.
- Draw execution is non-blocking: API transfer failures or manual 2FA requirements do NOT roll back the core cycle draw and ledger.
- Winner receives an initial "processing" notification on draw, and ONLY receives the final transfer success notification once Chapa webhook or verification confirms settlement.
- Periodic reconciliation in `runAutomatedPayouts` verifies transfers stuck > 12h and emits admin escalations if unresolved after 24h.

### Automation and scheduling

- Automated payout orchestration is available at `POST /api/admin/maintenance/payouts`; admin-triggered draws remain available for recovery.
- The preferred free scheduler is Upstash QStash: one signed recurring request to the protected payout maintenance route. Create it through the admin-only `POST /api/admin/maintenance/schedule` route.
- QStash is only a delivery mechanism. Firestore transactions and service-layer rules remain responsible for eligibility, payout selection, audit logs, and idempotency.
- QStash secrets are server-only: `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, and `QSTASH_NEXT_SIGNING_KEY`.
- Cloudflare Cron Triggers are the main alternative; GitHub Actions and Vercel Hobby scheduling are not preferred for financial jobs because of documented timing or availability limitations.
- The automated job reports selected, paid, and not-paid members to every admin using idempotent notifications.
- `completePayout()` finalizes the ledger and sends the settlement confirmation notification to the winner.


## Data Model

Key domain types live in `src/lib/domain/types.ts`.

- `UserProfile` includes `role` with values `ADMIN` or `USER`.
- `Equb` tracks lifecycle state, creator, and timestamps.
- `Membership`, `Cycle`, `ContributionObligation`, `PaymentRecord`, `Payout`, `PayoutDraw`, `LedgerEntry`, `AuditLogEntry`, and `Notification` are all modeled explicitly.
- Money is stored in minor units, not floats.
- Audit log entries are stored in Firestore and surfaced on the admin audit page.

## File Map

- `src/app/`
  - Public pages, auth pages, dashboards, admin pages, and API routes.
- `src/components/`
  - Small UI components such as `Button`, `Card`, `StatusBadge`, and `Navbar`.
- `src/lib/domain/`
  - Pure business rules, types, money helpers, lifecycle rules, and eligibility logic.
- `src/lib/firebase/`
  - Firebase client setup, admin setup, and auth helpers.
- `src/lib/services/`
  - Application services for Equbs, payments, payouts, audit, ledger, and notifications.
- `src/types/chapa-inline.d.ts`
  - Local TypeScript declaration for the Chapa Inline JS package, which does not publish declarations.
- `tests/`
  - Vitest unit tests for domain logic.

## Environment

- Copy `.env.example` to `.env.local`.
- Client-exposed Firebase env vars must start with `NEXT_PUBLIC_`.
- Server-only Firebase Admin vars must stay private.
- `.env.local` should not be committed.

## Commands

- `npm run dev` - start the app locally.
- `npm run build` - production build.
- `npm run lint` - lint the codebase.
- `npm run test` - run Vitest tests.
- `npm run firebase:emulators` - start Firebase auth and Firestore emulators.

## Working Rules

- Prefer service-layer changes over duplicating business logic in routes or components.
- Treat Firestore and Firebase Admin as the trusted backend boundary.
- Do not assume a user is an admin unless their Firestore profile role says so.
- When changing auth, registration, or permissions, check both the route handler and the helper in `src/lib/firebase/auth.ts`.
- When changing financial logic, check the money helpers and tests because amounts are stored as integers in minor units.

## Testing Notes

- `tests/domain.test.ts` covers money helpers, lifecycle transitions, eligibility, draw selection, and cycle validation.
- If a change affects business rules, add or update tests in the domain layer first.

## Useful References

- `README.md` explains the project setup, env vars, and the manual admin bootstrap step.
- `src/lib/firebase/client.ts` shows the public Firebase config.
- `src/lib/firebase/admin.ts` shows the server-side Firebase initialization.
- `src/lib/firebase/auth.ts` centralizes token verification and permission checks.
