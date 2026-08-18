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

- Registration happens in `src/app/(auth)/register/page.tsx`.
- A user signs up with Firebase Auth, then the client posts the ID token to `POST /api/users/profile`.
- `src/app/api/users/profile/route.ts` verifies the token and creates a Firestore user profile if one does not already exist.
- New profiles default to `role: "USER"` in `src/lib/firebase/auth.ts`.

### Admin access

- Admin access is not auto-assigned at registration.
- `requireAdmin()` checks the Firestore user profile role.
- The README says the first admin must be set manually in Firestore by changing a user document to `role: "ADMIN"`.

### Equb management

- Equb creation and status changes are handled in `src/lib/services/equbService.ts`.
- Only admins can create Equbs through `POST /api/equbs`.
- Equb lifecycle rules are enforced in `src/lib/domain/equbLifecycle.ts`.
- Equb config validation and cycle generation live in `src/lib/domain/cycleUtils.ts`.

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

## Data Model

Key domain types live in `src/lib/domain/types.ts`.

- `UserProfile` includes `role` with values `ADMIN` or `USER`.
- `Equb` tracks lifecycle state, creator, and timestamps.
- `Membership`, `Cycle`, `ContributionObligation`, `PaymentRecord`, `Payout`, `PayoutDraw`, `LedgerEntry`, `AuditLogEntry`, and `Notification` are all modeled explicitly.
- Money is stored in minor units, not floats.

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

