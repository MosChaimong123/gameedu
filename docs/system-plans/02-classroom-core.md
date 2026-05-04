# System Plan 02: Classroom Core

Last updated: 2026-05-04

## Scope

- Classroom CRUD, students, skills, points, attendance, groups, leaderboard, analytics

## Key Files

- `src/app/dashboard/classrooms`
- `src/app/api/classrooms`
- `src/app/api/classrooms/[id]`
- `src/app/api/classrooms/[id]/students`
- `src/app/api/classrooms/[id]/skills`
- `src/app/api/classrooms/[id]/points`
- `src/app/api/classrooms/[id]/attendance`
- `src/app/api/classrooms/[id]/groups`
- `src/app/api/classrooms/[id]/leaderboard`
- Prisma: `Classroom`, `Student`, `Skill`, `PointHistory`, `AttendanceRecord`, `StudentGroup`

## Problem Analysis Checklist

- [x] Teacher ownership validated on core classroom routes:
  dashboard load path, leaderboard/group-scores, groups, points, attendance, and reset flows now enforce owner/role checks more consistently
- [x] Student mutation isolation checked on core flows:
  points, batch points, attendance saves, and saved-group edits now reject cross-classroom student references
- [x] Point history reason and audit completeness checked:
  point awards persist meaningful reasons and the main classroom point mutations now emit audit events with skill and target metadata
- [x] Attendance save and history integrity checked:
  save flow preserves non-attendance student fields, and historical edits no longer corrupt current attendance state
- [x] Group score sync and empty-group handling checked:
  group-score reads require valid access, saved-group edit payloads stay shape-compatible, and empty sets render cleanly
- [x] Leaderboard and analytics numerical accuracy checked:
  leaderboard access/ranking is covered, and checklist-based assignment analytics now normalize bitmask submissions into actual academic points
- [x] Dashboard loading, empty, error, and mutation-feedback states fully swept:
  attendance-history, analytics, add-student, student-manager, classroom settings, assignment modal, and score-entry/table flows now surface localized failures and stable rollback paths across the main teacher-facing classroom dashboard mutations, and manual QA handoff is prepared

## Improvement Plan

1. เธ—เธณ ownership guard เน€เธเนเธ shared pattern
2. เน€เธเธดเนเธก tests เธชเธณเธซเธฃเธฑเธ cross-classroom access
3. เธ•เธฃเธงเธ data integrity เธเธญเธ points/attendance/groups
4. เธเธฃเธฑเธ dashboard state เนเธซเนเธเธฃเธ empty/loading/error
5. เน€เธเธดเนเธก manual QA classroom flow

## Validation

- `npm.cmd test -- src/__tests__/classroom-points-authorization.test.ts src/__tests__/attendance-save.test.ts src/__tests__/points-isolation.test.ts`
- `npm.cmd test -- src/__tests__/classroom-analytics-route.test.ts src/__tests__/classroom-dashboard-component.test.ts`
- `npm.cmd run test:classroom-core`
- `npm.cmd run check:classroom-core`
- `npm.cmd run lint`
- `npm.cmd run predev`
- `npm.cmd run build`

## Exit Criteria

- Classroom data isolation เธเนเธฒเธเธ—เธธเธ route
- เธเธฐเนเธเธ/เน€เธเนเธเธเธทเนเธญ/เธเธฅเธธเนเธกเธกเธต regression tests
- Dashboard เนเธเนเธเธฒเธเนเธ”เนเธ—เธฑเนเธ state เธงเนเธฒเธเนเธฅเธฐเธกเธตเธเนเธญเธกเธนเธฅ

## Progress Note 1

Completed on 2026-05-04:

- Started the first Classroom Core hardening pass by closing a classroom data-isolation gap in the group leaderboard route
- Updated `src/app/api/classrooms/[id]/groups/scores/route.ts` so it no longer exposes group member names and scores publicly by raw classroom id
- The route now follows the same access contract as the individual leaderboard:
  - teacher/admin session with classroom access is allowed
  - student login-code access is allowed only when the code belongs to the requested classroom
  - no session and no valid login code -> structured `AUTH_REQUIRED` / `FORBIDDEN`
- Updated `src/components/student/LeaderboardTab.tsx` so group leaderboard requests include the student login code just like the individual leaderboard request already did
- Added focused regression coverage in `src/__tests__/classroom-group-scores-route-auth.test.ts`

