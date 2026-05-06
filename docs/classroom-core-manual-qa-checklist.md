# Classroom Core Manual QA Checklist

Manual QA checklist for the teacher-facing classroom dashboard after the Classroom Core hardening pass.

## Automated Preflight

Run before or after each manual QA pass:

- `npm.cmd run check:classroom-core`

Expected result:

- [x] `test:classroom-core` passes
- [x] `predev` passes

## Dev QA

- [x] Teacher can open a classroom dashboard they own
- [x] Teacher cannot open another teacher's classroom by URL
- [x] Empty classroom state renders correctly and add-student CTA works
- [x] Add student success path updates the roster immediately
- [x] Add student invalid/forbidden failure shows readable localized feedback
- [x] Student manager save path updates name/nickname and keeps roster order stable
- [x] Student manager delete path removes the student and closes edit state if needed
- [x] Student manager reorder path persists after refresh
- [x] Student manager reorder failure rolls back cleanly and shows readable feedback
- [x] Attendance mode cycles student states and save persists them
- [x] Attendance history loads, retries, and surfaces failure states distinctly from empty states
- [x] Editing a historical attendance record does not corrupt the latest student attendance state
- [x] Single-student point award updates behavior points and shows no stale selection state
- [x] Multi-select point award updates the intended students only
- [x] Reset behavior points succeeds and the dashboard reflects the reset immediately
- [x] Assignment create/edit/delete flows keep the assignment list in sync
- [x] Assignment visibility toggle updates the list immediately and rolls back cleanly on failure
- [x] Assignment reorder persists after refresh
- [x] Manual score entry persists and failure restores the prior value
- [x] Checklist toggle persists and failure restores the prior state
- [x] Analytics tab loads successfully and displays data rather than an empty-state fallback when data exists
- [x] Group filter and selection state stay valid after adding/removing students

## Staging QA

- [x] Staging classroom dashboard smoke pass completed with a real teacher account
- [x] Staging mutation flows checked with real data and no console-blocking API failures

## Notes

- Do not mark staging complete without a real URL, teacher account, and classroom fixture details.
- Record any localized API message regressions with the exact dashboard surface where they appeared.
- Local QA fixtures prepared on 2026-05-04:
  - teacher: `qa.teacher.classroom@example.com`
  - classroom ids: empty/core/forbidden fixtures seeded locally for dev-only QA
- Prepared local smoke script:
  - `node scripts/classroom-core-manual-qa-smoke.mjs`
- Browser QA pass completed on 2026-05-04 for these verified dev items:
  - own-classroom access
  - forbidden classroom URL redirect
  - empty classroom state
  - add-student success path
  - student manager save path
  - student manager delete path (including active edit-state closure)
  - student manager reorder persistence after refresh
  - add-student forbidden failure feedback
  - student-manager reorder failure rollback feedback
  - attendance save persistence
  - attendance-history empty state vs error/retry state
  - historical attendance edit integrity
  - single-student point award path
  - multi-select point award path
  - reset behavior points flow
  - assignment create/edit/delete list sync
  - assignment visibility rollback-on-failure
  - assignment reorder persistence
  - manual score rollback-on-failure
  - checklist toggle rollback-on-failure
  - group filter remains valid through add/delete roster changes
  - analytics data rendering
- Staging QA pass on 2026-05-05 used:
  - site: `https://www.teachplayedu.com/`
  - teacher account: `borisud29744@sikhiu.ac.th`
  - classroom: `QA Classroom 2026-05-05`
  - classroom id: `69f9f17b06acd9c1d8f516a2`
- Verified on staging:
  - teacher sign-in succeeded
  - classroom list empty-state rendered before setup
  - creating the QA classroom added a real classroom card and opened a usable dashboard target
  - classroom dashboard loaded with the expected teacher-facing surfaces (`Classroom`, `Attendance`, `Idea Board`, `Analytics`, `Economy`)
  - adding `Staging QA Student 1` succeeded via `POST /api/classrooms/69f9f17b06acd9c1d8f516a2/students` with HTTP `200`
- Staging findings:
  - the classroom-create flow showed `Could not create classroom / Check your details and try again.` even though the classroom card was created successfully
  - the add-student dialog stayed on `Adding...` for several seconds before the dashboard refreshed to show the new student
  - `Attendance` and `Analytics` both surfaced `Could not reach the server. Check your connection and try again.` instead of usable data/empty states
  - the browser console emitted repeated Socket.IO websocket failures (`Insufficient resources` in this run), so staging mutation QA cannot be marked clean yet
- Follow-up fix pass prepared on 2026-05-05 (local code, awaiting deploy/re-run):
  - `CreateClassroomDialog` now routes directly to the created classroom id after a successful `POST /api/classrooms`, avoiding a false destructive toast when the follow-up refresh/navigation step is what fails
  - classroom tab loaders now retry one transient network failure before surfacing the localized error state, targeting the flaky staging `Attendance` / `Analytics` behavior seen in browser QA
  - focused loader tests passed `8/8`, and `npm.cmd run test:classroom-core` passed `105/105`
- Staging rerun after deploy on 2026-05-05 confirmed the four follow-up issues are cleared:
  - creating `QA Classroom Rerun 2026-05-05T14-17-27` returned HTTP `200`, showed the success toast, and did not show the false failure toast
  - add-student mutation in classroom `69f9fbf9eaecc54536c0cdf8` returned HTTP `200`, closed the dialog cleanly, and rendered the new student without the sticky `Adding...` state
  - `Attendance` loaded its normal history shell and empty-state copy instead of the prior network error panel
  - `Analytics` loaded normally without the prior network error panel
  - no console-blocking Socket.IO failures were reproduced in this rerun
- Current blockers / remaining work:
  - Classroom Core QA checklist is complete for dev and staging as of 2026-05-05
