# System Plan 12: Billing / Plan / Subscription

Last updated: 2026-05-03

## Scope

- Stripe, Omise/PromptPay, webhooks, plan limits, upgrade, billing events

## Key Files

- `src/app/api/billing/create-checkout-session`
- `src/app/api/billing/thai/start`
- `src/app/api/billing/omise/reconcile`
- `src/app/api/webhooks/stripe`
- `src/app/api/webhooks/billing/[provider]`
- `src/lib/billing`
- `src/lib/plan`
- Prisma: `BillingProviderEvent`, `User`

## Problem Analysis Checklist

- [ ] ตรวจ webhook replay idempotency
- [ ] ตรวจ provider event dedupe
- [ ] ตรวจ plan mapping ถูกต้อง
- [ ] ตรวจ missing config/secret errors
- [ ] ตรวจ plan limits ใน API และ UI
- [ ] ตรวจ checkout return/cancel URL
- [ ] ตรวจ Thai payment flow กับ sandbox

## Improvement Plan

1. Centralize plan access decisions
2. Harden provider event processing
3. Add tests for missing config and duplicate webhook
4. Verify plan limits across OMR/live players/features
5. Manual sandbox payment QA

## Validation

- `npm.cmd test -- src/lib/billing/__tests__/subscription-mapping.test.ts`
- `npm.cmd test -- src/lib/plan/__tests__/plan-access.test.ts`
- `npm.cmd test -- src/__tests__/user-upgrade-route.test.ts`
- `npm.cmd run lint`
- `npm.cmd run build`

## Exit Criteria

- Payment/webhook retry ไม่ทำให้ plan ผิดหรือ event ซ้ำ
- Plan limit enforce ในทุก entry point
