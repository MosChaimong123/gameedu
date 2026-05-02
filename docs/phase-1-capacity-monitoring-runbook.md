# Phase 1 Capacity, Monitoring, and Rollback Runbook

## Capacity Goals

Phase 1 must prove the app can handle a controlled teacher pilot before public launch.

Minimum targets:

- 1 teacher + 30 students for 10 minutes.
- 3 teachers + 100 students total in parallel.
- 5-10 teachers viewing dashboard/history after games.
- Payment checkout during live game traffic.
- Student refresh/reconnect during game without losing class flow.

## HTTP Smoke Load Script

Use the built-in script for basic HTTP readiness pressure:

```bash
PHASE1_BASE_URL=https://your-app.example.com npm run load:phase1:http
```

Common runs:

```bash
PHASE1_BASE_URL=https://your-app.example.com PHASE1_PATH=/api/health PHASE1_CONCURRENCY=30 PHASE1_REQUESTS=120 npm run load:phase1:http
PHASE1_BASE_URL=https://your-app.example.com PHASE1_PATH=/api/ready PHASE1_CONCURRENCY=30 PHASE1_REQUESTS=120 npm run load:phase1:http
PHASE1_BASE_URL=https://your-app.example.com PHASE1_PATH=/api/health PHASE1_CONCURRENCY=100 PHASE1_REQUESTS=500 npm run load:phase1:http
```

This script does not replace live Socket.IO classroom testing. It is a fast smoke test for HTTP health, readiness, latency, and restart symptoms.

## Manual Live Game Load Test

Record for each run:

- date/time
- hosting plan
- MongoDB tier
- number of teachers
- number of students
- game mode
- duration
- p95 HTTP latency if available
- Socket disconnect count
- Render memory/CPU max
- MongoDB latency/read/write spikes
- error count
- user-visible issues

Pass threshold:

- no Render restart
- no OOM
- no data loss
- no duplicated score/reward
- student reconnect does not break participation
- core API p95 remains usable

## Monitoring Setup

Minimum:

- Render deploy logs
- Render runtime logs
- uptime monitor for `/api/ready`
- MongoDB Atlas metrics
- payment webhook error review

Recommended metrics:

- active teachers
- classrooms created
- games hosted
- student sessions
- checkout started
- checkout completed
- webhook failures
- API 500 count

## Backup and Restore

Before launch:

- enable MongoDB Atlas backup if tier supports it
- document restore steps
- run one restore drill into a non-production database
- confirm `DATABASE_URL` cannot accidentally point production app to restored test DB

## Rollback Process

Code regression:

1. Pause new risky feature usage if possible.
2. Roll back to previous Render deploy.
3. Check `/api/ready`.
4. Verify login, dashboard, student portal.

Payment incident:

1. Disable checkout UI/provider env if necessary.
2. Keep webhook endpoint available if provider retries are expected.
3. Review provider dashboard events.
4. Apply or reverse entitlement manually only after confirming payment state.

Data incident:

1. Stop the affected write path.
2. Take backup/snapshot before repair.
3. Identify idempotency keys or duplicated rows.
4. Repair in staging first if possible.
5. Document root cause.

Socket/live-game incident:

1. Limit concurrent live games.
2. Restart service only if memory/socket state is unhealthy.
3. Inform pilot teachers.
4. Capture Render logs before restart if possible.

## Phase 1 Pilot Checklist

Pilot size:

- 3-5 teachers
- 1-2 real classes each
- support channel open during session

Collect:

- setup time
- game start success/failure
- student join issues
- display/projector issues
- score correctness
- payment/upgrade confusion
- top 3 requests
- top 3 blockers

Go if:

- all core flows pass
- no critical security issue
- no production OOM/restart
- payment path verified
- support has known incident process

No-Go if:

- student or teacher data isolation fails
- mock payment is enabled
- duplicate payment grants duplicate entitlement
- load test causes OOM/restart
- rollback process has not been tested
