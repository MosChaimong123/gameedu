# 37) Online Learning Platform Roadmap

Last updated: 2026-06-13
Status: Planning

## Goal

พัฒนาระบบของ GameEdu จากชุดเครื่องมือในห้องเรียนที่แข็งแรงอยู่แล้ว ไปสู่ `ระบบเรียนออนไลน์` ที่ครูเปิดใช้ได้ง่าย นักเรียนเรียนต่อเนื่องได้จริง และผู้บริหารติดตามผลได้ โดยไม่ทำให้ flow หลักที่มีอยู่แล้วกระจัดกระจายมากขึ้น

เป้าหมายของแผนนี้ไม่ใช่สร้าง LMS ใหม่ทั้งก้อนในครั้งเดียว แต่คือการจัดโครงให้ระบบปัจจุบันค่อย ๆ เชื่อมกันเป็นประสบการณ์เดียว:

- สอน
- มอบหมายงาน
- ทำกิจกรรม
- ตรวจ
- ติดตาม
- ทวงงาน
- ดูความก้าวหน้า
- สื่อสารกับนักเรียน/ผู้ปกครอง

## Product Question

คำถามหลักของแผนนี้คือ:

`ถ้าครูใช้ GameEdu เป็นศูนย์กลางการสอนออนไลน์ทั้งคาบ ทั้งสัปดาห์ และทั้งเทอม ระบบต้องมีอะไรบ้าง และควรพัฒนาอะไรก่อนหลัง`

## Current Foundation In Our Codebase

ฐานที่เรามีอยู่แล้ว และควรใช้ต่อแทนการเริ่มใหม่:

### Classroom Core

- classroom dashboard
- roster / student management
- points / leaderboard / attendance
- analytics พื้นฐาน

อ้างอิง:

- `docs/system-plans/02-classroom-core.md`
- `src/components/classroom/classroom-dashboard.tsx`
- `src/app/api/classrooms/[id]/`

### Assignment And Quiz

- assignment / quiz / manual score flow
- student submission flow
- teacher scoring and review

อ้างอิง:

- `docs/system-plans/04-assignment-quiz-manual-score.md`
- `src/app/api/classrooms/[id]/assignments/`

### Interactive Worksheet

- worksheet builder
- worksheet player
- auto grading + manual review
- export + analytics พื้นฐาน

อ้างอิง:

- `docs/system-plans/16-interactive-worksheet.md`
- `src/components/classroom/worksheet-builder.tsx`
- `src/components/student/worksheet-client.tsx`

### Lesson Layer

- lesson content
- lesson quiz generation / completion
- lesson progress export

อ้างอิง:

- `src/app/api/lessons/[id]/`
- `src/app/api/student/[code]/lessons/`

### Classroom Communication And Follow-up

- LINE classroom binding
- manual reminder
- auto reminder
- assignment-level follow-up

อ้างอิง:

- `docs/system-plans/33-nong-gring-line-assignment-roadmap.md`
- `docs/system-plans/36-nong-gring-line-auto-reminder-simplification.md`
- `src/components/classroom/classroom-line-assignment-panel.tsx`

### Social / Board / Media

- classroom board
- media library
- teaching media usage tracking

อ้างอิง:

- `docs/system-plans/11-board-classroom-social.md`
- `src/lib/actions/board-actions.ts`
- `src/lib/actions/teaching-media-actions.ts`

## External Benchmark Snapshot

เราใช้แนวคิดจากระบบหลักในตลาด เพื่อดูว่าอะไรคือ baseline ที่ครูคาดหวังจริงในปี 2026

### Google Classroom

จุดเด่นที่ควรเรียนรู้:

- งาน มอบหมาย ตรวจ และ feedback อยู่ใน flow เดียว
- เชื่อมเครื่องมือ Google Workspace และ add-ons ได้แน่น
- มี guardian summary และภาพรวมความคืบหน้า
- analytics กับ class organization ทำให้ครูจัดการทั้งห้องได้เร็ว

