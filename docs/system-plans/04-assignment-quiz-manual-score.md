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

- [ ] ตรวจ assignment ownership/classroom membership
- [ ] ตรวจ closed/due assignment access
- [ ] ตรวจ question index tampering
- [ ] ตรวจ duplicate submit
- [ ] ตรวจ manual score range/type/checklist constraints
- [ ] ตรวจ review policy ไม่ leak answer
- [ ] ตรวจ teacher overview count ตรงกับ submissions

## Improvement Plan

1. Map assignment lifecycle states
2. ทำ quiz server-authoritative contract
3. เพิ่ม validation utility สำหรับ manual score
4. เพิ่ม tests สำหรับ submit/review policy
5. ทำ manual QA quiz Thai/English

## Validation

- `npm.cmd test -- src/__tests__/quiz-integrity.test.ts src/__tests__/quiz-step-routes.test.ts`
- `npm.cmd test -- src/lib/__tests__/validate-manual-assignment-score.test.ts`
- `npm.cmd test -- src/__tests__/teacher-assignment-overview-service.test.ts src/__tests__/teacher-assignments-overview-route.test.ts`
- `npm.cmd run lint`
- `npm.cmd run build`

## Exit Criteria

- Assignment/quiz mutation paths มี authorization และ validation tests
- Manual score ไม่รับค่าผิดรูปแบบ
