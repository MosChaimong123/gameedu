# Secondary Core Curriculum Lesson Builder Plan

## Goal

ปรับระบบสร้างบทเรียนให้เริ่มจากหลักสูตรรายวิชาพื้นฐานระดับมัธยมตามไฟล์ `โครงสร้างระดับมัธยม พื้นฐาน.docx` โดยให้ครูเลือกข้อมูลตามลำดับเดียวกับหลักสูตรจริง:

1. เลือกวิชา / กลุ่มสาระจาก 8 กลุ่มสาระ
2. เลือกประเภทวิชา: `พื้นฐาน` หรือ `เพิ่มเติม`
3. ถ้าเลือก `พื้นฐาน` ให้เลือกสาระ
4. เลือกมาตรฐาน
5. แสดงตัวชี้วัดระหว่างทางและตัวชี้วัดปลายทาง
6. แสดงหน่วยการเรียนรู้ในแต่ละชั้นเรียน
7. ใช้หน่วยที่เลือกเป็นฐานให้ AI สร้างโครงบทเรียนและเนื้อหา

ประเภท `เพิ่มเติม` ให้เว้นเป็น placeholder ก่อน ยังไม่ต้องสร้าง workflow เต็มในรอบนี้

## Source Knowledge From DOCX

ไฟล์ที่ใช้เป็นฐานความรู้:

- `C:/Users/IHCK/Downloads/โครงสร้างระดับมัธยม พื้นฐาน.docx`
- อ่านได้ `1,990` paragraphs และ `204` tables
- โครงสร้างตารางหลักที่พบ:
  - ตาราง `มาตรฐาน | ตัวชี้วัดระหว่างทาง | ตัวชี้วัดปลายทาง`
  - ตาราง `ชื่อหน่วยการเรียนรู้ | มาตรฐานการเรียนรู้/ตัวชี้วัด | สมรรถนะสำคัญของผู้เรียน | สาระสำคัญ | เวลา (ชั่วโมง)`

สารบัญในไฟล์ระบุ 8 กลุ่มสาระหลัก:

1. ภาษาไทย
2. คณิตศาสตร์
3. วิทยาศาสตร์และเทคโนโลยี
4. สังคมศึกษา ศาสนา และวัฒนธรรม
5. สุขศึกษาและพลศึกษา
6. ศิลปะ
7. การงานอาชีพ
8. ภาษาต่างประเทศ

ตัวอย่างรายวิชาหรือกลุ่มย่อยที่พบในไฟล์:

- ภาษาไทย: หลักภาษาและการใช้ภาษาไทย, วรรณคดีและวรรณกรรม
- คณิตศาสตร์: คณิตศาสตร์
- วิทยาศาสตร์และเทคโนโลยี: วิทยาศาสตร์และเทคโนโลยี, วิทยาศาสตร์ชีวภาพ, วิทยาศาสตร์กายภาพ 1 (เคมี), วิทยาศาสตร์กายภาพ 2 (ฟิสิกส์), วิทยาศาสตร์โลกและอวกาศ, เทคโนโลยี (วิทยาการคำนวณ), เทคโนโลยี (การออกแบบและเทคโนโลยี)
- สังคมศึกษา ศาสนา และวัฒนธรรม: สังคมศึกษา ศาสนา และวัฒนธรรม, พระพุทธศาสนา, หน้าที่พลเมือง วัฒนธรรม และการดำเนินชีวิตในสังคม, เศรษฐศาสตร์, ประวัติศาสตร์, ภูมิศาสตร์
- สุขศึกษาและพลศึกษา: สุขศึกษา
- ศิลปะ: ทัศนศิลป์, ดนตรี, นาฏศิลป์
- การงานอาชีพ: การงานอาชีพ
- ภาษาต่างประเทศ: ภาษาอังกฤษ

## Target UX

### Step 1: Curriculum Selection

หน้า `/dashboard/lessons/create` ต้องมี selector ชุดเดียวเท่านั้น:

- วิชา / กลุ่มสาระ
- ประเภทวิชา: พื้นฐาน / เพิ่มเติม
- ระดับชั้น
- สาระ
- มาตรฐาน
- หน่วยการเรียนรู้

เมื่อครูเลือก `วิชา` แล้ว:

- ล้างค่าเก่าของสาระ มาตรฐาน หน่วย และ template ที่ไม่ตรงวิชา
- ไม่แสดง panel ฟิสิกส์เฉพาะทางอีก
- ไม่ให้มี selector ซ้ำด้านล่าง
- summary ด้านขวาเป็น read-only เท่านั้น

### Basic Course Flow

ถ้าเลือก `พื้นฐาน`:

1. แสดงสาระของวิชานั้น
2. เมื่อเลือกสาระ แสดงมาตรฐานที่อยู่ในสาระนั้น
3. เมื่อเลือกมาตรฐาน แสดง:
   - ตัวชี้วัดระหว่างทาง
   - ตัวชี้วัดปลายทาง
   - จำนวนตัวชี้วัดแต่ละประเภท
4. แสดงหน่วยการเรียนรู้ที่ผูกกับชั้นเรียนและมาตรฐานนั้น
5. เลือกหน่วยแล้วใช้เป็น context สำหรับ AI outline

### Additional Course Flow

ถ้าเลือก `เพิ่มเติม`:

- แสดงข้อความว่า `ระบบรายวิชาเพิ่มเติมจะเปิดใช้งานในเฟสถัดไป`
- ปิดปุ่มสร้างจากหลักสูตรกลาง
- ไม่ fallback ไปฟิสิกส์หรือวิชาเดิม
- ไม่สร้างข้อมูล placeholder ที่ปนกับพื้นฐาน

## Canonical Data Model

เพิ่มหรือปรับ schema ฝั่ง `src/lib/curriculum/` ให้รองรับโครงนี้:

```ts
type CurriculumCourseType = "core" | "additional";

type CoreSubjectGroup = {
  id: string;
  labelTh: string;
  courseType: "core";
  strands: CurriculumStrand[];
};

type CurriculumStrand = {
  id: string;
  subjectGroupId: string;
  labelTh: string;
  standards: CurriculumStandard[];
};

type CurriculumStandard = {
  id: string;
  strandId: string;
  code: string;
  labelTh: string;
  indicators: CurriculumIndicator[];
};

type CurriculumIndicator = {
  id: string;
  code: string;
  textTh: string;
  indicatorType: "during" | "terminal";
  gradeLevel: string;
  sourceRef: CurriculumSourceRef;
};

type CurriculumUnit = {
  id: string;
  subjectGroupId: string;
  courseType: "core";
  strandId: string;
  standardIds: string[];
  indicatorIds: string[];
  gradeLevel: string;
  titleTh: string;
  keyConceptTh: string;
  competencies: string[];
  estimatedHours: number;
  sourceRef: CurriculumSourceRef;
};
```

## Phase 1: Source Registry And DOCX Extraction

Goal: ลงทะเบียนไฟล์ DOCX เป็นแหล่งข้อมูลหลักสูตร และสร้างตัวอ่านข้อมูลแบบ repeatable

Checklist:

- เพิ่ม source entry ใน `src/lib/curriculum/source-registry.ts`
- เก็บชื่อไฟล์, checksum, วันที่ import, และประเภทแหล่งข้อมูลเป็น `teacher_uploaded_curriculum_reference`
- สร้าง extractor อ่าน paragraph/table จาก DOCX
- ตรวจตาราง 2 แบบหลัก: ตารางตัวชี้วัด และตารางหน่วยการเรียนรู้
- สร้าง extraction report แยกตาม table index
- ไม่ hardcode ข้อมูลจากหน้าจอหรือรูปภาพ

Output:

- `src/lib/curriculum/import/secondary-core-docx-source.ts`
- `src/lib/curriculum/import/secondary-core-docx-extractor.ts`
- `docs/curriculum-imports/secondary-core-docx-extraction-report.md`

