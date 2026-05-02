# Phase 1 Pilot Go/No-Go

## Pilot Setup

Pilot size:

- 3-5 teachers
- 1-2 real classroom sessions per teacher
- 30 students per first classroom target
- expand to 100 total students only after the first session has no critical issue

Support:

- One Line/email support channel
- One incident owner
- One technical owner watching Render/Mongo/payment logs
- Known refund/contact process before payment is enabled

## Teacher Script

Ask each teacher to run:

1. Create account or log in.
2. Create classroom.
3. Add students and distribute student codes.
4. Create a question set.
5. Host one live game.
6. Students join and complete activity.
7. Review leaderboard/history.
8. If payment is part of pilot, start checkout and complete sandbox/live test according to the agreed provider.

## Data to Collect

- teacher name/contact
- class size
- device/browser
- projector use
- student join success rate
- game start/end success
- score correctness
- dashboard/history usefulness
- payment result if tested
- top confusion point
- top missing feature
- blocker severity

## Go Criteria

- Production/staging deploy passes `/api/ready`.
- `npm run build`, `npm run test:unit`, `npm run check:i18n`, and `npm run smoke:build` pass.
- `npm audit --omit=dev` reports zero vulnerabilities.
- Payment path is verified if real PLUS sales are enabled.
- 3-5 pilot teachers complete core workflow.
- No critical auth/ownership/data isolation issue.
- No Render restart/OOM during pilot sessions.
- Support and rollback process are documented.

## No-Go Criteria

- Dev/mock payment is enabled for real money.
- Any student sees another student/classroom private data.
- Any teacher accesses another teacher's classroom.
- Webhook grants entitlement without verified provider state.
- Duplicate webhook grants duplicate entitlement.
- Live game has repeated disconnects or data loss.
- Build/deploy is unstable.
- Backup/rollback path is not ready.

## Decision Log Template

Date:

Decision: Go / No-Go / Limited Pilot Extension

Evidence:

- build/test:
- security:
- payment:
- capacity:
- support:
- pilot feedback:

Required fixes before expanding:

- 

Owner:

Next review date:
