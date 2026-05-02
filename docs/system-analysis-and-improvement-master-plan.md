# GameEdu System Analysis and Improvement Master Plan

Last updated: 2026-05-02

## Purpose

เอกสารนี้เป็นแผนหลักสำหรับวิเคราะห์ปัญหาและพัฒนาระบบ GameEdu ทีละระบบอย่างเป็นขั้นตอน โดยมีเป้าหมายให้ทีมสามารถ:

- เห็นภาพระบบย่อยทั้งหมดในโปรเจกต์
- รู้ว่าควรตรวจอะไร เพื่อหาปัญหาเชิงโครงสร้างและปัญหาเชิงพฤติกรรม
- วางลำดับแก้ปัญหาโดยไม่ชนกัน
- มี validation checklist ที่ชัดเจนก่อนปิดงานแต่ละระบบ
- แยกงาน automated validation ออกจาก manual QA/browser QA อย่างตรงไปตรงมา

## Current Automated Baseline

สถานะล่าสุดจากงาน i18n/system preflight:

- `npm.cmd run lint` ผ่านแล้ว โดยยังมี warnings บางจุด
- `npm.cmd test -- src/__tests__/ui-error-messages.test.ts src/__tests__/i18n-regression.test.ts` ผ่าน
- `npm.cmd run check:i18n:strict` ผ่าน
- `npm.cmd run predev` ผ่าน
- `npm.cmd run build` ผ่าน
- `src/lib/translation-lookup.ts` ไม่มี `thaiSupplemental` แล้ว
- i18n lookup order คือ `thaiPack -> legacyThaiTranslations -> English -> key`

## Global Analysis Method

ใช้ workflow เดียวกันกับทุกระบบ:

1. Inventory
   - ระบุ routes, components, libs, Prisma models, tests, scripts, docs ที่เกี่ยวข้อง
   - ระบุ owner boundary ว่าระบบนี้แตะข้อมูล/สิทธิ์/เงิน/เกม/นักเรียนหรือไม่

2. Contract Mapping
   - สรุป API request/response shape
   - สรุป error code และข้อความที่ผู้ใช้เห็น
   - สรุป authorization rule และ data isolation rule
   - สรุป side effects เช่น สร้าง transaction, ส่ง notification, เปลี่ยน role, sync reward

3. Risk Scan
   - Security: auth, role, ownership, abuse limits, rate limit
   - Data: duplicate, idempotency, stale data, missing migration, race condition
   - UX: loading/error/empty states, mobile layout, Thai/English text
   - Runtime: server/client boundary, React hooks, socket lifecycle, build/lint/type errors
   - Observability: audit log, structured error, health/readiness, recovery path

4. Test Gap Review
   - ดู unit/integration tests ที่มี
   - เพิ่ม regression test ก่อนแก้พฤติกรรมเสี่ยง
   - เพิ่ม route auth/isolation tests สำหรับ API ที่แตะข้อมูลข้าม user/classroom

5. Fix Plan
   - แก้จากฐานระบบก่อน feature ปลายทาง
   - จำกัด scope เป็นระบบย่อยเดียวต่อรอบ
   - บันทึกเอกสารและ runbook เมื่อมี contract หรือ operational behavior เปลี่ยน

6. Validation
   - ขั้นต่ำ: `lint`, targeted tests, relevant route tests, `check:i18n:strict`, `predev`
   - ถ้าแตะ build/runtime: `npm.cmd run build`
   - ถ้าเป็น UI สำคัญ: browser/manual QA checklist
   - ถ้าเป็น socket/game/economy/billing: เพิ่ม scenario test เฉพาะทาง

## Recommended Priority Order

1. Auth / Authorization / Security
2. Classroom Core
3. Student Dashboard / Student Code
4. Assignment / Quiz / Manual Score
5. Question Sets / Editor / Upload
6. Live Game / Socket
7. Negamon Battle
8. Economy / Shop / Ledger
9. Negamon Reward Audit / Resync
10. OMR
11. Board / Classroom Social
12. Billing / Plan / Subscription
13. Admin / Audit / Management
14. i18n / Localization / Accessibility
15. Ops / QA / Production Readiness

