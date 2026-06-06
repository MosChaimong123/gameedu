# Nong Gring LINE Production Growth Plan

Status: Phase 2/3 in progress
Created: 2026-06-05
Related plans:
- `docs/system-plans/32-gameedu-reminder-assistant.md`
- `docs/system-plans/33-nong-gring-line-assignment-roadmap.md`
- `docs/system-plans/34-nong-gring-line-ux-simple-mode.md`
- `docs/line-student-self-service-qa-checklist.md`

## Goal

ยกระดับระบบ LINE "น้องกริ่งทวง" จาก MVP ที่ใช้งานได้ ให้เป็นระบบที่ครูใช้จริงได้ง่าย ปลอดภัย ทดสอบได้ และพร้อมขายเป็นจุดต่างของ PLUS

เป้าหมายหลัก:

1. ปิด release blocker ของกอง LINE ให้เทสต์ผ่านและ deploy ได้มั่นใจ
2. ทำให้ครูเห็นสถานะ LINE ของแต่ละห้องและนักเรียนแบบไม่ต้องเดา
3. ทำให้ flow นักเรียนเชื่อม LINE ง่ายที่สุด: เว็บสร้างรหัส -> นักเรียนส่งรหัสให้ bot -> ระบบเชื่อมให้เอง
4. ทำให้ reminder อัตโนมัติควบคุมได้ ไม่ส่งซ้ำ และตรวจสอบย้อนหลังได้
5. เตรียมระบบ submission, export, AI preliminary grading และ pricing ให้เป็น feature PLUS ที่อธิบายง่าย

## Current State

### Implemented

- LINE webhook route: `/api/webhooks/line`
- LINE group can bind to classroom using signed expiring token
- Classroom page has `LINE / งานมอบหมาย` panel
- Teacher can send per-assignment LINE reminder
- Teacher can send classroom-level missing-work reminder
- Teacher can export assignment reminder data
- Teacher can see connected/pending student LINE status
- Teacher can reset a student's LINE link
- Student has `เชื่อม LINE` dialog
- Student dialog generates 6-digit link code and polls while open
- Direct LINE command `เชื่อม <code>` links LINE user to web student account
- Group commands exist for summary/reminder/student work scopes
- Private commands exist for my work, my scores, my submissions
- LINE-created assignment has plan limit
- LINE text submission has plan gate
- AI preliminary grading helper exists for LINE text submission
- Auto reminder job route exists: `/api/jobs/line-reminders`
- Pricing cards show LINE differences between Free, Plus, Pro

### Known Gaps

- LINE targeted test suite passed after updating reminder mocks for `lineStudentBinding.findMany` and Flex push behavior
- Auto reminder cron needs external scheduler setup and operations documentation
- Manual QA checklist exists but is not marked as completed
- Some older LINE docs have broken Thai encoding, so source of truth should be code plus this plan
- The command surface still contains legacy debt-tracker commands; teacher-facing LINE help should be simplified
- Auto reminder settings are not yet teacher-configurable per classroom
- AI grading result is preliminary but needs clearer teacher review workflow
- Submission storage is text-first; file/image submission via LINE is not production-ready yet

## Release Priority

### P0: Make Current LINE Safe To Release

Purpose: ปิดงานที่ทำให้ระบบดูไม่พร้อม deploy หรือ QA ต่อ

Checklist:

- [x] Fix `lineStudentBinding.findMany` mocks in LINE reminder tests
- [x] Run full LINE targeted tests
- [x] Confirm `npm test` LINE group passes without flaky failures
- [x] Run `npx tsc --project tsconfig.server.json --noEmit`
- [x] Check that no unrelated Negamon/experimental files are staged for LINE deploy
- [x] Add a short deploy checklist for LINE environment variables and webhook URL
- [x] Confirm Render has required env vars:
  - `LINE_CHANNEL_SECRET`
  - `LINE_CHANNEL_ACCESS_TOKEN`
  - `LINE_CLASSROOM_BINDING_SECRET`
  - `LINE_REMINDER_CRON_SECRET`
  - `LINE_BOT_CHAT_URL`
  - `NEXT_PUBLIC_APP_URL`
  - `GEMINI_API_KEY` only if AI grading is enabled

