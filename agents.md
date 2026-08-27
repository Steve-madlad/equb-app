# Agent Context

## Project Summary

This is a Next.js 15 + TypeScript app for managing Ethiopian Equb (እቁብ) rotating savings groups.
It uses Firebase Auth, Firestore, and the Firebase Admin SDK for server-side operations.

The app is split into public marketing pages, authenticated user pages, and admin pages.
Most business logic lives in `src/lib`, while route handlers in `src/app/api` expose server-side actions.

## Core Architecture

- Client-side Firebase SDK is used for sign-in, sign-up, and reading the current user session.
- Server-side Firebase Admin SDK (`src/lib/firebase/admin.ts`) is used for all trusted reads/writes to Firestore and for verifying ID tokens, initialized with `ignoreUndefinedProperties: true`.
- Firestore is the source of truth for user profiles, Equb records, memberships, cycles, obligations, payments, payouts, ledgers, audit logs, and notifications.
- The app relies on Next.js route handlers rather than Firebase Cloud Functions.

## Important Flows

### Authentication, Profiles & Settings

- Registration happens in `src/app/(auth)/register/page.tsx` with a modern glassmorphic UI.
- Registration collects personal credentials (`firstName`, `lastName`, `phone`, `email`, `password`) along with payout destination bank details (`bankCode`, `bankName`, `accountNumber`, `accountName`).
- Dynamic bank options are served via `GET /api/banks` backed by Chapa Bank List API and a 10-institution Ethiopian fallback list.
- A user signs up with Firebase Auth, then the client posts the ID token and payout account to `POST /api/users/profile`.
- `src/app/api/users/profile/route.ts` verifies the token and creates or updates a Firestore user profile.
- New profiles default to `role: "USER"` in `src/lib/firebase/auth.ts`.
- Profile updates, phone numbers, and payout bank accounts are managed via `GET /api/users/profile` and `PATCH /api/users/profile` on the dedicated `/settings` page (`src/app/settings/page.tsx`).
- The Navbar profile dropdown provides immediate access to Dashboard, Notifications, Finances, Settings (`/settings`), and Sign-out.

### Admin Access

- Admin access is not auto-assigned at registration.
- `requireAdmin()` checks the Firestore user profile role (`role === "ADMIN"`).
- The first admin must be set manually in Firestore by changing a user document to `role: "ADMIN"`.

### Equb Management & Rejoining

- Equb creation and status changes are handled in `src/lib/services/equbService.ts`.
- Only admins can create Equbs through `POST /api/equbs`.
- Equb lifecycle rules are enforced in `src/lib/domain/equbLifecycle.ts`.
- Equb config validation and cycle generation live in `src/lib/domain/cycleUtils.ts`.
- Admin-facing Equb search lives at `/equbs`, while user-facing search lives at `/search`.
- Members who previously left or were removed (`LEFT` / `REMOVED` / `REJECTED`) are eligible to re-apply, with active memberships taking priority over legacy inactive records.
- The user dashboard groups joined/owned Equbs separately from discoverable Equbs.
- Admin audit logs are surfaced at `/admin/audit` from the existing Firestore `auditLogs` collection.

### Memberships

- Membership requests are created server-side and start in `PENDING`.
- Approval, rejection, leaving, and removal are all handled through service-layer functions.
- Eligibility rules depend on active membership status, current-cycle payment state, and overdue obligations.

### Payments and Payouts

- Contribution obligations are created in `src/lib/services/paymentService.ts`.
- Money is stored in integer minor units (1 ETB = 100 minor units). Monetary values are formatted with comma separators (`100,000.00 ETB`) via `src/lib/domain/money.ts`.
- Payment initiation and verification are in `paymentService.ts`.
- Chapa collection is supported via `src/lib/payments/ChapaPaymentProvider.ts` (`PAYMENT_PROVIDER=chapa`):
  - Server-side initialization via `POST https://api.chapa.co/v1/transaction/initialize` with `customization.title` capped at 16 characters and sanitized Ethiopian phone numbers.
  - Return URL `/payments/chapa/complete?tx_ref=...` provides auto-polling verification for asynchronous mobile money (Telebirr / CBE Birr USSD) settlement.
  - In-app payment drawer (`src/components/payments/MockPaymentSheet.tsx`) supports both Chapa inline mobile money channels (Telebirr, CBE Birr, Ebirr, M-Pesa) with unique transaction references and direct hosted checkout redirect links.