เหตุผล: เริ่มจากฐานสิทธิ์และ classroom ก่อน เพราะระบบ student, quiz, battle, economy, billing และ admin ล้วนพึ่ง auth/classroom ownership ทั้งหมด

## System 1: Auth / User / Security

Scope:
- Login, register, NextAuth session, user profile, settings, role checks
- API auth guard, RBAC, ownership checks

Key areas:
- `src/app/login`
- `src/app/register`
- `src/app/api/auth/[...nextauth]`
- `src/app/api/register`
- `src/app/api/user/profile`
- `src/app/api/user/settings`
- `src/lib/authorization`
- `src/lib/security`
- Prisma models: `User`, `Account`, `Session`, `VerificationToken`

Problems to look for:
- Role confusion between teacher, student, admin
- API route allows cross-user or cross-classroom access
- Register/login returns raw backend errors
- Rate limit bypass
- Session missing after redirect
- Inconsistent user profile source of truth

Development direction:
- Centralize auth/ownership helpers
- Add route-level authorization tests for every protected API group
- Standardize structured error responses
- Keep user-facing error messages i18n-ready

Validation:
- `register-route.test.ts`
- `rate-limit.test.ts`
- `profile-route.test.ts`
- `user-settings-route.test.ts`
- `src/lib/authorization/__tests__/resource-access.test.ts`
- Manual: login/register/reset invalid credential flows in Thai and English

## System 2: Classroom Core

Scope:
- Classroom CRUD, students, skills, points, attendance, groups, leaderboard, analytics

Key areas:
- `src/app/dashboard/classrooms`
- `src/app/api/classrooms`
- `src/app/api/classrooms/[id]`
- `src/app/api/classrooms/[id]/students`
- `src/app/api/classrooms/[id]/skills`
- `src/app/api/classrooms/[id]/points`
- `src/app/api/classrooms/[id]/attendance`
- `src/app/api/classrooms/[id]/groups`
- `src/app/api/classrooms/[id]/leaderboard`
- Prisma models: `Classroom`, `Student`, `Skill`, `PointHistory`, `AttendanceRecord`, `StudentGroup`

Problems to look for:
- Teacher can access another teacher's classroom
- Student mutation not isolated by classroom
- Points duplication or missing audit reason
- Attendance history overwrite/loss
- Group score sync mismatch
- Analytics count mismatch

Development direction:
- Make classroom ownership check mandatory and shared
- Add idempotent point/economy mutation patterns
- Normalize empty/loading/error states in dashboard
- Add audit trails where teacher changes student data

Validation:
- `classroom-points-authorization.test.ts`
- `attendance-save.test.ts`
- `points-isolation.test.ts`
- `classroom-analytics-route.test.ts`
- `classroom-dashboard-*.test.ts`
- Manual: teacher dashboard, empty classroom, populated classroom, attendance, points

## System 3: Student Dashboard / Student Code

Scope:
- Student login code, dashboard, sync account, check-in, notifications, quests, shop access

Key areas:
- `src/app/student`
- `src/app/student/[code]`
- `src/app/api/student/[code]/sync`
- `src/app/api/student/[code]/checkin`
- `src/app/api/student/[code]/daily-quests`
- `src/app/api/student/[code]/notifications`
- `src/app/api/student/[code]/shop/buy`
- `src/app/api/student/[code]/shop/equip`
- Prisma models: `Student`, `Notification`, `EconomyTransaction`, `StudentAchievement`

Problems to look for:
- Student code guessed or reused unsafely
- Student sees another classroom's data
- Sync creates duplicate identity links
- Check-in/passive gold can be claimed repeatedly
- Notifications expose private classroom data

Development direction:
- Strengthen student code validation and audit
- Add idempotency to daily/passive rewards
- Keep dashboard data loader contract documented
- Improve student empty/locked states

Validation:
- `student-login-code.test.ts`
- `student-sync-route.test.ts`
- `student-checkin-route.test.ts`
- `student-passive-gold-route.test.ts`
- `student-notifications-route.test.ts`
- `student-dashboard-*.test.ts`

## System 4: Assignment / Quiz / Manual Score

Scope:
- Assignments, quiz flow, question stepping, answer submit, manual score, integrity policy

