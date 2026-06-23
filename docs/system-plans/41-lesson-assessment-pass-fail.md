# Lesson And Course Assessment Foundation

แผนนี้สรุป foundation ของระบบ assessment สำหรับ lesson และ course โดยอธิบายเฉพาะโครงสร้างที่ระบบใช้งานอยู่ในปัจจุบัน: course assessment สำหรับคอร์ส และ topic assessment สำหรับบทเรียน

## Goal

ให้ครูสร้างแบบทดสอบจากเนื้อหาการเรียนได้ใน workflow เดียว นักเรียนทำแบบทดสอบแล้วรู้ผลผ่าน/ไม่ผ่านทันที และครูเห็นผลรวมเพื่อใช้ติดตามนักเรียนที่ยังไม่ผ่าน

## Active System Inventory

- `CourseContentV1` มี `assessments` สำหรับ `pretest`, `checkpoint`, `posttest`
- `CourseAssessmentV2` รองรับ `questionSetId`, `moduleId`, `passScore`, `allowRetake`
- student course routes:
  - `/api/student/[code]/courses/[courseId]/assessments/[assessmentId]`
  - `/api/student/[code]/courses/[courseId]/assessments/[assessmentId]/attempt`
- teacher course results route:
  - `/api/classrooms/[id]/courses/[courseId]/assessment-results`
- lesson system ใช้ `topic.assessment` ใน Lesson V2

## Product Rules

- แบบทดสอบต้องสร้างจากเนื้อหาบทเรียนหรือหัวข้อที่เลือก
- แบบทดสอบต้องผูกกับ `QuestionSet`
- เกณฑ์ผ่านกำหนดเป็นคะแนนจริง
- นักเรียนเห็นผล `ผ่าน` / `ไม่ผ่าน` หลังส่งคำตอบ
- ถ้า `allowRetake` เปิดอยู่ ต้องทำซ้ำได้
- ถ้า `allowRetake` ปิดอยู่ ต้อง submit ซ้ำไม่ได้
- ครูต้องเห็นรายชื่อนักเรียนที่ยังไม่ผ่านเพื่อช่วยสอนซ้ำ
- reward/certificate ต้องนับเฉพาะ assessment ที่ผ่านจริง

## Data Direction

```ts
type CourseAssessmentV2 = {
  id: string
  type: "pretest" | "checkpoint" | "posttest"
  title: string
  questionSetId?: string
  moduleId?: string
  passScore?: number
  allowRetake?: boolean
}

type LessonAssessmentSource = {
  sourceType: "topic" | "module" | "course"
  topicId?: string
  moduleId?: string
  courseId?: string
  lessonId?: string
}
```

## Phase 1: Assessment Source Contract

Goal: ให้ระบบรู้ว่าแบบทดสอบสร้างจากเนื้อหาส่วนไหน

Checklist:

- เพิ่ม type สำหรับ assessment source
- map assessment กลับไปยัง lesson/topic/module/course ได้
- เพิ่ม metadata ใน question set
- validator กัน assessment ที่ไม่มี source
- tests สำหรับ valid/invalid source payload

Status: done

## Phase 2: AI Assessment Generation API

Goal: ให้ AI สร้างแบบทดสอบจากบทเรียนที่เลือก

Checklist:

- สร้าง `POST /api/ai/lessons/generate-assessment`
- รับ `lessonId`, `topicId`, `courseId`, `moduleId`
- ดึง source content จาก server
- จำกัด prompt ให้สร้างจาก objectives และ section content
- validate JSON response
- targeted tests สำหรับ invalid response / missing source

Status: done

## Phase 3: Teacher Assessment Builder

Goal: ให้ครูเลือกสร้างแบบทดสอบจาก lesson/topic/module/course ได้ในหน้า builder

Checklist:

- เพิ่มปุ่มสร้างแบบทดสอบใน lesson edit และ course builder
- ตั้งจำนวนข้อ, ระดับความยาก, pass score, retake
- preview และแก้ไขคำถามก่อนบันทึก
- save เป็น `QuestionSet`
- attach `questionSetId` เข้ากับ assessment object ที่เกี่ยวข้อง

