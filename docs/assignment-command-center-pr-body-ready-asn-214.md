# Assignment Command Center (ASN-201..214) PR Body (Ready)

## Summary

- What changed:
  - Added teacher assignment overview API (`GET /api/teacher/assignments/overview`) with normalized query handling (`range`, `classId`) and ownership enforcement.
  - Added Assignment Command Center UI for teacher/admin dashboard with class-level triage and priority assignment list.
  - Added deep-link support into classroom assignment context (`focus=assignments`, `highlightAssignmentId`) with query sanitization on classroom page.
  - Hardened async loading with latest-request gating and AbortController cancellation.
  - Standardized link/query construction via shared helpers to prevent query drift.
  - Added docs package (query contract, rollout checklist, changelog, PR template/playbook updates).
- Why now:
  - Teachers needed a faster, cross-classroom workflow to triage overdue/missing submissions and jump directly to actionable assignment views.

## Change Type

- [x] Feature
- [x] Bug fix
- [x] Refactor
- [x] Docs
- [x] Test-only

## What Changed (Detailed)

- API
  - `src/app/api/teacher/assignments/overview/route.ts`
  - `src/lib/services/teacher/get-teacher-assignment-overview.ts`
- UI
  - `src/components/dashboard/assignment-command-center.tsx`
  - `src/components/dashboard/teacher-command-center.tsx`
  - `src/components/dashboard/dashboard-content.tsx`
  - `src/app/dashboard/classrooms/[id]/page.tsx`
  - `src/components/classroom/classroom-dashboard.tsx`
  - `src/components/classroom/classroom-table.tsx`
- Reliability/State
  - `src/components/dashboard/use-teacher-assignment-overview.ts`
- Helpers
  - `src/components/dashboard/assignment-command-center.helpers.ts`
- Tests
  - `src/__tests__/teacher-assignments-overview-route.test.ts`
  - `src/__tests__/teacher-assignment-overview-service.test.ts`
  - `src/__tests__/dashboard-classroom-page.test.ts`
  - `src/__tests__/assignment-command-center-helpers.test.ts`
  - `src/__tests__/teacher-assignment-overview-load.test.ts`
  - `src/__tests__/teacher-assignment-overview-request-gate.test.ts`
- Docs
  - `docs/assignment-command-center-query-contract.md`
  - `docs/assignment-command-center-rollout-checklist.md`
  - `docs/asn-201-211-changelog.md`
  - `docs/pr-review-template-playbook.md`
  - `docs/assignment-command-center-pr-body-template.md`
  - `docs/assignment-command-center-pr-body-prefilled-asn-201-213.md`

## Why

- Problem addressed:
  - Prior workflow required opening classrooms one-by-one, with no centralized assignment-priority triage.
- Why this approach:
  - Keep authorization/aggregation server-side, expose narrow DTOs, and enforce consistent deep-link semantics via shared helper contract.

## Risk Assessment

- User impact risk:
  - Medium: incorrect deep-link query could route to wrong tab/focus.
- Security/data exposure risk:
  - Low-medium: new teacher-facing read route; mitigated by auth + role + ownership and constrained response shape.
- Operational risk:
  - Low: dashboard read flow only; mitigated by stale-response gate + request cancellation.
- Mitigations:
  - Added route/service/query/helper tests and explicit query contract documentation.

## Query/Deep-Link Contract Impact

- [ ] No query semantics changed
- [x] Query semantics changed and docs/tests were updated in same PR

Added/changed params:

- API: `range`, `classId`
- Classroom page: `tab` validation + `focus` + `highlightAssignmentId`

Normalization behavior:

- API: invalid/missing `range` => `14`; invalid `classId` ignored; valid non-owned `classId` => `404`
- Classroom page: `normalizeClassroomPageQuery(...)` sanitizes unsupported values to safe defaults

Safe fallbacks:

- Unsupported tab/focus/highlight values fallback to `classroom`, `null`, `null`

## Test Plan

- [x] `npx vitest run src/__tests__/teacher-assignments-overview-route.test.ts`
- [x] `npx vitest run src/__tests__/teacher-assignment-overview-service.test.ts`
- [x] `npx vitest run src/__tests__/dashboard-classroom-page.test.ts`
- [x] `npx vitest run src/__tests__/assignment-command-center-helpers.test.ts`
- [x] `npx vitest run src/__tests__/teacher-assignment-overview-load.test.ts`
- [x] `npx vitest run src/__tests__/teacher-assignment-overview-request-gate.test.ts`

Functional manual checks (to run before merge):

- [ ] Dashboard cards render expected data for teacher/admin
- [ ] Deep-link opens intended tab/focus/highlight
- [ ] Error + retry path behaves correctly

## Verification

- [ ] `npx tsc --noEmit` *(currently blocked by unrelated pre-existing repo errors outside this slice)*
- [ ] `npx eslint .`
- [ ] `npm test`
- [ ] `npx next build`

## Security And Data Review

- [x] Reviewed against `docs/security-pr-review-checklist.md`
- [x] Route work follows `docs/route-pattern-guide.md`
- [x] Protected route tests align with `docs/route-authorization-test-template.md`
- [x] Page/query data boundary reviewed where classroom query behavior changed

## Operational Safety

- [x] Route abuse/rate-limit applicability reviewed
- [x] No privileged write mutation introduced in this slice
- [x] Route errors remain structured (`error.code`) on reject paths

## Risks / Follow-ups

- Accepted risks:
  - UI integration coverage is mostly unit-level (node env); no browser e2e in this slice.
- Deferred tasks:
  - Add browser-level test for click-through + visual highlight confirmation.

## Rollback Plan

1. Remove dashboard entry points to Assignment Command Center (`dashboard-content`).
2. Revert classroom deep-link focus/highlight wiring.
3. Revert assignment overview route/service pair if needed.
4. Re-run targeted vitest files above to confirm rollback stability.

## Optional Release Notes Snippet

- User-facing:
  - Teachers can triage overdue/missing assignment work across classes from dashboard.
  - One-click deep-links open classroom assignment context and can highlight specific assignments.
- Internal/ops:
  - Added explicit query contract, rollout checklist, and PR review templates for consistent future changes.

## Executed Command Log (This Workstream)

- `npx vitest run src/__tests__/teacher-overview-route.test.ts`
- `npx vitest run src/__tests__/teacher-assignments-overview-route.test.ts`
- `npx vitest run src/__tests__/teacher-assignment-overview-service.test.ts src/__tests__/dashboard-classroom-page.test.ts src/__tests__/teacher-assignments-overview-route.test.ts`
- `npx vitest run src/__tests__/assignment-command-center-helpers.test.ts src/__tests__/teacher-assignments-overview-route.test.ts src/__tests__/teacher-assignment-overview-service.test.ts`
- `npx vitest run src/__tests__/teacher-assignment-overview-load.test.ts src/__tests__/assignment-command-center-helpers.test.ts`
- `npx vitest run src/__tests__/teacher-assignment-overview-load.test.ts src/__tests__/teacher-assignment-overview-request-gate.test.ts`
- `npx vitest run src/__tests__/assignment-command-center-helpers.test.ts src/__tests__/dashboard-classroom-page.test.ts`