Key areas:
- `src/app/api/classrooms/[id]/assignments`
- `src/app/api/classrooms/[id]/assignments/[assignmentId]`
- `src/app/api/classrooms/[id]/assignments/[assignmentId]/question`
- `src/app/api/classrooms/[id]/assignments/[assignmentId]/check-answer`
- `src/app/api/classrooms/[id]/assignments/[assignmentId]/submit`
- `src/app/api/classrooms/[id]/assignments/[assignmentId]/manual-scores`
- Prisma models: `Assignment`, `AssignmentSubmission`

Problems to look for:
- Student can access closed or wrong assignment
- Question index can be skipped or tampered with
- Manual score accepts invalid range
- Submission can be duplicated
- Review policy leaks answers when it should not

Development direction:
- Treat quiz flow as server-authoritative
- Standardize assignment status transitions
- Add clear score validation utilities
- Build teacher overview and student quiz tests around one contract

Validation:
- `quiz-integrity.test.ts`
- `quiz-step-routes.test.ts`
- `validate-manual-assignment-score.test.ts`
- `teacher-assignment-overview-*.test.ts`

## System 5: Question Sets / Editor / Upload / AI Import

Scope:
- Question set creation/editing, folders, CSV/file upload, AI generation, parse file

Key areas:
- `src/app/dashboard/create-set`
- `src/app/dashboard/edit-set/[id]`
- `src/app/api/sets`
- `src/app/api/sets/[id]`
- `src/app/api/folders`
- `src/app/api/upload`
- `src/app/api/ai/generate-questions`
- `src/app/api/ai/parse-file`
- Prisma models: `QuestionSet`, `Folder`

Problems to look for:
- Set ownership bypass
- Folder move leaks data across teacher
- Upload accepts unsupported or oversized files
- AI parse returns invalid question shape
- Editor saves partial/corrupt state

Development direction:
- Define question set schema contract
- Add import validation with useful errors
- Test folder/set ownership as a shared route pattern
- Harden upload and AI parse boundaries

Validation:
- `set-editor-messages.test.ts`
- `upload-route.test.ts`
- Add folder ownership tests if missing
- Manual: create/edit/import/delete set

## System 6: Live Game / Host / Play / Socket

Scope:
- Host room, lobby, player join, live question flow, socket events, reconnect

Key areas:
- `src/app/host/[setId]`
- `src/app/play`
- `src/app/play/lobby`
- `src/app/play/game`
- `src/lib/socket`
- `src/lib/game-engine`
- Prisma models: `ActiveGame`, `GameHistory`

Problems to look for:
- Host reconnect creates duplicate room state
- Player joins locked/ended game
- Socket event not authorized
- Race condition when start/end happens during join
- Game history write incomplete

Development direction:
- Make socket event contract explicit
- Keep server authoritative for game state
- Add reconnect and room lifecycle tests
- Use structured socket error codes with i18n mappings

Validation:
- `src/lib/socket/__tests__/register-game-socket-handlers.integration.test.ts`
- `battle-read-auth-routes.test.ts`
- socket manual QA checklist in `docs/socket-review-checklist.md`

## System 7: Negamon Battle / Monster

Scope:
- Monster state, moves, passives, battle arena, battle loadout, battle history, codex

Key areas:
- `src/components/negamon/*`
- `src/lib/game-engine`
- `src/lib/negamon`
- `src/app/api/classrooms/[id]/battle`
- `src/app/api/classrooms/[id]/battle/opponents`
- `src/app/api/student/[code]/battle-loadout`
- `src/app/api/student/[code]/negamon/unlock-skill`
- Prisma model: `BattleSession`

Problems to look for:
- Client and server battle result mismatch
- Move/passive balance bug
- Battle session not idempotent
- Loadout item use duplicated or lost
- React hooks/layout regressions in battle UI
- Result rewards not synced to economy correctly

Development direction:
- Keep battle engine server-authoritative
- Snapshot battle event contract
- Expand tests around status effects, passives, items
- Separate battle UI polish from engine correctness

Validation:
- `src/lib/game-engine/__tests__/negamon-battle-engine.test.ts`
- `src/lib/__tests__/negamon-battle-balance.test.ts`
- `src/lib/__tests__/battle-loadout-and-gold.test.ts`
- `battle-reward-*.test.ts`
- `npm.cmd run lint`
- Manual: start battle, auto mode, speed, item use, win/loss, rematch

