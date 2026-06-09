# 36) Nong Gring LINE Auto Reminder Simplification

## Goal

ทำให้ระบบ `LINE auto reminder` ใช้งานได้จริงสำหรับครูทั่วไป โดยลดความซับซ้อนของหน้าตั้งค่า, ทำให้รู้ทันทีว่าระบบพร้อมส่งหรือไม่, และมีวิธีทดสอบ/ตรวจสอบได้โดยไม่ต้องเดา

## Problem Summary

อาการที่พบจากของเดิม:

- เปิดใช้งานยาก ต้องตีความ checkbox หลายอันเอง
- ไม่รู้ว่าเปิดแล้วระบบจะส่งเมื่อไร ส่งให้ใคร และส่งข้อความแบบไหน
- ถ้าระบบไม่ส่ง ไม่มีเหตุผลที่ชัดเจนให้ครูเห็น
- ประวัติการส่งอ่านยากและไม่ช่วย debug
- flow การตั้งค่า, readiness, ทดสอบ, และประวัติยังแยกกันเกินไป

## Product Direction

เปลี่ยนจาก "หน้าตั้งค่าทางเทคนิค" เป็น "ตัวช่วยเปิดระบบทวงงานอัตโนมัติ"

หลักการออกแบบ:

1. เปิดใช้งานได้ในไม่เกิน 3 คลิก
2. มี preset ให้เลือกก่อน ไม่บังคับให้ตั้งค่าละเอียดตั้งแต่แรก
3. ก่อนบันทึกต้องเห็นสรุปว่าจะเกิดอะไรขึ้น
4. ถ้าไม่พร้อมใช้งาน ต้องบอก blocker ที่แก้ได้ทันที
5. ต้องมีปุ่มทดสอบโดยไม่ต้องรอ cron จริง

## Target UX

หน้าต่างใหม่ควรมี 6 ส่วน:

1. `สถานะพร้อมใช้งาน`
2. `เปิด auto reminder ห้องนี้`
3. `เลือกรูปแบบสำเร็จรูป`
4. `สรุปการทำงาน + preview`
5. `ประวัติการส่งล่าสุด`
6. `ปุ่มหลัก: บันทึกและเปิดใช้งาน / ทดสอบก่อนเปิด`

## Preset Model

### Preset A: แนะนำ

- ก่อนกำหนด 1 วัน
- วันครบกำหนด
- เลยกำหนด 1 วัน

เหมาะกับครูส่วนใหญ่และควรเป็น default

### Preset B: เบา

- วันครบกำหนด
- เลยกำหนด 1 วัน

### Preset C: เข้ม

- ก่อนกำหนด 1 วัน
- วันครบกำหนด
- เลยกำหนด 1 วัน
- สรุปรายสัปดาห์

### Preset D: กำหนดเอง

เปิด checkbox ย่อยเมื่อผู้ใช้ต้องการปรับเองจริง ๆ

## Runtime Contract

ระบบใหม่ควรใช้ contract ชัดเจนสำหรับทั้ง UI และ backend:

- `enabled`
- `preset`
- `triggers`
- `nextRunAt`
- `lastRunAt`
- `lastRunStatus`
- `lastErrorCode`
- `lastErrorMessage`
- `eligibleAssignmentCount`
- `eligibleStudentCount`
- `readiness`

`readiness` ควรแตกได้อย่างน้อย:

- `line_group_missing`
- `no_linked_students`
- `no_assignments_with_deadline`
- `auto_reminder_disabled`
- `worker_unavailable`
- `ready`

## Work Plan

### Phase 1: Baseline Audit And Rule Freeze

Goal: เข้าใจ flow ปัจจุบันทั้งหมดก่อนเปลี่ยน UX

Checklist:

- ไล่เส้นทาง setting save -> schedule -> dispatch -> history
- ตรวจว่าฟิลด์ setting ไหนถูกใช้จริง
- สรุป blocker ที่ทำให้ "เปิดแล้วไม่ส่ง"
- freeze behavior ปัจจุบันที่ยังต้องรองรับ
- ระบุจุดที่ manual send กับ auto send ใช้ logic แยกกัน

