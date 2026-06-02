# Nong Gring LINE Assignment Roadmap

Status: Draft plan
Created: 2026-06-02
Related plan: `docs/system-plans/32-gameedu-reminder-assistant.md`

## Goal

ต่อยอด "น้องกริ่งทวง" จาก LINE reminder MVP ให้กลายเป็นระบบช่วยครูจัดการงานผ่าน LINE แบบครบวงจร:

```text
มอบหมาย -> ทวง -> ส่งงาน -> ตรวจ -> จัดเก็บ -> สรุปรายงาน -> ให้รางวัล
```

เป้าหมายไม่ใช่คัดลอกคุณไก่ทวงตรง ๆ แต่ใช้แนวคิดที่เหมาะกับ GameEdu:

- LINE เป็นช่องทางที่ครูและนักเรียนคุ้นเคย
- GameEdu เป็น source of truth สำหรับห้องเรียน งาน คะแนน EXP และ dashboard
- ระบบต้องช่วยลดงานซ้ำของครู โดยยังให้ครูควบคุมจุดสำคัญได้
- Gamification ต้องผูกกับ Negamon/EXP ที่มีอยู่แล้ว

## Reference Study

Source: `https://khunkaituang.inskru.com/`

Key ideas observed:

- Main promise: ครูหมดห่วงเรื่องการส่งงานนักเรียน
- Core flow: มอบหมาย -> ทวง -> ตรวจ -> จัดเก็บ
- LINE-first experience: เพิ่ม bot เข้ากลุ่มห้องเรียนและใช้งานผ่าน LINE
- Teacher pain points:
  - ต้องทวงงานเองซ้ำ ๆ
  - นักเรียนถามงานซ้ำ
  - ครูสอนหลายห้องและตรวจงานเยอะ
  - ส่งงานผ่าน LINE แล้วหาไฟล์ไม่เจอ
- Student value:
  - เช็คงานค้างได้เอง
  - ส่งงานแล้วได้ EXP/gamification
- Product features:
  - Assignment through LINE
  - Auto reminders
  - AI grading with rubric
  - Google Drive storage
  - Excel export
  - Trial/Pro/School pricing

## Current GameEdu Baseline

Already shipped in repo:

- LINE bot can join classroom groups
- LINE group can bind to a GameEdu classroom using `classroomId + LINE_CLASSROOM_BINDING_SECRET`
- `กริ่งช่วย` returns command help
- `สรุปงาน` reads real classroom assignment/submission state
- `ทวงงาน` sends group-safe reminder text
- Teacher dashboard has a reminder assistant panel
- Teacher can send in-app assignment reminders
- Student assignment tab shows due work
- Quiz and worksheet completion can show earned EXP

## Product Principles

1. LINE is the quick command surface; GameEdu remains the canonical system.
2. Group messages must avoid exposing sensitive individual student data.
3. Any automated reminder must be idempotent and rate-limited.
4. AI grading must be teacher-reviewed before final score, at least in MVP.
5. Reward loops should encourage completion, not punish students publicly.
6. Every LINE feature should have a web dashboard fallback.

## Phase 1: LINE Assignment Commands

Objective: ครูสร้างและจัดการงานพื้นฐานผ่าน LINE ได้

### Commands

```text
สร้างงาน <ชื่องาน> ส่ง <วัน/เวลา>
สร้างงาน <ชื่องาน> ไม่มีกำหนดส่ง
รายการงาน
รายละเอียดงาน <รหัสงาน>
ปิดงาน <รหัสงาน>
เปิดงาน <รหัสงาน>
```

### Behavior

- Use the bound classroom from `LineBotGroup.classroomId`
- Create assignment in GameEdu with `visible: true`
- Generate short display code for LINE, e.g. `#A12`
- Reply with assignment summary
- Announce the assignment in group
- Keep assignment created through LINE compatible with the existing teacher dashboard

### Data Changes

Candidate schema additions:

```prisma
model Assignment {
  lineShortCode String?
  lineCreatedByGroupId String?
  lineCreatedAt DateTime?
}
```

Alternative: avoid touching `Assignment` initially and store mappings in a dedicated `LineAssignmentAlias` model.

Recommended MVP:

- Add `LineAssignmentAlias`
- Avoid overloading existing assignment model
- Keep alias scoped by `lineBotGroupId`

### Acceptance Criteria

- Teacher can create an assignment from LINE in a bound group
- `สรุปงาน` includes the new assignment immediately
- Created assignment appears in GameEdu dashboard
- Invalid date text gives a helpful reply
- Unbound group receives the bind instruction

## Phase 2: Auto Reminder Schedule

Objective: ระบบทวงงานอัตโนมัติตาม deadline โดยไม่ต้องให้ครูพิมพ์ทุกครั้ง

### Reminder Rules

Default schedule:

- 1 day before deadline
- Morning of deadline
- 1 day after deadline if still missing
- Weekly teacher summary

### Controls

Per classroom settings:

- Enable/disable auto reminders
- Reminder time window
- Quiet hours
- Max reminders per assignment per day
- Include/skip no-deadline assignments

### Data Model

Candidate:

```prisma
model ClassroomReminderSetting {
  id String @id @default(auto()) @map("_id") @db.ObjectId
  classroomId String @db.ObjectId
  lineBotGroupId String? @db.ObjectId
  enabled Boolean @default(false)
  timezone String @default("Asia/Bangkok")
  quietStart String?
  quietEnd String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model AssignmentReminderDelivery {
  id String @id @default(auto()) @map("_id") @db.ObjectId
  assignmentId String @db.ObjectId
  lineBotGroupId String @db.ObjectId
  reminderKey String
  sentAt DateTime @default(now())
  targetCount Int

  @@unique([assignmentId, lineBotGroupId, reminderKey])
}
```

### Acceptance Criteria

- Auto reminder sends only once per reminder window
- Retry does not duplicate group messages
- Teacher can turn automation off
- Render/server restart does not lose delivery history

## Phase 3: Student Self-Service in LINE

Objective: นักเรียนเช็คงานตัวเองได้เอง ลดการถามครูซ้ำ

### Commands

Group-safe commands:

```text
งานค้าง
งานวันนี้
งานใกล้ส่ง
```

Personal commands require identity strategy:

```text
งานของฉัน
คะแนนของฉัน
ส่งอะไรแล้ว
```

### Identity Options

MVP options:

1. Deep link only: group replies with GameEdu student dashboard link
2. Student self-bind: student links LINE user id with GameEdu student code
3. Private chat: bot replies privately after student links account

Recommended:

- Phase 3A: group-safe aggregate only
- Phase 3B: student self-bind via login code
- Phase 3C: private per-student reply

### Acceptance Criteria

- No student-specific missing list is posted publicly
- Student can find their dashboard quickly
- Linked identity can be revoked/reset by teacher

## Phase 4: Submission via LINE

Objective: นักเรียนส่งงานผ่าน LINE แล้ว GameEdu เก็บเป็น submission ที่ค้นหาได้

### MVP Flow

1. Teacher creates LINE assignment
2. Student sends text/image/file with assignment code
3. Bot receives LINE message event
4. System stores submission metadata
5. File is copied to durable storage
6. Teacher sees submission in GameEdu

### Commands / Message Patterns

```text
ส่งงาน #A12
ส่ง #A12
```

For file messages:

- If message has file/image and assignment code, attach automatically
- If no code, bot replies asking which assignment

### Storage Options

Preferred for GameEdu:

- Cloudflare R2 for actual files
- GameEdu DB stores file metadata and submission relation

Future optional:

- Google Drive export/sync for schools that want Drive folders

### Acceptance Criteria

- Student can submit a text answer
- Student can submit image/file attachment
- Teacher can open submitted file from dashboard
- Duplicate submission policy is clear: replace, append, or resubmit version

## Phase 5: AI Preliminary Grading

Objective: ให้ AI ตรวจเบื้องต้นตาม rubric แล้วครู approve

### Scope

Start with:

- Text answers
- Short worksheet answers
- OCR-assisted image submissions later

### Teacher Setup

Each assignment may include:

- Rubric
- Max score
- Expected answer / criteria
- AI grading enabled flag

### Safety

- AI result is draft only
- Teacher must approve before final score
- Store explanation/audit trail
- Track AI usage quota by plan

### Acceptance Criteria