## System 8: Economy / Shop / Ledger

Scope:
- Gold ledger, shop buy/equip, passive gold, admin adjustment, reconciliation, analytics

Key areas:
- `src/app/api/classrooms/[id]/economy/*`
- `src/app/api/student/[code]/shop/buy`
- `src/app/api/student/[code]/shop/equip`
- `src/app/api/student/[code]/claim-passive-gold`
- Prisma model: `EconomyTransaction`

Problems to look for:
- Duplicate transaction on retry
- Balance mismatch between student and ledger
- Shop purchase not atomic
- Teacher adjustment affects wrong student
- Export leaks classroom data

Development direction:
- Enforce ledger idempotency and reconciliation
- Prefer transaction-like service boundaries
- Add export authorization and CSV tests
- Build teacher controls after ledger correctness is stable

Validation:
- `economy-ledger-idempotency.test.ts`
- `classroom-economy-*-route.test.ts`
- `student-shop-ledger.test.ts`
- `student-quest-ledger.test.ts`
- `negamon-economy-*.md`

## System 9: Negamon Reward Audit / Resync

Scope:
- Reward audit, skipped players, remediation, effectiveness, resync

Key areas:
- `src/app/api/classrooms/[id]/negamon/reward-audit`
- `src/app/api/classrooms/[id]/negamon/reward-remediation`
- `src/app/api/classrooms/[id]/negamon/reward-effectiveness`
- `src/app/api/classrooms/[id]/negamon/reward-resync`
- Prisma model: `NegamonLiveBattleRewardClaim`

Problems to look for:
- Resync duplicates rewards
- Ambiguous student identity remains unresolved
- Audit export leaks data
- Remediation event does not improve effectiveness
- Behavior score/economy reward mismatch

Development direction:
- Treat resync as idempotent operational workflow
- Keep skipped/applied/unresolved counts explicit
- Add audit export and effectiveness tests for each edge case

Validation:
- `classroom-negamon-reward-*.test.ts`
- `negamon-reward-*.test.ts`
- `docs/negamon-reward-resync-qa.md`

## System 10: OMR

Scope:
- OMR quiz, OMR set, scanner UI, result capture, camera/OpenCV loading

Key areas:
- `src/app/dashboard/omr`
- `src/app/dashboard/omr-scanner`
- `src/app/dashboard/omr-templates`
- `src/app/api/omr/quizzes`
- `src/app/api/omr/sets`
- Prisma models: `OMRQuiz`, `OMRResult`

Problems to look for:
- Camera permission failure not handled
- OpenCV loading timeout or CDN issue
- Result matched to wrong quiz/student
- Plan limit not enforced
- Scanner UI breaks on mobile

Development direction:
- Add clear scanner state machine
- Keep OMR API errors structured and localized
- Add plan-limit tests
- Manual QA on real camera/browser is required

Validation:
- i18n OMR tests in `i18n-regression.test.ts`
- Add route tests for OMR ownership/plan limits if missing
- Manual: camera permission, scan success/fail, retry, result save

## System 11: Board / Classroom Social

Scope:
- Board, posts, comments, images/video links, polls, reactions

Key areas:
- `src/components/board`
- Prisma models: `Board`, `BoardPost`, `BoardPoll`, `BoardPollVote`, `BoardComment`, `BoardReaction`

Problems to look for:
- Post/comment ownership bypass
- Poll double vote
- Unsafe external link/embed
- Media upload preview mismatch
- Reaction count race

Development direction:
- Add action authorization tests for every mutation
- Keep media/link sanitization explicit
- Add optimistic UI rollback behavior

Validation:
- `board-actions-auth.test.ts`
- i18n board action tests
- Manual: create post, comment, poll, reaction, media preview

## System 12: Billing / Plan / Subscription

Scope:
- Stripe, Omise/PromptPay, plan limits, upgrade, webhooks

Key areas:
- `src/app/api/billing/create-checkout-session`
- `src/app/api/billing/thai/start`
- `src/app/api/billing/omise/reconcile`
- `src/app/api/webhooks/stripe`
- `src/app/api/webhooks/billing/[provider]`
- `src/lib/billing`
- `src/lib/plan`
- Prisma model: `BillingProviderEvent`

