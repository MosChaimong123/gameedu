# Assignment Command Center Query Contract

This contract defines the canonical query and deep-link behavior for the Teacher dashboard assignment workflows.

## Scope

Applies to:

- `src/components/dashboard/assignment-command-center.tsx`
- `src/components/dashboard/teacher-command-center.tsx`
- `src/app/dashboard/classrooms/[id]/page.tsx`
- `src/components/classroom/classroom-dashboard.tsx`
- `src/components/classroom/classroom-table.tsx`
- `src/components/dashboard/assignment-command-center.helpers.ts`

## Canonical Links

Use shared helpers only:

- `buildAssignmentOverviewUrl(rangeDays)`
- `buildAssignmentClassroomHref(classId, assignmentId?)`
- `buildClassroomAssignmentsHref(classId)`
- `buildAttendanceTabHref(classId)`

Do not hardcode dashboard classroom query strings in components when a helper exists.

## Query Parameters

### 1) Dashboard API

`GET /api/teacher/assignments/overview`

Supported query params:

- `range`: `7`, `7d`, `14`, `14d`, `30`, `30d`
- `classId`: 24-char hex ObjectId

Normalization rules:

- invalid or missing `range` => `14`
- invalid `classId` => ignored
- valid but non-owned `classId` => API returns `404 NOT_FOUND`

### 2) Classroom Page Deep-Link

Path: `/dashboard/classrooms/[id]`

Supported query params:

- `tab`: `classroom | attendance | analytics | board`
- `focus`: currently `assignments` only
- `highlightAssignmentId`: 24-char hex ObjectId

Normalization rules in `normalizeClassroomPageQuery(...)`:

- invalid or missing `tab` => `classroom`
- unsupported `focus` => `null`
- invalid `highlightAssignmentId` => `null`

## Behavioral Contract

When `focus=assignments`:

- `ClassroomDashboard` opens in `table` mode (assignment-centric view).

When `highlightAssignmentId` is valid:

- `ClassroomTable` scrolls to target assignment column/card.
- target is temporarily highlighted (ring class) then reset.

When both exist:

- both behaviors must apply.

## Safety Contract

- All teacher dashboard links to assignment views must route through helper functions.
- Route/API authorization remains server-side (`auth` + role + ownership checks).
- Frontend query params are hints only and must always be sanitized on server/page boundary.

## Regression Tests

Current contract coverage:

- `src/__tests__/assignment-command-center-helpers.test.ts`
  - canonical URL generation and deep-link helpers
- `src/__tests__/teacher-assignments-overview-route.test.ts`
  - range and classId query behavior for API route
- `src/__tests__/dashboard-classroom-page.test.ts`
  - page query normalization behavior
- `src/__tests__/teacher-assignment-overview-load.test.ts`
  - loader fetch/error/abort behavior
- `src/__tests__/teacher-assignment-overview-request-gate.test.ts`
  - stale-request gate behavior

## Review Rule

If a PR changes any of the query param semantics above, it must update this contract and the matching tests in the same PR.
