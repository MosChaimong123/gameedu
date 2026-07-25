# Curriculum Builder Rework: Subject -> Course -> Grade

## Goal

ปรับหน้า `/dashboard/lessons/create` ให้เริ่มจากโครงสร้างที่ครูเข้าใจง่ายตามหลักสูตรจริง:

1. เลือก `วิชาแกนกลาง`
2. เลือก `รายวิชา`
3. เลือก `ชั้น`
4. แสดงข้อมูลสรุปทันที:
   - มาตรฐาน
   - ตัวชี้วัดระหว่างทาง
   - ตัวชี้วัดปลายทาง
   - คำอธิบายรายวิชา

โดยยังไม่พาครูไปจัดการ `หน่วยการเรียนรู้` ในขั้นแรกของ flow  
หน่วยการเรียนรู้จะไปอยู่ในหน้าถัดไปหลังจากกดสร้าง draft

---

## UX Target

หน้าแรกของ builder ต้องตอบคำถามนี้ให้ครูได้ทันที:

- ตอนนี้กำลังเลือก `กลุ่มสาระอะไร`
- รายวิชาที่จะสร้างคือ `รายวิชาไหน`
- สำหรับ `ชั้นไหน`
- รายวิชานี้มี `มาตรฐานอะไร`
- มี `ตัวชี้วัดระหว่างทาง` และ `ตัวชี้วัดปลายทาง` อะไรบ้าง
- `คำอธิบายรายวิชา` คืออะไร

สิ่งที่ต้องตัดออกจาก step แรก:

- การให้ครูเลือกหน่วยตั้งแต่หน้าแรก
- การให้ครูเลือกเทมเพลตก่อนเข้าใจรายวิชา
- การมี selector ซ้ำหลายจุด
- การแสดงข้อมูลที่เป็น placeholder หรือภาษากลางระบบแทนข้อมูลหลักสูตรจริง

---

## Canonical Selection Model

หน้าแรกใหม่จะใช้ selection ชุดเดียว:

- `coreSubjectId`
- `courseId`
- `gradeLevel`

จาก selection นี้ ให้ derive ข้อมูล read-only ต่อไปนี้:

- `courseTitle`
- `courseDescription`
- `standards[]`
- `duringIndicators[]`
- `terminalIndicators[]`
- `availableUnits[]`

ห้ามให้ครูเลือก `strand`, `standard`, `unit`, `template` ในหน้าแรกอีก  
ค่าเหล่านี้ต้องมาจาก `courseId + gradeLevel` เป็นหลัก

---

## Data Contract To Add

ต้องมี canonical contract สำหรับ `รายวิชา` แยกจาก `กลุ่มสาระ` และ `หน่วย`

### Proposed course shape

```ts
type CanonicalCourseEntry = {
  id: string
  coreSubjectId: CanonicalCoreSubjectId
  courseCode: string | null
  titleTh: string
  titleEn: string | null
  gradeLevel: CanonicalGradeLevel
  semester: 1 | 2 | null
  strandIds: string[]
  standardIds: string[]
  duringIndicatorIds: string[]
  terminalIndicatorIds: string[]
  descriptionText: string | null
  sourceRegistryIds: string[]
  unitIds: string[]
}
```

### Notes

- `course` คือรายวิชาจริงในระดับชั้น เช่น
  - ภาษาไทย ป.1
  - วิทยาศาสตร์ชีวภาพ ม.4
  - ฟิสิกส์ ม.4
- `unit` ยังอยู่ระดับย่อยกว่าเดิม
- `standardIds` อาจมีหลายตัวต่อ 1 รายวิชา
- `indicatorIds` ต้องอ้าง canonical indicator catalog ที่ import แล้ว

---

## Phase Plan

### Phase 1: Canonical Course Catalog

Goal: เพิ่ม data model สำหรับ `รายวิชา` ให้เป็นแกนกลางใหม่ของหน้า builder

Checklist:

- สร้างไฟล์ `src/lib/curriculum/course-catalog.ts`
- นิยาม `CanonicalCourseEntry`
- แยก `วิชาแกนกลาง` ออกจาก `รายวิชา`
- ให้ 1 รายวิชาผูกกับ 1 ชั้นเรียนชัดเจน
- ผูก `standardIds`, `duringIndicatorIds`, `terminalIndicatorIds`
- ผูก `descriptionText`
- เพิ่ม validator และ test

---

### Phase 2: Course Source Extraction

Goal: ดึงข้อมูล `รายวิชา + ชั้น + มาตรฐาน + คำอธิบายรายวิชา` จากไฟล์หลักสูตรจริงเข้า canonical catalog

Checklist:

- parse แหล่งข้อมูลจาก DOCX/PDF ที่มีโครงสร้างรายวิชา
- สร้าง mapping จาก:
  - กลุ่มสาระ
  - รายวิชา
  - ชั้น
  - มาตรฐาน
  - ตัวชี้วัด
  - คำอธิบายรายวิชา
- เก็บผล import ลง `src/lib/curriculum/import/`
- เพิ่ม report สำหรับ unresolved rows
- ห้าม hardcode รายวิชาด้วย display text ถ้ายังไม่มี source mapping

---

### Phase 3: Builder Step 1 UI Rework

Goal: เปลี่ยนหน้าแรกให้เหลือเพียง 3 ตัวเลือกหลัก

New flow:

1. เลือกวิชาแกนกลาง
2. เลือกรายวิชา
3. เลือกชั้น

