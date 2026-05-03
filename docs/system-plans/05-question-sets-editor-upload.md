# System Plan 05: Question Sets / Editor / Upload / AI Import

Last updated: 2026-05-03

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

- [ ] ตรวจ set/folder ownership
- [ ] ตรวจ public/private behavior
- [ ] ตรวจ upload file size/type
- [ ] ตรวจ imported question schema
- [ ] ตรวจ AI parse/generate error path
- [ ] ตรวจ editor save partial/corrupt state
- [ ] ตรวจ delete/move folder side effects

## Improvement Plan

1. Define question set schema contract
2. Harden upload/import validation
3. Add ownership tests for sets/folders
4. Add editor regression for validation messages
5. Manual QA create/edit/import/delete

## Validation

- `npm.cmd test -- src/__tests__/set-editor-messages.test.ts src/__tests__/upload-route.test.ts`
- Add targeted set/folder ownership tests if missing
- `npm.cmd run lint`
- `npm.cmd run check:i18n:strict`
- `npm.cmd run build`

## Exit Criteria

- Editor/import ไม่ทำข้อมูลเสีย
- Ownership ของ set/folder ชัดและมี tests