## Phase 2: Subject Catalog For 8 Core Subjects

Goal: ให้ระบบเลือก 8 กลุ่มสาระได้จาก canonical catalog

Checklist:

- เพิ่ม/ตรวจ `subject-catalog.ts` ให้มี 8 กลุ่มสาระ
- เพิ่ม `courseType` เป็น `core | additional`
- ตั้งค่า `additional` เป็น disabled/placeholder ก่อน
- เพิ่ม label ไทยและ stable id
- เพิ่ม test ว่า 8 วิชาพื้นฐานครบ
- เพิ่ม test ว่าไม่มี default fallback ไป physics

Core subject ids ที่เสนอ:

- `thai_language`
- `mathematics`
- `science_technology`
- `social_studies_religion_culture`
- `health_physical_education`
- `arts`
- `career`
- `foreign_languages`

## Phase 3: Strand And Standard Model

Goal: แยกสาระกับมาตรฐานออกจากหน่วยเรียน เพื่อให้เลือกตามหลักสูตรได้จริง

Checklist:

- เพิ่ม `CurriculumStrand`
- เพิ่ม `CurriculumStandard`
- ผูก strand กับ subject group
- ผูก standard กับ strand
- แสดง standard code เช่น `ท 1.1`, `ค 1.1`, `ว 1.2`
- เพิ่ม validator กันมาตรฐานข้ามวิชา
- เพิ่ม helper `getStandardsForSubjectAndStrand()`

Output:

- `src/lib/curriculum/strands-and-standards.ts`
- tests สำหรับ subject -> strand -> standard

## Phase 4: Indicator Split

Goal: แสดงตัวชี้วัดระหว่างทางและตัวชี้วัดปลายทางให้ถูกต้อง

Checklist:

- เพิ่ม `indicatorType: during | terminal`
- parse table `มาตรฐาน | ตัวชี้วัดระหว่างทาง | ตัวชี้วัดปลายทาง`
- เก็บรหัสตัวชี้วัดแยกเป็นรายการ
- เก็บข้อความตัวชี้วัดเมื่อมีในตารางหน่วย
- เพิ่ม UI panel แสดง 2 columns:
  - ตัวชี้วัดระหว่างทาง
  - ตัวชี้วัดปลายทาง
- เพิ่ม badge นับจำนวนตัวชี้วัด
- ห้าม AI สร้างหรือแก้รหัสตัวชี้วัดเอง

## Phase 5: Unit Map By Grade

Goal: แสดงหน่วยที่เรียนตามชั้นเรียนและมาตรฐานที่เลือก

Checklist:

- parse table `ชื่อหน่วยการเรียนรู้...`
- สร้าง unit records จาก:
  - ชื่อหน่วย
  - มาตรฐาน/ตัวชี้วัด
  - สมรรถนะสำคัญ
  - สาระสำคัญ
  - เวลาเรียน
- ผูก unit กับ grade เช่น `m1`, `m2`, `m3`, `m4_6`
- เพิ่ม filter unit ตาม subject + courseType + grade + strand + standard
- เพิ่ม test ว่าหน่วยไม่ปนข้ามวิชา
- เพิ่ม test ว่าเปลี่ยนวิชาแล้ว selected unit ถูก clear

## Phase 6: Teacher Builder UI Rework

Goal: ทำหน้า create ให้เป็น curriculum-first builder จริง

Checklist:

- ลบ selector ซ้ำใน lower source panel
- เหลือ selector หลักชุดเดียว
- เพิ่ม subject cards หรือ dropdown 8 วิชา
- เพิ่ม toggle `พื้นฐาน / เพิ่มเติม`
- ถ้า `พื้นฐาน` แสดง strand/standard/unit flow
- ถ้า `เพิ่มเติม` แสดง disabled placeholder
- เพิ่ม read-only summary:
  - วิชา
  - ประเภท
  - ชั้น
  - สาระ
  - มาตรฐาน
  - หน่วย
  - จำนวนตัวชี้วัด
