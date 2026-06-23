# Science Curriculum File-to-Template Plan

Last updated: 2026-06-22  
Status: Planning  
Owner: `curriculum-lesson-builder`

## Goal

สรุปความรู้จากไฟล์หลักสูตรวิทยาศาสตร์ให้เป็นข้อมูลหลักสูตรแบบมีโครงสร้าง เพื่อใช้สร้าง curriculum map, learning outcomes และ lesson template ในระบบ GameEdu โดยรักษาแหล่งอ้างอิงและเลขหน้าไว้ครบถ้วน

แผนนี้ไม่สร้างบทเรียนหรือแบบทดสอบจากข้อความทั้งเล่มโดยตรง ทุกข้อมูลต้องผ่าน validator และการตรวจรับของครูก่อนเข้าสู่ canonical curriculum

## Source File

- ชื่อไฟล์: `โครงสร้างหลักสูตรเพิ่มเติม (วิทยาศาสตร์).pdf`
- ที่มาในเครื่อง: `C:/Users/IHCK/Downloads/โครงสร้างหลักสูตรเพิ่มเติม (วิทยาศาสตร์).pdf`
- จำนวน: 277 หน้า
- เอกสาร: ตัวชี้วัดและสาระการเรียนรู้แกนกลาง กลุ่มสาระการเรียนรู้วิทยาศาสตร์ ฉบับปรับปรุง พ.ศ. 2560
- หลักสูตรอ้างอิง: หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช 2551
- หน่วยงานที่ปรากฏในเอกสาร: สพฐ., กระทรวงศึกษาธิการ และ สสวท.
- ISBN ที่ปรากฏในเอกสาร: `978-616-395-939-3`

## Knowledge Summary From The File

เอกสารแบ่งความรู้เป็นสองกลุ่มใหญ่:

1. วิทยาศาสตร์พื้นฐาน
   - สาระที่ 1 วิทยาศาสตร์ชีวภาพ
   - สาระที่ 2 วิทยาศาสตร์กายภาพ
   - สาระที่ 3 วิทยาศาสตร์โลกและอวกาศ
   - สาระที่ 4 เทคโนโลยี
   - ครอบคลุมระดับประถมศึกษาถึงมัธยมศึกษาตอนปลาย

2. วิทยาศาสตร์เพิ่มเติมระดับมัธยมศึกษาตอนปลาย
   - ชีววิทยา
   - เคมี
   - ฟิสิกส์
   - โลก ดาราศาสตร์ และอวกาศ
   - เอกสารกำหนดผลการเรียนรู้และสาระการเรียนรู้เพิ่มเติมรายข้อ

สาระฟิสิกส์ในเอกสารครอบคลุมอย่างน้อย:

- ธรรมชาติทางฟิสิกส์ ปริมาณ และกระบวนการวัด
- การเคลื่อนที่ แรง และกฎการเคลื่อนที่
- สมดุล งาน พลังงาน โมเมนตัม และการเคลื่อนที่แนวโค้ง
- การเคลื่อนที่แบบฮาร์มอนิก คลื่น เสียง และแสง
- ไฟฟ้า สนามไฟฟ้า วงจรไฟฟ้า และแม่เหล็กไฟฟ้า
- ความร้อน แก๊ส ของแข็ง ของไหล และอุณหพลศาสตร์
- ฟิสิกส์อะตอม นิวเคลียร์ อนุภาค และพลังงานนิวเคลียร์

## Scope Decision

### Wave A: Additional Science Templates

สร้าง canonical packs สำหรับ `m4_m6` ก่อน เพราะไฟล์มีผลการเรียนรู้เพิ่มเติมที่ชัดเจน:

- `biology`
- `chemistry`
- `physics`
- `earth_space_science`

### Wave B: Core Science Templates

ภายหลังจึงนำตัวชี้วัดวิทยาศาสตร์พื้นฐานมาเติม `science_technology` แยกตาม grade band และมาตรฐาน ว 1.1 ถึง ว 4.2

ห้ามนำ Additional Science ไปปนกับ Core Science และห้ามจับคู่ด้วยชื่อภาษาไทยเมื่อมี canonical id

## Target Knowledge Model

ข้อมูลที่สกัดจากไฟล์ต้องผ่านชั้นต่อไปนี้:

```text
Curriculum source
  -> source page range
  -> subject and grade scope
  -> strand / standard
  -> learning outcome
  -> curriculum concept
  -> suggested unit
  -> topic
  -> lesson template draft
  -> teacher approval
  -> canonical template pack
```

แต่ละระเบียนต้องเก็บอย่างน้อย:

```ts
type CurriculumFileKnowledgeDraft = {
  sourceId: string
  sourceFileName: string
  sourcePageStart: number
  sourcePageEnd: number
  subjectId: "biology" | "chemistry" | "physics" | "earth_space_science" | "science_technology"
  gradeBand: "p1_p3" | "p4_p6" | "m1_m3" | "m4_m6"
  strandTitle: string
  outcomeCode?: string
  outcomeText: string
  coreConcepts: string[]
  scienceProcessSkills: string[]
  suggestedUnitTitle?: string
  reviewStatus: "extracted" | "normalized" | "reviewed" | "approved" | "rejected"
}
```

