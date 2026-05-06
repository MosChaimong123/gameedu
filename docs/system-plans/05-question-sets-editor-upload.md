# System Plan 05: Question Sets / Editor / Upload / AI Import

Last updated: 2026-05-06

## Scope

- Question set create/edit, folders, upload, CSV/file import, AI generate/parse

## Key Files

- `src/app/dashboard/create-set`
- `src/app/dashboard/edit-set/[id]`
- `src/app/api/sets`
- `src/app/api/sets/[id]`
- `src/app/api/folders`
- `src/app/api/upload`
- `src/app/api/ai/generate-questions`
- `src/app/api/ai/parse-file`
- Prisma: `QuestionSet`, `Folder`

## Problem Analysis Checklist

- [x] ตรวจ set/folder ownership
- [x] ตรวจ public/private behavior
- [x] ตรวจ upload file size/type
- [x] ตรวจ imported question schema
- [x] ตรวจ AI parse/generate error path
- [x] ตรวจ editor save partial/corrupt state
- [x] ตรวจ delete/move folder side effects

## Improvement Plan

- [x] Define question set schema contract
- [x] Harden upload/import validation
- [x] Add ownership tests for sets/folders
- [x] Add editor regression for validation messages
- [x] Manual QA create/edit/import/delete

## Validation

- `npm.cmd test -- src/__tests__/set-editor-messages.test.ts src/__tests__/upload-route.test.ts`
- Add targeted set/folder ownership tests if missing
- `npm.cmd run lint`
- `npm.cmd run check:i18n:strict`
- `npm.cmd run build`

## Exit Criteria

- Editor/import ไม่ทำข้อมูลเสีย
- Ownership ของ set/folder ชัดและมี tests

## Execution Update

Updated: 2026-05-04

Completed in this pass:

- Added `src/lib/question-set-schema.ts` as the shared Zod contract for editor and AI-imported question data
- Wired question schema validation into `src/app/api/sets/[id]/route.ts` so corrupt editor state is rejected before update
- Wired AI generated output through the shared schema in `src/app/api/ai/generate-questions/route.ts`
- Added coverage for set/folder ownership, upload size/type, imported question schema, AI parse/generate failures, and folder delete side effects

Validation run on 2026-05-04:

- Passed: `npm.cmd test -- src/__tests__/set-editor-messages.test.ts src/__tests__/upload-route.test.ts src/lib/__tests__/question-set-schema.test.ts src/__tests__/sets-route-auth.test.ts src/__tests__/folders-route-auth.test.ts src/__tests__/ai-import-routes.test.ts`
- Passed clean: `npm.cmd run lint`
- Passed: `npm.cmd run check:i18n:strict`
- Passed: `npm.cmd run build` via Windows Prisma lock fallback using the existing generated client

## Checklist Resolution

- [x] Set and folder ownership is enforced by `src/app/api/sets/route.ts`, `src/app/api/sets/[id]/route.ts`, `src/app/api/folders/route.ts`, and `src/app/api/folders/[folderId]/route.ts`, with coverage in `src/__tests__/sets-route-auth.test.ts` and `src/__tests__/folders-route-auth.test.ts`
- [x] Public/private set behavior remains scoped to teacher-owned mutations through authenticated set routes, with plan and ownership guards covered by `src/__tests__/sets-route-auth.test.ts`
- [x] Upload file size and MIME type constraints are enforced in `src/app/api/upload/route.ts`, covered by `src/__tests__/upload-route.test.ts`
- [x] Imported/editor question schema is enforced by `src/lib/question-set-schema.ts`, covered by `src/lib/__tests__/question-set-schema.test.ts` and route regression coverage in `src/__tests__/sets-route-auth.test.ts`
- [x] AI parse/generate error paths are covered by `src/__tests__/ai-import-routes.test.ts`
- [x] Editor save partial/corrupt state is rejected by `src/app/api/sets/[id]/route.ts` before persistence, covered by `src/__tests__/sets-route-auth.test.ts`
- [x] Delete and move folder side effects are covered by `src/__tests__/folders-route-auth.test.ts`, including clearing owned sets before folder deletion

## Progress Note 1

Completed on 2026-05-06:

- Added focused preflight commands for this system:
  - `npm.cmd run test:question-sets`
  - `npm.cmd run check:question-sets`
- Added the manual QA handoff in `docs/question-sets-editor-upload-manual-qa-checklist.md`
- Closed the staging QA pass using the real teacher account on `https://www.teachplayedu.com/`
- Verified live folder lifecycle:
  - create folder
  - move a set into the folder
  - delete folder
  - confirm the owned set is detached instead of deleted
- Verified live question-set lifecycle:
  - create set
  - save valid editor question data
  - reject corrupt question data with `INVALID_PAYLOAD`
  - delete the set cleanly after verification
- Verified live upload behavior with a supported text file via `/api/upload`
- Verified live AI route behavior for the real account plan:
  - `/api/ai/parse-file` returns `PLAN_LIMIT_AI_FEATURE`
  - `/api/ai/generate-questions` returns `PLAN_LIMIT_AI_FEATURE`

Practical status:

- Plan 05 now has automated preflight, repeatable manual QA documentation, and a completed staging verification pass
- Question Sets / Editor / Upload / AI Import can be treated as closed for Phase 1 unless a new production-only finding appears
