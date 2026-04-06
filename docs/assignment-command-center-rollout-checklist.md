# Assignment Command Center Rollout Checklist

Use this checklist before merging and releasing changes related to ASN-201+.

## 1) Functional Verification

- Teacher dashboard shows both `TeacherCommandCenter` and `AssignmentCommandCenter`.
- Assignment overview loads for teacher/admin roles.
- Non-teacher roles do not see teacher command sections.
- Empty-state behavior is clear when no classrooms or no assignment hotspots exist.

## 2) Deep-Link Contract Verification

- From command centers, attendance button opens:
  - `/dashboard/classrooms/[id]?tab=attendance`
- From assignment actions, classroom opens with focus:
  - `/dashboard/classrooms/[id]?tab=classroom&focus=assignments`
- Highlight action includes assignment id:
  - `...&highlightAssignmentId=<ObjectId>`
- Classroom page sanitizes unsupported query params safely.

## 3) API Contract Verification

- `GET /api/teacher/assignments/overview` returns:
  - `totals`
  - `classrooms[]`
  - `items[]`
- Query handling:
  - `range` defaults to `14`
  - invalid `classId` is ignored
  - non-owned `classId` returns `404`
- Protected routes still enforce `auth + role + ownership`.

## 4) Concurrency/Resilience Verification

- Rapid range switching does not show stale data from older requests.
- Previous in-flight request is aborted when a new load starts.
- Retry button works after API/network failure.
- Abort paths do not surface as user-facing errors.

## 5) Required Test Suite

Run at minimum:

- `npx vitest run src/__tests__/teacher-assignments-overview-route.test.ts`
- `npx vitest run src/__tests__/teacher-assignment-overview-service.test.ts`
- `npx vitest run src/__tests__/dashboard-classroom-page.test.ts`
- `npx vitest run src/__tests__/assignment-command-center-helpers.test.ts`
- `npx vitest run src/__tests__/teacher-assignment-overview-load.test.ts`
- `npx vitest run src/__tests__/teacher-assignment-overview-request-gate.test.ts`

Optional full gate:

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`

## 6) PR Review Checklist (Fast Pass)

- Query strings are created by helper functions, not inline string concatenation.
- New route/query behavior is documented in:
  - `docs/assignment-command-center-query-contract.md`
- If query semantics changed, matching tests were updated in same PR.
- Error handling uses structured route contract where applicable.

## 7) Rollback Notes

If production issues occur:

1. Revert dashboard references to assignment command center.
2. Keep API route disabled from UI entry points first.
3. Preserve data schema (no migration needed in ASN-201+ path).
4. Re-enable after contract tests pass in CI.