Deliverable:

- audit note ของ flow ปัจจุบัน
- รายการ failure modes
- contract ใหม่สำหรับ auto reminder

#### Phase 1 Audit Findings

##### Current Runtime Flow

1. Teacher UI loads per-classroom reminder setting from:
   - `src/app/api/classrooms/[id]/line-reminder-settings/route.ts`
2. Teacher UI loads recent delivery history from:
   - `src/app/api/classrooms/[id]/line-reminder-deliveries/route.ts`
3. Teacher saves setting by `PATCH` to the same settings route.
4. Scheduled execution enters from:
   - `src/app/api/jobs/line-reminders/route.ts`
5. Cron route calls:
   - `runLineAutoReminders()` in `src/lib/line-bot/auto-reminders.ts`
6. Auto reminder runtime:
   - scans active `lineBotGroup` rows with a bound classroom
   - loads per-classroom reminder settings
   - builds candidates per assignment
   - writes one `lineAssignmentReminderDelivery` row per candidate
   - pushes LINE flex
   - updates delivery status to `sent` or `failed`
7. Manual reminder flows are separate:
   - classroom-level send: `src/app/api/classrooms/[id]/line-reminders/route.ts`
   - assignment-level send: `src/app/api/classrooms/[id]/assignments/[assignmentId]/line-reminders/route.ts`

##### Active Rules In Production Code

- Data model is still checkbox-based:
  - `enabled`
  - `beforeDeadline1d`
  - `dueToday`
  - `overdue1d`
  - `weeklySummary`
  - `timezone`
- Default setting is:
  - disabled
  - before 1 day = true
  - due today = true
  - overdue 1 day = true
  - weekly summary = false
  - timezone = `Asia/Bangkok`
- Auto reminder only considers assignments that are:
  - visible
  - have a non-null deadline
  - still have missing submissions
- Auto reminder only runs for classrooms that:
  - have an active bound LINE group
  - belong to a teacher with `lineAutoReminders` access
  - have `enabled = true`
- Reminder type resolution is hard-coded by Bangkok calendar day difference:
  - `+1 day` => `before_1d`
  - `0 day` => `due_today`
  - `-1 day` => `overdue_1d`
  - `< -1 day` and Monday and weeklySummary enabled => `weekly_summary`
- Duplicate prevention is enforced by delivery uniqueness:
  - `@@unique([lineBotGroupId, assignmentId, reminderKey])`

##### Baseline Gaps And Failure Modes

- `timezone` is stored but not actually used in runtime decision-making.
  - `auto-reminders.ts` always uses Bangkok-specific date helpers.
- `weeklySummary` is not a real summary digest.
  - current behavior sends one overdue reminder per assignment on Monday.
- There is no teacher-facing readiness contract.
  - UI does not expose `nextRunAt`, `lastRunStatus`, or why a classroom is blocked.
- There is no dry-run/test-run path.
  - teachers must save and wait for cron or use manual send separately.
- Manual send and auto send do not share the same runtime contract.
  - manual classroom route builds a carousel of urgent assignments
  - manual assignment route sends one assignment bubble
  - auto route sends one candidate per assignment per reminder window
- Manual delivery logging is weaker than auto delivery logging.
  - auto route writes `pending -> sent/failed`
  - manual routes only create delivery rows and do not normalize status/error the same way
- History endpoint is too thin for diagnosis.
  - it returns recent delivery rows, but not `why skipped`, `why not eligible`, `next run`, or readiness blockers
- Settings route accepts broad normalized payloads without strong UX-level validation.
  - invalid UX combinations are technically allowed as long as JSON shape is accepted
- Ops dependency is hidden from teacher UX.
  - cron route requires LINE bot enabled + cron secret configured
  - health visibility exists only in admin health route, not in classroom UI

##### Rule Freeze For Phase 2+

Until the redesign lands, keep these rules stable:

- Keep reminder windows limited to:
  - `before_1d`
  - `due_today`
  - `overdue_1d`
  - `weekly_summary`
- Do not change duplicate-prevention semantics.
- Do not change current plan gating semantics in Phase 2 UI work.
- Treat manual send and auto send mismatch as a known baseline defect to be fixed intentionally later.
- Preserve existing setting storage fields until migration/replacement contract is ready.

##### Phase 1 Output Contract Proposal

The next-phase UI and runtime should converge on a derived audit/readiness payload containing:

- `enabled`
- `preset`
- `triggers`
- `readiness`
- `eligibleAssignmentCount`
- `eligibleStudentCount`
- `lastRunAt`
- `lastRunStatus`
- `lastErrorCode`
- `lastErrorMessage`
- `nextRunAt`
- `previewAssignments`
- `previewAudience`

### Phase 2: Preset-first UI Simplification

Goal: ให้ครูเปิดใช้งานจาก preset ได้ทันที

Checklist:

- เปลี่ยนหน้า setting เป็น preset-first layout
- ตั้ง default เป็น `แนะนำ`
- ซ่อน advanced options ไว้หลัง `กำหนดเอง`
- ลดจำนวน control หลักให้เหลือเท่าที่จำเป็น
- ทำ CTA หลักให้ชัดเจนเหลือปุ่มเดียว

Deliverable:

- modal/UI ใหม่
- preset mapping จาก UI ไป setting schema

### Phase 3: Summary And Preview

Goal: ครูต้องเห็นผลลัพธ์ก่อนกดบันทึก

Checklist:

- เพิ่ม summary ว่า trigger ไหนเปิดอยู่
- preview ว่าจะส่งให้ใครแบบไหน
- แสดงจำนวนงาน/นักเรียนที่เข้าเงื่อนไขตอนนี้
- ถ้าไม่มีอะไรจะส่ง ให้บอกเหตุผลตรง ๆ
- แสดงตัวอย่างข้อความเตือน

Deliverable:

- preview panel
- empty-state explanations ที่อ่านรู้เรื่อง

### Phase 4: Readiness Diagnostics

Goal: แก้ปัญหา "ทำไมไม่ส่ง" ให้จบในหน้าเดียว

Checklist:

- แสดงสถานะ LINE group
- แสดงจำนวนนักเรียนที่เชื่อม LINE แล้ว
- แสดงจำนวนงานที่มี deadline
- แสดง last run / next run
- แสดง blocker พร้อม CTA แก้ปัญหา
- แยก `พร้อมใช้งาน` ออกจาก `เปิดไว้แต่ยังไม่พร้อม`

Deliverable:

- readiness cards / badges
- blocker-specific messaging

### Phase 5: Delivery History Redesign

Goal: ประวัติการส่งต้องใช้ไล่ปัญหาได้จริง

Checklist:

- เปลี่ยน history เป็นรายการที่อ่านง่าย
- เพิ่มข้อมูล trigger, เวลา, งาน, จำนวนคน, สถานะ
- แยก `ส่งสำเร็จ`, `ข้าม`, `มีปัญหา`
- แสดงเหตุผลของการข้ามหรือการล้มเหลว
- เพิ่ม filter ช่วงเวลาและสถานะ

Deliverable:

- new history section
- detail view ของแต่ละรอบส่ง

### Phase 6: Test Run / Dry Run

Goal: ให้ครูลองระบบได้ทันทีโดยไม่ต้องรอ schedule

Checklist:

- เพิ่มปุ่ม `ทดสอบตอนนี้`
- รองรับ dry run ที่ไม่ส่งจริง
- แสดงผลว่า "ถ้ารันตอนนี้จะส่งอะไร"
- เพิ่มปุ่มส่งตัวอย่างให้กลุ่มที่ผูกแล้ว
- แยกผลทดสอบออกจาก history จริงถ้าจำเป็น

Deliverable:

- test-run endpoint / action
- test-run result UI

### Phase 7: Dispatch Reliability And Observability