## Extraction Rules

- เก็บข้อความผลการเรียนรู้ตามต้นฉบับ พร้อมเลขหน้า
- แยกข้อความอ้างอิงจากข้อความที่ AI สรุปขึ้นใหม่
- ทำ normalization อักขระไทยเก่าที่สกัดจาก PDF ผิดรูปก่อนเปรียบเทียบข้อมูล
- ห้าม AI แต่งผลการเรียนรู้ มาตรฐาน หรือรหัสหลักสูตรที่ไม่มีในแหล่งข้อมูล
- ห้ามคัดข้อความทั้งหน้าไปเป็น lesson content
- ใช้ AI ช่วยจำแนก concepts, skills และข้อเสนอหน่วย แต่ต้องให้ครูอนุมัติ
- เก็บ checksum ของไฟล์ เพื่อรู้ว่า knowledge draft มาจาก source version ใด
- ตรวจข้อมูลซ้ำจาก `subjectId + gradeBand + normalized outcome text + source page`

## Phase 1: Register And Fingerprint Source

Goal: ทำให้ไฟล์มีตัวตนใน curriculum source registry ก่อนสกัดข้อมูล

Checklist:

- เพิ่ม source record สำหรับเอกสารฉบับปรับปรุง พ.ศ. 2560
- เก็บชื่อไฟล์ จำนวนหน้า ISBN หน่วยงาน และ checksum
- ระบุชนิด source เป็น `official_curriculum`
- ระบุ scope เป็น core science และ additional science
- เพิ่ม page-range provenance contract
- เพิ่ม test ป้องกัน source id และ checksum ซ้ำ

Definition of done:

- ทุก knowledge draft อ้างกลับไปยัง source และหน้า PDF ได้

## Phase 2: PDF Text Normalization

Goal: ทำข้อความที่สกัดจาก PDF ให้พร้อมจำแนกโดยไม่ทำลายต้นฉบับ

Checklist:

- สกัดข้อความแยกตามหน้า
- เก็บ raw text และ normalized text คนละ field
- แก้อักขระ Thai legacy/private-use ที่พบบ่อย
- รวมบรรทัดที่ถูกตัดกลางประโยค
- รักษาลำดับ bullet และตารางผลการเรียนรู้
- สร้าง extraction report ระบุหน้าที่อ่านข้อความไม่ได้
- เพิ่ม snapshot tests สำหรับหน้าสารบัญ หน้าสรุปสาระ และหน้าตารางผลการเรียนรู้

Definition of done:

- ระบบค้นหา subject, strand และผลการเรียนรู้จากข้อความ normalized ได้ โดยยังเปิดดู raw source เทียบได้

## Phase 3: Curriculum Knowledge Draft

Goal: แปลงข้อความเป็น draft ที่ validator ตรวจสอบได้

Checklist:

- แยก core science ออกจาก additional science
- จำแนกชีววิทยา เคมี ฟิสิกส์ และโลก ดาราศาสตร์และอวกาศ
- สกัดผลการเรียนรู้รายข้อและสาระประกอบ
- สกัด concepts และ science process skills เป็น metadata
- ผูก grade band และ grade level เฉพาะเมื่อเอกสารระบุได้
- ห้ามเดาภาคเรียนจากลำดับหน้า
- validate subject, grade, source page และ outcome text
- สร้างรายงานรายการที่ AI ไม่มั่นใจเพื่อให้ครูตรวจ

Definition of done:

- ได้ knowledge draft ครบทุกผลการเรียนรู้เพิ่มเติม พร้อม provenance และสถานะ review

## Phase 4: Teacher Review And Approval

Goal: ป้องกันข้อมูลสกัดผิดเข้าสู่ canonical curriculum

Checklist:

- เพิ่มหน้าตรวจ raw text เทียบ normalized text
- แสดงภาพหน้า PDF ข้างผลการสกัด
- ให้ครูแก้ subject, grade, outcome, concept และ skill ได้
- รองรับ approve/reject ทีละรายการและแบบหลายรายการ
- บันทึกผู้ตรวจ เวลา และเหตุผลการแก้ไข
- ห้ามสร้าง canonical pack จากรายการที่ยังไม่ approved

Definition of done:

- มี audit trail และไม่มีข้อมูล `extracted` ถูกนำไปใช้สร้าง template โดยตรง

## Phase 5: Canonical Curriculum Pack Generation

Goal: นำเฉพาะข้อมูลที่อนุมัติแล้วเข้าสู่ `src/lib/curriculum/`

Checklist:

- สร้างหรือปรับ map packs ของ additional science ทั้ง 4 วิชา
- สร้าง stable unit ids และ topic ids
- ผูก learning outcome ids กับ subject, unit และ topic
- ตรวจ cross-subject outcome leakage
- ห้ามนำข้อมูลกลับไปไว้ใน legacy `src/lib/physics/`
- เพิ่ม validators และ targeted tests
- เปรียบเทียบจำนวน approved outcomes กับจำนวน canonical outcomes