Progress note 2026-06-05:

- Fixed LINE reminder tests to mock `lineStudentBinding.findMany/update`
- Updated reminder tests to expect Flex delivery through `pushLineFlex`
- Full LINE targeted suite passed: 10 files, 56 tests
- Server typecheck passed with `npx tsc --project tsconfig.server.json --noEmit`
- Added production release checklist: `docs/line-production-release-checklist.md`
- 2026-06-05 Phase 2/3 update: LINE targeted suite passed again, now 10 files and 57 tests
- 2026-06-05 Phase 2/3 update: `npx tsc --project tsconfig.server.json --noEmit`, targeted eslint, and `npx prisma validate` passed
- 2026-06-06 update: `git diff --cached --name-only` is empty, so no unrelated files are currently staged for a LINE deploy
- 2026-06-06 update: `/api/health/line` and `/admin/line-health` now expose runtime checks for `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CLASSROOM_BINDING_SECRET`, `LINE_REMINDER_CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, `LINE_BOT_CHAT_URL`, and optional `GEMINI_API_KEY`

Acceptance criteria:

- All LINE targeted tests pass
- Build/typecheck is not blocked by LINE code
- Teacher can bind one classroom group on production
- Student can link one account from production using private LINE chat

Validation commands:

```powershell
npm.cmd test -- src/__tests__/line-webhook-route.test.ts src/__tests__/line-auto-reminders-route.test.ts src/__tests__/assignment-line-reminders-route.test.ts src/__tests__/classroom-student-line-link-route.test.ts src/lib/line-bot/__tests__/commands.test.ts src/lib/line-bot/__tests__/handlers.test.ts src/lib/line-bot/__tests__/student-linking.test.ts src/lib/line-bot/__tests__/auto-reminders.test.ts src/lib/line-bot/__tests__/ai-grading.test.ts src/lib/line-bot/__tests__/repository-submission.test.ts
npx.cmd tsc --project tsconfig.server.json --noEmit
```

## Phase 1: Teacher LINE Readiness Dashboard

Purpose: ครูต้องรู้ทันทีว่าห้องไหนพร้อมใช้ LINE และห้องไหนยังขาดอะไร

Features:

- Add classroom-level readiness status:
  - Group linked
  - Student linked count
  - Auto reminder enabled
  - Last reminder sent
  - Last LINE error if any
- Add a compact status in classroom list:
  - `LINE พร้อมใช้`
  - `ยังไม่ผูกกลุ่ม`
  - `นักเรียนเชื่อมแล้ว 8/30`
- Add quick actions:
  - Open bind dialog
  - Copy invite/setup instruction
  - Open student LINE status panel

Progress note 2026-06-05:

- Added LINE readiness data to `/dashboard/classrooms`
- Classroom cards now show:
  - Group linked/not linked
  - Linked student count and percentage
  - Last LINE reminder time and target count when available
  - Empty reminder history state for linked rooms
- Readiness uses existing data only: active `LineBotGroup`, `LineStudentAccountLink`, and optional `LineAssignmentReminderDelivery`
- No schema change required

Acceptance criteria:

- Teacher does not need to enter each classroom to know LINE readiness
- Classroom page remains the main action surface
- Reports page remains overview only

## Phase 2: Teacher-Controlled Auto Reminders

Status: done

Purpose: ทำให้ระบบทวงอัตโนมัติไว้ใจได้และครูควบคุมได้

Features:

- Add per-classroom reminder settings:
  - Enabled/disabled
  - Reminder time window
  - Before deadline 1 day
  - Due today
  - Overdue 1 day
  - Weekly summary
- Add delivery audit:
  - Assignment
  - Reminder type
  - Target count
  - Sent/failed
  - Error message
- Add retry-safe behavior using existing `LineAssignmentReminderDelivery`
- Add Render cron setup guide or external scheduler instructions

Acceptance criteria:

- Running the cron route twice does not duplicate messages
- Teacher can disable automation per classroom
- Teacher can see why a reminder did or did not send

Progress note 2026-06-05:

- Added `ClassroomLineReminderSetting` for per-classroom auto reminder control
- Added `GET/PATCH /api/classrooms/[id]/line-reminder-settings`
- Added `GET /api/classrooms/[id]/line-reminder-deliveries`
- Classroom LINE panel now has an `Auto LINE` dialog:
  - Enable/disable auto reminder for this classroom
  - Toggle before deadline 1 day, due today, overdue 1 day
  - View recent LINE reminder delivery audit
- Scheduled reminder job now sends only for classrooms with auto reminder enabled
- Manual classroom reminder now records delivery audit after successful LINE push
- 2026-06-06 Phase 2 backlog close:
  - Added weekly summary toggle to classroom LINE reminder settings
  - Weekly summary scheduler sends older-overdue work once per Bangkok week on Monday
  - Delivery records now persist `pending`, `sent`, and `failed` status plus `errorMessage`
  - Teacher delivery history now exposes reminder status and error text
  - Render/external scheduler behavior is documented in `docs/line-production-release-checklist.md`

## Phase 3: Simplify LINE Commands

Purpose: ลดความจำเป็นที่ครูและนักเรียนต้องจำคำสั่งเยอะ

Teacher commands to keep visible:

- `คำสั่ง`
- `ผูกห้อง <token>`
- `สรุปงาน`
- `ทวงงาน`
- `สร้างงาน <ชื่อ> ส่ง <วัน/เวลา>`

Student commands to keep visible:

- `เชื่อม <code>`
- `งานของฉัน`
- `คะแนนของฉัน`
- `ส่งอะไรแล้ว`
- `ส่งงาน <รหัสงาน>: <คำตอบ>`

Work items:

- [x] Hide or separate legacy debt commands from classroom help
- [x] Make help messages short and role-specific
- [ ] Add examples in Thai and English where useful
- [ ] Add fallback reply for near-miss commands such as `งาน`, `ช่วย`, `ส่งงาน`

Progress note 2026-06-05:

- Group `help` now shows the simplified classroom command set instead of legacy debt help
- Classroom help now points group binding to the web-generated `ผูกห้อง <token>` flow
- Direct chat help now focuses on student self-service commands:
  - `เชื่อม <code>`
  - `งานของฉัน`
  - `คะแนนของฉัน`
  - `ส่งอะไรแล้ว`
- Legacy parsers remain available for backward compatibility, but they are no longer the visible path

Acceptance criteria:

- `กริ่งช่วย` in group shows only classroom commands
- `help` in direct chat shows only student commands
- No sensitive student-specific detail is posted publicly in group

## Phase 4: Submission Workflow Upgrade

Purpose: ทำให้ LINE submission ไม่ใช่แค่รับข้อความ แต่ต่อเข้าหน้างานครูจริง

Features:

- Better assignment reference:
  - Short code per assignment
  - Assignment list includes short code
  - `ส่งงาน A12: คำตอบ...`
- Submission status:
  - Submitted
  - Needs review
  - AI suggested score
  - Teacher accepted score
- Teacher review surface:
  - Filter LINE submissions
  - Show AI preliminary grading
  - Accept/edit score
  - Add teacher feedback
- Reward:
  - Award gold/EXP only after first valid submission
  - Ensure idempotent reward ledger

Acceptance criteria:

- Student can submit text via LINE without student code after linking account
- Teacher can review LINE submissions in web dashboard
- AI score is never treated as final without clear teacher review label

Progress note 2026-06-05:

- Added linked-account direct LINE submission:
  - Student can type `ส่งงาน A1: คำตอบ...` after connecting LINE
  - English fallback: `submit A1: answer...`
  - Existing group legacy command `ส่งงาน <studentCode> <งาน>: <คำตอบ>` remains supported
- Added deterministic assignment short code from classroom assignment order:
  - `A1`, `A2`, `A3`, ...
  - Student work list now prefixes visible assignment names with the short code
- LINE submission content now uses shared JSON helpers:
  - `submittedVia: "line"`
  - raw text answer
  - AI preliminary grading metadata
- AI preliminary grading is advisory only:
  - Stored teacher-facing score remains `0` until teacher reviews/sets the score
  - AI suggestion remains visible in LINE reply and dashboard hint
- Classroom score table now shows a compact LINE review hint for score assignments:
  - LINE source badge
  - AI suggested score when available
  - short answer preview
- Remaining Phase 4 backlog:
  - Dedicated LINE submissions review drawer/table
  - Teacher feedback field
  - Accept AI suggestion button
  - File/image submissions via LINE

## Phase 5: Student Self-Service Polish

Status: done

Purpose: นักเรียนควรถามงานตัวเองได้โดยไม่รบกวนครู

Features:

- Direct chat responses:
  - Missing work: implemented
  - Due today: implemented
  - Due soon: implemented
  - Scores: implemented
  - Submitted work: implemented
- Group privacy:
  - Group replies acknowledge and push private details when possible: implemented
  - If push fails, instruct student to open direct chat with bot: implemented
- Web fallback:
  - Direct work/scores/submitted replies include a student dashboard link when `NEXT_PUBLIC_APP_URL` and `student.loginCode` are available: implemented
- Low-friction command fallback:
  - Near-miss keywords such as `งาน`, `ส่งงาน`, `คะแนน`, `scores`, and `submit` return the simplified LINE help instead of doing nothing: implemented

Implementation notes:

- Student links use `/student/<loginCode>` so the LINE reply takes the learner back to the existing student web entry.
- Assignment lists include short codes such as `A1` so students can submit with `ส่งงาน A1: <answer>`.
- Personal commands remain safe for group use because detailed results are pushed privately when the bot can message the student.

Acceptance criteria:

- Linked student can type `งานของฉัน` in direct chat and get only their own work
- In group, private commands do not reveal personal details publicly
- Teacher can reset a bad link and student can relink
- Student can open the provided GameEdu link from LINE and continue on the web

## Phase 6: AI Preliminary Grading For LINE

Status: done

Purpose: ช่วยครูลดเวลาตรวจเบื้องต้น แต่ยังคงครูเป็นผู้ตัดสิน

Features:

- Store AI grading metadata with submission:
  - Suggested score: implemented
  - Confidence: implemented
  - Feedback: implemented
  - Model/version: backlog
  - Created at: backlog
- Add teacher review UI:
  - Accept score: implemented with `ใช้ AI` button in classroom score table
  - Edit score: implemented by manual score save on LINE AI submissions
  - Reject AI suggestion: route/content model supports `rejected`, dedicated UI is backlog
- Add plan gate:
  - Free: unavailable through existing LINE plan gate
  - Plus/Pro: enabled through existing LINE plan gate
- Add audit log:
  - AI grading generated: backlog
  - Teacher accepted/edited/rejected: implemented for manual score endpoint

Acceptance criteria:

- Missing `GEMINI_API_KEY` does not break submission
- AI result is visible as preliminary only
- Teacher can complete score without AI
- Teacher can apply AI score from the classroom table and the submission keeps review metadata
- Teacher-edited scores on LINE AI submissions are marked as teacher edited

## Phase 7: Export And Storage

Status: in progress

Purpose: ครูต้องเอาข้อมูลออกไปใช้ต่อได้ และงานไม่หาย

Features:

- Export CSV per assignment:
  - Student: implemented
  - Linked LINE status: implemented
  - Submission status: implemented
  - Submitted at: implemented
  - Score: implemented
  - AI suggested score: implemented
- Export classroom LINE readiness: implemented
- Add storage strategy for future file/image submissions:
  - Store metadata in DB: documented
  - Store binary file in configured storage: documented
  - Keep LINE message id and file checksum: documented

Implementation notes:

- Classroom page now exposes both assignment export and classroom-wide readiness export.
- Classroom-wide readiness export includes active LINE groups, linked-student ratio, last reminder snapshot, and per-student LINE link status.
- File/image submission storage design is documented in `docs/line-file-submission-storage-strategy.md`.

Acceptance criteria:

- Export works from classroom page
- CSV columns are stable enough for teacher use
- File submission design is documented before implementation

## Phase 8: Plan And Pricing Tightening

Status: in progress

Purpose: ทำให้ครูเข้าใจ Free vs Plus แบบไม่ต้องอ่านเยอะ

Free:

- Create limited assignments from LINE
- Basic group summary
- No auto reminders
- No LINE submission
- No AI preliminary grading
- No LINE export

Plus:

- More LINE-created assignments
- Manual Send LINE
- Auto reminders
- Student private self-service
- LINE text submissions
- LINE export
- AI preliminary grading

Work items:

- [x] Add in-app upgrade prompts exactly where blocked
- [x] Make blocked action explain what Plus unlocks
- [x] Add billing analytics event for clicked LINE upgrade prompts

Implementation notes:

- Classroom LINE panel now disables blocked Free-plan actions in place:
  - `Auto LINE`
  - `Send LINE`
  - `ทวงงานค้างทั้งห้อง`
  - `Export readiness`
  - `Export ทั้งห้อง`
- The blocked-state card explains the real Plus unlocks in the teacher workflow:
  - Send LINE
  - auto reminder
  - LINE submissions
  - export
  - AI preliminary grading
- The CTA points directly to `/dashboard/upgrade`.
- Clicking the CTA now writes `billing.line_upgrade_prompt.clicked` audit events with source metadata for the LINE panel.

Acceptance criteria:

- Teacher understands why an action is blocked
- Upgrade copy is tied to real LINE workflow, not generic marketing

## Phase 9: Operations And Observability

Status: in progress

Purpose: เวลาระบบ LINE มีปัญหา ต้องรู้ว่าเกิดที่ webhook, LINE API, DB, cron, หรือ config

Features:

- Add `/api/health/line` or admin-only LINE health panel
- Check env readiness
- Check webhook route configured
- Check last webhook event time
- Check last cron run
- Check last LINE push error
- Add admin audit filters for category `line`

Progress note 2026-06-06:

- Added admin-only `GET /api/health/line`
- Added `/admin/line-health` UI with in-page refresh and auto polling
- Health response now shows:
  - LINE config readiness (`channelSecret`, `channelAccessToken`, `bindingSecret`, `cronSecret`, `botChatUrl`)
  - webhook path and latest webhook-received audit activity
  - latest reminder delivery snapshot and latest reminder cron run
  - latest LINE rejected/error audit event
- Admin audit already supports category filter `line`
- `POST /api/webhooks/line` now records `line.webhook.received`
- `POST /api/jobs/line-reminders` now records `line.reminder_job.run`
- `/admin/line-health` now shows recent LINE audit events and links to `/admin/audit?category=line`

Acceptance criteria:

- Admin can diagnose LINE issue without reading Render logs first
- Failed LINE push does not crash unrelated classroom page
- Error messages are actionable

## Manual QA Flow

Use one real classroom with two students.

1. Teacher opens classroom page
2. Teacher opens LINE bind dialog
3. Bot is invited to LINE group
4. Teacher sends bind command
5. Classroom page polling changes to connected
6. Student logs into web
7. Student opens `เชื่อม LINE`
8. Student copies `เชื่อม <code>`
9. Student sends code to bot in private chat
10. Dialog changes to connected
11. Teacher page shows student as connected
12. Teacher creates or selects assignment
13. Teacher clicks `Send LINE`
14. Group receives reminder
15. Student types `งานของฉัน`
16. Student submits text work
17. Teacher reviews submission
18. Export CSV and verify data
19. Reset student LINE link
20. Student relinks successfully

## Recommended Work Order

1. P0 release blocker: fix LINE tests and typecheck
2. Phase 1 teacher readiness dashboard
3. Phase 2 auto reminder controls and cron docs
4. Phase 3 command simplification
5. Phase 4 submission review workflow
6. Phase 5 student self-service polish
7. Phase 6 AI grading review UI
8. Phase 7 export and storage
9. Phase 8 pricing prompts
10. Phase 9 operations and observability

## Definition Of Done

- Feature has route-level tests
- Feature has at least one UI/manual QA checklist item
- Teacher-facing copy is understandable in Thai
- Private student data is not posted publicly
- Plan gates are enforced server-side
- LINE API failure is handled gracefully
- No duplicate reminders on retry
- No unrelated files are included in deploy commit
