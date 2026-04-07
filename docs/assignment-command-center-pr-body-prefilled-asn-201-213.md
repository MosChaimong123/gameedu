# Assignment Command Center (ASN-201..213) PR Draft

## Summary

- What changed:
  - Added teacher assignment overview API (`GET /api/teacher/assignments/overview`) with safe query handling for `range` and `classId`.
  - Added Assignment Command Center UI on teacher dashboard with deep-link actions into classroom assignment workflows.
  - Added deep-link support and query sanitization on classroom page for `focus=assignments` and `highlightAssignmentId`.
  - Added hardening for async loading (latest-request gate + AbortController cancellation).
  - Added helper contract layer, rollout docs, query contract docs, and PR/review templates.
- Why now:
  - Teachers needed a faster cross-classroom way to triage overdue/missing work and jump directly to the relevant assignment context.

## Change Type

- [x] Feature
- [x] Bug fix
- [x] Refactor
- [x] Docs
- [x] Test-only

## What Changed (Detailed)

- API:
  - Added `src/app/api/teacher/assignments/overview/route.ts`
  - Added `src/lib/services/teacher/get-teacher-assignment-overview.ts`
  - Enforced auth + role + ownership behavior for optional `classId`
- UI:
  - Added `src/components/dashboard/assignment-command-center.tsx`
  - Updated `src/components/dashboard/dashboard-content.tsx` to show teacher/admin command surfaces
  - Updated `src/app/dashboard/classrooms/[id]/page.tsx` with query normalization helper and deep-link plumbing
  - Updated classroom components for assignment focus/highlight behavior
- Reliability:
  - Added `src/components/dashboard/use-teacher-assignment-overview.ts`
  - Added latest-request gate and in-flight cancellation via AbortController
- Helpers:
  - Added/expanded `src/components/dashboard/assignment-command-center.helpers.ts`
  - Centralized deep-link generation to reduce query drift
- Tests:
  - Added/updated:
    - `src/__tests__/teacher-assignments-overview-route.test.ts`
    - `src/__tests__/teacher-assignment-overview-service.test.ts`
    - `src/__tests__/dashboard-classroom-page.test.ts`
    - `src/__tests__/assignment-command-center-helpers.test.ts`
    - `src/__tests__/teacher-assignment-overview-load.test.ts`
    - `src/__tests__/teacher-assignment-overview-request-gate.test.ts`
- Docs:
  - Added:
    - `docs/assignment-command-center-query-contract.md`
    - `docs/assignment-command-center-rollout-checklist.md`
    - `docs/asn-201-211-changelog.md`
    - `docs/pr-review-template-playbook.md` updates
    - `docs/assignment-command-center-pr-body-template.md`

## Why

- Problem addressed:
  - Existing flow required opening classrooms one-by-one and lacked assignment-priority triage across classes.
- Why this approach:
  - Keep policy and aggregation server-side, render narrow DTOs to UI, and standardize all deep-links through helpers for maintainability.

## Risk Assessment

- User impact risk:
  - Medium: deep-link regressions could route to wrong tab/focus.
- Security/data exposure risk:
  - Low-medium: new teacher API route; mitigated by auth/role/ownership checks and narrow payloads.
- Operational risk:
  - Low: dashboard reads only; mitigated with cancellation and stale-response guards.
- Mitigations:
  - Route, service, and query-contract tests added; deep-link helper tests and page normalization tests included.

## Query/Deep-Link Contract Impact

- [ ] No query semantics changed
- [x] Query semantics changed and docs/tests were updated in same PR

Added/changed params:

- API: `range`, `classId`
- Classroom page: `focus`, `highlightAssignmentId` (plus validated `tab`)

Normalization behavior:

- API `range` fallback to `14`; invalid `classId` ignored; non-owned valid `classId` => `404`
- Classroom query normalized via `normalizeClassroomPageQuery(...)`

Safe fallbacks:

- Unsupported tab/focus/highlight values are sanitized to safe defaults.

## Test Plan

- Targeted tests run:
  - [x] `npx vitest run src/__tests__/teacher-assignments-overview-route.test.ts`
  - [x] `npx vitest run src/__tests__/teacher-assignment-overview-service.test.ts`
  - [x] `npx vitest run src/__tests__/dashboard-classroom-page.test.ts`
  - [x] `npx vitest run src/__tests__/assignment-command-center-helpers.test.ts`
  - [x] `npx vitest run src/__tests__/teacher-assignment-overview-load.test.ts`
  - [x] `npx vitest run src/__tests__/teacher-assignment-overview-request-gate.test.ts`
- Functional manual checks:
  - [ ] Dashboard cards render expected data
  - [ ] Deep-link opens intended tab/focus/highlight
  - [ ] Error + retry behavior works

## Verification

- [ ] `npx tsc --noEmit` *(repo currently has unrelated pre-existing TS errors; rerun after baseline is clean)*
- [ ] `npx eslint .`
- [ ] `npm test`
- [ ] `npx next build`

## Security And Data Review

- [x] Reviewed against `docs/security-pr-review-checklist.md`
- [x] Route work follows `docs/route-pattern-guide.md`
- [x] Protected route tests align with `docs/route-authorization-test-template.md`
- [x] Page data exposure reviewed where dashboard query/data flow changed

## Operational Safety

- [x] New public or abuse-prone routes checked for rate limiting applicability
- [x] Privileged mutation audit logging not required for this read-focused slice
- [x] User-facing error paths use structured `error.code` contract on route paths

## Risks / Follow-ups

- Accepted risks:
  - UI integration tests still mostly unit-level (node env); no browser-level e2e in this slice.
- Deferred tasks:
  - Add browser integration/e2e for click-through and visual highlight verification.

## Rollback Plan

1. Remove teacher dashboard entry points to assignment command center in `dashboard-content`.
2. Revert classroom deep-link focus/highlight wiring.
3. Keep API route isolated or revert route/service pair if needed; validate with targeted vitest commands.

## Optional Release Notes Snippet

- User-facing:
  - Teachers can now view cross-class assignment health, overdue items, and missing submissions from dashboard command center.
  - One-click deep-links open classroom assignment context and can highlight a specific assignment.
- Internal/ops:
  - Added query contract + rollout checklist + PR/review templates for consistent future changes.