Practical status:

- Classroom Core now has its first explicit proof that a student-facing classroom data surface cannot be enumerated by classroom id alone
- Next high-value follow-up is inventorying the remaining classroom routes for the same kind of cross-classroom leakage and ownership drift

## Progress Note 2

Completed on 2026-05-04:

- Fixed a saved-group integrity bug in `src/app/api/classrooms/[id]/groups/[groupId]/route.ts`
- The route previously treated `studentIds` in PATCH payloads as if they were always raw student ids, even though saved group sets are stored as serialized subgroup JSON blobs
- This meant editing an existing saved group could validate the wrong values and drift the stored data shape away from the create flow
- The PATCH handler now:
  - accepts legacy raw student-id arrays
  - accepts serialized subgroup payloads from the classroom group-maker edit flow
  - extracts referenced student ids from either shape before validating classroom membership
  - rejects malformed subgroup JSON as structured `INVALID_PAYLOAD`
- Added regression coverage in `src/__tests__/classroom-groups-skills-auth.test.ts` to prove:
  - serialized subgroup updates are validated against the underlying student ids rather than the raw JSON strings
  - malformed serialized subgroup payloads fail cleanly instead of being written through

Practical status:

- Saved group creation and saved group editing now follow the same data contract instead of silently drifting into incompatible shapes
- Next high-value follow-up is still inventorying classroom routes for remaining ownership/data-isolation gaps, with attendance and points flows as the most likely next cluster

## Progress Note 3

Completed on 2026-05-04:

- Hardened `attendance`, `points`, `points/batch`, and `points/reset` so they no longer blur classroom ownership failures into `AUTH_REQUIRED`
- Added explicit teacher/admin role gates in:
  - `src/app/api/classrooms/[id]/attendance/route.ts`
  - `src/app/api/classrooms/[id]/points/route.ts`
  - `src/app/api/classrooms/[id]/points/batch/route.ts`
  - `src/app/api/classrooms/[id]/points/reset/route.ts`
- Updated the underlying classroom services so non-owner access resolves as `FORBIDDEN` instead of a misleading unauthenticated error:
  - `src/lib/services/classroom-attendance/save-classroom-attendance.ts`
  - `src/lib/services/classroom-points/award-classroom-points.ts`
  - `src/lib/services/classroom-points/reset-classroom-points.ts`
- Added focused regression coverage in `src/__tests__/classroom-points-attendance-contract.test.ts` proving that:
  - non-teacher sessions are rejected before mutating attendance or points
  - ownership failures map to structured `FORBIDDEN`
  - failed reset attempts do not emit noisy classroom reset audit logs

Practical status:

- Classroom Core mutation routes now distinguish missing authentication from valid-but-forbidden classroom access more cleanly
- Next high-value follow-up is continuing the inventory for attendance history and classroom dashboard state handling, where read/write drift can still hide in edge cases

## Progress Note 4

Completed on 2026-05-04:

- Hardened the classroom dashboard load path so teacher ownership is checked before the full dashboard payload is fetched
- Added `getClassroomDashboardForTeacher()` in `src/lib/services/classroom-dashboard/get-classroom-dashboard.ts`
- The new helper performs a lightweight owner check first and returns a structured access result:
  - `not_found`
  - `forbidden`
  - `ok`
- Updated `src/app/dashboard/classrooms/[id]/page.tsx` to use the new helper instead of fetching the classroom by id first and comparing `teacherId` afterwards
- This removes an ownership drift where another teacher's classroom payload could be loaded before the page redirected away
- Added regression coverage in:
  - `src/__tests__/classroom-dashboard-access.test.ts`
  - `src/__tests__/dashboard-classroom-page.test.ts`

Practical status:

- Classroom dashboard reads are now owner-scoped from the start instead of post-filtered in the page layer
- Next high-value follow-up is attendance history integrity and dashboard empty/error handling around real fetched data, especially where the classroom page joins attendance, analytics, and modal-driven state

## Progress Note 5

Completed on 2026-05-04:

- Fixed an attendance-history integrity bug in `src/app/api/classrooms/[id]/attendance/history/[recordId]/route.ts`
- Previously, editing any historical attendance record wrote the edited status directly back to `student.attendance`
- That meant changing an older record could incorrectly overwrite the student's current attendance even when a newer record still existed
- The route now recomputes the student's current attendance from the latest attendance record for that classroom/student pair after the edit succeeds
- If no later record exists, it safely falls back to the edited status
- Added regression coverage in `src/__tests__/classroom-tail-auth.test.ts` proving:
  - historical record edits resync `student.attendance` from the latest record instead of the edited record blindly
  - the route still falls back correctly when no newer record exists