### Canvas

จุดเด่นที่ควรเรียนรู้:

- gradebook แข็งแรงมาก
- `Message Students Who...` เป็นตัวอย่างที่ดีของ action-based intervention
- blueprint course / module / outcomes เหมาะกับการใช้ซ้ำทั้งโรงเรียน
- integration และ reporting พร้อมสำหรับ scale ใหญ่

### Moodle

จุดเด่นที่ควรเรียนรู้:

- ยืดหยุ่นสูงและปรับตามวิธีสอนหลายแบบ
- role / activity / assessment ละเอียด
- accessibility และ extensibility ดี
- เหมาะกับระบบที่ต้องการ configurability สูง

### Microsoft Teams For Education

จุดเด่นที่ควรเรียนรู้:

- การสื่อสารกับการเรียนไม่ถูกแยกคนละโลก
- chat / meeting / files / assignments อยู่ใกล้กัน
- เหมาะกับบริบทห้องเรียนที่ครูต้องสลับระหว่างสอนสดกับมอบงาน

## What These Benchmarks Mean For GameEdu

บทเรียนที่ควรหยิบมา ไม่ใช่การ copy หน้าตาหรือ feature list ตรง ๆ:

1. ครูต้องทำงานหลักจบได้จากหน้าเดียวหรือ flow เดียว
2. งาน สื่อสาร คะแนน และความคืบหน้า ต้องเชื่อมกัน
3. นักเรียนต้องเห็นว่า “วันนี้ต้องทำอะไร” แบบชัดมาก
4. ระบบ follow-up ต้องแนะนำสิ่งที่ควรทำต่อ ไม่ใช่แค่แสดงข้อมูล
5. ผู้บริหารต้องมี summary ระดับห้องเรียน ระดับครู และระดับการใช้งานระบบ

## Product Direction For Our System

ทิศทางที่เหมาะกับ GameEdu คือ `classroom-first online learning platform`

ไม่ใช่เริ่มจาก course marketplace หรือ content warehouse ขนาดใหญ่ก่อน แต่เริ่มจาก:

- ห้องเรียน
- งาน
- บทเรียน
- กิจกรรม
- การติดตาม
- การสื่อสาร

แล้วค่อยยกระดับไปสู่:

- reusable course structure
- reusable content library
- school-level analytics
- parent visibility

## North Star User Flows

ระบบควรรองรับ 6 flow หลักให้ดีมากก่อน

### 1. Teacher Weekly Teaching Flow

ครูควรทำสิ่งนี้ได้ลื่น:

- เปิดห้องเรียน
- วางบทเรียนของสัปดาห์
- แนบสื่อ
- สร้างงาน/quiz/worksheet
- กำหนดวันส่ง
- ส่งให้ห้อง
- ติดตามว่าใครยังไม่ทำ
- ทวงงาน
- ตรวจ
- ประกาศคะแนน/feedback

### 2. Student Daily Learning Flow

นักเรียนควรทำสิ่งนี้ได้ชัด:

- เข้ามาแล้วเห็นงานที่ต้องทำวันนี้
- เข้าเรียนบทเรียนหรือใบงานได้ทันที
- รู้ว่างานไหนค้าง งานไหนใกล้ครบกำหนด
- ส่งงานแล้วเห็นสถานะ
- เห็นคะแนน/feedback/รางวัลแบบเข้าใจง่าย

### 3. Teacher Intervention Flow

ครูควรทำ intervention ได้เร็ว:

- ดูว่านักเรียนกลุ่มไหนยังไม่เริ่ม
- ดูว่าใครเริ่มแล้วแต่ไม่จบ
- กดทวงงาน/ประกาศคะแนน/ส่งข้อความตามกลุ่มเป้าหมาย

### 4. Assessment Flow

ระบบประเมินต้องรองรับ:

- quiz อัตโนมัติ
- worksheet แบบ interactive
- manual score
- OMR
- blended grading ในห้องเดียวกัน

