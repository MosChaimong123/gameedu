# Auth Password Recovery Production Runbook

Last updated: 2026-07-14

Use this runbook to verify production email configuration and test password recovery without exposing secrets or using an uncontrolled user account.

## Safety Rules

- Use a dedicated QA credentials account and mailbox controlled by the GameEdu team.
- Do not test against a random production user.
- Never paste `RESEND_API_KEY`, OTP, password, or full email address into tickets, chat, screenshots, or audit metadata.
- Record only masked email, recovery reference code, provider message ID, timestamps, and delivery status.
- Do not use `onboarding@resend.dev` or any `@resend.dev` sender in production.

## 1. Render Environment Check

Open Render Dashboard -> `gamedu-app` -> Environment and confirm these keys have non-empty values:

- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `EMAIL_FROM`
- `NEXT_PUBLIC_APP_URL`
- `NEXTAUTH_URL`

Expected values:

- `EMAIL_FROM` uses a mailbox on a domain verified in the active Resend account, for example `TeachPlayEdu <notify@teachplayedu.com>`.
- `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` use the same public HTTPS origin.
- Neither public URL uses localhost, `127.0.0.1`, `0.0.0.0`, or an internal Render hostname.

In Resend Dashboard, configure a webhook endpoint at:

```text
https://www.teachplayedu.com/api/webhooks/resend
```

Subscribe to `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.suppressed`, and `email.failed`. Copy its signing secret to `RESEND_WEBHOOK_SECRET`; do not use the API key as the webhook secret.

Do not reveal the API key. It is sufficient to confirm that the value exists and was saved for the correct Render service/environment.

## 2. Resend Domain Check

Open Resend Dashboard -> Domains and confirm the sender domain is `Verified`.

For `teachplayedu.com`, public DNS evidence captured on 2026-07-13:

- DKIM: `resend._domainkey.teachplayedu.com` exists.
- SPF: `send.teachplayedu.com` includes Amazon SES.
- MX: `send.teachplayedu.com` points to Amazon SES feedback SMTP.
- DMARC: `_dmarc.teachplayedu.com` exists with policy `p=none`.

The DNS records show that Resend-related records exist, but the Resend Dashboard remains the authority for whether the domain is verified in the account tied to the production API key.

## 3. Pre-deploy Validation

Run:

```powershell
npm.cmd test -- src/__tests__/email-delivery-readiness.test.ts src/__tests__/health-routes.test.ts
npm.cmd run check:auth
npm.cmd run predev
```

Production configuration must fail validation when:

- `RESEND_API_KEY` is missing.
- `EMAIL_FROM` is missing or malformed.
- sender domain is `resend.dev`.
- public origin is not HTTPS.
- public origin is localhost or a bind address.

## 4. Post-deploy Readiness Check

Request:

```text
GET https://www.teachplayedu.com/api/ready
```

Expected response includes:

```json
{
  "ok": true,
  "status": "ready",
  "checks": {
    "emailDelivery": "configured"
  }
}
```

The endpoint must not expose the API key, sender address, or public URL value.

Baseline before Phase 0 deployment, captured on 2026-07-13, returned ready but had no `emailDelivery` check. This is the evidence that the old readiness endpoint could not detect the reported incident.

## 5. Controlled End-to-End Test

Prerequisites:

- A dedicated QA user with a credentials password.
- A controlled mailbox from a real provider.
- Access to Render logs and Resend email logs.

Procedure:

1. Open `/forgot-password` in a private browser session.
2. Enter the controlled QA credentials email.
3. Record request time and masked email.
4. Confirm the API does not expose OTP or provider secrets.
5. In Resend Logs, locate the message and record provider message ID and accepted status.
6. Confirm the signed webhook updates the reference-code lookup to delivered/bounced/suppressed as applicable.
7. As an ADMIN, query `/api/admin/ops/password-reset-delivery?referenceCode=TP-XXXX` and confirm the response contains no email or OTP.
8. Confirm the mailbox receives the message; check spam if necessary.
9. Confirm the From domain matches the verified TeachPlayEdu sender domain.
10. Use the OTP once and set a new QA password.
11. Confirm reusing the OTP fails.
12. Confirm the old password fails and the new password succeeds.
13. Restore the QA account to its documented test state if required.

