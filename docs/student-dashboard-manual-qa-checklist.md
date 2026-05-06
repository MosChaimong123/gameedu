# Student Dashboard Manual QA Checklist

Manual QA checklist for the student code login flow and the student-facing dashboard after the Student Dashboard / Student Code hardening pass.

## Automated Preflight

Run before or after each manual QA pass:

- `npm.cmd run check:student-dashboard`

Expected result:

- [x] `test:student-dashboard` passes
- [x] `predev` passes

## Dev QA

- [x] Student portal renders correctly in Thai and English
- [x] Invalid student code redirects back to `/student?error=invalid_code`
- [x] Valid student code opens only that student's classroom dashboard
- [x] Student home route shows only linked classrooms for the authenticated student account
- [x] Join-class dialog succeeds with a valid code and fails cleanly with an invalid code
- [x] Check-in succeeds once and does not duplicate rewards on the same day
- [x] Passive-gold claim is idempotent for the same reward window
- [x] Notifications load only the resolved student's notifications
- [x] Notification delete/update actions stay scoped to the resolved student code
- [x] Dashboard tabs render expected locked and empty states
- [x] Board tab does not expose sync CTA when the student is already linked
- [x] Shop / equip / unlock-skill flows reject invalid or foreign student-code access cleanly

## Staging QA

- [x] Student code login works with a real classroom code
- [x] Student dashboard tabs load with a real student account or code-only student
- [x] Check-in and passive-gold actions behave correctly with real data
- [x] Notifications and shop-related actions do not leak or cross students

## Notes

- Do not mark staging complete without a real URL, student login code or student account, and at least one classroom fixture.
- Record the exact student code flow used:
  - code-only student
  - linked student account
  - classroom fixture / student name
- Staging verification completed on 2026-05-05 at `https://www.teachplayedu.com/`
  - flow type: `code-only student`
  - classroom fixture: `Student QA 2026-05-05T15-05-28-019Z` (`69fa0739d21a5314213f2e53`)
  - student 1: `Staging Student QA One` (`P8JT3L3YBP8R`)
  - student 2: `Staging Student QA Two` (`GU644QX7WMTJ`)
- Staging results captured from the live dashboard:
  - `/student/P8JT3L3YBP8R` opened the correct classroom and rendered the student-only dashboard
  - Learn tabs loaded as `Tasks`, `Ideas`, `History`
  - Game tabs loaded as `Quests`, `Monster`, `Battle`, `Ranks`, `History`
  - passive-gold route returned `200` with `alreadyClaimed: true`, `goldEarned: 0`, `goldRate: 1`
  - check-in route returned `200` with `alreadyDone: true`, confirming duplicate-safe real-data behavior
  - notification fetch stayed scoped to `/api/student/<code>/notifications`
  - per-student API traffic stayed code-scoped:
    - student 1: `/api/student/P8JT3L3YBP8R/...`
    - student 2: `/api/student/GU644QX7WMTJ/...`
  - shop CTA rendered in game mode for both code-only students without cross-student route drift
- Execution update from the hardening pass on 2026-05-04 verified via automated coverage:
  - invalid-code redirect behavior
  - student-scoped dashboard read model
  - duplicate-safe sync behavior
  - check-in and passive-gold idempotency
  - notification scoping
  - dashboard tab wiring, locked states, and Thai/English text coverage