### 5. Family / Parent Visibility Flow

ในอนาคตควรต่อยอดไปสู่:

- guardian summary
- สถานะงานค้าง
- คะแนนสำคัญ
- พฤติกรรม/การเข้าเรียนแบบเลือกแชร์ได้

### 6. Leadership / Admin Flow

ระดับโรงเรียนควรเห็น:

- การใช้งานรายครู
- completion rate รายห้อง
- on-time submission
- engagement กับ lesson / worksheet / quiz

## Gap Analysis

### What We Already Have Strength In

- classroom-centric architecture
- assignment / quiz runtime
- worksheet runtime
- LINE follow-up foundation
- classroom analytics foundation
- board / media building blocks

### What Is Still Fragmented

- lesson, assignment, worksheet, board, LINE ยังไม่ได้ถูกร้อยเป็น journey เดียว
- หน้า teacher ยังเน้นเครื่องมือแยกส่วนมากกว่า weekly teaching workflow
- หน้า student ยังควรรวม “วันนี้ต้องทำอะไร” ให้เป็นศูนย์กลางกว่านี้
- gradebook / progressbook ระดับใช้งานทุกวันยังไม่เด่นพอ
- intervention suggestions ยังไม่พอ
- admin / school analytics ยังไม่เป็น product layer เต็มรูป

### What Is Missing

- learning home / agenda ของนักเรียน
- course/module sequencing ระดับบทเรียนต่อเนื่อง
- teacher planning surface ระดับสัปดาห์
- unified gradebook
- parent-facing summary contract
- school-level adoption / learning analytics

## System Architecture Direction

ชั้นระบบที่ควรแยกให้ชัดขึ้น:

### Layer 1: Classroom Runtime

สิ่งที่มีแล้วและต้องรักษาเสถียรภาพ:

- roster
- assignments
- submissions
- points
- attendance
- reminders

### Layer 2: Learning Experience

สิ่งที่ควรทำให้เป็น product surface ชัด:

- lesson player
- worksheet player
- quiz player
- task agenda
- progress tracker

### Layer 3: Teaching Operations

- weekly planner
- gradebook
- review queue
- intervention center
- communication center

### Layer 4: Reusable Content

- question sets
- worksheet templates
- lesson blocks
- media library
- classroom-to-classroom reuse

### Layer 5: School Intelligence

- teacher analytics
- classroom health
- completion trends
- risk flags
- adoption metrics

## Work Plan

### Phase 1: Platform Baseline Audit And Product Contract

Goal: freeze product language and map current systems into one online-learning model before building new UI

Checklist:

- inventory every current learning surface:
  - classroom
  - assignment
  - quiz
  - worksheet
  - lesson
  - board
  - LINE reminder
  - media library
- define canonical nouns:
  - class
  - lesson
  - task
  - activity
  - submission
  - review
  - grade
  - announcement
- define who each surface serves:
  - teacher
  - student
  - admin
  - future guardian
- freeze product contract for:
  - learning agenda
  - gradebook
  - progress
  - intervention

Deliverable:

- inventory note
- canonical vocabulary
- cross-system product map

### Phase 2: Student Learning Home

Goal: make the student side feel like a true online learning home, not a set of separate pages

Checklist:

- create one student learning home with:
  - today
  - due soon
  - overdue
  - recently graded
  - lesson continuation
- unify entry points for:
  - lesson
  - assignment
  - worksheet
  - quiz
- surface clear status states:
  - not started
  - in progress
  - submitted
  - reviewed
  - overdue
- add “continue where you left off”

Deliverable:

- student agenda/home
- unified task cards

### Phase 3: Teacher Weekly Teaching Workspace

Goal: help teachers run a week of teaching from one surface

Checklist:

- create a weekly teaching workspace
- show:
  - upcoming lessons
  - active assignments
  - pending review
  - students at risk
  - reminder status
- support quick actions:
  - create assignment
  - attach media
  - announce
  - remind
  - open gradebook

