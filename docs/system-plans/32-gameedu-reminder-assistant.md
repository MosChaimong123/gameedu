# System Plan 32: น้องกริ่งทวง / GameEdu Reminder Assistant

Last updated: 2026-06-01

## Product Name

ชื่อที่แนะนำ: **น้องกริ่งทวง**

เหตุผล:

- จำง่ายและอารมณ์ใกล้กับ "คุณไก่ทวง"
- คำว่า "กริ่ง" ผูกกับโรงเรียนทันที ทั้งกริ่งเข้าเรียน กริ่งเตือน และกริ่งหมดเวลา
- คำว่า "ทวง" บอกหน้าที่ตรง ๆ ว่าช่วยครูตามงาน
- ใช้ต่อยอดเป็นคาแรกเตอร์ใน GameEdu ได้ เช่น กริ่งแจ้งภารกิจ, กริ่งเตือนงานค้าง, กริ่งแจก EXP

ชื่อสำรอง:

- **ครูกริ่งทวง** - ดูเป็นผู้ช่วยครูมากขึ้น เหมาะกับ teacher-facing feature
- **กริ่งงานค้าง** - ตรง pain point มาก แต่ฟังเป็นฟีเจอร์มากกว่าแบรนด์
- **น้องทวงงาน** - เข้าใจง่ายที่สุด แต่บุคลิกยังไม่เด่น
- **กริ่งเควส** - เข้ากับ GameEdu/Quest มากกว่า แต่ความหมายเรื่องทวงงานอ่อนลง
- **เนก้าทวง** - ผูกกับ Negamon ได้ดี แต่ถ้าระบบนี้ต้องใช้ได้ทุกห้องเรียนอาจแคบเกินไป

## Vision

น้องกริ่งทวงคือผู้ช่วยครูใน GameEdu ที่ช่วยสรุปงานค้าง ทวงงานอัตโนมัติ และเปลี่ยนการส่งงานให้เป็นเกมรางวัล นักเรียนเห็นงานที่ต้องทำได้เอง ครูลดเวลาตามงานซ้ำ ๆ และระบบเรียน/เกมของ GameEdu ถูกเชื่อมเป็นประสบการณ์เดียว

แนวคิดหลัก:

```text
มอบหมาย -> เตือน -> ส่งงาน -> ให้รางวัล -> สรุปผล
```

## Inspiration From Khun Kai Tuang

สิ่งที่ควรยืมมาใช้:

- สื่อสาร pain point ชัด: ครูไม่ต้องทวงงานเองทุกวัน
- ใช้ช่องทางที่คุ้นเคย เช่น LINE หรือ notification
- นักเรียนเช็กงานค้างเองได้
- มี gamification กระตุ้นให้ส่งงาน
- มีภาพรวมว่าใครส่งแล้ว ใครยังไม่ส่ง

สิ่งที่ GameEdu ควรทำให้ต่าง:

- ไม่เป็นแค่ LINE bot แต่เป็นส่วนหนึ่งของ Classroom Dashboard และ Student Dashboard
- เชื่อมรางวัลเข้ากับ Points, Gold, Daily Quest และ Negamon
- ใช้ข้อมูล assignment/submission เดิม ไม่สร้างระบบงานค้างแยกซ้ำ
- ให้ครูควบคุมข้อความทวง รอบเวลา และความถี่ได้
- รองรับทั้งห้องที่ใช้ LINE และห้องที่ใช้ student code/dashboard อย่างเดียว

## Current GameEdu Foundation

ระบบที่มีอยู่แล้วและนำมาต่อยอดได้:

- Classroom dashboard: `src/components/classroom/classroom-dashboard.tsx`
- Assignment CRUD: `src/app/api/classrooms/[id]/assignments/`
- Assignment submissions: `AssignmentSubmission`
- Teacher assignment overview: `src/lib/services/teacher/get-teacher-assignment-overview.ts`
- Student dashboard: `src/app/student/[code]/`
- Student notifications: `src/app/api/student/[code]/notifications/`
- Points and classroom rewards: `src/app/api/classrooms/[id]/points/`
- Gold / economy / Negamon reward systems
- LINE webhook MVP: `src/app/api/webhooks/line/`
- LINE bot logic: `src/lib/line-bot/`

## Problem Statement