- ปุ่มสร้างบทเรียนใช้ unit ที่เลือกเท่านั้น
- ปิดปุ่มถ้ายังเลือกไม่ครบ

## Phase 7: AI Lesson Context Rules

Goal: ให้ AI สร้างบทเรียนจาก context หลักสูตรที่เลือก ไม่ใช่เดาจากข้อความอย่างเดียว

Checklist:

- ปรับ `ai-curriculum-rules.ts`
- prompt ต้องส่ง:
  - subjectGroupId
  - courseType
  - gradeLevel
  - strandId
  - standardIds
  - indicatorIds
  - unitId
  - unit key concept
  - source text จากครู
- outline generation สร้างเฉพาะบทเรียนและหัวข้อ
- topic content generation ใช้ตัวชี้วัดและสาระสำคัญเป็น guardrail
- ห้ามสร้างข้อสอบใน lesson content generation
- assessment ใช้ route แยกตามเดิม

## Phase 8: Template Pack From Core Units

Goal: สร้าง template จากหน่วยพื้นฐานจริง แทน template ฟิสิกส์เดี่ยว

Checklist:

- สร้าง template pack ขั้นต่ำ 1 วิชาก่อน เช่น ภาษาไทยหรือวิทยาศาสตร์และเทคโนโลยี
- template ต้องผูก `unitId` และ `indicatorIds`
- template list filter ตาม subject/grade/unit
- เปลี่ยนปุ่มบนหน้า list เป็น `เทมเพลตบทเรียน`
- ไม่แสดงคำว่า Physics Template Library ใน canonical create page

## Phase 9: Compatibility And Migration

Goal: กันระบบเก่ากับใหม่ปนกัน

Checklist:

- ตรวจข้อมูล lesson เดิมที่มี physics-only metadata
- เพิ่ม migration helper map old `subject/unit` ไป canonical ids เท่าที่ทำได้
- V1/V2 lesson content อ่านได้เหมือนเดิม
- new draft ต้องใช้ canonical curriculum context เท่านั้น
- ไม่สร้าง lesson ใหม่จาก legacy physics panel
- เพิ่ม fallback เฉพาะอ่านข้อมูลเก่า ไม่ใช้เขียนข้อมูลใหม่

## Phase 10: QA And Release Gate

Goal: ตรวจว่าระบบไม่ค้าง ไม่เลือกวิชาผิด และไม่มีภาษาเพี้ยน

Checklist:

- Run curriculum tests
- Run lesson tests
- Run i18n check
- Manual localhost QA:
  - เลือกภาษาไทย -> เห็นสาระ/มาตรฐาน/หน่วยภาษาไทย
  - เลือกวิทยาศาสตร์ -> ไม่เห็นหน่วยภาษาไทยค้าง
  - เลือกคณิตศาสตร์ -> ไม่เห็นฟิสิกส์ค้าง
  - เลือกเพิ่มเติม -> เห็น placeholder และปุ่มสร้างถูก disable
  - refresh page แล้ว selection ไม่กลายเป็นฟิสิกส์เอง
  - AI outline ใช้ unit ที่เลือกจริง
  - publish guard ยังทำงาน

## Recommended Next Work

เริ่มจาก Phase 1-2 ก่อน เพราะต้องทำให้ระบบรู้จัก source และ 8 วิชาแบบ canonical ให้ได้ก่อน ถ้ารีบทำ UI ก่อน จะเกิดปัญหาเดิมคือข้อมูลเก่ากับใหม่ปนกัน และ selector จำค่าฟิสิกส์/ภาษาไทยค้างข้ามวิชาอีก

งานแรกที่ควรทำ:

1. เพิ่ม source registry สำหรับ DOCX นี้
2. เพิ่ม subject catalog 8 กลุ่มสาระพื้นฐาน
3. เพิ่ม course type `core/additional`
4. เพิ่ม test กัน fallback ไปฟิสิกส์
5. ค่อยต่อ strand/standard/indicator/unit extraction

