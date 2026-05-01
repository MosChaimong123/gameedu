# Phase 1 Production Readiness Status

This file tracks the current status of Phase 1 from `docs/commercial-production-roadmap.md`.

Last updated: 2026-04-30

## Summary

Phase 1 is code-ready for a production beta foundation, but not fully launch-complete until external production accounts and real deployment checks are completed.

Status:

- In-repo implementation: mostly complete
- External production setup: pending
- Legal review: pending
- Full paid billing sandbox/live verification: pending

## Checklist

| Area | Status | Notes |
| --- | --- | --- |
| Environment documentation | Done | `.env.example` includes database, auth, app URL, rate limit, audit log, health, Stripe, and Thai PSP variables. |
| Startup env validation | Done | `src/lib/env.ts` validates required env and production app URL. |
| Health endpoint | Done | `src/app/api/health/route.ts` exists and is covered by tests. |
| Readiness endpoint | Done | `src/app/api/ready/route.ts` validates env/database readiness and is covered by tests. |
| Operational rate limit/audit config | Done | `RATE_LIMIT_STORE` and `AUDIT_LOG_SINK` support production defaults. |
| Economy ledger indexes | Done in repo | `scripts/ensure-economy-ledger-indexes.mjs` exists. Must be run against production DB. |
| Negamon reward claim indexes | Done in repo | `scripts/ensure-negamon-live-reward-indexes.mjs` exists. Must be run against production DB. |
| Billing skeleton | Done in repo | Stripe, mock Thai billing, and Omise paths exist. Requires provider credentials and sandbox verification. |
| Billing idempotency | Done in repo | `BillingProviderEvent` and billing idempotency helpers exist. |
| Plan limits | Done in repo | `src/constants/plan-limits.ts` and `src/lib/plan` exist. Continue enforcing limits on new features. |
| Terms page | Done | `src/app/terms/page.tsx` added as starter legal text. Needs legal review. |
| Privacy page | Done | `src/app/privacy/page.tsx` added as starter privacy text. Needs legal review. |
| Signup legal visibility | Done | Register flow links to `/terms` and `/privacy`. |
| Route authorization sweep | Partial | Many route tests exist, but a final full `src/app/api/**` audit should be done before public launch. |
| Production database backup | External blocker | Configure MongoDB Atlas backup and run restore drill outside repo. |
| Domain and hosting | External blocker | Choose domain/host and configure env. |
| Payment provider sandbox | External blocker | Requires Stripe/Omise/PSP account credentials. |
| Monitoring | External blocker | Configure Sentry/uptime provider outside repo. |

## Required External Actions Before Public Launch

1. Buy or connect the production domain.
2. Provision production hosting.
3. Provision MongoDB Atlas production database.
4. Enable daily backups and test restore on staging.
5. Set production env vars:
   - `DATABASE_URL`
   - `AUTH_SECRET` or `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `NEXT_PUBLIC_APP_URL`
   - `AUTH_TRUST_HOST=true`
   - `RATE_LIMIT_STORE=auto`
   - `AUDIT_LOG_SINK=auto` or `both`
   - billing provider secrets when billing is enabled
6. Run DB index scripts against production.
7. Configure payment provider sandbox and webhook URLs.
8. Configure error monitoring and uptime monitoring.
9. Replace starter Terms/Privacy with reviewed production text.
10. Run full production smoke checks:
    - `/api/health`
    - `/api/ready`
    - registration
    - login
    - create classroom
    - add student
    - student login code
    - host live game
    - student join game
    - Negamon reward sync
    - economy ledger/reconciliation
    - billing checkout/webhook if paid plans are enabled

## Recommended Verification Commands

```bash
npx tsc --noEmit --pretty false
npm test
npx eslint .
npm run build
npm run test:e2e:negamon-reward
```

If the environment blocks process spawning, rerun the affected Vitest or Playwright command in an approved local shell.

## Notes for Future Agents

- Do not forge teacher sessions for QA. Use a real authorized `PLAYWRIGHT_STORAGE_STATE`.
- Do not mark production billing complete without a real provider sandbox run.
- Do not mark database readiness complete until production indexes and backup restore are verified.
- Treat starter Terms/Privacy as placeholders, not final legal approval.

