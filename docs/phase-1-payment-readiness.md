# Phase 1 Payment Readiness

Broader revenue tasks (PLUS positioning, pilot program, funnel): [`revenue-plus-pilot-task-checklist.md`](./revenue-plus-pilot-task-checklist.md).

## Provider Decision

Open one payment provider first. Do not enable Stripe and Omise together for public launch until one path is fully verified.

Recommended order for Thai teacher MVP:

1. Omise/PromptPay if the primary buyers are Thai teachers and PromptPay is the expected default.
2. Stripe if card checkout is required first or Stripe operations are easier for the team.

## Required Environment

### Stripe

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PLUS_MONTHLY`
- `STRIPE_PRICE_PLUS_YEARLY`
- optional: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- webhook URL: `https://YOUR_DOMAIN/api/webhooks/stripe`

### Omise

- `BILLING_THAI_PROVIDER=omise`
- `OMISE_SECRET_KEY`
- `NEXT_PUBLIC_OMISE_PUBLIC_KEY`
- `OMISE_PLUS_MONTHLY_SATANG`
- `OMISE_PLUS_YEARLY_SATANG`
- webhook URL: `https://YOUR_DOMAIN/api/webhooks/billing/omise`

Never use `BILLING_THAI_PROVIDER=mock` for production paid launch.

## Stripe Smoke Checklist

1. Log in as teacher.
2. Open `/dashboard/upgrade`.
3. Start monthly checkout.
4. Complete test payment.
5. Return to app with `checkout=success`.
6. Confirm DB user fields:
   - `plan: "PLUS"`
   - `planStatus: "ACTIVE"`
   - `customerId` set
   - `planExpiry` or subscription-derived status set as expected
7. Refresh session and confirm UI sees PLUS.
8. Replay the same Stripe event from Dashboard/CLI.
9. Confirm duplicate webhook does not apply duplicate entitlement.
10. Cancel subscription in Stripe test mode.
11. Confirm subscription deletion/update maps plan correctly.

## Omise Smoke Checklist

1. Set `BILLING_THAI_PROVIDER=omise`.
2. Log in as teacher.
3. Open `/dashboard/upgrade`.
4. Start Thai payment.
5. Confirm Omise charge is created and return URL is valid.
6. Complete PromptPay test payment.
7. Confirm browser return reconcile or webhook grants PLUS only after paid charge retrieval.
8. Re-run reconcile.
9. Replay webhook.
10. Confirm duplicate idempotency through `BillingProviderEvent`.
11. Test unpaid/expired charge and confirm no entitlement.

### Omise Server-side Diagnostic

If the PromptPay button does nothing or shows a generic error, use the
diagnostic endpoint (teacher/admin only) to inspect the live config of the
running server without opening Render shell:

- HTTP: `GET https://YOUR_DOMAIN/api/billing/thai/status`
- UI: open `/dashboard/upgrade` while signed in as teacher/admin; an "Omise /
  Thai billing diagnostic" panel appears under the banner. Click to expand.

The endpoint never returns secrets — only presence flags, key mode
(`test`/`live`), resolved app origin, computed satang amounts, and an
`issues` array describing the first thing to fix
(`OMISE_SECRET_KEY missing`, `Omise key mode mismatch`, etc.).

Render server logs also tag Omise failures with `[omise]` and
`[billing/thai/start]` plus the Omise `code`/`location`/`message`, so
"button does nothing" can usually be diagnosed from a single log line.

### Test-mode "Pay now" Shortcut

Omise PromptPay charges in **test mode** stay `pending` forever — Omise
never fires `charge.complete` until somebody flips the charge in their
dashboard. To avoid that round trip during QA we added an in-app shortcut:

- Click PromptPay on `/dashboard/upgrade` and return.
- Wait for the polled return banner to say the charge is still pending
  *and* mention test mode (the panel detects the `skey_test_` prefix).
- Click **"จ่ายเลย (test mode)"** — it POSTs to
  `/api/billing/omise/mark-as-paid`, which calls Omise's test endpoint
  `POST /charges/<id>/mark_as_paid`, then immediately reconciles and
  applies PLUS. The polling loop continues so the banner flips green
  within a couple of seconds.
- Refuses outside test mode and verifies the charge belongs to the
  signed-in teacher/admin via the `ge_omise_charge` cookie metadata.

For **live mode** there is no shortcut — the user scans the PromptPay QR
in their banking app, Omise emits `charge.complete`, and PLUS activates
through either the webhook or the same poll loop.

## Static Findings

- Stripe webhook verifies signature and claims event idempotency.
- Omise webhook retrieves charge from Omise before entitlement.
- Omise/browser reconcile shares charge-id idempotency.
- Shared entitlement writer is `src/lib/billing/apply-plus-entitlement.ts`.
- Production payment readiness still requires real provider dashboard setup and sandbox/live verification.

## No-Go Payment Conditions

- Missing webhook secret for selected provider.
- Checkout UI is enabled but webhook is not configured.
- Mock provider is enabled in production.
- Duplicate webhook grants entitlement twice.
- Failed/unpaid/expired payment grants PLUS.
- Session does not refresh plan after payment.

## Today Closeout Checklist (Phase 1)

Use this quick list to mark payment verification done today (production domain).

- [ ] Choose one provider for launch (`stripe` or `omise`) and keep the other disabled.
- [ ] Confirm required env vars for selected provider are set on Render.
- [ ] Confirm webhook endpoint is configured in provider dashboard and points to `https://www.teachplayedu.com`.
- [ ] Complete one real/sandbox payment from `/dashboard/upgrade` (teacher account).
- [ ] Verify user plan fields updated to PLUS/ACTIVE and UI session reflects PLUS after refresh.
- [ ] Replay the same webhook event once; verify idempotency (no duplicate entitlement).
- [ ] Test one negative case (failed/unpaid/expired) and verify no PLUS grant.
- [ ] Append result row to `docs/phase-1-production-readiness-status.md` log.