Practical status:

- Attendance history edits now preserve current-state integrity instead of letting retroactive fixes corrupt the live classroom attendance snapshot
- Next high-value follow-up is dashboard empty/error handling around classroom-side fetch failures, especially in attendance-history and analytics tabs where the UI still fails quietly on load errors

## Progress Note 6

Completed on 2026-05-04:

- Improved classroom dashboard tab error handling for attendance history and analytics
- Added shared loader helpers in `src/lib/classroom-tab-loaders.ts` so these tabs now distinguish:
  - successful empty data
  - structured API failure
  - network failure
- Updated `src/components/classroom/attendance-history-tab.tsx` so failed history loads no longer collapse into the same UI as "no attendance records"
- The attendance tab now shows a readable error state with a retry action instead of silently rendering an empty-state message
- Updated `src/components/classroom/AnalyticsDashboard.tsx` so analytics failures surface a clear error panel with retry instead of a generic silent fallback path
- Added regression coverage in `src/__tests__/classroom-tab-loaders.test.ts` to prove that:
  - attendance and analytics loaders preserve localized API errors
  - network failures become readable user-facing messages
  - non-OK responses do not get misclassified as empty data

Practical status:

- Classroom dashboard tabs now give teachers a cleaner distinction between "there is no data yet" and "the data failed to load"
- Next high-value follow-up is continuing the classroom dashboard UX pass around mutation feedback and cross-tab consistency, especially where modal actions change classroom state and other tabs need to stay in sync

## Progress Note 7

Completed on 2026-05-04:

- Updated the plan's analysis checklist with a readable status summary under `## Problem Analysis Checklist`
- The summary now distinguishes items that are already hardened in core classroom flows from items that still need a dedicated sweep
- Improved `src/components/classroom/attendance-history-tab.tsx` so attendance-history PATCH failures no longer collapse into a generic save error only
- The tab now attempts to surface localized API error messages for failed status updates, while still falling back cleanly for network failures

Practical status:

- The Classroom Core plan now has a clearer checklist/status view for the work already completed
- Attendance-history load and edit flows now both provide better operator feedback, while leaderboard/analytics accuracy and cross-tab state consistency remain the next meaningful checklist items

## Progress Note 8

Completed on 2026-05-04:

- Closed the main audit-trail gap for classroom point awards
- `src/app/api/classrooms/[id]/points/route.ts` now logs `classroom.points.awarded` with:
  - classroom id
  - target student id
  - skill id / skill name
  - skill weight
  - awarded count
- `src/app/api/classrooms/[id]/points/batch/route.ts` now logs `classroom.points.batch_awarded` with:
  - classroom id
  - skill id / skill name
  - skill weight
  - awarded count
  - affected student ids
- Lifted `skillId` and `skillName` into the successful result contract of `src/lib/services/classroom-points/award-classroom-points.ts` so routes can log consistent metadata without re-querying
- Added regression coverage in:
  - `src/__tests__/classroom-points-attendance-contract.test.ts`
  - refreshed fixtures in `src/__tests__/classroom-audit-log-routes.test.ts`

Practical status:

- Core classroom point mutations now have both user-facing point history reasons and server-side audit metadata
- The next high-value unchecked item in the Classroom Core checklist is leaderboard/analytics numerical correctness, followed by broader cross-tab consistency after mutations

## Progress Note 9

Completed on 2026-05-04:

- Fixed a numerical accuracy drift in classroom analytics assignment stats for checklist assignments
- `src/app/api/classrooms/[id]/analytics/route.ts` previously used raw submission scores directly when computing:
  - `avgScore`
  - `passCount`
  - per-assignment reporting
- For checklist assignments, those raw scores can represent bitmasks rather than the true academic points earned
- The analytics route now selects assignment `checklists` and normalizes checklist submissions through `checklistCheckedScore()` before computing aggregate assignment stats
- Added focused regression coverage in `src/__tests__/classroom-analytics-assignment-stats.test.ts`
- Updated `src/__tests__/classroom-analytics-route.test.ts` to reflect the additional query field needed for score normalization