ครูมีภาระซ้ำ ๆ หลังมอบหมายงาน:

- ต้องเช็กว่าใครส่งแล้ว ใครยังไม่ส่ง
- ต้องทวงในหลายช่องทาง
- นักเรียนถามซ้ำว่างานอะไรค้าง
- งานใกล้ครบกำหนดหลุดจากสายตา
- การส่งงานยังไม่เชื่อมกับแรงจูงใจในเกมอย่างชัดเจน

ผลลัพธ์ที่ต้องการ:

- ครูเห็นงานที่ควรทวงได้ในหน้าเดียว
- นักเรียนรู้เองว่าต้องทำอะไรต่อ
- ระบบแจ้งเตือนงานค้างได้โดยไม่รบกวนเกินไป
- การส่งงานมี reward feedback ทันที
- ครูสามารถสรุปสถานะห้องเรียนได้รวดเร็ว

## Scope

### In Scope

- Reminder Assistant panel ใน Teacher Dashboard
- Assignment risk summary: overdue, due soon, missing submissions
- Manual reminder action: copy message, send in-app notification
- Student "งานค้างของฉัน" view ใน Student Dashboard
- Reward hook เมื่อส่งงานตรงเวลา / ส่งงานครบ
- LINE command MVP สำหรับสรุปงานและทวงงาน
- Audit log สำหรับ reminder actions
- Settings สำหรับเปิด/ปิดและกำหนดความถี่การทวง

### Out Of Scope For First Release

- AI grading เต็มรูปแบบ
- Google Drive sync
- LINE LIFF onboarding แบบสมบูรณ์
- Auto-scheduler ที่ยิงทุกห้องโดยไม่มี teacher approval
- Procurement / school package admin console
- Parent-facing notification

## User Stories

### Teacher

- ในฐานะครู ฉันอยากเห็นว่างานไหนควรทวงวันนี้ เพื่อไม่ต้องไล่เปิดทีละ assignment
- ในฐานะครู ฉันอยากกดส่ง reminder ให้นักเรียนที่ยังไม่ส่ง เพื่อประหยัดเวลา
- ในฐานะครู ฉันอยากคัดลอกข้อความทวงไปวางใน LINE กลุ่มได้ทันที
- ในฐานะครู ฉันอยากตั้งเวลาทวงอัตโนมัติได้ แต่ยังควบคุมความถี่ไม่ให้นักเรียนรำคาญ

### Student

- ในฐานะนักเรียน ฉันอยากเห็นงานค้างของฉันในหน้าแรก เพื่อรู้ว่าต้องทำอะไรก่อน
- ในฐานะนักเรียน ฉันอยากได้รับแจ้งเตือนก่อนหมดเขต เพื่อไม่พลาดส่งงาน
- ในฐานะนักเรียน ฉันอยากได้ EXP/Gold/Quest progress เมื่อส่งงาน เพื่อรู้สึกว่าการเรียนคืบหน้า

### School/Admin

- ในฐานะโรงเรียน ฉันอยากมั่นใจว่าการแจ้งเตือนและข้อมูลนักเรียนถูกจำกัดสิทธิ์
- ในฐานะโรงเรียน ฉันอยาก export หรือดู log การแจ้งเตือนได้เมื่อมีข้อร้องเรียน

## Phase Plan

### Phase 1: Teacher Reminder Command Center

เป้าหมาย: ครูเห็นงานค้างและทวงแบบ manual ได้ก่อน

งานหลัก:

- เพิ่ม read model สำหรับ "งานที่ควรทวงวันนี้"
- ใช้ข้อมูลจาก `getTeacherAssignmentOverview` เป็นฐาน
- เพิ่มสถานะ assignment:
  - overdue
  - due within 24 hours
  - due within 3 days
  - missing submissions
  - all submitted
- เพิ่ม panel ใน dashboard:
  - จำนวนงานเลยกำหนด
  - จำนวนงานใกล้ครบกำหนด
  - จำนวนนักเรียนที่ยังไม่ส่ง
  - top 5 assignments ที่ควรทวง
- เพิ่มปุ่ม:
  - Copy reminder message
  - Send in-app notification
  - Open assignment review

ไฟล์ที่คาดว่าจะเกี่ยวข้อง:

- `src/lib/services/teacher/get-teacher-assignment-overview.ts`
- `src/components/dashboard/assignment-command-center.tsx`
- `src/components/classroom/classroom-dashboard.tsx`
- `src/app/api/teacher/assignments/overview/route.ts`
- `src/lib/notifications.ts`

Exit criteria:

- ครูเห็นงานค้างใน dashboard โดยไม่ต้องเข้าแต่ละห้อง
- ข้อความทวงถูกสร้างจากข้อมูลจริง
- มี test สำหรับ count งานค้างและ missing submissions
- ไม่มีข้อมูลข้ามครูหรือข้าม classroom หลุด

### Phase 2: Student Self-Service งานค้างของฉัน

เป้าหมาย: นักเรียนเช็กงานตัวเองได้เอง ลดคำถามซ้ำถึงครู

งานหลัก:

- เพิ่ม section "งานค้างของฉัน" ใน Student Dashboard
- แยกงานเป็น:
  - ต้องส่งวันนี้
  - เลยกำหนดแล้ว
  - ใกล้ครบกำหนด
  - ส่งแล้วรอครูตรวจ
- เพิ่ม CTA ไปยัง quiz/worksheet/assignment ที่เกี่ยวข้อง
- เพิ่ม empty state เมื่อไม่มีงานค้าง
- เพิ่ม reward preview เช่น "ส่งงานนี้รับ +EXP / +Gold"

ไฟล์ที่คาดว่าจะเกี่ยวข้อง:

- `src/lib/services/student-dashboard/get-student-dashboard.ts`
- `src/components/student/student-dashboard-assignments-tab.tsx`
- `src/components/student/StudentDashboardClient.tsx`
- `src/app/student/[code]/page.tsx`

Exit criteria:

- Student code เห็นเฉพาะงานของตัวเอง
- งานค้างเรียงตามความเร่งด่วน
- รองรับ mobile ได้ดี
- มี tests สำหรับ invalid code และ classroom isolation

### Phase 3: Reward Hook For Assignment Completion

เป้าหมาย: เปลี่ยนการส่งงานให้เป็น progression ในเกม

งานหลัก:

- กำหนด reward policy สำหรับ assignment completion
- Award reward เมื่อ:
  - ส่งงานครั้งแรก
  - ส่งก่อน deadline
  - ส่งครบทุกงานในช่วงหนึ่ง
- เชื่อมกับ:
  - classroom points
  - student gold
  - daily quests
  - Negamon EXP/progression
- ป้องกัน duplicate reward ด้วย idempotency key
- เพิ่ม reward result modal หรือ toast หลังส่งงาน

ไฟล์ที่คาดว่าจะเกี่ยวข้อง:

- `src/app/api/classrooms/[id]/assignments/[assignmentId]/submit/route.ts`
- `src/app/api/classrooms/[id]/assignments/[assignmentId]/worksheet/submit/route.ts`
- `src/lib/services/classroom-points/award-classroom-points.ts`
- `src/lib/services/student-economy/`
- `src/lib/game-negamon/core/learning-rewards.ts`

Exit criteria:

- ส่งงานซ้ำไม่แจก reward ซ้ำ
- ครูเห็น audit/reason ของ reward ได้
- นักเรียนเห็น feedback หลังส่งงาน
- Reward policy ไม่ปะปนกับ manual teacher scoring

### Phase 4: LINE Reminder MVP

เป้าหมาย: ใช้ LINE เป็นช่องทางเสริมสำหรับห้องที่ต้องการ

Command MVP:

```text
กริ่งช่วย
สรุปงาน
ทวงงาน
งานค้าง
งานวันนี้
ผูกห้อง <classroom-code>
```

งานหลัก:

- แยก LINE bot จาก debt-bot MVP เดิมเป็น classroom reminder bot
- เพิ่ม group-classroom binding
- เพิ่มคำสั่ง teacher-only ใน LINE group
- เพิ่มคำสั่ง student-facing แบบไม่เปิดเผยข้อมูลคนอื่น
- เพิ่ม Flex Message หรือข้อความ plain text แบบอ่านง่าย
- เพิ่ม rate limit กัน spam

ไฟล์ที่คาดว่าจะเกี่ยวข้อง:

- `src/app/api/webhooks/line/route.ts`
- `src/lib/line-bot/commands.ts`
- `src/lib/line-bot/handlers.ts`
- `src/lib/line-bot/repository.ts`
- `prisma/schema.prisma`

Exit criteria:

- LINE signature verification ยังปลอดภัย
- Group binding ไม่ผูกผิดห้อง
- คำสั่งทวงงานไม่เผยรายชื่อนักเรียนเกินที่ครูตั้งค่า
- มี test สำหรับ command parsing และ webhook route

### Phase 5: Scheduled Reminders

เป้าหมาย: ทวงงานอัตโนมัติแบบควบคุมได้

งานหลัก:

- เพิ่ม reminder schedule ต่อ classroom
- ค่าเริ่มต้นปลอดภัย:
  - ปิดไว้ก่อน
  - ครูต้อง opt-in
  - จำกัดจำนวนครั้งต่อ assignment
- เพิ่ม quiet hours
- เพิ่ม cooldown ต่อ student/assignment
- เพิ่ม preview ก่อนเปิดใช้งาน
- เพิ่ม audit log ทุกครั้งที่ส่ง

Exit criteria:

- ไม่มี reminder storm
- ครูปิด/แก้ตารางได้ง่าย
- มี idempotency สำหรับ cron run
- มี manual QA สำหรับ timezone Asia/Bangkok

### Phase 6: Trust, Policy, And School Readiness

เป้าหมาย: ทำให้ขายโรงเรียนได้จริง

งานหลัก:

- เพิ่มหน้าอธิบาย privacy สำหรับข้อมูลนักเรียน
- เพิ่ม setting ว่าใครเห็นสถานะส่งงานของใคร
- เพิ่ม export reminder/audit log
- เพิ่ม data retention note
- เพิ่ม admin/school package readiness checklist

Exit criteria:

- ครูและโรงเรียนเข้าใจว่าข้อมูลใดถูกใช้เพื่อ reminder
- มี path สำหรับ export/delete ตาม policy
- เอกสาร onboarding พร้อมสำหรับ pilot school

## Data Model Notes

อาจต้องเพิ่ม model ใหม่เมื่อเข้า Phase 4-5:

```prisma
model ClassroomReminderSettings {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  classroomId      String   @unique @db.ObjectId
  enabled          Boolean  @default(false)
  lineEnabled      Boolean  @default(false)
  inAppEnabled     Boolean  @default(true)
  quietHoursStart  String?
  quietHoursEnd    String?
  maxPerAssignment Int      @default(3)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model AssignmentReminderLog {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  classroomId  String   @db.ObjectId
  assignmentId String   @db.ObjectId
  teacherId    String?  @db.ObjectId
  channel      String
  targetScope  String
  targetCount  Int
  message      String?
  status       String
  idempotencyKey String @unique
  createdAt    DateTime @default(now())
}
```

ควรยืนยัน schema จริงอีกครั้งก่อน implement เพราะ repo มี LINE MVP models อยู่แล้ว (`LineBotGroup`, `LineGroupDebt`) และอาจต้อง migrate/rename ให้เป็น classroom-oriented model

## API Design Draft

```text
GET  /api/teacher/assignments/overview?range=7d
GET  /api/classrooms/[id]/reminders/summary
POST /api/classrooms/[id]/reminders/send
GET  /api/classrooms/[id]/reminders/settings
PATCH /api/classrooms/[id]/reminders/settings
GET  /api/student/[code]/assignments/due
```

Rules:

- Teacher routes must use `requireClassroomTeacher`
- Student routes must resolve student by code and never accept arbitrary studentId from client
- Reminder send must validate classroom ownership
- Scheduled jobs must use idempotency key per classroom/assignment/channel/time window

## UX Draft

### Teacher Dashboard Panel

Title: **น้องกริ่งทวง**

Cards:

- งานเลยกำหนด
- งานครบกำหนดวันนี้
- นักเรียนยังไม่ส่ง
- ห้องที่ควรทวงก่อน

Actions:

- `ทวงงาน`
- `คัดลอกข้อความ`
- `ดูรายละเอียด`
- `ตั้งค่ากริ่งทวง`

Example copy:

```text
กริ่งเตือนงานค้าง 🔔
งาน: แบบฝึกหัดบทที่ 3
กำหนดส่ง: วันนี้ 18:00
ยังไม่ส่ง: 8 คน

เข้าไปส่งงานที่ GameEdu ได้เลยนะ
```

### Student Dashboard Panel

Title: **งานที่กริ่งเตือน**

States:

- Empty: "ตอนนี้ไม่มีงานค้าง เก่งมาก!"
- Due today: "ส่งวันนี้ รับรางวัลเต็ม"
- Overdue: "เลยกำหนดแล้ว แต่ยังส่งได้"
- Submitted: "ส่งแล้ว รอครูตรวจ"

## Notification Policy

ค่าเริ่มต้น:

- In-app notification: enabled
- LINE group reminder: teacher manual only
- Scheduled LINE reminder: disabled until teacher opts in
- Student private reminder: disabled until identity binding is reliable

Privacy:

- หลีกเลี่ยงการประกาศรายชื่อนักเรียนที่ยังไม่ส่งในกลุ่มเป็นค่าเริ่มต้น
- ใช้ข้อความรวม เช่น "ยังมี 8 คนที่ยังไม่ส่ง"
- ถ้าครูต้องการรายชื่อ ต้องเป็น setting แยกพร้อมคำเตือน

## Testing Plan

Focused tests:

```powershell
npm.cmd test -- src/__tests__/teacher-assignment-overview-service.test.ts src/__tests__/teacher-assignments-overview-route.test.ts
npm.cmd test -- src/__tests__/student-dashboard-page.test.ts src/__tests__/student-notifications-route.test.ts
npm.cmd test -- src/__tests__/line-webhook-route.test.ts src/lib/line-bot/__tests__/commands.test.ts
```

Domain checks:

```powershell
npm.cmd run check:assignment-quiz
npm.cmd run check:student-dashboard
npm.cmd run check:classroom-core
```

Build safety:

```powershell
npm.cmd run lint
npm.cmd run build
```

Manual QA:

- Teacher sees correct overdue and due-soon counts
- Teacher can copy reminder message
- Teacher can send in-app notification to affected students
- Student sees only their own due assignments
- Student reward is granted once
- LINE command does not leak student-private data
- Reminder settings persist and can be disabled

## Rollout Strategy

1. Ship dashboard-only reminder summary behind feature flag
2. Enable manual in-app reminders for internal QA classroom
3. Add student due-work panel
4. Add reward feedback for assignment completion
5. Pilot LINE command in one test group
6. Add scheduled reminders after audit/idempotency is proven
7. Prepare school-facing trust docs and pilot package

Feature flags:

```env
NEXT_PUBLIC_REMINDER_ASSISTANT_ENABLED=false
LINE_CLASSROOM_REMINDER_ENABLED=false
REMINDER_SCHEDULER_ENABLED=false
```

## Open Questions

- จะให้ "น้องกริ่งทวง" เป็น feature เฉพาะ PLUS/Pro หรือเปิดบางส่วนให้ free?
- จะทวงผ่าน LINE group อย่างเดียว หรือมี private LINE/student dashboard notification ด้วย?
- ครูควรเห็นรายชื่อนักเรียนที่ยังไม่ส่งในข้อความทวงหรือไม่?
- Reward สำหรับส่งงานควรเป็น Points, Gold, EXP หรือ Quest progress เป็นหลัก?
- งานประเภท manual assignment ที่ยังไม่ตรวจควรถือว่า "ส่งสำเร็จ" สำหรับ reward หรือรอครูอนุมัติ?

## Recommended First Implementation Slice

เริ่มจาก slice เล็กที่สุดที่ให้คุณค่าทันที:

1. เพิ่ม helper สร้าง reminder summary จาก assignment overview
2. เพิ่ม panel "น้องกริ่งทวง" ใน teacher dashboard
3. เพิ่ม copy reminder message
4. เพิ่ม tests สำหรับ overdue/due-soon/missing count
5. ทำ manual QA บน classroom fixture

ยังไม่ควรเริ่มจาก scheduled LINE เพราะมีความเสี่ยงเรื่อง spam, privacy, group binding และ idempotency มากกว่า

## Progress Note 1

Started on 2026-06-01:

- Added reminder candidate helpers in `src/components/dashboard/assignment-command-center.helpers.ts`
- Added copyable reminder message generation for urgent assignments with missing submissions
- Added the first "Nong Gring Tuang" panel inside `AssignmentCommandCenter`
- The panel appears when the assignment overview has overdue or due-soon assignments with missing submissions
- Teachers can copy a ready-to-send reminder message and jump directly to the highlighted assignment
- Added regression coverage in `src/__tests__/assignment-command-center-helpers.test.ts`

Validation:

- Passed: `npm.cmd test -- src/__tests__/assignment-command-center-helpers.test.ts src/__tests__/teacher-assignment-overview-service.test.ts src/__tests__/teacher-assignments-overview-route.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\components\dashboard\assignment-command-center.tsx src\components\dashboard\assignment-command-center.helpers.ts src\__tests__\assignment-command-center-helpers.test.ts src\lib\translations.ts`
- Full `npm.cmd run lint` is currently blocked by unrelated pre-existing errors in `daily-quests`, `opencv-provider`, `EventBanner`, and `game-negamon/engine-showdown/adapter`

## Progress Note 2

Started on 2026-06-01:

- Added the first student-facing due work helper in `src/components/student/student-dashboard-assignments.helpers.ts`
- Added a "Nong Gring reminders" panel to `StudentDashboardAssignmentsTab`
- The panel highlights incomplete assignments that are overdue, due today, or due within the next 3 days
- Quiz and worksheet reminder rows link directly to the student action page
- Added focused helper coverage in `src/__tests__/student-dashboard-assignments-helpers.test.ts`

Validation:

- Passed: `npm.cmd test -- src/__tests__/student-dashboard-assignments-helpers.test.ts src/__tests__/student-dashboard-main-tabs.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\components\student\student-dashboard-assignments-tab.tsx src\components\student\student-dashboard-assignments.helpers.ts src\__tests__\student-dashboard-assignments-helpers.test.ts src\lib\translations.ts`
- Broader run with `src/__tests__/student-dashboard-page.test.ts` is blocked by an existing read-model expectation drift around `negamonSkillLoadout`

## Progress Note 3

Started on 2026-06-01:

- Added a student-facing reward preview for quiz assignments only
- The preview uses the existing `calcAssignmentEXP` formula and classroom Negamon settings
- Reminder rows and assignment cards can now show "Up to +X EXP" when Negamon is enabled
- Worksheet rewards are intentionally not previewed yet because the current worksheet submit route does not award assignment EXP
- Added helper coverage for reward preview gating in `src/__tests__/student-dashboard-assignments-helpers.test.ts`

Validation:

- Passed: `npm.cmd test -- src/__tests__/student-dashboard-assignments-helpers.test.ts src/__tests__/student-dashboard-main-tabs.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\components\student\student-dashboard-assignments-tab.tsx src\components\student\student-dashboard-assignments.helpers.ts src\__tests__\student-dashboard-assignments-helpers.test.ts src\lib\translations.ts`

## Progress Note 4

Started on 2026-06-01:

- Added real worksheet Negamon EXP awarding in `src/app/api/classrooms/[id]/assignments/[assignmentId]/worksheet/submit/route.ts`
- Rewards are limited to first-time auto-graded worksheet submissions
- Resubmissions do not grant duplicate EXP
- Worksheets with manual review items do not grant EXP during submit because the score is not final yet
- The worksheet response now includes `expBonus`
- `WorksheetClient` now shows the earned EXP on the completion screen when a reward is granted
- Added route coverage in `src/__tests__/worksheet-submit-route.test.ts`

Validation:

- Passed: `npm.cmd test -- src/__tests__/worksheet-submit-route.test.ts src/__tests__/student-dashboard-assignments-helpers.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\app\api\classrooms\[id]\assignments\[assignmentId]\worksheet\submit\route.ts src\__tests__\worksheet-submit-route.test.ts src\components\student\worksheet-client.tsx src\components\student\student-dashboard-assignments.helpers.ts src\__tests__\student-dashboard-assignments-helpers.test.ts src\lib\translations.ts`

## Progress Note 5

Started on 2026-06-01:

- Updated quiz submit responses to include `expBonus`
- Already-submitted quiz responses return `expBonus: 0` so clients do not show a duplicate reward
- `QuizClient` now shows earned EXP on the completion screen when the backend awards it
- Added route coverage in `src/__tests__/quiz-step-routes.test.ts`

