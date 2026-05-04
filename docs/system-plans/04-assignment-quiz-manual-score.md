# System Plan 04: Assignment / Quiz / Manual Score

Last updated: 2026-05-03

## Scope

- Assignments, quiz question stepping, submit, check-answer, manual scores, review/integrity policy

## Key Files

- `src/app/api/classrooms/[id]/assignments`
- `src/app/api/classrooms/[id]/assignments/[assignmentId]`
- `src/app/api/classrooms/[id]/assignments/[assignmentId]/question`
- `src/app/api/classrooms/[id]/assignments/[assignmentId]/check-answer`
- `src/app/api/classrooms/[id]/assignments/[assignmentId]/submit`
- `src/app/api/classrooms/[id]/assignments/[assignmentId]/manual-scores`
- Prisma: `Assignment`, `AssignmentSubmission`

## Problem Analysis Checklist

- [x] ตรวจ assignment ownership/classroom membership
- [x] ตรวจ closed/due assignment access
- [x] ตรวจ question index tampering
- [x] ตรวจ duplicate submit
- [x] ตรวจ manual score range/type/checklist constraints
- [x] ตรวจ review policy ไม่ leak answer
- [x] ตรวจ teacher overview count ตรงกับ submissions

## Improvement Plan

- [x] Map assignment lifecycle states
- [x] ทำ quiz server-authoritative contract
- [x] เพิ่ม validation utility สำหรับ manual score
- [x] เพิ่ม tests สำหรับ submit/review policy
- [x] ทำ manual QA quiz Thai/English

## Validation

- `npm.cmd test -- src/__tests__/quiz-integrity.test.ts src/__tests__/quiz-step-routes.test.ts`
- `npm.cmd test -- src/lib/__tests__/validate-manual-assignment-score.test.ts`
- `npm.cmd test -- src/__tests__/teacher-assignment-overview-service.test.ts src/__tests__/teacher-assignments-overview-route.test.ts`
- `npm.cmd run lint`
- `npm.cmd run build`

## Exit Criteria

- Assignment/quiz mutation paths มี authorization และ validation tests
- Manual score ไม่รับค่าผิดรูปแบบ
## Execution Update

Updated: 2026-05-04

Validation run on 2026-05-04:

- Passed: `npm.cmd test -- src/__tests__/quiz-integrity.test.ts src/__tests__/quiz-step-routes.test.ts`
- Passed: `npm.cmd test -- src/lib/__tests__/validate-manual-assignment-score.test.ts`
- Passed: `npm.cmd test -- src/__tests__/teacher-assignment-overview-service.test.ts src/__tests__/teacher-assignments-overview-route.test.ts`
- Passed clean: `npm.cmd run lint`
- Passed: `npm.cmd run build` via Windows Prisma lock fallback using the existing generated client

## Checklist Resolution

- [x] Assignment ownership and classroom membership are enforced through the classroom-aware route params and teacher/student context loaders in `src/app/api/classrooms/[id]/assignments/[assignmentId]/question/route.ts`, `src/app/api/classrooms/[id]/assignments/[assignmentId]/check-answer/route.ts`, `src/app/api/classrooms/[id]/assignments/[assignmentId]/submit/route.ts`, and `src/app/api/classrooms/[id]/assignments/[assignmentId]/manual-scores/route.ts`, with ownership coverage in `src/__tests__/teacher-assignment-overview-service.test.ts`
- [x] Closed or due assignment access is checked by the quiz take context consumed by `question`, `check-answer`, and `submit`, and the route contract is exercised by `src/__tests__/quiz-step-routes.test.ts`
- [x] Question index tampering is rejected in `question` and `check-answer`, covered by `src/__tests__/quiz-step-routes.test.ts`
- [x] Duplicate submit is handled in `src/app/api/classrooms/[id]/assignments/[assignmentId]/submit/route.ts` through the `already_submitted` branch, with submit/review behavior covered by `src/__tests__/quiz-step-routes.test.ts`
- [x] Manual score range, type, and checklist constraints are enforced by `src/lib/validate-manual-assignment-score.ts` and consumed by `src/app/api/classrooms/[id]/assignments/[assignmentId]/manual-scores/route.ts`, with coverage in `src/lib/__tests__/validate-manual-assignment-score.test.ts`
- [x] Review policy does not leak answer correctness during stepping because `check-answer` only returns `{ accepted: true }` and `question` omits `correctAnswer`, covered by `src/__tests__/quiz-step-routes.test.ts`; integrity logs are sanitized and summarized by `src/__tests__/quiz-integrity.test.ts`
- [x] Teacher overview counts stay aligned with submissions via `src/__tests__/teacher-assignment-overview-service.test.ts` and `src/__tests__/teacher-assignments-overview-route.test.ts`
