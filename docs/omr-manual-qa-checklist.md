# OMR Manual QA Checklist

Manual QA checklist for Plan 10 after the OMR route-contract and scanner hardening pass.

## Automated Preflight

Run before or after each manual QA pass:

- `npm.cmd run check:omr`

Expected result:

- [x] `test:omr` passes
- [x] `predev` passes

## THAI-50-V1 Release Gate

- [x] Template page offers only `THAI-50-V1`
- [x] Generated sheet contains five student-code columns and questions 1–50
- [x] Quiz creation requires a classroom and always creates 50 answer-key entries
- [x] Save API rejects missing/duplicate/malformed answers and incomplete keys
- [x] Score, total, and per-question correctness are computed on the server
- [x] Re-scan replaces the existing quiz/student result
- [x] OpenCV reads the supplied blank reference image as 50 blank answers with no ambiguity
- [x] OpenCV synthetic fixture reads all 50 marks and student code `00001`
- [x] OpenCV reads the supplied fully marked THAI-50-V1 image: 50/50 answers,
  code `00001`, confidence 1.0 on every answer, and zero ambiguity
- [x] Automated robustness matrix preserves all 50 answers and code `00001`
  across ±5° rotation, perspective, 38% dimming, diagonal shadow, low
  resolution, and JPEG quality 42
- [ ] Print at 100% scale on A4 and confirm no browser “fit to page” scaling
- [ ] Scan clean unmarked sheet on iOS Safari and Android Chrome
- [ ] Scan fully marked sheet on iOS Safari and Android Chrome
- [ ] Verify each block: 1–10, 11–20, 21–30, 31–40, 41–50
- [ ] Verify student codes `00001`, a middle seat number, and the final seat number
- [ ] Verify light pencil, dark pencil, blue pen, and black pen
- [ ] Verify one blank answer and one double-mark are flagged for review
- [ ] Verify moderate rotation, perspective angle, shadow, and indoor lighting
- [ ] Confirm saved score and student identity against a manual count

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

- The current release candidate supports one paper format only:
  `THAI-50-V1` (50 questions, five choices, five-digit student seat code).
- Image-level preflight:
  `npm.cmd run qa:omr-image -- "C:\path\to\sheet.png"`.
- Synthetic full-mark preflight:
  `npm.cmd run qa:omr-image -- --synthetic`.
- Robustness matrix:
  `npm.cmd run qa:omr-image -- "C:\path\to\filled-sheet.png" --matrix`.
- The supplied 1110×1417 blank reference image was normalized to 705×900 and
  passed marker detection with 50 blank answers, zero false marks, and zero
  ambiguous questions on `2026-07-27`.
- The supplied 569×806 fully marked image also passed on `2026-07-27`: all five
  question blocks matched the visible marks, student code was `00001`, every
  answer confidence was 1.0, and no manual-review flags were raised.
- The same filled image passed all seven automated degradation variants with
  identical answers, identical student code, and zero ambiguity. This closes
  software-level rotation/perspective/light/compression robustness; physical
  iOS and Android camera checks remain separate release gates.
- Do not enable the OMR dashboard feature flag globally until every unchecked
  THAI-50-V1 release-gate item above passes on physical paper.

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