Validation:

- Passed: `npm.cmd test -- src/__tests__/quiz-step-routes.test.ts src/__tests__/worksheet-submit-route.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\app\api\classrooms\[id]\assignments\[assignmentId]\submit\route.ts src\components\student\quiz-client.tsx src\__tests__\quiz-step-routes.test.ts src\lib\translations.ts`

## Progress Note 6

Started on 2026-06-01:

- Added manual in-app assignment reminders at `POST /api/classrooms/[id]/assignments/[assignmentId]/reminders`
- The route is teacher-only and verifies classroom ownership before sending
- Reminders target only students who do not have a submission for that assignment
- Reminder links deep-link students to quiz, worksheet, or their student dashboard depending on assignment type
- Added a "Send in-app" action to the teacher "Nong Gring Tuang" panel
- Added English fallback notification copy for assignment reminder i18n keys
- Added route coverage in `src/__tests__/assignment-reminders-route.test.ts`

Validation:

- Passed: `npm.cmd test -- src/__tests__/assignment-reminders-route.test.ts src/__tests__/assignment-command-center-helpers.test.ts src/__tests__/teacher-assignment-overview-service.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\app\api\classrooms\[id]\assignments\[assignmentId]\reminders\route.ts src\__tests__\assignment-reminders-route.test.ts src\components\dashboard\assignment-command-center.tsx src\lib\translations.ts`
- Reconfirmed after copy update: `npm.cmd test -- src/__tests__/assignment-reminders-route.test.ts src/__tests__/assignment-command-center-helpers.test.ts`

## Progress Note 7

Started on 2026-06-01:

- Added LINE command shell for "น้องกริ่งทวง" in `src/lib/line-bot/commands.ts`
- Supported MVP commands:
  - `กริ่งช่วย`
  - `สรุปงาน`
  - `ทวงงาน`
  - `ผูกห้อง <รหัสห้อง>`
  - English aliases: `gring help`, `gring summary`, `gring remind`, `bind classroom <code>`
- Updated `src/lib/line-bot/handlers.ts` so classroom commands return clear MVP responses
- `สรุปงาน` and `ทวงงาน` currently require classroom binding before reading real classroom data
- `ผูกห้อง` currently acknowledges the code but does not persist binding yet
- Cleaned the legacy LINE debt command copy while preserving legacy command support
- Added coverage in `src/lib/line-bot/__tests__/commands.test.ts` and `src/lib/line-bot/__tests__/handlers.test.ts`

Validation:

- Passed: `npm.cmd test -- src/lib/line-bot/__tests__/commands.test.ts src/lib/line-bot/__tests__/handlers.test.ts src/__tests__/line-webhook-route.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\lib\line-bot\commands.ts src\lib\line-bot\handlers.ts src\lib\line-bot\__tests__\commands.test.ts src\lib\line-bot\__tests__\handlers.test.ts src\__tests__\line-webhook-route.test.ts`

## Progress Note 8

Started on 2026-06-01:

- Added persistent LINE group to classroom binding on `LineBotGroup`
- Added `LINE_CLASSROOM_BINDING_SECRET` gating for the `bind classroom <classroomId> <secret>` command
- Updated classroom LINE commands so `gring summary` / `สรุปงาน` read real visible assignments, students, and submissions
- Updated classroom LINE reminders so `gring remind` / `ทวงงาน` posts a privacy-safe group reminder with assignment names and missing counts only
- Kept legacy debt commands available while separating them from the classroom reminder assistant path
- Updated LINE command and handler tests for the real binding flow

Validation:

- Passed: `.\node_modules\.bin\prisma.cmd validate`
- Passed: `npm.cmd test -- src/lib/line-bot/__tests__/commands.test.ts src/lib/line-bot/__tests__/handlers.test.ts src/__tests__/line-webhook-route.test.ts`
- Passed: `.\node_modules\.bin\eslint.cmd src\lib\line-bot\commands.ts src\lib\line-bot\handlers.ts src\lib\line-bot\repository.ts src\lib\line-bot\config.ts src\lib\line-bot\__tests__\commands.test.ts src\lib\line-bot\__tests__\handlers.test.ts`
- Passed: `npm.cmd run predev`