- Payout selection is server-side and random, implemented in `src/lib/services/payoutService.ts` using `RandomSelectionStrategy`.
- Outbound winning disbursements are handled via `src/lib/services/chapaTransferService.ts` (`POST https://api.chapa.co/v1/transfers`), mapping winner bank details.
- `POST /api/webhooks/payments` discriminates incoming collections from outbound transfer webhooks (`transfer.success`, `transfer.failed`).
- Payout state machine: `PENDING` -> `PROCESSING` | `AWAITING_ADMIN_APPROVAL` -> `COMPLETED` | `FAILED`.
- Draw execution is non-blocking: API transfer failures or manual 2FA requirements do NOT roll back the core cycle draw and ledger.
- Winner receives an initial "processing" notification on draw, and ONLY receives the final transfer success notification once Chapa webhook or verification confirms settlement.
- The Equb detail page's `Current pool` value is derived from ledger entries, not a frontend calculation.

### Automation and Scheduling

- Automated payout orchestration is available at `POST /api/admin/maintenance/payouts`; admin-triggered draws remain available for recovery.
- The preferred scheduler is Upstash QStash: one signed recurring request to the protected payout maintenance route (`POST /api/admin/maintenance/schedule`).
- QStash secrets are server-only: `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, and `QSTASH_NEXT_SIGNING_KEY`.

### SEO & Metadata Architecture

- `src/app/layout.tsx`: Base metadata, OpenGraph, Twitter large cards, canonicals, viewport theme-colors, and `schema.org` JSON-LD structured data (`WebApplication`, `Organization`, `WebSite`).
- `src/app/sitemap.ts`: Dynamic XML sitemap generator for search engines.
- `src/app/robots.ts`: Dynamic `robots.txt` protecting private authenticated/admin/API paths while indexing public pages.
- Social sharing preview image: `public/equb-app.png`.

## Data Model

Key domain types live in `src/lib/domain/types.ts`.

- `UserProfile` includes `role` (`ADMIN` | `USER`), `rating`, `phone`, and `payoutAccount`.
- `Equb` tracks lifecycle state, creator, and timestamps.
- `Membership`, `Cycle`, `ContributionObligation`, `PaymentRecord`, `Payout`, `PayoutDraw`, `LedgerEntry`, `AuditLogEntry`, and `Notification` are all modeled explicitly.
- Money is stored in minor units, not floats.
- Audit log entries are stored in Firestore and surfaced on the admin audit page.

## File Map

- `src/app/`
  - Public pages, auth pages, dashboards, settings, admin pages, and API routes.
- `src/components/`
  - UI components (`Button`, `Card`, `StatusBadge`), layouts (`Navbar`, `HomeNavbar`), and drawers (`MockPaymentSheet`).
- `src/lib/domain/`
  - Pure business rules, types, money helpers, lifecycle rules, and eligibility logic.
- `src/lib/firebase/`
  - Firebase client setup, admin setup, and auth helpers.
- `src/lib/payments/`
  - Payment providers (`PaymentProvider`, `MockPaymentProvider`, `ChapaPaymentProvider`).
- `src/lib/services/`
  - Application services for Equbs, payments, payouts, bank lists, audit, ledger, and notifications.
- `public/`
  - Static assets and SEO social card image (`equb-app.png`).
- `tests/`
  - Vitest unit tests for domain logic.

## Environment

- Copy `.env.example` to `.env.local`.
- Client-exposed Firebase and app env vars must start with `NEXT_PUBLIC_`.
- Server-only Firebase Admin and Chapa keys must stay private.
- `.env.local` should not be committed.

## Commands

- `npm run dev` - start the app locally.
- `npm run build` - production build.
- `npm run lint` - lint the codebase.
- `npm run test` - run Vitest tests.
- `npm run firebase:emulators` - start Firebase auth and Firestore emulators.
