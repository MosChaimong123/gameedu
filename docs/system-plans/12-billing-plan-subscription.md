# System Plan 12: Billing / Plan / Subscription

Last updated: 2026-05-09

## Scope

- Stripe checkout and webhooks
- Thai billing via Omise/PromptPay and mock provider
- Plan entitlement mapping and plan limits
- Upgrade UI/API return paths
- Billing provider event idempotency

## Key Files

- `src/app/api/billing/create-checkout-session/route.ts`
- `src/app/api/billing/thai/start/route.ts`
- `src/app/api/billing/omise/reconcile/route.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/api/webhooks/billing/[provider]/route.ts`
- `src/lib/billing`
- `src/lib/plan/plan-access.ts`
- Prisma: `BillingProviderEvent`, `User`

## Problem Analysis Checklist

- [x] Check webhook replay idempotency
- [x] Check provider event dedupe
- [x] Check plan mapping correctness
- [x] Check missing config and secret errors
- [x] Check plan limits in API and server entry points
- [x] Check checkout return/cancel URL handling
- [x] Check Thai payment flow with sandbox/staging

## Improvement Plan

- [x] Centralize plan access decisions
- [x] Harden provider event processing
- [x] Add one-command billing/plan preflight
- [x] Add or expand tests for missing config and duplicate webhook paths
- [x] Verify plan limits across OMR, live players, AI, classrooms, and Negamon features
- [x] Manual sandbox/staging payment QA

## Validation

- `npm.cmd run check:billing-plan`
- `npm.cmd run check:i18n:strict`
- `npm.cmd run lint`
- `npm.cmd run build`
- Manual: `docs/billing-plan-manual-qa-checklist.md`

## Exit Criteria

- Payment/webhook retry does not double-apply a plan or duplicate provider events.
- PLUS/FREE/PRO mapping is stable across Stripe, Omise, mock, and admin-managed users.
- Plan limits are enforced at all paid-feature entry points.
- Missing billing config fails with readable structured errors.
- Staging or sandbox payment QA is recorded.

## Progress Note 1

- Rewrote the plan file to remove mojibake and make Plan 12 trackable.
- Added `npm.cmd run test:billing-plan` and `npm.cmd run check:billing-plan` for the current billing/plan test set.
- Existing code already has central plan-limit resolution in `src/lib/plan/plan-access.ts` and central PLUS entitlement application in `src/lib/billing/apply-plus-entitlement.ts`.
- Existing billing idempotency uses `BillingProviderEvent` through `claimBillingProviderEvent`; Stripe claims event ids and Omise claims charge ids so browser reconcile and webhook cannot double-apply the same charge.

## Progress Note 2

- Added Stripe checkout/webhook route regression coverage in `src/__tests__/billing-stripe-routes.test.ts`.
- Covered missing Stripe checkout config, student/non-staff checkout denial, public success/cancel checkout URLs, duplicate Stripe webhook events, and idempotency claim release on handler failure.
- Audited plan limit entry points: classrooms, AI generation/file parse, OMR monthly scans, question set count, questions per set, Negamon species settings, and live-game players.
- Fixed `server.ts` live-game cap wiring so host `planStatus` and `planExpiry` are passed into `getLimitsForUser`; expired or inactive PLUS hosts now fall back to FREE live-player limits.
- `npm.cmd run check:billing-plan` passed on `2026-05-09` with `8 files / 46 tests`, followed by `predev`.

## Progress Note 3

- Closed billing/Omise i18n strict findings in `src/app/api/billing/omise/mark-as-paid/route.ts`, `src/app/dashboard/upgrade/omise-status-panel.tsx`, `src/app/dashboard/upgrade/upgrade-client.tsx`, and `src/lib/billing/omise-api.ts`.
- Added billing diagnostic and Omise test-mode payment translation keys in `src/lib/translations.ts`.
- `npm.cmd run check:i18n:strict` passed with no suspicious hardcoded user-facing strings.
- Re-ran `npm.cmd run check:billing-plan`; it still passed with `8 files / 46 tests`, followed by `predev`.

## Progress Note 4

- Completed staging sandbox payment QA on `https://www.teachplayedu.com/` with a real teacher session.
- Confirmed `/api/billing/thai/status` reports Omise test-mode readiness clearly: `provider: omise`, `ready: true`, test secret/public keys, monthly `29000` satang, yearly `300000` satang, and no config issues.
- Confirmed PromptPay sandbox start creates an Omise test payment URL and a secure HttpOnly `ge_omise_charge` pending cookie.
- Confirmed pending reconcile reports `skipped_not_paid`, `chargeStatus: pending`, `testMode: true`, and a dashboard URL under `/test/charges/...`.
- Confirmed test-mode mark-as-paid applies PLUS, clears the pending cookie, and follow-up reconcile returns `no_pending_charge`.
- Documented the staging data effect: the teacher account was already `PLUS/ACTIVE`; the sandbox payment refreshed the PLUS expiry to `2026-06-09T04:12:56.723Z`. Mock webhook replay remains a non-staging item because this staging environment is configured for Omise rather than the mock provider.
