# System Plan 10: OMR

Last updated: 2026-05-08

## Scope

- OMR quiz, set, result, scanner UI, camera, OpenCV loading, templates

## Key Files

- `src/app/dashboard/omr`
- `src/app/dashboard/omr-scanner`
- `src/app/dashboard/omr-templates`
- `src/app/api/omr/quizzes`
- `src/app/api/omr/sets`
- Prisma: `OMRQuiz`, `OMRResult`

## Problem Analysis Checklist

- [x] Check OMR ownership on quiz and set routes
- [x] Check monthly OMR plan-limit enforcement on result saves
- [x] Check camera permission failure behavior in the scanner UI
- [x] Check OpenCV loading timeout and fallback behavior
- [x] Check quiz and student linkage for saved OMR results
- [x] Check retry, scan-next, and save-result feedback states
- [x] Check mobile scanner layout

## Improvement Plan

- [x] Add one-command OMR preflight
- [x] Lock quiz, result, and OMR set route contracts with tests
- [x] Tighten OMR result payload validation and classroom/student matching
- [x] Add a dedicated OMR manual QA checklist
- [x] Run staging QA for real scanner fixture and teacher flow

## Validation

- `npm.cmd run check:omr`
- `npm.cmd run check:i18n:strict`
- `npm.cmd run lint`
- `npm.cmd run build`
- Manual: `docs/omr-manual-qa-checklist.md`

## Exit Criteria

- Scanner error states are readable and actionable
- OMR results cannot be linked to the wrong quiz or the wrong student

## Progress Note 1

- Added one-command OMR preflight in [package.json](/C:/Users/IHCK/GAMEEDU/gamedu/package.json): `npm.cmd run test:omr` and `npm.cmd run check:omr`.
- Added OMR handoff checklist in [omr-manual-qa-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/omr-manual-qa-checklist.md).
- Hardened [src/app/api/omr/quizzes/route.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/app/api/omr/quizzes/route.ts), [src/app/api/omr/quizzes/[quizId]/route.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/app/api/omr/quizzes/[quizId]/route.ts), and [src/app/api/omr/quizzes/[quizId]/results/route.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/app/api/omr/quizzes/[quizId]/results/route.ts) so invalid payloads fail early and result saves cannot silently attach a student from another classroom.
- Added regression coverage in [omr-route-auth.test.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/__tests__/omr-route-auth.test.ts) and [omr-sets-route.test.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/__tests__/omr-sets-route.test.ts).

## Progress Note 2

- `npm.cmd run check:omr` passed on `2026-05-07` with `2 files / 14 tests`.
- The automated OMR checklist items for ownership, invalid quiz payloads, invalid result payloads, and classroom-safe student linkage are now closed.
- The highest-value remaining work is scanner-browser QA: camera permission denial, OpenCV fallback, save-result error feedback, and mobile layout verification.

## Progress Note 3

- `npm.cmd run check:omr` passed again on `2026-05-07` with `3 files / 19 tests` after adding scanner QA helpers in [src/lib/omr-scanner-fallbacks.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/omr-scanner-fallbacks.ts).
- Hardened [src/app/dashboard/omr-scanner/page.tsx](/C:/Users/IHCK/GAMEEDU/gamedu/src/app/dashboard/omr-scanner/page.tsx) so pre-capture quiz-load failures are visible in the empty state and QA-driven save-result failures do not depend on `Image.onload`.
- Local browser QA on `http://localhost:3000` closed the scanner fallback sweep:
  - missing quiz fixture now shows a readable failure banner instead of silently hiding the error
  - camera denial shows `Camera access was blocked. Allow camera permission and try again.`
  - OpenCV fallback shows `Could not load the AI engine`
  - save-result failure shows `Could not save the scan result right now.`
  - mobile fallback layout at `390x844` stayed within viewport width
- Remaining work for Plan 10 is now staging verification of a real OMR teacher flow.

## Progress Note 4

- Staging QA closed on `2026-05-08` against [https://www.teachplayedu.com/](https://www.teachplayedu.com/) with teacher account `borisud29744@sikhiu.ac.th`.
- Verified real teacher flow end to end:
  - temporary OMR quiz fixture creation succeeded
  - scanner route rendered the selected quiz title in the `CHECKING:` banner
  - valid result save succeeded with `200` and result id `69fdd1d2c742538ee879e085`
  - invalid result save was blocked with `400 INVALID_PAYLOAD`
  - unauthenticated `GET /api/omr/quizzes` was blocked with `401 AUTH_REQUIRED`
  - temporary staging fixtures were deleted after verification
- Headless staging browser still hit camera denial during scanner UI verification, but that surfaced a readable error (`Could not access the camera. Check permissions and try again.`) and did not block authenticated result-save verification for the selected quiz.
