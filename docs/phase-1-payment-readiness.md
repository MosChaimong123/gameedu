# Phase 1 Payment Readiness

Broader revenue tasks (PLUS positioning, pilot program, funnel): [`revenue-plus-pilot-task-checklist.md`](./revenue-plus-pilot-task-checklist.md).

## Provider decision

**Production uses Stripe only** (card subscription + PromptPay QR on hosted Checkout).

Omise has been removed from the app. Thai PromptPay for teachers is via **Stripe PromptPay**, not a separate PSP.

Optional **dev-only** mock: `BILLING_THAI_PROVIDER=mock` for internal webhook tests (`POST /api/webhooks/billing/mock`). It does not appear on `/dashboard/upgrade` in production.

## Required environment (Stripe)

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PLUS_MONTHLY`
- `STRIPE_PRICE_PLUS_YEARLY`
- optional: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- webhook URL: `https://YOUR_DOMAIN/api/webhooks/stripe`
- Stripe Dashboard → Payment methods → enable **PromptPay** (Thailand live account)
- Webhook events (minimum):
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded` (required for PromptPay QR)
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Production: `BILLING_THAI_PROVIDER` unset or `none` (remove any legacy `omise` value and `OMISE_*` env vars from Render)

## Stripe checkout paths

PLUS upgrade (`POST /api/billing/create-checkout-session` body `channel`):

| Channel | Checkout mode | Renewal |
| --- | --- | --- |
| `card` (default) | `subscription` | Auto-renew monthly/yearly |
| `promptpay` | `payment` + `payment_method_types: [promptpay]` | No auto-renew — month = 30 days, year = 12 months |

PromptPay entitlement runs on `checkout.session.async_payment_succeeded` (and `checkout.session.completed` when already paid). Metadata: `checkoutKind=promptpay_pass`, `plusInterval=month|year`.

## Stripe card smoke checklist

1. Log in as teacher.
2. Open `/dashboard/upgrade`.
3. Click **Subscribe with card** (monthly or yearly).
4. Complete payment on `checkout.stripe.com`.
5. Return with `checkout=success`.
6. Confirm DB: `plan: PLUS`, `planStatus: ACTIVE`, `customerId` set.
7. Refresh session; UI shows PLUS.
8. Replay webhook once; confirm no duplicate entitlement.
9. Cancel subscription in Stripe; confirm plan maps back correctly.

## Stripe PromptPay smoke checklist

1. Enable PromptPay on the Stripe account (live or test with PromptPay enabled).
2. Add `checkout.session.async_payment_succeeded` to the Stripe webhook endpoint.
3. Open `/dashboard/upgrade`, choose monthly or yearly.
4. Click **Pay with PromptPay (QR)** (not the card button).
5. Complete QR payment on `checkout.stripe.com`.
6. Return with `checkout=success`; wait for webhook (up to ~1 minute).
7. Confirm `plan: PLUS`, `planExpiry` ~30 days (month) or ~1 year (year).
8. Sign out and sign in to refresh JWT.

## Render ops checklist (after deploy)

- [ ] Remove from Render env: `OMISE_*`, `BILLING_THAI_PROVIDER=omise`
- [ ] Set `BILLING_THAI_PROVIDER=none` or delete the variable
- [ ] Confirm Stripe webhook includes `checkout.session.async_payment_succeeded`
- [ ] Confirm PromptPay enabled in Stripe Dashboard → Payment methods
- [ ] One live or test PromptPay payment ฿290 on production
- [ ] Log result in `docs/phase-1-production-readiness-status.md`

## No-go conditions

- Missing `STRIPE_WEBHOOK_SECRET` or webhook not receiving events
- PromptPay enabled in UI but `async_payment_succeeded` not subscribed
- `BILLING_THAI_PROVIDER=mock` in production
- Duplicate webhook grants PLUS twice
- Session does not refresh after successful payment

## Static findings

- Stripe webhook verifies signature and claims event idempotency.
- Shared entitlement writer: `src/lib/billing/apply-plus-entitlement.ts`.
- Mock Thai webhook path remains for dev only: `/api/webhooks/billing/mock`.
