# Phase 1 — Route authorization audit

Inventory of `src/app/api/**` authorization patterns completed for public-launch planning.  
**Not a substitute** for targeted tests: use [`route-authorization-test-template.md`](./route-authorization-test-template.md) when adding routes.

Last updated: 2026-05-02

## Summary

| Pattern | Description |
| --- | --- |
| **Teacher session** | `auth()` + role check + `teacherId` / `canUserAccessClassroom` / service helper ownership |
| **Student scope** | Student login **code** in query/body + `loadQuizTakeContext`, `authorizeBattleRead`, or `student/[code]` handlers |
| **Admin** | `ADMIN_SECRET` header or session `ADMIN` role (per route) |
| **Public** | Health, readiness, registration, email verification, OAuth, webhooks |
| **Mixed** | e.g. leaderboard: session **or** `?code=` login code |

## Routes by category

### Public or provider-only (no teacher session)

- `GET/HEAD` **`/api/health`**, **`/api/ready`** — operational probes
- **`/api/auth/[...nextauth]`**, **`/api/auth/oauth-intent`**, **`/api/auth/verify-email`**, **`/api/auth/resend-verification`**
- **`POST /api/register`**
- **`POST /api/webhooks/stripe`**, **`POST /api/webhooks/billing/[provider]`** — signature / shared-secret verification

### Teacher dashboard (session + ownership)

Routes under **`/api/classrooms`**, **`/api/sets`**, **`/api/folders`**, **`/api/history`**, **`/api/upload`**, **`/api/user/*`**, **`/api/notifications`**, **`/api/teacher/*`**, **`/api/billing/*`** (except reconcile may be session-scoped), **`/api/omr/*`**, **`/api/ai/*`**, **`POST /api/admin/register`**: use **`auth()`** and enforce classroom/set ownership or role via existing helpers (`canUserAccessClassroom`, `getGamificationSettings`, etc.).  
**Regression:** existing Vitest suites (e.g. `*-route-auth.test.ts`) cover several of these.

### Student portal (`/api/student/[code]/*`, `/api/student/negamon/select`)

Authorization via **student code** (and related helpers), not teacher JWT.  
Must not expose other classrooms’ data — enforced in handlers + `resource-access` / economy services.

### Classroom reads with alternate auth

- **`GET /api/classrooms/[id]/leaderboard`** — [`handleClassroomLeaderboardGet`](../src/lib/api-handlers/classroom-leaderboard.ts): teacher session **or** `?code=` login code + `canLoginCodeAccessClassroom`
- **`GET /api/classrooms/[id]/battle/opponents`**, **`POST /api/classrooms/[id]/battle`** — [`authorizeBattleRead`](../src/lib/services/battle-read-auth.ts) (student id + optional code)
- **Quiz take** — **`/api/classrooms/[id]/assignments/[assignmentId]/question`**, **`check-answer`**, **`submit`**: [`loadQuizTakeContext`](../src/lib/quiz-take-context.ts)

### Classroom events

- **`GET /api/classrooms/[id]/events`** — same access model as leaderboard: teacher session (`canUserAccessClassroom`) or **`?code=`** student login code (`canLoginCodeAccessClassroom`). Student UI must append the code query param.

## Plan quotas (related)

Server routes that enforce limits must call **`getLimitsForUser(role, plan, planStatus, planExpiry)`** with billing fields from session or DB so expired/inactive subscriptions do not keep PLUS quotas — see [`plan-access.ts`](../src/lib/plan/plan-access.ts).

## Maintenance

When adding a new file under `src/app/api/**`:

1. Classify it into a row above (or add a subsection).
2. Add or extend a focused auth test if the route is high-risk (classroom write, billing, economy).