Goal: ให้ auto reminder ส่งได้จริงและ trace ได้

Checklist:

- รวม contract ของ manual send กับ auto send ให้ชัด
- เพิ่ม idempotency กันส่งซ้ำ
- บันทึก run result แบบ machine-readable
- เพิ่ม error code มาตรฐาน
- เพิ่ม next-run calculation ที่ส่งถึง UI ได้
- เพิ่ม health/status signal ของ worker หรือ cron

Deliverable:

- stable dispatch pipeline
- standardized reminder run logs

### Phase 8: Classroom Integration

Goal: ให้ครูเห็นสถานะ auto reminder จากหน้า classroom หลักได้ทันที

Checklist:

- แสดง badge ว่า auto reminder เปิดอยู่หรือไม่
- แสดงรอบล่าสุด / รอบถัดไป
- เชื่อมกับ assignment rows ว่างานไหนเข้าเงื่อนไข auto
- เชื่อมกับ student LINE readiness
- เพิ่มทางลัดเข้าหน้าตั้งค่าจากจุดที่เกี่ยวข้อง

Deliverable:

- classroom summary integration
- assignment/student contextual entry points

## Suggested Implementation Order

ทำตามลำดับนี้เพื่อให้ได้ผลเร็วที่สุด:

1. Phase 1: Baseline Audit And Rule Freeze
2. Phase 2: Preset-first UI Simplification
3. Phase 3: Summary And Preview
4. Phase 4: Readiness Diagnostics
5. Phase 6: Test Run / Dry Run
6. Phase 5: Delivery History Redesign
7. Phase 7: Dispatch Reliability And Observability
8. Phase 8: Classroom Integration

## MVP Scope

ถ้าจะทำเวอร์ชันแรกที่คุ้มที่สุดก่อน ให้รวมแค่:

- preset 3 แบบ + custom
- readiness summary
- summary/preview
- dry run / test now
- history ที่มีสถานะกับเหตุผล

## Acceptance Criteria

ระบบถือว่าใช้งานได้เมื่อ:

- ครูเปิด auto reminder ได้ภายในไม่เกิน 3 คลิก
- ครูรู้ทันทีว่าห้องนี้พร้อมใช้งานหรือยัง
- ครูเห็น preview ก่อนบันทึก
- หากระบบไม่ส่ง มีเหตุผลชัดเจนบนหน้า
- มี test run โดยไม่ต้องรอ cron
- ประวัติการส่งบอกได้ว่า ส่งอะไร ให้ใคร เมื่อไร สำเร็จหรือไม่

## Risks

### Risk 1: UI ง่ายขึ้นแต่ logic หลังบ้านยังซับซ้อน

Mitigation:

- freeze runtime contract ก่อนแตะ UI ใหญ่
- ลดทางเลือกที่ backend ไม่รองรับจริง

### Risk 2: manual send กับ auto send ให้ผลไม่ตรงกัน

Mitigation:

- ใช้ dispatch pipeline ร่วมกันให้มากที่สุด
- แยกเฉพาะ source context และ logging

### Risk 3: ครูเข้าใจว่าเปิดแล้วต้องส่งทันที

Mitigation:

- แสดง `รอบถัดไปจะเช็กเมื่อ...`
- มีปุ่ม `ทดสอบตอนนี้`

### Risk 4: history โตเร็วและอ่านยาก

Mitigation:

- จำกัดช่วงเริ่มต้นที่ 7/30 วัน
- เพิ่ม filter และ summary ต่อรายการ

## Release Gate

ห้ามปล่อยถ้ายังมีข้อใดข้อหนึ่ง:

- เปิดใช้งานแล้วไม่รู้ว่าพร้อมส่งหรือไม่
- ไม่มี dry run/test run
- ไม่มีเหตุผลอธิบายกรณีไม่ส่ง
- ประวัติยังบอกไม่ได้ว่าระบบทำอะไรไป
- ครูต้องใช้การลองผิดลองถูกเพื่อเปิดใช้งาน