Problems to look for:
- Webhook replay duplicate
- Wrong plan applied
- Missing provider event idempotency
- Payment secret/config missing
- Plan limit not reflected in UI/API

Development direction:
- Keep provider event processing idempotent
- Centralize plan access decisions
- Add payment readiness runbook checks
- Separate test mode from production config clearly

Validation:
- `src/lib/billing/__tests__/subscription-mapping.test.ts`
- `src/lib/plan/__tests__/plan-access.test.ts`
- `user-upgrade-route.test.ts`
- `docs/phase-1-payment-readiness.md`
- Manual payment QA in provider sandbox only

## System 13: Admin / Audit / Management

Scope:
- Admin dashboard, users, sets, audit export, teacher news, teacher missions

Key areas:
- `src/app/admin`
- `src/app/api/admin/*`
- Prisma models: `TeacherNewsItem`, `TeacherMission`, `User`, `QuestionSet`

Problems to look for:
- Admin-only route exposed to non-admin
- Role update lacks audit trail
- Audit export misses filters
- Admin set delete affects owner data unexpectedly
- Teacher news/mission lifecycle unclear

Development direction:
- Require admin auth helper everywhere
- Standardize audit log query/filter/export
- Add destructive-action confirmation in UI

Validation:
- `admin-*.test.ts`
- `audit-log-query.test.ts`
- `admin-audit-export-route.test.ts`

## System 14: i18n / Localization / Accessibility

Scope:
- Translation packs, lookup, hardcoded string guard, manual language QA, accessibility labels

Key areas:
- `src/lib/translations.ts`
- `src/lib/translations-th-legacy.json`
- `src/lib/translation-lookup.ts`
- `src/__tests__/i18n-regression.test.ts`
- `scripts/check-i18n-hardcoded.mjs`
- `docs/i18n-manual-qa-checklist.md`

Problems to look for:
- Raw translation key visible
- Thai page falls back to English unexpectedly
- Literal placeholders incorrectly required to contain Thai glyph
- Hardcoded string false positives/false negatives
- Text overflow in Thai UI

Development direction:
- Keep regression coverage by user flow
- Keep literal keys separated from Thai-glyph-required keys
- Decide later whether to migrate all legacy Thai JSON into `thaiPack`
- Run manual browser QA before release

Validation:
- `i18n-regression.test.ts`
- `ui-error-messages.test.ts`
- `npm.cmd run check:i18n:strict`
- `docs/i18n-manual-qa-checklist.md`

## System 15: Ops / QA / Production Readiness

Scope:
- Health, readiness, build, deploy, backup/restore, monitoring, release gates

Key areas:
- `src/app/api/health`
- `src/app/api/ready`
- `scripts/check-phase1-readiness.mjs`
- `scripts/smoke-build.mjs`
- `docs/production-readiness-runbook.md`
- `docs/backup-restore-runbook.md`
- `docs/test-ci-maturity-playbook.md`

Problems to look for:
- Build passes locally but deploy env missing
- Health/readiness does not catch DB/config failure
- No backup/restore rehearsal
- Flaky tests block release confidence
- Manual QA not recorded

Development direction:
- Maintain a release gate checklist
- Add smoke checks for core routes
- Track warnings separately from errors
- Rehearse backup/restore and payment/webhook readiness

Validation:
- `health-routes.test.ts`
- `env.test.ts`
- `npm.cmd run build`
- `npm.cmd run lint`
- `npm.cmd run check:phase1`

## Cross-System Workstreams

### A. Authorization Sweep

Goal: ทุก route ที่แตะข้อมูล user/classroom/student ต้องมี ownership check

Steps:
- Inventory protected routes
- Add route auth tests by route group
- Use shared helpers from `src/lib/authorization`
- Document exceptions

Done when:
- All protected APIs have auth/isolation tests
- No route relies only on client-side hiding

### B. Error Contract Standardization

Goal: API errors predictable, localized, and testable

Steps:
- Map error code per route group
- Replace raw string errors with structured errors where practical
- Ensure UI maps legacy text and structured codes

Done when:
- `ui-error-messages.test.ts` covers shared paths
- User-facing flows do not show raw backend strings

