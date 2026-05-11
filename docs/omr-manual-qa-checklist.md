# OMR Manual QA Checklist

Manual QA checklist for Plan 10 after the OMR route-contract and scanner hardening pass.

## Automated Preflight

Run before or after each manual QA pass:

- `npm.cmd run check:omr`

Expected result:

- [x] `test:omr` passes
- [x] `predev` passes

## Dev QA

- [x] Teacher-only OMR quiz and OMR sets routes reject unauthenticated and student access
- [x] OMR quiz creation and update reject invalid title, question count, answer key, and classroom payloads
- [x] OMR result save rejects invalid score/total data and invalid answer payloads
- [x] OMR result save rejects a linked `studentId` from another classroom and derives `studentName` from the linked student when omitted
- [x] Scanner page surfaces readable failure states for camera, OpenCV, quiz-load, and save-result failures

## Staging QA

- [x] Real teacher session can create a temporary OMR quiz fixture
- [x] Real OMR scanner page loads the selected quiz and can save at least one result on staging
- [x] Real invalid result submission is rejected with a readable message on staging
- [x] Real unauthorized or over-limit OMR flows stay blocked on staging
- [x] Temporary staging fixture is deleted after verification

## Notes

- Prefer a temporary OMR quiz fixture and delete it after verification.
- Record quiz id, classroom id if linked, whether the scan was camera-based or upload-based, and the exact error shown for any blocked path.
- Local browser QA on `2026-05-07` used a temporary OMR quiz on `http://localhost:3000` with `qa.teacher.classroom@example.com`.
- Verified readable scanner failures on localhost:
  - camera denied: `Camera access was blocked. Allow camera permission and try again.`
  - OpenCV error: `Could not load the AI engine`
  - save-result failure: `Could not save the scan result right now.`
  - missing quiz fixture: empty-state shell now also shows a readable failure banner instead of silently hiding the error
- Verified mobile scanner fallback layout at `390x844` with `scrollWidth === innerWidth`.
- Staging QA on `2026-05-08` used teacher account `borisud29744@sikhiu.ac.th` on `https://www.teachplayedu.com/`.
- Temporary staging OMR quizzes were created and deleted during verification, including:
  - `69fdd1cac742538ee879e084`
  - `69fdd20fc742538ee879e086`
  - `69fdd240c742538ee879e087`
- Verified staging teacher flow:
  - scanner route rendered the selected quiz title in the banner: `CHECKING: QA OMR STAGING ...`
  - valid result save returned `200` with result id `69fdd1d2c742538ee879e085`
  - invalid result save returned `400 INVALID_PAYLOAD` with message `Score and total are invalid`
  - unauthenticated `GET /api/omr/quizzes` returned `401 AUTH_REQUIRED`
- In headless staging browser, the scanner UI hit camera denial (`Could not access the camera. Check permissions and try again.`), so result-save verification was completed through the authenticated teacher session API while the real scanner page was open on the selected quiz.