- AI can generate draft score and feedback
- Teacher can accept/edit/reject
- Student only sees approved result
- Quota is enforced

## Phase 6: Gamification and Negamon Loop

Objective: ทำให้การส่งงานกลายเป็น loop ที่นักเรียนอยากกลับมาใช้

### Reward Ideas

- On-time EXP bonus
- Streak: ส่งครบหลายวัน/หลายงานติดกัน
- Badge: "ไม่ต้องทวง"
- Negamon egg progress from submitted assignments
- Weekly classroom progress celebration

### Rules

- Reward only first valid submission
- Resubmission does not duplicate EXP
- Late submission may receive base EXP but no on-time bonus
- Teacher can disable rewards per classroom

### Acceptance Criteria

- Reward reason is visible to student
- Reward ledger/audit exists
- Teacher can explain why student got or did not get reward

## Phase 7: Teacher Command Center

Objective: ทำให้หน้าเว็บครูเป็นศูนย์ควบคุมงานและ reminder ทั้งหมด

### Features

- Assignment reminder timeline
- Last LINE reminder sent
- Missing count trend
- Manual send LINE reminder
- Manual send in-app reminder
- Copy message
- Export Excel
- Automation settings

### Acceptance Criteria

- Teacher can see what the bot already did
- Teacher can manually override automation
- Dashboard and LINE state match

## Phase 8: Export and Storage

Objective: ลดปัญหา "งานหาย" และช่วยครูส่งรายงาน

### Export

- Excel summary per classroom
- Assignment-level submission report
- Missing list
- Score/EXP report

### Storage

- R2-backed file archive
- Optional Google Drive sync later
- Folder structure:

```text
Classroom/
  Assignment/
    StudentName-StudentCode/
      submitted-files
```

### Acceptance Criteria

- Teacher can export current missing/submission status
- File links remain valid after deploy
- Export does not leak private data across classrooms

## Phase 9: Plan and Pricing Integration

Objective: ผูก feature กับระบบ PLUS/School package

### Candidate Limits

Free:

- Manual LINE summary/remind
- Limited LINE-created assignments
- No AI grading

PLUS:

- Auto reminders
- More LINE-created assignments
- Submission via LINE
- Export Excel
- Limited AI quota

School:

- Multiple teachers
- Higher AI quota
- Admin-level reports
- Priority support

### Acceptance Criteria

- Feature gates use existing plan system
- Teacher sees upgrade prompt before hitting a blocked feature
- Existing free classroom workflows do not break

## Suggested Build Order

1. Phase 1: LINE Assignment Commands
2. Phase 2: Auto Reminder Schedule
3. Phase 3A: Student group-safe self-service
4. Phase 7: Teacher Command Center visibility
5. Phase 4: Submission via LINE
6. Phase 6: Gamification upgrade
7. Phase 8: Export/storage
8. Phase 5: AI grading
9. Phase 9: Pricing and school package

Reasoning:

- Creating assignments through LINE unlocks the core "มอบหมาย -> ทวง" loop fastest
- Auto reminder is the highest teacher-time-saving feature after manual reminders
- Submission and AI grading are higher risk because they touch files, privacy, storage, and scoring

## Next Implementation Candidate

Recommended next task:

```text
Phase 1A: Add LINE assignment alias model and implement `สร้างงาน <name> ส่ง <date>` command.
```

Detailed steps:

1. Add Prisma model for LINE assignment aliases
2. Add parser for `สร้างงาน`
3. Add Thai date parser for MVP formats:
   - `พรุ่งนี้`
   - `วันนี้`
   - `5 มิ.ย.`
   - `5/6/2026`
4. Create assignment in bound classroom
5. Reply with assignment code and deadline
6. Update `สรุปงาน` formatting to show LINE code when available
7. Add tests for parser, handler, and repository

## Open Questions

- Should LINE-created assignments default to quiz, worksheet, or generic/manual assignment?
- Should students submit directly in group, or should the bot return a GameEdu upload link first?
- Do we want Google Drive sync, or is R2 + Excel export enough for the first production version?
- Should auto reminders be opt-in per classroom or enabled by default after binding?
- Should LINE features be Free Trial, PLUS-only, or partially free?

## Release Gate

Before deploying each phase:

- Targeted unit tests pass
- Prisma schema validates if changed
- `npm.cmd run predev` passes
- Manual LINE group smoke:
  - `กริ่งช่วย`
  - `สรุปงาน`
  - new phase command
  - error case in unbound group or invalid input
- Production Render env checked for any new variables
- LINE Developers webhook verify passes after deploy

## Progress Note 1

Started on 2026-06-02:

- Implemented Phase 1A without adding a new Prisma model yet
- Added LINE commands:
  - `สร้างงาน <ชื่องาน> ส่ง <วันส่ง>`
  - `สร้างงาน <ชื่องาน> ไม่มีกำหนดส่ง`
  - `create assignment <name> due <date>`
  - `create assignment <name> no due`
- Supported MVP due-date parsing:
  - `วันนี้`
  - `พรุ่งนี้`
  - `YYYY-MM-DD`
  - `DD/MM/YYYY`
  - Thai short month format such as `5 มิ.ย.`
- LINE-created assignments use existing `Assignment` fields:
  - `type: "score"`
  - `maxScore: 10`
  - `visible: true`
  - `description: "Created from LINE by Nong Gring"`
- Created assignments also send existing in-app assignment notifications to classroom students
- Updated LINE help and handler tests for the new create-assignment flow

Validation:

- Passed: `npm.cmd test -- src/lib/line-bot/__tests__/commands.test.ts src/lib/line-bot/__tests__/handlers.test.ts src/__tests__/line-webhook-route.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\lib\line-bot\commands.ts src\lib\line-bot\handlers.ts src\lib\line-bot\repository.ts src\lib\line-bot\__tests__\commands.test.ts src\lib\line-bot\__tests__\handlers.test.ts`
- Passed: `npm.cmd run predev`

## Progress Note 2

Started on 2026-06-02:

- Implemented Phase 2 MVP as a cron-triggered job endpoint instead of an always-running in-process scheduler
- Added `LineAssignmentReminderDelivery` to record delivery idempotency
- Added `POST /api/jobs/line-reminders`
- Protected the job route with `LINE_REMINDER_CRON_SECRET`, falling back to `ADMIN_SECRET`
- Added `pushLineText` for proactive LINE group messages
- Added auto reminder windows:
  - 1 day before deadline
  - deadline day
  - 1 day after deadline
- Reminder messages remain group-safe and show assignment name plus missing count only
- Duplicate job runs skip already-recorded reminders by unique key

Operational setup after deploy:

- Add `LINE_REMINDER_CRON_SECRET` in Render, or reuse `ADMIN_SECRET`
- Configure Render Cron / external cron to call:

```text
POST https://www.teachplayedu.com/api/jobs/line-reminders
Authorization: Bearer <LINE_REMINDER_CRON_SECRET>
```

Recommended schedule:

```text
0 8,12,16 * * *
```

Validation:

- Passed: `.\node_modules\.bin\prisma.cmd validate`
- Passed: `npm.cmd test -- src/lib/line-bot/__tests__/auto-reminders.test.ts src/__tests__/line-auto-reminders-route.test.ts src/lib/line-bot/__tests__/commands.test.ts src/lib/line-bot/__tests__/handlers.test.ts src/__tests__/line-webhook-route.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\lib\line-bot\auto-reminders.ts src\app\api\jobs\line-reminders\route.ts src\lib\line-bot\client.ts src\lib\line-bot\config.ts src\lib\db.ts src\lib\line-bot\__tests__\auto-reminders.test.ts src\__tests__\line-auto-reminders-route.test.ts`
- Passed: `npm.cmd run predev`

## Progress Note 3

Started on 2026-06-02:

- Implemented Phase 3A group-safe student self-service commands in LINE
- Added commands:
  - `งานค้าง`
  - `งานวันนี้`
  - `งานใกล้ส่ง`
  - English aliases: `missing work`, `today work`, `soon work`
- Commands reuse the bound classroom assignment summary
- Replies show aggregate missing counts only and explicitly avoid student names
- Unbound LINE groups receive the classroom binding instruction
- Updated `กริ่งช่วย` help text to include the student self-service commands

Validation:

- Passed: `npm.cmd test -- src/lib/line-bot/__tests__/commands.test.ts src/lib/line-bot/__tests__/handlers.test.ts src/__tests__/line-webhook-route.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\lib\line-bot\commands.ts src\lib\line-bot\handlers.ts src\lib\line-bot\__tests__\commands.test.ts src\lib\line-bot\__tests__\handlers.test.ts`
- Passed: `npm.cmd run predev`

## Progress Note 4

Started on 2026-06-02:

- Implemented Phase 4A text submission through LINE
- Added commands:
  - `ส่งงาน <studentCode> <ชื่องานหรือ assignmentId>: <คำตอบ>`
  - `submit work <studentCode> <assignment name or id>: <content>`
- The LINE bot resolves the bound classroom, student login code, and visible assignment
- Text submissions write to `AssignmentSubmission.content` with metadata:
  - `mode: "line_text"`
  - `submittedVia: "line"`
- Existing submissions are updated instead of duplicated
- Quiz and worksheet assignments are intentionally blocked from LINE text submission because they require dedicated grading flows
- Replies remain group-safe and only confirm the assignment/classroom

Validation:

- Passed: `npm.cmd test -- src/lib/line-bot/__tests__/commands.test.ts src/lib/line-bot/__tests__/handlers.test.ts src/lib/line-bot/__tests__/repository-submission.test.ts src/__tests__/line-webhook-route.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\lib\line-bot\commands.ts src\lib\line-bot\handlers.ts src\lib\line-bot\repository.ts src\lib\line-bot\__tests__\commands.test.ts src\lib\line-bot\__tests__\handlers.test.ts src\lib\line-bot\__tests__\repository-submission.test.ts`
- Passed: `npm.cmd run predev`

## Progress Note 5

Started on 2026-06-02:

- Implemented Phase 3B student self-bind via LINE login code
- Added `LineStudentBinding` to link:
  - LINE user ID
  - LINE group ID
  - GameEdu classroom
  - GameEdu student
  - student login code used during binding
- Added LINE commands:
  - `ผูกนักเรียน <studentCode>`
  - `bind student <studentCode>`
  - `งานของฉัน`
  - `my assignments`
  - `my work`
- Binding only works after the LINE group is already linked to a classroom with `ผูกห้อง`
- `งานของฉัน` returns personal missing visible assignments for the bound LINE user
- Personal work replies show only the requesting student's own assignment list
- If the LINE user is not bound yet, the bot asks them to run `ผูกนักเรียน <studentCode>` first
- Added repository tests for successful binding, unknown login code, personal work lookup, and not-yet-bound users

Manual LINE flow after deploy:

```text
ผูกนักเรียน S123
งานของฉัน
```

Expected behavior:

- First command confirms the student and classroom
- Second command lists that student's missing assignments
- In a group, each student must bind their own LINE account once

Validation:

- Passed: `.\node_modules\.bin\prisma.cmd validate`
- Passed: `npm.cmd test -- src/lib/line-bot/__tests__/commands.test.ts src/lib/line-bot/__tests__/handlers.test.ts src/lib/line-bot/__tests__/student-binding.test.ts src/lib/line-bot/__tests__/repository-submission.test.ts src/__tests__/line-webhook-route.test.ts src/__tests__/line-auto-reminders-route.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\lib\line-bot\commands.ts src\lib\line-bot\handlers.ts src\lib\line-bot\repository.ts src\lib\db.ts src\lib\line-bot\__tests__\commands.test.ts src\lib\line-bot\__tests__\handlers.test.ts src\lib\line-bot\__tests__\student-binding.test.ts`
- Passed: `npm.cmd run predev`

## Progress Note 6

Started on 2026-06-02:

- Implemented Phase 3C private per-student LINE replies
- Personal commands now separate the group acknowledgement from the sensitive student payload
- Commands affected:
  - `ผูกนักเรียน <studentCode>`
  - `bind student <studentCode>`
  - `งานของฉัน`
  - `my assignments`
  - `my work`
- The bot replies in the group with a generic acknowledgement only
- The actual student name, binding confirmation, and personal missing-work list are pushed to the requesting LINE user privately
- If private push fails, the bot does not leak the personal content into the group
- Fallback group message tells the student to add the bot as a friend and try again

Manual LINE flow after deploy:

```text
1. Student adds the LINE OA bot as a friend
2. In the classroom LINE group: ผูกนักเรียน S123
3. In the classroom LINE group: งานของฉัน
4. Confirm the group only shows a generic acknowledgement
5. Confirm the student's private chat receives the actual detail
```

Operational note:

- LINE push messages to an individual user require the bot to be able to message that user, so students should add the LINE OA bot as a friend before using private replies.
- Keep group-safe aggregate commands like `งานค้าง`, `งานวันนี้`, and `งานใกล้ส่ง` available for students who have not bound or friended the bot yet.

Validation:

- Passed: `.\node_modules\.bin\prisma.cmd validate`
- Passed: `npm.cmd test -- src/lib/line-bot/__tests__/commands.test.ts src/lib/line-bot/__tests__/handlers.test.ts src/lib/line-bot/__tests__/student-binding.test.ts src/lib/line-bot/__tests__/repository-submission.test.ts src/__tests__/line-webhook-route.test.ts src/__tests__/line-auto-reminders-route.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\lib\line-bot\commands.ts src\lib\line-bot\handlers.ts src\lib\line-bot\__tests__\commands.test.ts src\lib\line-bot\__tests__\handlers.test.ts`
- Passed: `npm.cmd run predev`

## Progress Note 7

Started on 2026-06-02:

- Implemented Phase 5 AI Preliminary Grading for LINE text submissions
- Added Gemini-based grading helper for submitted LINE text answers
- The AI returns:
  - suggested score
  - max score
  - confidence
  - short teacher-facing feedback
- `ส่งงาน <studentCode> <assignment>: <answer>` now attempts preliminary grading after resolving the classroom, student, and assignment
- AI grading is best-effort:
  - if `GEMINI_API_KEY` is missing, submission still succeeds
  - if Gemini returns invalid JSON or fails, submission still succeeds
  - failed/unavailable AI status is stored in submission metadata
- For graded results:
  - `AssignmentSubmission.score` is set to the suggested preliminary score
  - `AssignmentSubmission.content` stores the original LINE answer plus `aiPreliminaryGrading`
  - LINE confirmation shows the AI suggested score and confidence
- Quiz and worksheet assignments remain blocked from LINE text submission and AI preliminary grading

Stored `content` shape:

```json
{
  "mode": "line_text",
  "text": "student answer",
  "submittedVia": "line",
  "aiPreliminaryGrading": {
    "status": "graded",
    "suggestedScore": 8,
    "maxScore": 10,
    "confidence": "medium",
    "feedback": "teacher-facing feedback"
  }
}
```

Operational setup after deploy:

- Add `GEMINI_API_KEY` in Render if AI preliminary grading should run in production
- Without `GEMINI_API_KEY`, the LINE submission flow still works, but no preliminary score is generated

Validation:

- Passed: `.\node_modules\.bin\prisma.cmd validate`
- Passed: `npm.cmd test -- src/lib/line-bot/__tests__/ai-grading.test.ts src/lib/line-bot/__tests__/commands.test.ts src/lib/line-bot/__tests__/handlers.test.ts src/lib/line-bot/__tests__/student-binding.test.ts src/lib/line-bot/__tests__/repository-submission.test.ts src/__tests__/line-webhook-route.test.ts src/__tests__/line-auto-reminders-route.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\lib\line-bot\ai-grading.ts src\lib\line-bot\commands.ts src\lib\line-bot\repository.ts src\lib\line-bot\__tests__\ai-grading.test.ts src\lib\line-bot\__tests__\repository-submission.test.ts`
- Passed: `npm.cmd run predev`

## Progress Note 8

Started on 2026-06-02:

- Implemented Phase 6 MVP: Gamification and Negamon economy loop for LINE submissions
- Added `line_assignment` as an economy ledger source
- Added LINE assignment reward service:
  - awards Gold through the Negamon economy ledger
  - uses idempotency key `line_assignment:<studentId>:<assignmentId>`
  - awards only once per student per assignment
  - skips duplicate Gold when a student edits/resubmits the same LINE assignment
- Reward rule:
  - first valid LINE assignment submission: `+10 Gold`
  - high-confidence strong AI preliminary result: extra `+5 Gold`
