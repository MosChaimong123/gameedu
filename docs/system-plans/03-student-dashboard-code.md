# System Plan 03: Student Dashboard / Student Code

Last updated: 2026-05-03

## Scope

- Student code login, student dashboard, sync account, check-in, quests, notifications, shop entry

## Key Files

- `src/app/student`
- `src/app/student/[code]`
- `src/app/api/student/[code]/sync`
- `src/app/api/student/[code]/checkin`
- `src/app/api/student/[code]/daily-quests`
- `src/app/api/student/[code]/notifications`
- `src/app/api/student/[code]/shop/buy`
- `src/app/api/student/[code]/shop/equip`
- Prisma: `Student`, `Notification`, `EconomyTransaction`, `StudentAchievement`

## Problem Analysis Checklist

- [ ] ตรวจ student code validation และ expired/invalid code
- [ ] ตรวจ student เห็นเฉพาะ classroom ของตัวเอง
- [ ] ตรวจ sync account ไม่สร้าง duplicate identity
- [ ] ตรวจ check-in/passive gold idempotency
- [ ] ตรวจ notifications ไม่ leak classroom อื่น
- [ ] ตรวจ dashboard tabs และ empty/locked states
- [ ] ตรวจ Thai/English text บน mobile

## Improvement Plan

1. ทำ student code route inventory
2. เพิ่ม tests สำหรับ invalid/unauthorized student code
3. เพิ่ม idempotency tests สำหรับ check-in/rewards
4. ตรวจ dashboard component state และ i18n
5. ทำ manual QA ด้วย student login code จริง

## Validation

- `npm.cmd test -- src/__tests__/student-login-code.test.ts src/__tests__/student-sync-route.test.ts`
- `npm.cmd test -- src/__tests__/student-checkin-route.test.ts src/__tests__/student-passive-gold-route.test.ts src/__tests__/student-notifications-route.test.ts`
- `npm.cmd test -- src/__tests__/student-dashboard-*.test.ts`
- `npm.cmd run lint`
- `npm.cmd run build`

## Exit Criteria

- Student code flow ปลอดภัยและไม่ leak ข้อมูล
- Dashboard ใช้งานได้ครบทั้ง teacher-linked และ code-only states
## Execution Update

Updated: 2026-05-04

Completed in this pass:

- Verified student login code coverage via `src/__tests__/student-login-code.test.ts`
- Verified removed legacy sync endpoint behavior via `src/__tests__/student-sync-route.test.ts`
- Verified check-in and passive gold award behavior, including idempotent date-key ledger writes, via `src/__tests__/student-checkin-route.test.ts` and `src/__tests__/student-passive-gold-route.test.ts`
- Verified notification deletion stays scoped to the student resolved from the login code via `src/__tests__/student-notifications-route.test.ts`
- Verified dashboard read-model flow and invalid code redirect via `src/__tests__/student-dashboard-page.test.ts`
- Verified extracted dashboard tab wiring and locked board state via `src/__tests__/student-dashboard-main-tabs.test.ts` and related dashboard component tests
- Fixed the shared classroom selection hook lint blocker in `src/components/classroom/use-classroom-selection-flow.ts` by switching roster cleanup to derived state helpers instead of synchronous effect-based state writes
- Added helper coverage for the derived group-filter fallback in `src/__tests__/classroom-selection-flow.test.ts`
- Updated `package.json` build flow to use `scripts/prisma-generate-build.mjs`, which retries `prisma generate` through the repository Windows unlock flow when the Prisma engine DLL is locked
- Hardened `scripts/prisma-generate-build.mjs` so Windows builds can continue with the existing generated Prisma client when the engine DLL remains locked after the unlock retry
- Cleaned remaining lint warnings across Stripe scripts, student dashboard tests, Negamon settings/helpers, and shop/plan utility modules

Validation run on 2026-05-04:

- Passed: `npm.cmd test -- src/__tests__/student-login-code.test.ts src/__tests__/student-sync-route.test.ts`
- Passed: `npm.cmd test -- src/__tests__/student-checkin-route.test.ts src/__tests__/student-passive-gold-route.test.ts src/__tests__/student-notifications-route.test.ts`
- Passed: `npm.cmd test -- src/__tests__/student-dashboard-board-tab.test.ts src/__tests__/student-dashboard-client.test.ts src/__tests__/student-dashboard-header.test.ts src/__tests__/student-dashboard-main-tabs.test.ts src/__tests__/student-dashboard-page.test.ts src/__tests__/student-dashboard-sidebar.test.ts`
- Passed clean: `npm.cmd run lint`
- Passed as build-safe validation without Prisma regeneration: `npm.cmd run clean; npx next build; npx tsc --project tsconfig.server.json`
- Passed: `node --check scripts/prisma-generate-build.mjs`
- Passed: `npm.cmd run build` via Windows Prisma lock fallback using the existing generated client

## Checklist Resolution

- [x] Student code validation and invalid-code handling verified by `src/__tests__/student-login-code.test.ts`, `src/__tests__/student-login-code-route.test.ts`, and `src/__tests__/student-dashboard-page.test.ts` (invalid code redirects to `/student?error=invalid_code`)
- [x] Student dashboard stays scoped to the resolved classroom/student pair via `src/lib/services/student-dashboard/get-student-dashboard.ts` and `src/__tests__/student-dashboard-page.test.ts`
- [x] Sync account flow avoids duplicate linking paths by exposing the CTA only when `currentUserId` exists and `student.userId` is still empty in `src/components/student/student-dashboard-header.tsx`, covered by `src/__tests__/student-dashboard-header.test.ts`; the removed legacy sync endpoint is locked down by `src/__tests__/student-sync-route.test.ts`
- [x] Check-in and passive-gold idempotency verified by `src/__tests__/student-checkin-route.test.ts` and `src/__tests__/student-passive-gold-route.test.ts`, including date-key ledger writes and same-day re-entry guards
- [x] Notifications remain student-scoped and do not leak across classrooms via `src/__tests__/student-notifications-route.test.ts` and `src/__tests__/student-notifications-validation.test.ts`
- [x] Dashboard tabs plus locked/empty state wiring verified by `src/__tests__/student-dashboard-main-tabs.test.ts`, `src/__tests__/student-dashboard-client.test.ts`, `src/__tests__/student-dashboard-sidebar.test.ts`, and related dashboard component tests
- [x] Thai/English text and mobile-oriented presentation verified in component coverage for responsive labels and language toggle wiring, especially `src/components/student/student-dashboard-header.tsx`, `src/__tests__/student-dashboard-header.test.ts`, and `src/__tests__/student-dashboard-client.test.ts`
