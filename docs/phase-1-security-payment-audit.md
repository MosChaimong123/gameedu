# Phase 1 Security and Payment Audit

## Summary

Phase 1 launch can proceed only after the items in this document remain true in the production environment. This audit captures the in-repo security posture and the external checks that cannot be proven without production secrets or provider dashboards.

## Auth and RBAC

### Positive findings

- `src/auth.ts` uses Auth.js/NextAuth v5 with JWT sessions, Prisma adapter, optional Google provider, credentials provider, bcrypt password verification, and credential-login rate limiting.
- `src/auth.config.ts` protects page routes:
  - `/dashboard` blocks `STUDENT`
  - `/admin` requires `ADMIN`
  - `/student/home` requires authenticated user
- `src/proxy.ts` applies page protection and deliberately excludes API routes.

### Phase 1 risks

- API routes are not protected by a global API middleware. Each handler must enforce auth/ownership itself.
- `auth.config.ts` contains callback definitions that are effectively overridden by `src/auth.ts`; this is not a launch blocker but can confuse future audits.
- Plan enforcement currently relies primarily on `plan`, not `planStatus`/`planExpiry`.

### Required checks before launch

- Verify teacher APIs query by `teacherId: session.user.id` or shared resource-access helper.
- Verify admin mutations require `role === "ADMIN"`.
- Verify student-code routes expose only the specific student/classroom data.
- Verify session refresh after payment updates `plan` and `planStatus`.

## Student Code Security

Student login codes are bearer-style access tokens for student routes.

Required Phase 1 controls:

- Codes must be hard to guess.
- Brute force must be rate limited.
- Support must be able to rotate or regenerate a compromised code.
- Student-code endpoints must not expose teacher-only data.

## Socket and Live Game Security

Positive findings:

- Host actions are resolved through NextAuth JWT from the Socket.IO handshake in `server.ts`.
- Classroom socket publish/access checks are injected into socket handlers.
- `src/lib/socket-io-cors.ts` supports explicit production CORS origins.

Required Phase 1 controls:

- Set `SOCKET_IO_CORS_ORIGIN` explicitly in production.
- Treat game PINs as bearer secrets.
- Limit public pilot size until load tests prove stability.

## Payment Security

### Stripe

Positive findings:

- `src/app/api/webhooks/stripe/route.ts` verifies `stripe-signature` with raw body.
- Stripe webhook event IDs are claimed before handling for idempotency.
- Checkout routes require teacher/admin session.

Required Phase 1 controls:

- Configure `STRIPE_WEBHOOK_SECRET` for the production endpoint.
- Replay webhook events and verify duplicate-safe behavior.
- Verify subscription deleted/updated events downgrade or update plan correctly.

### Omise / Thai PSP

Positive findings:

- Omise webhook retrieves the charge from Omise before entitlement is applied.
- Entitlement idempotency uses charge ID through `BillingProviderEvent`.
- Browser return reconcile and webhook share the idempotency path.

Required Phase 1 controls:

- Use `BILLING_THAI_PROVIDER=omise`, not `mock`, for real money.
- Test unpaid, expired, paid, duplicate webhook, and duplicate reconcile paths.
- Confirm Omise dashboard webhook URL is `/api/webhooks/billing/omise`.

## Dependency Security

Actions taken during Phase 1 implementation:

- Installed missing dependencies so production build can resolve `stripe`.
- Ran `npm audit fix` to update vulnerable transitive dependencies.
- Upgraded `next` and `eslint-config-next` to `16.2.4`.
- Added `overrides.postcss=8.5.13` to avoid vulnerable nested PostCSS.
- Replaced client-side Excel export that depended on vulnerable `xlsx` with CSV export in `src/components/classroom/AnalyticsDashboard.tsx`.
- Removed `xlsx` dependency.

Current target:

- `npm audit --omit=dev` should report `found 0 vulnerabilities`.

## Go/No-Go Security Gates

Go only if:

- No known production dependency vulnerabilities remain.
- `/api/ready` passes with production env and DB.
- Mock billing is disabled.
- Webhooks are verified and idempotent.
- Student cannot access data for another classroom/student.
- Teacher cannot access another teacher's classroom.
- Admin bootstrap secret is strong and removed/rotated after initial setup if needed.

No-Go if:

- Any high-severity production dependency remains unmitigated.
- Payment entitlement can be granted without provider verification.
- API ownership gaps are found in core classroom/student/payment flows.
- `SOCKET_IO_CORS_ORIGIN=*` in production.