Status: done

## Phase 4: Student Quiz Player

Goal: ให้นักเรียนทำแบบทดสอบแล้วเห็นผลชัดเจน

Checklist:

- แสดง assessment ใน student course player
- โหลดคำถามจาก route ปัจจุบัน
- submit คำตอบไป attempt route ปัจจุบัน
- แสดง score, maxScore, passScore, passed
- รองรับ retake ตาม policy
- กันการส่งคำตอบไม่ครบ

Status: done

## Phase 5: Pass/Fail Progress Rules

Goal: ผูกผลสอบเข้ากับ progress ให้ชัด

Checklist:

- course complete ต้องตรวจ required assessments
- module complete ต้องตรวจ checkpoint ที่เกี่ยวข้อง
- certificate eligibility ใช้ `passedAssessmentIds`
- progress payload มี `assessmentStatus`
- student shelf/player บอก next action ได้

Status: done

## Phase 6: Teacher Results And Intervention

Goal: ให้ครูเห็นผลสอบและช่วยนักเรียนที่ยังไม่ผ่านได้

Checklist:

- summary: submitted, passed, failed, not started
- แสดงคะแนนล่าสุดและจำนวนครั้งที่ทำ
- filter เฉพาะนักเรียนไม่ผ่าน
- export CSV
- แสดงข้อที่ผิดบ่อย
- quick action สำหรับ follow-up

Status: done

## Phase 7: Topic Assessment For Lessons

Goal: ให้ lesson assessment ใช้ pattern เดียวกับ lesson player ปัจจุบัน

Checklist:

- ใช้ topic-level assessment ใน lesson system
- topic แต่ละหัวข้อมี assessment panel ของตัวเอง
- student lesson page แสดง assessment ตามหัวข้อ
- progress แยก pass/fail รายหัวข้อ
- tests ครอบคลุม lesson topic assessment flow

Status: done

## Phase 8: Rewards And Certificates

Goal: ให้การผ่านแบบทดสอบมีผลต่อ reward และ certificate อย่างควบคุมได้

Checklist:

- ให้ reward เมื่อผ่านตามเงื่อนไข
- กัน reward farm จาก retake
- certificate ออกเฉพาะ assessment ที่ผ่าน
- teacher เห็นสถานะ reward/certificate
- audit log สำหรับ reward/certificate

Status: done

## Phase 9: QA And Release Gate

Goal: ปล่อยระบบ assessment โดยไม่ให้ flow ปัจจุบันพัง

Checklist:

- tests ของ course assessment ผ่าน
- tests ของ lesson topic assessment ผ่าน
- tests ของ publish gate ผ่าน
- manual QA สำหรับ teacher/student/results/reward
- build ผ่าน

Status: automated gate passed, manual QA checklist prepared

## Current Implementation Notes

- course assessment flow ใช้งานผ่าน course routes
- lesson assessment flow ใช้งานผ่าน topic assessment routes
- progress, reward, certificate, analytics อ่านจาก assessment contracts ที่ยัง active
- release gate ใช้ targeted tests + build + manual QA checklist

## Risks

- ถ้า AI สร้างคำถามโดยไม่ผูก source จะควบคุมคุณภาพไม่ได้
- ถ้า passScore ไม่ชัด นักเรียนจะไม่รู้เกณฑ์ผ่าน
- ถ้า retake ไม่กัน reward ซ้ำ จะเกิดการรับรางวัลซ้ำ
- ถ้า teacher report ไม่ชัด ครูจะช่วยนักเรียนไม่ตรงจุด

## Definition Of Done

- ครูสร้างแบบทดสอบจากเนื้อหาได้
- แบบทดสอบถูกบันทึกเป็น QuestionSet
- แบบทดสอบผูกกับ course/topic assessment ได้
- นักเรียนทำแบบทดสอบและเห็นผลผ่าน/ไม่ผ่าน
- ระบบบันทึก attempt และคะแนนได้
- progress/certificate/reward ใช้ผลผ่านจริง
- ครูเห็นรายงานนักเรียนที่ผ่านและไม่ผ่าน