- `ส่งงาน ...` now returns reward feedback in LINE when Gold is awarded
- `AssignmentSubmission` remains the learning submission record; `EconomyTransaction` is the Gold audit trail
- The reward metadata stores:
  - assignment ID/name
  - source `line_submission`
  - AI preliminary score summary when available
- This keeps Classroom Points and Negamon Gold separate

Operational behavior after deploy:

```text
ส่งงาน S123 Homework 1: คำตอบของฉัน
```

Expected first submission reply includes:

```text
รางวัล: +10 Gold
เปิด GameEdu เพื่อใช้ Gold ในร้านค้า/Negamon ได้เลย
```

If AI preliminary grading is available and strong enough, reward can be `+15 Gold`.

Validation:

- Passed: `.\node_modules\.bin\prisma.cmd validate`
- Passed: `npm.cmd test -- src/lib/line-bot/__tests__/ai-grading.test.ts src/lib/line-bot/__tests__/commands.test.ts src/lib/line-bot/__tests__/handlers.test.ts src/lib/line-bot/__tests__/student-binding.test.ts src/lib/line-bot/__tests__/repository-submission.test.ts src/lib/services/student-economy/__tests__/line-assignment-reward.test.ts src/__tests__/line-webhook-route.test.ts src/__tests__/line-auto-reminders-route.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\lib\services\student-economy\line-assignment-reward.ts src\lib\services\student-economy\__tests__\line-assignment-reward.test.ts src\lib\services\student-economy\economy-ledger.ts src\lib\line-bot\commands.ts src\lib\line-bot\repository.ts src\lib\line-bot\__tests__\commands.test.ts src\lib\line-bot\__tests__\repository-submission.test.ts`
- Passed: `npm.cmd run predev`

## Progress Note 9

Started on 2026-06-02:

- Implemented Phase 7 MVP: Teacher Command Center LINE visibility and manual override
- Extended teacher assignment overview items with LINE reminder state:
  - `lineReminderCount`
  - `lastLineReminderSentAt`
  - `lastLineReminderTargetCount`
- Added manual LINE reminder endpoint:

```text
POST /api/classrooms/:id/assignments/:assignmentId/line-reminders
```

- Manual LINE reminder route:
  - requires teacher/admin auth
  - verifies classroom ownership
  - finds active LINE groups linked to the classroom
  - computes missing submission target count
  - pushes a teacher-triggered LINE reminder to linked LINE groups
  - records delivery in `LineAssignmentReminderDelivery`
- Updated the dashboard Assignment Command Center:
  - shows how many LINE reminders were sent per assignment
  - shows last LINE reminder time
  - adds a `Send LINE` manual reminder button next to existing in-app reminder controls
- Existing in-app reminder endpoint remains unchanged
- This lets dashboard state and LINE state match for teacher visibility

Validation:

- Passed: `.\node_modules\.bin\prisma.cmd validate`
- Passed: `npm.cmd test -- src/__tests__/teacher-assignment-overview-service.test.ts src/__tests__/teacher-assignments-overview-route.test.ts src/__tests__/assignment-line-reminders-route.test.ts src/__tests__/teacher-assignment-overview-load.test.ts src/__tests__/assignment-command-center-helpers.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\lib\services\teacher\get-teacher-assignment-overview.ts src\app\api\classrooms\[id]\assignments\[assignmentId]\line-reminders\route.ts src\components\dashboard\assignment-command-center.tsx src\__tests__\teacher-assignment-overview-service.test.ts src\__tests__\assignment-line-reminders-route.test.ts`
- Passed: `npm.cmd run predev`

## Progress Note 10

Started on 2026-06-02:

- Implemented Phase 8 MVP: Export and storage-ready archive metadata
- Added assignment export endpoint:

```text
GET /api/classrooms/:id/assignments/:assignmentId/export
```

- Export route:
  - requires teacher/admin auth
  - verifies classroom ownership
  - exports every student in the classroom, including missing submissions
  - includes assignment metadata, student metadata, submission score, answer text, submitted time, and max score
  - extracts LINE text submission metadata from `AssignmentSubmission.content`
  - includes AI preliminary grading fields:
    - status
    - suggested score
    - max score
    - confidence
    - feedback
  - protects CSV cells from spreadsheet formula injection