Deliverable:

- teacher weekly workspace
- quick-create and quick-follow-up actions

### Phase 4: Unified Gradebook And Review Queue

Goal: merge score visibility across quizzes, worksheets, manual scores, and lesson outcomes

Checklist:

- define unified grade row contract
- merge:
  - quiz score
  - worksheet score
  - manual score
  - OMR score
  - lesson completion score where applicable
- build teacher review queue by urgency:
  - waiting manual review
  - late but submitted
  - unsubmitted near deadline
- add student-facing grade detail view

Deliverable:

- unified gradebook
- unified review queue

### Phase 5: Learning Sequence And Module Structure

Goal: move from isolated tasks to structured learning progression

Checklist:

- define module / unit / lesson sequencing contract
- allow teachers to group lessons and tasks into learning sequences
- support prerequisites or recommended order
- show progress at:
  - task level
  - lesson level
  - module level

Deliverable:

- module sequence model
- learner progress rail

### Phase 6: Intervention And Communication Center

Goal: turn reminders and class communication into a teacher-friendly action center

Checklist:

- unify:
  - LINE reminder
  - board announcement
  - targeted follow-up
  - score announcement
- add smart segments:
  - not started
  - in progress
  - overdue
  - recently graded
  - low score
- add action-based workflows inspired by systems like Canvas:
  - message students who did not submit
  - remind students who scored below threshold
  - announce released grades

Deliverable:

- communication center
- target group actions

### Phase 7: Reusable Content And School-wide Distribution

Goal: reduce repeated teacher setup work

Checklist:

- connect question sets, worksheet templates, lessons, and media library
- support duplicate / reuse / import into another classroom
- define share scope:
  - private
  - same teacher
  - school template
- add usage metadata and last-used context

Deliverable:

- reusable content layer
- classroom-to-classroom copy flow

### Phase 8: Parent / Guardian Summary

Goal: provide optional visibility for family support without overcomplicating classroom runtime

Checklist:

- define guardian-safe data contract
- choose what can be shown:
  - missing work
  - due soon
  - recent grades
  - attendance summary
- support periodic digest first before full portal

Deliverable:

- guardian summary contract
- MVP digest plan

### Phase 9: School Analytics And Leadership Dashboard

Goal: give school leaders visibility into usage and learning health

Checklist:

- aggregate by:
  - teacher
  - classroom
  - grade level
  - assignment type
- show:
  - active classrooms
  - submission rate
  - review turnaround
  - lesson completion
  - reminder effectiveness
- define drill-down paths to classroom detail

Deliverable:

- leadership analytics layer
- school health dashboard

### Phase 10: QA, Security, Accessibility, And Release Gate

Goal: ensure the online-learning layer is trustworthy before broad rollout

Checklist:

- validate auth/role boundaries across all teacher/student/admin surfaces
- run accessibility pass on student and teacher critical flows
- test mobile and low-resolution usage on student side
- test late work, resubmission, review, and reminder edge cases
- verify build, route, and regression suites across connected systems

Deliverable:

- release checklist
- rollout gate

## Suggested Implementation Order

แนะนำลำดับนี้เพื่อให้เห็นผลเร็วและไม่ชนระบบเดิมแรงเกินไป:

1. Phase 1: Platform Baseline Audit And Product Contract
2. Phase 2: Student Learning Home
3. Phase 3: Teacher Weekly Teaching Workspace
4. Phase 4: Unified Gradebook And Review Queue
5. Phase 6: Intervention And Communication Center
6. Phase 5: Learning Sequence And Module Structure
7. Phase 7: Reusable Content And School-wide Distribution
8. Phase 9: School Analytics And Leadership Dashboard
9. Phase 8: Parent / Guardian Summary
10. Phase 10: QA, Security, Accessibility, And Release Gate

## MVP Recommendation

ถ้าจะเลือกเวอร์ชันที่คุ้มสุดสำหรับรอบแรกของ “ระบบเรียนออนไลน์” ให้ทำก่อนแค่นี้:

- student learning home
- teacher weekly workspace
- unified gradebook/review queue
- intervention center ที่เชื่อม LINE + announcement

เหตุผล:

- ครูจะรู้สึกว่าระบบ “ใช้งานสอนจริง” ขึ้นทันที
- นักเรียนจะเห็นงานและความคืบหน้าชัดขึ้นทันที
- ใช้ฐาน assignment / worksheet / reminder ที่มีอยู่แล้วได้มาก

## Acceptance Criteria

ระบบถือว่าเริ่มเป็น online learning platform จริง เมื่อ:

- นักเรียนเข้าแล้วเห็นงานที่ต้องทำและงานค้างจากจุดเดียว
- ครูวางงาน ติดตาม ตรวจ และทวงงานได้จาก flow ที่ต่อเนื่อง
- คะแนนและความคืบหน้าไม่แยกคนละระบบในสายตาผู้ใช้
- lesson, worksheet, quiz, assignment เชื่อมกันเป็น journey เดียว
- การสื่อสารกับการติดตามผลใช้ข้อมูลชุดเดียวกัน
- ผู้บริหารดูภาพรวมการใช้งานและผลการเรียนได้โดยไม่ต้องเปิดหลายเครื่องมือ

## Risks

### Risk 1: Product Surface โตเร็วกว่า Runtime Contract

Mitigation:

- freeze contract ก่อนขยาย UI
- หลีกเลี่ยงสร้าง dashboard ใหม่โดยยังไม่สรุป source of truth

### Risk 2: ระบบดูเหมือนเชื่อมกัน แต่ข้อมูลจริงยังแยกกัน

Mitigation:

- ทำ canonical status model สำหรับ task / submission / review / grade
- ลด fallback logic ระหว่าง lesson, assignment, worksheet

### Risk 3: ครูรู้สึกว่ามี feature เยอะขึ้น แต่ใช้งานจริงช้าลง

Mitigation:

- ออกแบบตาม weekly teacher workflow
- ใช้ quick actions และ preset-heavy interactions

### Risk 4: Student Surface หนักเกินไปบนมือถือ

Mitigation:

- mobile-first ที่ student side
- desktop-first เฉพาะ teacher planning / analytics

### Risk 5: Parent/Admin Layer มาก่อน Core Learning Flow

Mitigation:

- ทำครูและนักเรียนให้แน่นก่อน
- parent/admin ใช้ derived data ไม่สร้าง runtime ใหม่แยก

## Release Gate

ยังไม่ควรเรียกระบบนี้ว่า “ระบบเรียนออนไลน์ของเรา” แบบเต็มตัว ถ้ายังขาดข้อใดข้อหนึ่ง:

- ไม่มี student learning home ที่ใช้งานจริง
- ครูยังต้องกระโดดหลายหน้าเพื่อสอน-มอบหมาย-ติดตาม-ตรวจ
- คะแนนยังไม่มี unified gradebook
- reminder/announcement ยังไม่เชื่อมกับสถานะงานจริง
- lesson กับ assignment ยังเป็นคนละโลกในสายตาผู้ใช้

## References

External benchmark sources used for this plan:

- Google Classroom official product page:
  - https://edu.google.com/workspace-for-education/products/classroom/
- Canvas official product page:
  - https://www.instructure.com/canvas
- Moodle LMS official product page:
  - https://moodle.com/products/lms/
- Microsoft Teams for Education official product page:
  - https://www.microsoft.com/en-us/education/products/teams

Internal system references:

- `docs/system-plans/02-classroom-core.md`
- `docs/system-plans/04-assignment-quiz-manual-score.md`
- `docs/system-plans/11-board-classroom-social.md`
- `docs/system-plans/16-interactive-worksheet.md`
- `docs/system-plans/33-nong-gring-line-assignment-roadmap.md`
- `docs/system-plans/36-nong-gring-line-auto-reminder-simplification.md`
