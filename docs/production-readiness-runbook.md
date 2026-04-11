# Production Readiness Runbook

This runbook covers the production-readiness layer added after the security and governance milestones.

## Scope

The production-readiness layer includes:

- shared-backed rate limiting
- persistent audit log sink
- startup environment validation
- health and readiness endpoints

## Environment Variables

Required:

- `DATABASE_URL`
- `AUTH_SECRET` or `NEXTAUTH_SECRET`

Production requires at least one app URL:

- `NEXT_PUBLIC_APP_URL`
- or `NEXTAUTH_URL`

Operational settings:

- `RATE_LIMIT_STORE=auto|memory|mongo`
- `AUDIT_LOG_SINK=auto|console|mongo|both`
- `HEALTHCHECK_DB_TIMEOUT_MS=3000`

Recommended production defaults:

- `RATE_LIMIT_STORE=auto`
- `AUDIT_LOG_SINK=auto`

With these defaults:

- production uses Mongo-backed shared rate limits
- production writes audit logs to both console and Mongo
- local dev keeps fast in-memory rate limits and console audit logs

## Health Endpoints

- Liveness: [api/health/route.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/app/api/health/route.ts)
- Readiness: [api/ready/route.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/app/api/ready/route.ts)

Expected behavior:

- `/api/health` returns process-level health and current limiter/log sink mode
- `/api/ready` validates critical env and database reachability

## Rate Limit Storage

Rate limits now support:

- memory store
- Mongo shared store

Implementation:

- [rate-limit.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/security/rate-limit.ts)
- [mongo-admin.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/ops/mongo-admin.ts)

Mongo collections used:

- `appRateLimits`
- `appAuditLogs`

## Audit Log Persistence

Audit logging supports:

- console only
- Mongo only
- both

Implementation:

- [audit-log.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/security/audit-log.ts)

## Startup Validation

Server startup now validates env and ensures operational indexes before accepting traffic:

- [server.ts](/C:/Users/IHCK/GAMEEDU/gamedu/server.ts)
- [env.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/env.ts)

## Deployment Checklist

1. Confirm production env vars are present.
2. Confirm `RATE_LIMIT_STORE` and `AUDIT_LOG_SINK` are set as intended.
3. Deploy and verify `/api/health`.
4. Confirm the platform health check points to `/api/ready`.
5. Verify `/api/ready` returns success.
6. Confirm Mongo collections `appRateLimits` and `appAuditLogs` are being created.
7. Confirm audit events appear during an admin or classroom mutation.

## Rollback Notes

If Mongo-backed operational features cause issues:

- set `RATE_LIMIT_STORE=memory`
- set `AUDIT_LOG_SINK=console`

This keeps the app functional while preserving the previous local behavior.
