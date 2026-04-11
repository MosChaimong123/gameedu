# ASN-217 Manual QA Checklist

Manual QA checklist for the Assignment Command Center teacher flow.

## Environment

- App URL: `<fill>`
- Role used: `TEACHER` (and optionally `ADMIN`)
- Data setup:
  - at least 2 classrooms
  - assignments with mixed states (overdue, due soon, no deadline)
  - submissions with some missing slots

## Dashboard Flow

- [ ] Teacher dashboard renders `TeacherCommandCenter`
- [ ] Teacher dashboard renders `AssignmentCommandCenter`
- [ ] Non-teacher role does not render teacher command components

## Assignment Command Center States

- [ ] Loading skeleton appears before data
- [ ] Success state shows totals + by-classroom rows + priority list
- [ ] Empty hotspots state shows expected empty message
- [ ] Error state shows retry button and recovers after retry

## Range Behavior

- [ ] Default range is 14 days
- [ ] Switching to 7 days updates totals/list correctly
- [ ] Switching to 30 days updates totals/list correctly
- [ ] Rapid switching does not show stale data

## Deep-Link Behavior

- [ ] "Open grade table" goes to `?tab=classroom&focus=assignments`
- [ ] "Take attendance" goes to `?tab=attendance`
- [ ] "Open & highlight" includes `highlightAssignmentId`
- [ ] Classroom opens in assignment-focused table when `focus=assignments`
- [ ] Target assignment is scrolled/highlighted when `highlightAssignmentId` is valid
- [ ] Invalid query values fallback safely to defaults

## Notes / Issues Found

- `<fill>`

## QA Sign-off

- Tester: `<fill>`
- Date: `<fill>`
- Status: `[ ] Pass  [ ] Pass with notes  [ ] Blocked`

## Optional Browser Smoke (Playwright)

Prerequisites:

- app running at `PLAYWRIGHT_BASE_URL` (default `http://127.0.0.1:3000`)
- **Always-on check:** one test calls `GET /api/health` (no class/assignment env needed). If the dev server is down, this fails fast.
- **Deep-link URL checks** (skipped until env set):
  - teacher-auth storage state file (recommended, or you may be redirected to login and assertions fail):
    - set `PLAYWRIGHT_STORAGE_STATE=<path-to-json>`
  - sample IDs:
    - `ASN_E2E_CLASS_ID=<class ObjectId>`
    - `ASN_E2E_ASSIGNMENT_ID=<assignment ObjectId>`

Commands:

```bash
npm run test:e2e:asn:install
npm run test:e2e:asn
```
