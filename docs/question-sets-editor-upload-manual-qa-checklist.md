# Question Sets / Editor / Upload / AI Import Manual QA Checklist

Manual QA checklist for Plan 05 after the Question Sets / Editor / Upload / AI Import hardening pass.

## Automated Preflight

Run before or after each manual QA pass:

- `npm.cmd run check:question-sets`

Expected result:

- [x] `test:question-sets` passes
- [x] `predev` passes

## Dev QA

- [x] Teacher can create a folder and a question set
- [x] Teacher can save valid editor question data and corrupt question data is rejected cleanly
- [x] Upload accepts a small supported file and rejects unsupported or oversized files
- [x] Folder move/delete flows preserve ownership boundaries and expected side effects
- [x] AI parse / generate routes return predictable success or expected plan/error responses

## Staging QA

- [x] Teacher can create, edit, move, and delete a question set with a real account
- [x] Teacher can create and delete a folder with a real account
- [x] Upload route accepts a supported text file with the real account
- [x] AI parse-file route handles a supported text file with the real account
- [x] AI generate route responds predictably for the real account and plan

## Notes

- Reuse one temporary QA folder and one QA question set during staging, then clean them up after verification.
- Record the exact set id, folder id, upload result, and AI route result used for staging verification.
- Automated preflight completed on 2026-05-06:
  - `npm.cmd run test:question-sets` -> `6 files / 29 tests passed`
  - `npm.cmd run check:question-sets` -> passed
- Staging verification completed on 2026-05-06 at `https://www.teachplayedu.com/`
  - folder fixture: `Plan5 Folder 2026-05-06T12-42-43-162Z` (`69fb3745ab39bc6c1c810add`)
  - set fixture: `Plan5 Set 2026-05-06T12-42-43-162Z` (`69fb3745ab39bc6c1c810ade`)
- Live verification details:
  - folder create returned `200`
  - set create returned `200`
  - valid set patch returned `200`, moved the set into the folder, and saved one question
  - invalid set patch returned `400` with `INVALID_PAYLOAD` / `Invalid question data`
  - upload route accepted a supported text file and returned `200` with `/uploads/...txt`
  - AI parse-file returned `403` with `PLAN_LIMIT_AI_FEATURE`, which is the expected plan-gated behavior for this account
  - AI generate returned `403` with `PLAN_LIMIT_AI_FEATURE`, which is the expected plan-gated behavior for this account
  - folder delete returned `200`
  - the set remained and `folderId` became `null` after folder deletion
  - set delete returned `200`
