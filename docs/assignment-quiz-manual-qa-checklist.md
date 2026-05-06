# Assignment / Quiz / Manual Score Manual QA Checklist

Manual QA checklist for Plan 04 after the Assignment / Quiz / Manual Score hardening pass.

## Automated Preflight

Run before or after each manual QA pass:

- `npm.cmd run check:assignment-quiz`

Expected result:

- [x] `test:assignment-quiz` passes
- [x] `predev` passes

## Dev QA

- [x] Teacher can create score, checklist, and quiz assignments
- [x] Student assignment list shows new visible assignments without leaking answers
- [x] Quiz question step route serves one question at a time without `correctAnswer`
- [x] Check-answer accepts input without revealing correctness
- [x] First quiz submit records a score and duplicate submit stays idempotent
- [x] Manual score accepts valid score/checklist payloads and rejects invalid payloads cleanly
- [x] Teacher assignment overview reflects visible assignments and missing-submission counts

## Staging QA

- [x] Teacher can create score, checklist, and quiz assignments with a real classroom fixture
- [x] Student code dashboard shows the staged assignments in the real classroom
- [x] Quiz step, check-answer, and submit routes behave correctly with a real student code
- [x] Manual score valid/invalid cases behave correctly with real teacher credentials
- [x] Teacher assignment overview reflects the staged classroom and submission state

## Notes

- Reuse an existing QA classroom and student-code fixture where possible to avoid plan-limit churn.
- Record the exact classroom id, assignment ids, question-set id, and student codes used for staging verification.
- Automated preflight completed on 2026-05-06:
  - `npm.cmd run test:assignment-quiz` -> `7 files / 29 tests passed`
  - `npm.cmd run check:assignment-quiz` -> passed
- Staging verification completed on 2026-05-06 at `https://www.teachplayedu.com/`
  - classroom fixture: `Student QA 2026-05-05T15-05-28-019Z` (`69fa0739d21a5314213f2e53`)
  - student 1: `Staging Student QA One` (`P8JT3L3YBP8R`)
  - student 2: `Staging Student QA Two` (`GU644QX7WMTJ`)
  - score assignment: `Plan4 Score 2026-05-06T12-30-53-379Z` (`69fb347fab39bc6c1c810ad1`)
  - checklist assignment: `Plan4 Checklist 2026-05-06T12-30-53-379Z` (`69fb3480ab39bc6c1c810ad4`)
  - quiz assignment: `Plan4 Quiz 2026-05-06T12-32-07-678Z` (`69fb34caab39bc6c1c810ad7`)
- Live verification details:
  - student dashboard rendered all three staged assignments in the `Tasks` tab
  - quiz question route returned `200` and did not expose `correctAnswer`
  - check-answer returned `200` with `{ accepted: true }`
  - first quiz submit returned score `10/10`
  - duplicate quiz submit returned `{ alreadySubmitted: true, score: 10 }`
  - valid manual score returned `200` with `score: 7`
  - invalid checklist manual score returned `400` with `INVALID_PAYLOAD`
  - valid checklist manual score returned `200` with `score: 3`
  - teacher assignment overview returned `200`, `visibleAssignmentCount: 3`, `dueWithinRangeCount: 3`, and listed all three staged assignment names
