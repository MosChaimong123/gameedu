# Lesson Topic Assessment Architecture

แผนนี้สรุปโครงสร้างแบบทดสอบบทเรียนที่ใช้งานจริงในระบบปัจจุบัน โดยยึดแนวทาง `1 topic = 1 assessment` เพื่อให้ 1 บทเรียนมีแบบทดสอบได้หลายชุดตามหัวข้อย่อย และให้ progress, reward, certificate, analytics อ่านจากโครงสร้างเดียวกัน

## Current Direction

- แบบทดสอบของบทเรียนอยู่ที่ `topic.assessment`
- 1 หัวข้อมีแบบทดสอบได้ 0 หรือ 1 ชุด
- 1 บทเรียนมีหลายหัวข้อ จึงมีหลายแบบทดสอบได้
- lesson progress summary คำนวณจากผลของ topic assessments ทั้งหมด
- student และ teacher flow ใช้ topic assessment route เดียวกัน

## Canonical Structure

```ts
type LessonTopicContentDraft = {
  id: string
  title: string
  sections: LessonSection[]
  media?: LessonTopicMedia[]
  documents?: LessonTopicDocument[]
  assessment?: TopicAssessmentV2
}

type TopicAssessmentV2 = {
  id: string
  title: string
  questionSetId: string
  passScore?: number
  allowRetake?: boolean
  source: CourseAssessmentSource
  reward?: {
    behaviorPoints?: number
    gold?: number
    achievementId?: string
    achievementTitle?: string
  }
  certificate?: {
    enabled: boolean
    title?: string
    description?: string
  }
}
```

## Product Flow

1. ครูสร้างบทเรียน
2. ครูเพิ่มหัวข้อย่อยในบทเรียน
3. ครูสร้างแบบทดสอบแยกต่อหัวข้อ
4. AI สร้าง question set จากหัวข้อที่เลือก
5. ครูตั้ง pass score, retake, reward, certificate ต่อหัวข้อ
6. นักเรียนเรียนแต่ละหัวข้อและทำแบบทดสอบของหัวข้อนั้น
7. ระบบสรุปผลการเรียนจาก video progress + topic assessment results

## Non-Goals

- หลาย assessment ต่อหัวข้อเดียว
- randomized assessment pools ต่อหัวข้อ
- adaptive difficulty
- final exam รวมหลายหัวข้อในรอบเดียว

## Phase 1: Contracts And Validators

Goal: ให้ lesson content ใช้ topic assessment เป็นโครงสร้างมาตรฐาน

Checklist:

- เพิ่ม `TopicAssessmentV2`
- เพิ่ม `assessment?: TopicAssessmentV2` ใน `LessonTopicContentDraft`
- เพิ่ม validator สำหรับ topic assessment
- เพิ่ม helper อ่าน canonical topic assessment
- เพิ่ม tests สำหรับ valid/invalid topic assessment payload

Definition of done:

- lesson content parse ได้ด้วย canonical topic assessment
- tests ของ contract ผ่าน

## Phase 2: Topic Assessment Source Rules

Goal: ให้ทุกแบบทดสอบผูกกับหัวข้อจริงแบบ trace ย้อนกลับได้

Checklist:

- ใช้ `sourceType: "topic"`
- `topicId` เป็น required field
- route generate-assessment รับ topic source แบบ canonical
- save question set พร้อม source metadata
- เพิ่ม tests สำหรับ missing topicId / invalid source

Definition of done:

- แบบทดสอบทุกชุดระบุ source topic ได้ชัดเจน

## Phase 3: Teacher Builder UI Per Topic

Goal: ให้ครูสร้างและจัดการแบบทดสอบแยกต่อหัวข้อในหน้า lesson edit

Checklist:

- ปุ่มสร้างแบบทดสอบอยู่ใน topic flow
- แต่ละหัวข้อมี assessment panel ของตัวเอง
- แสดง title, questionSetId, passScore, retake, reward, certificate
- dialog builder บันทึกกลับไปยัง topic ที่เลือก
- รองรับ replace / regenerate ต่อหัวข้อ

Definition of done:

- บทเรียนหลายหัวข้อสามารถมีหลายแบบทดสอบได้จริง

## Phase 4: Student Topic Quiz Player

Goal: ให้นักเรียนทำแบบทดสอบแยกตามหัวข้อใน lesson player

Checklist:

- lesson player แสดง assessment card ต่อหัวข้อ
- โหลดคำถามด้วย `topicId`
- submit attempt ด้วย `topicId`
- แสดง not_started / passed / failed / locked
- แสดง score/max/passScore ต่อหัวข้อ
- รองรับ retake ตาม policy ของหัวข้อนั้น

