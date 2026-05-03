# System Plan 10: OMR

Last updated: 2026-05-03

## Scope

- OMR quiz/set/result, scanner UI, camera, OpenCV loading, templates

## Key Files

- `src/app/dashboard/omr`
- `src/app/dashboard/omr-scanner`
- `src/app/dashboard/omr-templates`
- `src/app/api/omr/quizzes`
- `src/app/api/omr/sets`
- Prisma: `OMRQuiz`, `OMRResult`

## Problem Analysis Checklist

- [ ] ตรวจ OMR ownership
- [ ] ตรวจ plan limit OMR monthly
- [ ] ตรวจ camera permission failure
- [ ] ตรวจ OpenCV loading timeout/CDN failure
- [ ] ตรวจ result matched quiz/student ถูกต้อง
- [ ] ตรวจ retry/scan next/save result
- [ ] ตรวจ mobile scanner layout

## Improvement Plan

1. Define scanner state machine
2. Standardize OMR structured errors
3. Add ownership/plan-limit route tests
4. Add UI fallback for camera/OpenCV failure
5. Manual QA with real browser camera

## Validation

- `npm.cmd test -- src/__tests__/i18n-regression.test.ts`
- Add OMR route tests for ownership/limits if missing
- `npm.cmd run check:i18n:strict`
- `npm.cmd run lint`
- `npm.cmd run build`

## Exit Criteria

- Scanner error states ชัด
- OMR result ไม่ผูกผิด quiz/student
