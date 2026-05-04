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
- [ ] Add student invalid/forbidden failure shows readable localized feedback
- [x] Student manager save path updates name/nickname and keeps roster order stable
- [x] Student manager delete path removes the student and closes edit state if needed
- [ ] Student manager reorder path persists after refresh
- [ ] Student manager reorder failure rolls back cleanly and shows readable feedback
- [x] Attendance mode cycles student states and save persists them
- [ ] Attendance history loads, retries, and surfaces failure states distinctly from empty states
- [x] Editing a historical attendance record does not corrupt the latest student attendance state
- [x] Single-student point award updates behavior points and shows no stale selection state
- [x] Multi-select point award updates the intended students only
- [ ] Reset behavior points succeeds and the dashboard reflects the reset immediately
- [x] Assignment create/edit/delete flows keep the assignment list in sync
- [ ] Assignment visibility toggle updates the list immediately and rolls back cleanly on failure
- [x] Assignment reorder persists after refresh
- [ ] Manual score entry persists and failure restores the prior value
- [ ] Checklist toggle persists and failure restores the prior state
- [x] Analytics tab loads successfully and displays data rather than an empty-state fallback when data exists
- [ ] Group filter and selection state stay valid after adding/removing students

## Staging QA

- [ ] Staging classroom dashboard smoke pass completed with a real teacher account
- [ ] Staging mutation flows checked with real data and no console-blocking API failures

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
  - attendance save persistence
  - historical attendance edit integrity
  - single-student point award path
  - multi-select point award path
  - assignment create/edit/delete list sync
  - assignment reorder persistence
  - analytics data rendering
- Current blockers / remaining work:
  - Add-student failure-path QA still needs a live invalid or forbidden browser scenario, not just the success path.
  - After a bulk point award, the student-manager list reflected fresh totals, but an already-open edit panel still showed the pre-award number until it was reopened. That looks like a follow-up UX consistency bug even though the award mutation itself persisted correctly.
  - Assignment visibility toggle success path is verified, but the explicit rollback-on-failure branch is still unproven in browser QA.
  - Student-manager keyboard reorder did not move rows in the current browser pass, so that checklist item is still open pending a reliable interaction or a product bug fix.
  - Reset points is ready to test, but it requires an explicit confirmation because it deletes behavior-point history and assignment submissions in the classroom fixture.
  - Group-filter and several assignment/checklist/manual-score failure-path items are still pending a dedicated browser pass.
  - Staging QA is still blocked because no staging URL or staging credentials were provided.
