# System Plan 03: Student Dashboard / Student Code

Last updated: 2026-05-05

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

- [x] ตรวจ student code validation และ expired/invalid code
- [x] ตรวจ student เห็นเฉพาะ classroom ของตัวเอง
- [x] ตรวจ sync account ไม่สร้าง duplicate identity
- [x] ตรวจ check-in/passive gold idempotency
- [x] ตรวจ notifications ไม่ leak classroom อื่น
- [x] ตรวจ dashboard tabs และ empty/locked states
- [x] ตรวจ Thai/English text บน mobile

## Improvement Plan

- [x] ทำ student code route inventory
- [x] เพิ่ม tests สำหรับ invalid/unauthorized student code
- [x] เพิ่ม idempotency tests สำหรับ check-in/rewards
- [x] ตรวจ dashboard component state และ i18n
- [x] ทำ manual QA ด้วย student login code จริง

## Validation

- `npm.cmd test -- src/__tests__/student-login-code.test.ts src/__tests__/student-sync-route.test.ts`
- `npm.cmd test -- src/__tests__/student-checkin-route.test.ts src/__tests__/student-passive-gold-route.test.ts src/__tests__/student-notifications-route.test.ts`
- `npm.cmd test -- src/__tests__/student-dashboard-*.test.ts`
- `npm.cmd run test:student-dashboard`
- `npm.cmd run check:student-dashboard`
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

## Progress Note 1

Completed on 2026-05-05:

- Standardized the Student Dashboard / Student Code handoff so this system now matches the repeatable workflow used by Auth and Classroom Core
- Added `npm.cmd run test:student-dashboard` to bundle the focused student-code and student-dashboard regression coverage into one command
- Added `npm.cmd run check:student-dashboard` to run the focused student suite plus `predev`
- Added `docs/student-dashboard-manual-qa-checklist.md` to capture:
  - student-code login and invalid-code behavior
  - linked-account versus code-only dashboard states
  - check-in / passive-gold verification
  - notification and shop scoping checks
  - staging follow-up placeholders

Practical status:

- Plan 03 now has a clean automated preflight and a dedicated manual QA handoff instead of relying only on the narrative execution update
- The next meaningful pass for this system is either:
  - run `check:student-dashboard` and keep the preflight green
  - or execute the new manual QA checklist on dev/staging once a real student code fixture is available

## Progress Note 2

Completed on 2026-05-05:

- Closed `docs/student-dashboard-manual-qa-checklist.md` on staging using live code-only student fixtures at `https://www.teachplayedu.com/`
- Verified real student-code access for:
  - `Staging Student QA One` (`P8JT3L3YBP8R`)
  - `Staging Student QA Two` (`GU644QX7WMTJ`)
  - classroom `Student QA 2026-05-05T15-05-28-019Z` (`69fa0739d21a5314213f2e53`)
- Confirmed the live dashboard renders the correct classroom and student identity from a real classroom code
- Confirmed learn-mode tabs render on staging as `Tasks`, `Ideas`, `History`
- Confirmed game-mode tabs render on staging as `Quests`, `Monster`, `Battle`, `Ranks`, `History`
- Verified live passive-gold behavior via `/api/student/[code]/claim-passive-gold` returning `200` with `alreadyClaimed: true`, `goldEarned: 0`, `goldRate: 1`
- Verified live check-in duplicate protection via `/api/student/[code]/checkin` returning `200` with `alreadyDone: true`
- Confirmed student-scoped API isolation by comparing two real codes:
  - student 1 traffic stayed under `/api/student/P8JT3L3YBP8R/...`
  - student 2 traffic stayed under `/api/student/GU644QX7WMTJ/...`
- Confirmed notification fetches and game-mode shop surface stay bound to the resolved student code during the staging pass

Practical status:

- Plan 03 now has automated preflight, dev QA, and staging QA closed
- The Student Dashboard / Student Code system is ready to be treated as complete for Phase 1 unless a new production-only finding appears