Definition of done:

- canonical curriculum resolve source -> subject -> unit -> topic -> outcome ได้ครบ

## Phase 6: Template Draft Generation

Goal: สร้าง lesson template draft จากหน่วยและผลการเรียนรู้ที่ผ่านการอนุมัติ

Checklist:

- สร้าง template แยกตาม subject และ unit
- ให้หนึ่ง template อ้าง primary outcome และ supporting outcomes อย่างชัดเจน
- กำหนด objectives จาก outcome โดยไม่เปลี่ยนความหมาย
- เสนอหัวข้อบทเรียนและลำดับเนื้อหา
- เพิ่ม video-first media suggestion โดยไม่สร้าง URL ปลอม
- เพิ่ม document requirements สำหรับใบกิจกรรมหรือเอกสารประกอบ
- ไม่สร้าง quiz ในขั้น template generation
- บันทึกสถานะเป็น `draft` เท่านั้น

Definition of done:

- ครูเปิด template draft แล้วเห็น source, outcomes, topics และ media requirements ครบ

## Phase 7: Template Quality Gate

Goal: ตรวจว่า template สอดคล้องกับหลักสูตรก่อนเผยแพร่

Checklist:

- ตรวจทุก outcome id ว่าอยู่ใน unit และ subject เดียวกัน
- ตรวจ objective coverage
- ตรวจความซ้ำของ template ภายในหน่วย
- ตรวจเวลาเรียนและจำนวนหัวข้อให้อยู่ในขอบเขตที่ครูแก้ได้
- ตรวจว่าไม่มีข้อความอ้างว่าเป็นหลักสูตรทางการโดยไม่มี source page
- เพิ่ม teacher preview และ approval
- publish ได้เฉพาะ template ที่ผ่าน gate

Definition of done:

- template ที่เผยแพร่ทุกชุดย้อนกลับไปยังผลการเรียนรู้และหน้าเอกสารได้

## Phase 8: Builder Integration And QA

Goal: ให้ครูเลือก template จาก canonical Curriculum Builder ได้จริง

Checklist:

- ใช้ subject/unit selector ชุดเดียวในหน้า lesson create
- filter template ตาม canonical subject และ unit
- clear template เดิมทันทีเมื่อเปลี่ยน subject หรือ unit
- ส่ง curriculum context เดียวกันให้ outline generator
- บันทึก Lesson Content V2 เท่านั้น
- ทดสอบ additional science ทั้ง 4 วิชา
- ทดสอบ Thai rendering, responsive layout และ empty state บน localhost
- รัน curriculum, lesson, TypeScript และ i18n checks

Definition of done:

- ครูเลือกวิชา -> หน่วย -> template -> สร้าง lesson draft ได้โดยไม่มีข้อมูลข้ามวิชา

## Proposed Repository Outputs

```text
src/lib/curriculum/source-registry.ts
src/lib/curriculum/map-packs.ts
src/lib/curriculum/unit-learning-outcomes.ts
src/lib/curriculum/template-master-pack.ts
src/lib/curriculum/import/
  science-pdf-source.ts
  normalize-thai-pdf-text.ts
  curriculum-knowledge-draft.ts
  curriculum-knowledge-validator.ts
src/lib/curriculum/__tests__/
docs/curriculum-imports/
  science-2560-extraction-report.md
  science-2560-review-checklist.md
```

ชื่อไฟล์เป็นข้อเสนอ ระหว่าง implementation ต้องตรวจ ownership และรูปแบบเดิมของ repo ก่อนสร้าง module ใหม่

## Release Gate

- [ ] source registry มี provenance และ checksum
- [ ] raw/normalized text แยกกัน
- [ ] every outcome has subject, grade scope and page reference
- [ ] teacher review ครบทุก outcome ที่จะใช้
- [ ] canonical ids ไม่ซ้ำและไม่ปนข้ามวิชา
- [ ] template ทุกชุดอ้าง approved outcomes
- [ ] ไม่มี writer ใหม่สร้าง Lesson Content V1
- [ ] ไม่มีการ import legacy physics เข้า canonical builder
- [ ] targeted curriculum tests ผ่าน
- [ ] lesson contract tests ผ่าน
- [ ] TypeScript และ i18n checks ผ่าน
- [ ] manual localhost QA ผ่านก่อน commit/push/deploy

## Recommended First Delivery

เริ่มจาก pilot ขนาดเล็กในสาระฟิสิกส์:

1. ลงทะเบียน source และ checksum
2. สกัดเฉพาะหน้าสรุปสาระฟิสิกส์และผลการเรียนรู้ช่วงแรก
3. สร้าง knowledge draft 5-10 outcomes
4. ให้ครูตรวจเทียบหน้า PDF
5. สร้าง canonical unit ทดลอง 1 หน่วย
6. สร้าง lesson template draft 2 แบบ
7. ทดสอบใน Curriculum Builder โดยไม่ publish

เมื่อ pilot ผ่านจึงขยายไปยังฟิสิกส์ทั้งหมด แล้วตามด้วยเคมี ชีววิทยา และโลก ดาราศาสตร์และอวกาศ