Checklist:

- ลบ selector เก่า:
  - สาระการเรียนรู้
  - มาตรฐาน
  - หน่วยหลักสูตร
  - เทมเพลตตั้งต้น
- เพิ่ม selector ใหม่:
  - วิชาแกนกลาง
  - รายวิชา
  - ชั้น
- filter รายวิชาตามวิชาแกนกลาง
- filter รายวิชาตามชั้นได้ถูกต้อง
- หากเลือกใหม่ ต้อง clear selection เก่าที่ไม่สอดคล้อง

---

### Phase 4: Read-only Curriculum Summary Panel

Goal: แสดงข้อมูลหลักสูตรที่ครูต้องเห็นทันทีหลังเลือกครบ

Checklist:

- แสดง `ชื่อรายวิชา`
- แสดง `ชั้น`
- แสดง `คำอธิบายรายวิชา`
- แสดงรายการ `มาตรฐาน`
- แสดง `ตัวชี้วัดระหว่างทาง`
- แสดง `ตัวชี้วัดปลายทาง`
- แสดงจำนวนหน่วยที่จะถูกใช้ในรายวิชานี้
- ถ้าไม่มีข้อมูล ต้องบอกว่า `ยังไม่มีข้อมูล canonical` แบบชัดเจน

---

### Phase 5: Draft Creation From Course

Goal: เมื่อกดสร้าง ให้เปิด draft จากระดับ `รายวิชา` ก่อน แล้วค่อยเข้าไปจัดการหน่วยในหน้าถัดไป

Checklist:

- ปุ่มหลักเปลี่ยนเป็น `สร้างจากรายวิชานี้`
- เมื่อกดสร้าง:
  - สร้าง lesson shell จากทุก unit ในรายวิชานั้น
  - เก็บ metadata จาก `courseId`
  - เก็บ `standardIds`
  - เก็บ `indicator ids`
- หน้าถัดไปจึงค่อยจัดการ:
  - หน่วย
  - หัวข้อ
  - template
  - AI generation

---

### Phase 6: Metadata And API Normalization

Goal: ให้ route อ่าน/เขียน lesson ใช้ `course-based curriculum summary` แบบเดียวกัน

Checklist:

- เพิ่ม `courseId` ใน lesson curriculum metadata
- normalize metadata ตอน create/update
- GET route ส่ง summary แบบเดียวกันทุก endpoint
- teacher list / edit / classroom read ใช้ field เดียวกัน
- student/player route ไม่ parse ซ้ำจาก display text

---

### Phase 7: Template And Unit Step Migration

Goal: ย้าย template และ unit ไปอยู่ step ถัดไปให้เหมาะกับ flow ใหม่

Checklist:

- หน้าแรกไม่โชว์ template
- หน้าแรกไม่ให้เลือกหน่วย
- หลังสร้าง draft แล้ว ค่อยแสดง:
  - หน่วยในรายวิชา
  - template ต่อหน่วย
  - AI outline/topic generation
- ป้องกันการย้อนกลับไปสู่ UI เก่าที่มี selector ซ้ำ

---

### Phase 8: QA And Cleanup

Goal: ปิดระบบ selection เก่าที่ทำให้ครูงง

Checklist:

- ลบ copy ที่พูดถึง selector เก่า
- ลบ state ที่ไม่ใช้แล้ว:
  - `curriculumStrandId`
  - `curriculumStandardId`
  - `curriculumUnitId` ใน step แรก
  - `curriculumTemplateId` ใน step แรก
- รัน build/test
- manual QA หน้า create:
  - เปลี่ยนวิชาแล้วข้อมูลไม่ค้าง
  - เปลี่ยนรายวิชาแล้วมาตรฐานตรง
  - เปลี่ยนชั้นแล้วคำอธิบายรายวิชาเปลี่ยนตาม
  - ไม่มี panel ซ้ำ
  - ไม่มีภาษาเพี้ยน

---

## UI Acceptance Criteria

ถือว่าจบเมื่อหน้าแรกของ builder:

- มีแค่ 3 ตัวเลือกหลัก: `วิชาแกนกลาง / รายวิชา / ชั้น`
- ไม่มี selector ซ้ำ
- ไม่ต้องเลือกหน่วยในหน้าแรก
- ไม่ต้องเลือกเทมเพลตในหน้าแรก
- แสดง `มาตรฐาน / ตัวชี้วัดระหว่างทาง / ตัวชี้วัดปลายทาง / คำอธิบายรายวิชา`
- ปุ่มสร้างมีหน้าที่เดียว: สร้าง draft จากรายวิชา
- หน้าถัดไปค่อยจัดการหน่วยการเรียนรู้

---

## Suggested Build Order

ลำดับทำงานที่แนะนำ:

1. Phase 1: Canonical Course Catalog
2. Phase 2: Course Source Extraction
3. Phase 3: Builder Step 1 UI Rework
4. Phase 4: Read-only Curriculum Summary Panel
5. Phase 5: Draft Creation From Course
6. Phase 6: Metadata And API Normalization
7. Phase 7: Template And Unit Step Migration
8. Phase 8: QA And Cleanup

---

## Recommendation

แนะนำให้เริ่มจาก `Phase 1` ก่อนทันที  
เพราะถ้ายังไม่มี `course catalog` เป็นแกนกลาง หน้า UI จะยังต้อง hack จาก `strand/unit` แบบเดิม และจะงงซ้ำอีก