Definition of done:

- นักเรียนทำแบบทดสอบหัวข้อหนึ่งโดยไม่กระทบหัวข้ออื่น

## Phase 5: Persistence And Attempt Model

Goal: เก็บผลสอบแบบแยกหัวข้ออย่างชัดเจน

Checklist:

- `LessonAssessmentAttempt` ผูกกับ `topicId`
- route read/write อ่านและเขียนตาม topic
- helper score/reward/certificate รองรับ topic assessment
- tests ครอบคลุม attempt per topic

Definition of done:

- query ผลสอบรายหัวข้อได้ชัดเจน

## Phase 6: Progress, Pass/Fail, Completion Rules

Goal: ให้ lesson progress สะท้อนผลของหลายหัวข้อได้ถูกต้อง

Checklist:

- lesson complete พิจารณา content completion + required topic assessments
- เพิ่ม `passedTopicAssessmentIds`
- เพิ่ม `pendingTopicAssessmentIds`
- เพิ่ม `failedTopicAssessmentIds`
- student lesson list แสดงสถานะ assessment summary
- student lesson player บอก next action ได้

Definition of done:

- completion logic และ progress summary ใช้ topic assessment ทั้งหมด

## Phase 7: Rewards And Certificates Rework

Goal: ให้ reward และ certificate ทำงานต่อหัวข้อได้

Checklist:

- reward ออกได้ต่อ topic assessment
- กัน reward ซ้ำต่อ topic
- certificate ออกได้ต่อ topic
- teacher view เห็นผู้ที่ได้ reward/certificate ต่อหัวข้อ
- tests ครอบคลุม multi-topic reward issuance

Definition of done:

- reward/certificate ผูกกับผลสอบของหัวข้ออย่างถูกต้อง

## Phase 8: Teacher Results And Analytics V2

Goal: ให้ครูเห็นผลสอบรายหัวข้อแบบใช้สอนได้จริง

Checklist:

- แสดงผล per topic
- summary ต่อ topic: submitted, passed, failed, not_started
- filter นักเรียนที่ยังไม่ผ่าน
- export CSV พร้อม `topicId` และ `topicTitle`
- แสดง top missed questions แยกตาม topic

Definition of done:

- ครูตอบได้ทันทีว่านักเรียนติดที่หัวข้อไหน

## Phase 9: Assessment Data Alignment

Goal: ให้ข้อมูลบทเรียนทั้งหมดอยู่ใน canonical topic assessment shape

Checklist:

- ตรวจทุกบทเรียนให้ใช้ topic assessment shape
- ยืนยันว่า teacher edit flow บันทึกเฉพาะ topic assessment
- ยืนยันว่า student routes ไม่เรียก lesson-level assessment path
- ยืนยันว่า progress/reward/certificate อ่านจาก topic assessment เท่านั้น

Definition of done:

- ระบบเหลือ data shape เดียวสำหรับ lesson assessment

## Phase 10: Single-Path Cleanup

Goal: ให้ code, tests, และ docs ใช้คำอธิบายตามระบบปัจจุบันเพียงแบบเดียว

Checklist:

- ลบ route ที่ไม่ใช้แล้ว
- ลบ helper / validator ที่ไม่อยู่ใน canonical flow
- อัปเดต tests ให้ใช้ topic assessment อย่างเดียว
- อัปเดต docs/manual QA/release gate

Definition of done:

- ระบบเหลือ canonical shape เดียว: topic assessment

## Current Implementation Notes

- student lesson list/detail/complete flows read only `topic.assessment`
- lesson progress/pass-fail summary reads only topic assessment state
- student and teacher tests cover the active topic assessment flow
- release gate และ manual QA อ้างอิงโครงสร้างปัจจุบันแล้ว

## Risks

- ถ้า reward logic ไม่อิง topic assessment ให้ครบ อาจจ่ายรางวัลซ้ำ
- ถ้า analytics ไม่อ่าน topic state ตรงกัน ครูจะเห็นผลสรุปคลาดเคลื่อน
- ถ้า UI summary และ backend summary ไม่ใช้ helper ชุดเดียวกัน อาจเกิด mismatch ระหว่างหน้าจอ

## Definition Of Success

- บทเรียน 1 บทมีหลายหัวข้อและสร้างข้อสอบได้หลายชุด
- นักเรียนทำข้อสอบรายหัวข้อได้จริง
- pass/fail เก็บแยกรายหัวข้อ
- reward/certificate ไม่จ่ายซ้ำ
- ครูดูผลสอบรายหัวข้อได้
- lesson system ใช้ topic assessment path เดียวทั้งหมด