### C. Data Integrity and Idempotency

Goal: retry, refresh, reconnect, webhook replay, and resync do not duplicate side effects

Systems:
- Economy
- Billing
- Negamon reward
- Attendance/check-in
- Assignment submit
- Socket game result/history

Done when:
- Critical mutation paths have idempotency tests
- Reconciliation route can detect and explain mismatch

### D. UI State and Accessibility

Goal: every major screen has loading, empty, error, success, Thai/English, mobile behavior

Systems:
- Dashboard
- Classroom
- Student
- Battle
- OMR
- Admin

Done when:
- Manual QA checklist exists per high-risk flow
- Text does not overflow compact Thai UI
- Buttons/inputs have useful labels

### E. Observability and Operations

Goal: failures can be detected and recovered

Steps:
- Review health/readiness
- Review audit logs
- Review export logs and sensitive data boundaries
- Review backup/restore runbook

Done when:
- Release gate includes health, build, tests, smoke, backup confidence

## Per-System Analysis Template

Use this template when starting a new system pass.

```md
## System Pass: <name>

Date:
Owner:
Branch/PR:

### Scope

- In scope:
- Out of scope:

### Inventory

- Routes:
- Components:
- Lib/services:
- Prisma models:
- Existing tests:
- Existing docs:

### Current Behavior

- Happy path:
- Known failure paths:
- User-facing messages:
- Side effects:

### Risks

- Security:
- Data integrity:
- UX:
- Runtime:
- Operational:

### Test Gaps

- Unit:
- Route/API:
- Integration:
- Manual QA:

### Fix Plan

1.
2.
3.

### Validation

- [ ] `npm.cmd run lint`
- [ ] targeted tests
- [ ] `npm.cmd run check:i18n:strict`
- [ ] `npm.cmd run predev`
- [ ] `npm.cmd run build` if runtime/build surface changed
- [ ] manual QA checklist if UI changed

### Result

- Status:
- Remaining risks:
- Follow-up:
```

## Milestone Plan

### Milestone 1: Foundation Safety

Focus:
- Auth/authorization
- Classroom ownership
- Structured error contract
- Test baseline

Exit criteria:
- Protected route inventory done
- Route auth tests added for highest-risk groups
- `lint`, targeted tests, `predev`, `build` pass

### Milestone 2: Teacher and Student Core

Focus:
- Classroom dashboard
- Student dashboard
- Assignment/quiz/manual score
- Question set/editor

Exit criteria:
- Teacher/student core flows tested in Thai and English
- Manual QA checklist completed for classroom/student/quiz
- No raw API errors in common flows

### Milestone 3: Real-Time and Game Systems

Focus:
- Live game/socket
- Negamon battle
- Battle loadout
- Reward sync

Exit criteria:
- Socket lifecycle tests cover join/start/end/reconnect
- Battle engine tests cover key status/passive/item flows
- Manual battle QA completed

### Milestone 4: Economy and Billing

Focus:
- Economy ledger
- Shop
- Reconciliation
- Billing/webhooks/plan limits

Exit criteria:
- Idempotency tests pass for ledger/reward/payment paths
- Reconciliation reports known mismatches
- Billing sandbox QA complete

### Milestone 5: Ops and Release Readiness

Focus:
- Health/readiness
- Backup/restore
- Deployment
- Production checklist

Exit criteria:
- Production build passes
- Health/readiness checked in target environment
- Backup/restore runbook reviewed
- Manual QA sign-off recorded

## Always-Run Commands Before Closing a System Pass

Minimum:

```powershell
npm.cmd run lint
npm.cmd run check:i18n:strict
npm.cmd run predev
```

When tests are touched:

```powershell
npm.cmd test -- <targeted test files>
```

When runtime, route, Next.js page, Prisma, or config is touched:

```powershell
npm.cmd run build
```

## Notes

- Do not mark manual QA as passed without a real environment, browser/device, tester, and account details.
- Treat lint warnings separately from lint errors. Warnings should be triaged, but passing lint with warnings can still be an acceptable automated gate if documented.
- For high-risk systems such as billing, authorization, economy, reward resync, and student data, prefer adding regression tests before changing behavior.
- For frontend-heavy systems, take screenshots/manual QA after functional tests pass.