- Added storage-ready `archivePath` column:

```text
Classroom/Assignment/StudentName-StudentCode/submission.txt
Classroom/Assignment/StudentName-StudentCode/missing.txt
```

- Updated Teacher Command Center:
  - adds an `Export` button beside assignment priority and reminder candidates
  - export downloads directly from the assignment export endpoint
- This phase prepares the shape for later R2-backed storage without requiring R2 credentials yet

Validation:

- Passed: `.\node_modules\.bin\prisma.cmd validate`
- Passed: `npm.cmd test -- src/__tests__/assignment-export-route.test.ts src/__tests__/assignment-line-reminders-route.test.ts src/__tests__/teacher-assignment-overview-service.test.ts src/__tests__/assignment-command-center-helpers.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\app\api\classrooms\[id]\assignments\[assignmentId]\export\route.ts src\components\dashboard\assignment-command-center.tsx src\__tests__\assignment-export-route.test.ts`
- Passed: `npm.cmd run predev`

## Progress Note 11

Started on 2026-06-02:

- Implemented Phase 9 MVP: Plan and Pricing Integration for LINE assignment workflows
- Added LINE-specific fields to the existing plan limit system:
  - `lineCreatedAssignmentsPerMonth`
  - `lineSubmission`
  - `lineAutoReminders`
  - `lineExport`
  - `lineAiPreliminaryGrading`
- Added central LINE plan helper:

```text
src/lib/line-bot/plan-access.ts
```

- Current effective limits:
  - Free:
    - up to 5 LINE-created assignments per month
    - manual LINE summary/remind commands remain available
    - LINE submission disabled
    - auto reminders disabled
    - export disabled
    - AI preliminary grading disabled
  - PLUS:
    - up to 100 LINE-created assignments per month
    - LINE submission enabled
    - auto reminders enabled
    - export enabled
    - AI preliminary grading enabled
  - PRO / School:
    - unlimited LINE-created assignments
    - LINE submission enabled
    - auto reminders enabled
    - export enabled
    - AI preliminary grading enabled
- Added gates to:
  - LINE-created assignment monthly quota
  - LINE text submission
  - AI preliminary grading inside LINE submission
  - scheduled auto LINE reminders
  - dashboard manual LINE reminder push
  - assignment export endpoint
- LINE replies now show an upgrade prompt when a blocked LINE command hits a plan limit
- Export and dashboard reminder APIs return a plan-limit API error before doing privileged work
- Existing group-safe free workflows remain available:
  - `สรุปงาน`
  - `ทวงงาน`
  - `งานค้าง`
  - `งานวันนี้`
  - `งานใกล้ส่ง`

Validation:

- Passed: `.\node_modules\.bin\prisma.cmd validate`
- Passed: `npm.cmd test -- src/lib/line-bot/__tests__/ai-grading.test.ts src/lib/line-bot/__tests__/commands.test.ts src/lib/line-bot/__tests__/handlers.test.ts src/lib/line-bot/__tests__/student-binding.test.ts src/lib/line-bot/__tests__/repository-submission.test.ts src/lib/line-bot/__tests__/auto-reminders.test.ts src/lib/services/student-economy/__tests__/line-assignment-reward.test.ts src/lib/plan/__tests__/plan-access.test.ts src/__tests__/assignment-export-route.test.ts src/__tests__/assignment-line-reminders-route.test.ts src/__tests__/line-webhook-route.test.ts src/__tests__/line-auto-reminders-route.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\constants\plan-limits.ts src\lib\plan\plan-access.ts src\lib\line-bot\plan-access.ts src\lib\line-bot\repository.ts src\lib\line-bot\auto-reminders.ts src\app\api\classrooms\[id]\assignments\[assignmentId]\export\route.ts src\app\api\classrooms\[id]\assignments\[assignmentId]\line-reminders\route.ts src\lib\plan\__tests__\plan-access.test.ts src\lib\line-bot\__tests__\auto-reminders.test.ts src\lib\line-bot\__tests__\repository-submission.test.ts src\__tests__\assignment-export-route.test.ts src\__tests__\assignment-line-reminders-route.test.ts`
- Passed: `npm.cmd run predev`
