# Billing / Plan / Subscription Manual QA Checklist

Manual QA checklist for System Plan 12.

## Automated Preflight

Run before or after each manual QA pass:

- `npm.cmd run check:billing-plan`

Expected result:

- [x] `test:billing-plan` passes
- [x] `predev` passes

## Dev QA

- [x] Stripe checkout requires teacher/admin session
- [x] Stripe checkout rejects student/non-privileged sessions
- [x] Stripe checkout reports missing config with a structured error
- [x] Stripe webhook duplicate event id is ignored without reprocessing
- [x] Stripe webhook handler releases the idempotency claim when processing fails
- [x] Omise reconcile keeps the pending charge cookie while payment is still pending
- [x] Omise reconcile clears the pending charge cookie on final outcomes
- [x] Omise webhook/reconcile duplicate charge id does not double-apply PLUS
- [x] Thai billing start uses public app origin, not internal request host
- [x] Thai billing start rejects unsupported payment methods
- [x] PRO users cannot self-manage checkout through Stripe or Thai billing

## Plan Limit QA

- [x] FREE classroom limit is enforced by `POST /api/classrooms`
- [x] FREE AI question generation/file parse limits are enforced
- [x] FREE OMR set/scan limits are enforced
- [x] FREE live game player limits are enforced
- [x] FREE Negamon species/custom-species limits are enforced
- [ ] PLUS raises limits consistently across API and UI
- [ ] EXPIRED or INACTIVE paid plans fall back to FREE limits
- [x] ADMIN keeps unlimited limits regardless of plan fields

## Staging / Sandbox QA

- [x] Staging billing status endpoint reports provider config and key mode clearly
- [ ] Mock Thai billing webhook can apply PLUS once and ignore duplicate event id
- [x] Omise test PromptPay start creates a pending charge and sets the pending cookie
- [x] Omise test reconcile applies PLUS after paid status and clears the pending cookie
- [x] Omise dashboard URL points to `/test/charges/...` for test keys
- [x] Temporary paid-plan changes are reverted or documented after QA

## Notes

- Prefer mock Thai billing for destructive-free staging checks unless Omise test keys are confirmed.
- Record user id/email, provider, external event id or charge id, HTTP status, and returned `error.code` for any blocked path.
- `npm.cmd run check:billing-plan` passed on `2026-05-09` with `8 files / 46 tests`.
- `npm.cmd run check:i18n:strict` passed on `2026-05-09` after localizing the remaining billing/Omise diagnostic and test-mode payment strings.
- Fixed live-game server wiring so `resolveLivePlayerCapForHost` passes `planStatus` and `planExpiry` into `getLimitsForUser`; expired/inactive PLUS hosts now fall back to FREE live-player caps.
- Staging QA on `2026-05-09` used `https://www.teachplayedu.com/` with the teacher test account. Billing status returned `provider: omise`, `ready: true`, `secretKeyMode: test`, `publicKeyMode: test`, monthly `29000` satang, yearly `300000` satang, and no config issues.
- Omise PromptPay sandbox start returned `https://pay.omise.co/payments/pay2_test_.../authorize?acs=false` and set the secure HttpOnly `ge_omise_charge` pending cookie for `chrg_test_67mcltpb7ut8bfsz5ms`.
- Pending reconcile returned `outcome: skipped_not_paid`, `chargeStatus: pending`, `testMode: true`, and `omiseDashboardUrl: https://dashboard.omise.co/test/charges/chrg_test_67mcltpb7ut8bfsz5ms`.
- Test-mode mark-as-paid returned `outcome: applied`, `chargeStatus: successful`, `chargePaid: true`, cleared `ge_omise_charge`, and the follow-up reconcile returned `outcome: no_pending_charge`.
- The staging teacher was already `PLUS/ACTIVE` before QA; the test payment refreshed the PLUS expiry to `2026-06-09T04:12:56.723Z`, so no downgrade/revert was performed from the browser session. Mock webhook staging QA remains open because this staging environment is configured for Omise, not the mock provider, and the browser session does not expose a webhook secret for duplicate event replay.