## 6. Failure Triage

### API returns 503

Check Render logs for these non-secret reason codes:

- `productionEmailDelivery:missing_api_key`
- `productionEmailDelivery:missing_from`
- `productionEmailDelivery:invalid_from`
- `productionEmailDelivery:test_sender_domain`
- `productionEmailDelivery:missing_public_url`
- `productionEmailDelivery:invalid_public_url`
- `productionEmailDelivery:public_url_must_use_https`
- `productionEmailDelivery:public_url_must_not_be_local`

### Resend rejects the request

- Confirm the API key belongs to the Resend account containing the verified domain.
- Confirm `EMAIL_FROM` uses that verified domain.
- Inspect the Resend error and provider message ID; do not copy OTP or full email into logs.

### Resend accepts but mailbox receives nothing

- Inspect Resend delivery state: delivered, bounced, complained, or suppressed.
- Check spam/quarantine rules at the recipient provider.
- Confirm DMARC alignment and sender domain.
- Record the provider message ID for follow-up.

## 7. Evidence Record Template

```text
Date/time (Asia/Bangkok):
Deployment/revision:
QA email (masked):
Render env keys present: yes/no
Resend domain verified: yes/no
Readiness emailDelivery: configured/not_configured/invalid
Provider message ID:
Provider accepted:
Provider delivered/bounced/suppressed:
Mailbox received:
OTP consumed once:
Old password rejected:
New password accepted:
Notes without secrets:
```

## 8. Delivery Retention

Delivery webhook events and provider metadata are retained for 90 days by default. Audit logs are retained for 365 days. Override with `EMAIL_DELIVERY_RETENTION_DAYS` and `AUDIT_LOG_RETENTION_DAYS` only after approving a policy change. Run cleanup from an approved operations environment:

```powershell
npm.cmd run db:print-target
npm.cmd run db:prune-email-delivery
npm.cmd run db:prune-email-delivery -- --apply
```

The first prune command is a dry run. Never use `--apply` before confirming the database target and reviewing the reported counts.

## Completion Criteria

- Render environment contains all five required values, including `RESEND_WEBHOOK_SECRET`.
- Resend domain is verified in the production API key's account.
- Resend sends signed delivery events to `/api/webhooks/resend`.
- `/api/ready` reports `emailDelivery: configured`.
- Controlled QA mailbox receives the OTP from the verified domain.
- Evidence record contains no OTP, password, API key, or unmasked email.

## Evidence Captured on 2026-07-13

- Render service: `teach-play-edu`.
- Required Render environment keys: present with masked non-empty values.
- Resend domain: `teachplayedu.com` verified.
- Production sender domain: `teachplayedu.com`.
- Recent password-reset delivery evidence: two messages accepted and delivered.
- Matching application audits: `otp_sent` followed by `completed` for both requests.
- Matching `[forgot-password]` errors in the 24-hour Render log window: none.
- Secrets, OTP values, full recipient addresses, and provider message IDs are intentionally omitted from this record.

## Pre-rollout Evidence Captured on 2026-07-14

- `GET https://www.teachplayedu.com/api/ready` returned HTTP 200 with `status: ready`.
- The live response did **not** contain `checks.emailDelivery`. Do not treat this response as evidence that the Phase 0-7 email readiness gate is deployed.
- The deployed forgot-password page rendered without horizontal overflow at 390 px and desktop widths; its email input exposed `autocomplete="email"`.
- The deployed reset page exposed `autocomplete="one-time-code"` for OTP, but its password fields omitted `autocomplete="new-password"` and its placeholder still stated a 6-character minimum.
- Local remediation adds complete Thai/English reset copy, an 8-character minimum, accessible show/hide controls, and password-manager attributes.
- No form was submitted because a controlled staging deployment/account and two controlled mailbox providers were not available. No OTP, password, or recipient address was handled during this pass.