Practical status:

- Classroom analytics now aligns checklist assignment reporting with the same academic scoring rules used elsewhere in the product
- The remaining major unchecked Classroom Core item is broader dashboard cross-tab consistency after mutations

## Progress Note 10

Completed on 2026-05-04:

- Tightened dashboard cross-tab consistency for roster-driven selection state
- `src/components/classroom/use-classroom-selection-flow.ts` now reconciles:
  - saved group filters
  - selected student ids
  - visible roster-backed group membership
  whenever the classroom roster changes
- This prevents selection-mode state from holding stale student ids or dead saved-group filters after mutations such as student add/remove/edit flows
- Added a focused helper export `normalizeSavedGroupsForRoster()` and regression coverage in `src/__tests__/classroom-selection-flow.test.ts`

Practical status:

- Classroom dashboard selection state is now more resilient when modal-driven roster mutations happen in a different part of the UI
- The remaining open Classroom Core UX work is mostly around broader mutation feedback consistency rather than stale roster-backed selection state

## Progress Note 11

Completed on 2026-05-04:

- Tightened mutation feedback and local roster consistency inside `src/components/classroom/student-manager-dialog.tsx`
- Student profile save, student removal, and drag-reorder flows now:
  - surface localized API error messages instead of collapsing into generic failure toasts
  - fall back cleanly for browser/network-level fetch failures
  - restore local roster state from a stable snapshot when reorder persistence fails
- Replaced stale roster update paths with shared helpers in `src/components/classroom/student-manager-dialog.helpers.ts`
- The dialog now also resyncs its local roster from incoming classroom students through an effect instead of mutating state during render
- Added focused regression coverage in `src/__tests__/student-manager-dialog.helpers.test.ts`

Practical status:

- The classroom dashboard now gives more consistent operator feedback for the most mutation-heavy roster-management modal
- The remaining open Classroom Core UX work is narrower now: mainly a final sweep for consistency between the remaining modal/table mutation flows, rather than broad roster-state drift

## Progress Note 12

Completed on 2026-05-04:

- Extended the mutation-feedback consistency pass across the remaining high-traffic classroom surfaces:
  - `src/components/classroom/add-assignment-dialog.tsx`
  - `src/components/classroom/classroom-settings-dialog.tsx`
  - `src/components/classroom/classroom-table.tsx`
- Assignment save, visibility toggle, delete, and reorder flows now surface localized API errors instead of collapsing into generic failure toasts
- Classroom settings save and behavior-point reset now preserve structured server error messages and still fall back cleanly for network failures
- Manual score entry and checklist toggles in the classroom table now report localized API failures before rolling optimistic state back
- Assignment visibility and reorder flows now also use stable snapshots so failed mutations do not drift the local list state

Practical status:

- The remaining unchecked Classroom Core item is now genuinely a last-mile consistency sweep instead of a broad mutation-feedback gap

## Progress Note 13

Completed on 2026-05-04:

- Closed the remaining major generic classroom-mutation error path in `src/components/classroom/add-student-dialog.tsx`
- Student creation now surfaces localized API errors instead of collapsing into a generic failure toast
- Browser/network failures still fall back cleanly through the shared UI error-message helpers
- Marked the main `Problem Analysis Checklist` as swept for the core teacher-facing dashboard flows after covering:
  - attendance history
  - analytics
  - add student
  - student manager
  - classroom settings
  - assignment modal
  - score entry / checklist toggles

Practical status:

- `02-classroom-core` is now in a much cleaner place: the major correctness and operator-feedback gaps are closed, and follow-up work can move from broad hardening into targeted polish or manual QA

## Progress Note 14

Completed on 2026-05-04:

- Prepared the Classroom Core handoff for repeatable regression and manual QA
- Added `npm.cmd run test:classroom-core` to bundle the focused Classroom Core regression suite into one command
- Added `npm.cmd run check:classroom-core` to run the focused classroom suite plus `predev`
- Added `docs/classroom-core-manual-qa-checklist.md` covering the main teacher-facing dashboard flows for dev/staging verification
- Updated the system plan validation section so the Classroom Core pass now has an explicit automated preflight and a concrete manual QA checklist

Practical status:

- `02-classroom-core` is now ready for a real browser/manual QA pass without re-deriving the scope from scratch
- Follow-up work can cleanly branch into either manual QA execution or the next system plan
