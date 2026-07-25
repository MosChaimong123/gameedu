# Primary Grade 1-6 DOCX To Lesson Template Markdown Plan

## เป้าหมาย

สร้างฐานข้อมูล Markdown สำหรับเตรียมทำเทมเพลตบทเรียนระดับประถมศึกษา ป.1-ป.6 จากไฟล์ต้นทาง:

`C:\Users\IHCK\Downloads\โครงสร้างรายวิชาพื้นฐานตามสาระการเรียนรู้ พื้นฐาน.docx`

ผลลัพธ์รอบแรกยังไม่แก้ canonical code โดยตรง แต่จะสร้างเอกสารข้อมูลกลางที่ตรวจทานได้ก่อน แล้วจึงค่อยนำไปแปลงเป็น `src/lib/curriculum/` ในรอบถัดไป

## ขอบเขตงาน

- ดึงข้อมูลสำคัญจาก DOCX เช่น กลุ่มสาระ รายวิชา ระดับชั้น เวลาเรียน คำอธิบายรายวิชา หน่วยการเรียนรู้ สาระ มาตรฐาน ตัวชี้วัด และหัวข้อที่ใช้สร้างบทเรียน
- จัดข้อมูลเป็น Markdown database สำหรับ ป.1-ป.6
- สรุปช่องว่างของข้อมูลที่ต้องตรวจด้วยคนก่อนนำเข้า canonical curriculum
- วางแนวทางแปลงข้อมูลเป็น lesson template pack ในระบบ GameEdu

## ไฟล์ผลลัพธ์ที่ต้องสร้าง

1. `docs/curriculum-imports/primary-grade-1-6-course-database.md`
   - ฐานข้อมูลหลักสูตรจาก DOCX
   - แยกตามชั้น ป.1-ป.6 และกลุ่มสาระ/รายวิชา
   - ใช้โครงสร้างที่พร้อมแปลงเป็น `map-packs`, `unit-learning-outcomes`, และ `template-master-pack`

2. `docs/curriculum-imports/primary-grade-1-6-extraction-report.md`
   - รายงานวิธีดึงข้อมูล
   - สรุปจำนวนหน้า ตาราง หัวข้อ และรายการที่พบ
   - ระบุข้อมูลที่อ่านได้ครบ ข้อมูลที่คลุมเครือ และข้อมูลที่ควรตรวจซ้ำจาก DOCX

3. `docs/system-plans/primary-lesson-template-pack-plan.md`
   - แผนต่อยอดจาก Markdown database ไปเป็นเทมเพลตบทเรียนจริง
   - ระบุ subjectId, gradeLevel, unitId, outcomeId, template strategy และ QA ที่ต้องทำ

## โครงสร้าง Markdown Database

รูปแบบข้อมูลที่ต้องการ:

```md
## ป.1 ภาษาไทย

- subjectId: thai
- gradeLevel: grade_1
- courseCode:
- courseTitle:
- totalHours:
- source: โครงสร้างรายวิชาพื้นฐานตามสาระการเรียนรู้ พื้นฐาน.docx

### หน่วยที่ 1: ...

- unitId: thai-g1-u01
- unitTitle:
- estimatedHours:
- strand:
- standards:
- indicators:
- keyConcept:
- competencies:
- suggestedTemplateType:
- notes:
```

## Mapping เข้าระบบ Canonical

ข้อมูล Markdown ต้องออกแบบให้ต่อกับไฟล์หลักเหล่านี้ได้:

- `src/lib/curriculum/source-registry.ts`
- `src/lib/curriculum/subject-catalog.ts`
- `src/lib/curriculum/grade-model.ts`
- `src/lib/curriculum/map-packs.ts`
- `src/lib/curriculum/unit-learning-outcomes.ts`
- `src/lib/curriculum/template-master-pack.ts`
- `src/lib/curriculum/ai-curriculum-rules.ts`
- `src/lib/curriculum/assessment-blueprints.ts`

กติกาสำคัญ:

- ใช้ canonical `subjectId` เดิม เช่น `thai`, `mathematics`, `science_technology`
- ใช้ id แบบคงที่ เช่น `thai-g1-u01`, `math-g2-u03`
- เก็บ provenance จาก DOCX ทุกส่วนที่นำมาใช้
- ถ้าข้อมูลใน DOCX เป็นชื่อหน่วยหรือคำอธิบาย แต่ยังไม่ใช่ตัวชี้วัดทางการ ให้ mark เป็น `needsReview`
- ยังไม่สร้าง `lesson_content_v2` ในรอบ extraction นี้

## ขั้นตอนดำเนินงาน

### Phase 1: DOCX Extraction

- ตรวจว่าไฟล์ DOCX เปิดอ่านได้
- ดึงข้อความ ย่อหน้า ตาราง และ heading structure
- แยกข้อมูล raw ตามลำดับที่ปรากฏในเอกสาร
- บันทึกปัญหา encoding, ตารางแตก, ข้อความซ้ำ, หรือหัวข้อไม่ชัด

ผลลัพธ์:

- raw extraction notes ภายใน extraction report
- รายการ section/table ที่ใช้เป็นฐานข้อมูล

### Phase 2: Data Normalization

- จัดชั้นเรียนเป็น `grade_1` ถึง `grade_6`
- map ชื่อวิชาเป็น canonical subjectId
- แยกรายวิชา หน่วย เวลาเรียน และตัวชี้วัด
- สร้าง id ชั่วคราวที่เสถียรสำหรับ unit/topic/outcome
- ระบุรายการที่ยังต้อง human review

ผลลัพธ์:

- `primary-grade-1-6-course-database.md`
- ตาราง coverage ว่าข้อมูลครบแค่ไหนในแต่ละชั้น/วิชา

### Phase 3: Template Strategy

- เลือกประเภท template ตามลักษณะวิชาและหน่วย
- กลุ่ม template เบื้องต้น:
  - document_first สำหรับภาษาไทยและสังคม
  - practice_first สำหรับคณิตศาสตร์ ศิลปะ การงาน
  - video_first สำหรับวิทยาศาสตร์ สุขศึกษา และภาษาต่างประเทศ
- ระบุ required blocks เช่น objectives, topics, media, documents, practice, summary, assessment_bridge
- ระบุสื่อ/เอกสารขั้นต่ำที่เหมาะกับแต่ละ template

ผลลัพธ์:

- `primary-lesson-template-pack-plan.md`

### Phase 4: Canonical Import Preparation

- เทียบข้อมูลกับ subject catalog และ grade model ปัจจุบัน
- ตรวจว่า unit ids ไม่ซ้ำกับ starter pack เดิม
- เตรียมแผนเพิ่มหรือแยก primary map packs โดยไม่ทำให้ secondary/core pack เดิมพัง
- เตรียม test cases สำหรับ map packs, outcomes, templates, AI rules

ผลลัพธ์:

- รายการ code changes ที่ต้องทำในรอบถัดไป
- checklist สำหรับ QA ก่อนแก้ source code

## QA Checklist

ก่อนถือว่า Markdown database พร้อมใช้:

- ตรวจว่าทุกชั้น ป.1-ป.6 มีรายการวิชาครบตาม DOCX
- ตรวจว่าทุกวิชามี `subjectId` ที่ map ได้กับ canonical catalog
- ตรวจว่าทุกหน่วยมี `unitId` ไม่ซ้ำ
- ตรวจว่าทุกข้อมูลจาก DOCX มี source/provenance
- ตรวจว่าข้อมูลคลุมเครือถูก mark เป็น `needsReview`
- ตรวจว่าภาษาไทยอ่านได้ ไม่เกิด mojibake ใน Markdown
- ตรวจว่า Markdown render แล้วอ่านง่าย

ก่อนนำเข้า canonical code:

```powershell
npx.cmd vitest run src/lib/curriculum/__tests__/subject-catalog.test.ts src/lib/curriculum/__tests__/map-packs.test.ts src/lib/curriculum/__tests__/unit-learning-outcomes.test.ts src/lib/curriculum/__tests__/template-master-pack.test.ts src/lib/curriculum/__tests__/ai-curriculum-rules.test.ts
```

## ความเสี่ยงและข้อควรระวัง

- DOCX อาจมีข้อมูลในตารางที่แตกเมื่อ extract ต้องตรวจเทียบกับต้นฉบับ
- ชื่อวิชา/รายวิชาอาจไม่ตรงกับ canonical subjectId ต้อง normalize อย่างระวัง
- ตัวชี้วัดจากเอกสารอาจเป็นข้อความรวม ไม่ควรนำไปใช้เป็น official outcome โดยไม่ mark source
- ระบบเดิมมี starter template pack 8 กลุ่มสาระอยู่แล้ว ต้องต่อยอด ไม่สร้าง selector หรือ schema ซ้ำ
- รอบแรกควรสร้าง Markdown database เท่านั้น ยังไม่ควรแก้ `lesson_content_v2` หรือ route สร้างบทเรียน

## Definition Of Done

- มี `primary-grade-1-6-course-database.md` ที่แยก ป.1-ป.6 และวิชาได้ครบตาม DOCX
- มี `primary-grade-1-6-extraction-report.md` ที่อธิบายแหล่งข้อมูลและจุดต้องตรวจซ้ำ
- มี `primary-lesson-template-pack-plan.md` สำหรับต่อยอดเป็น canonical template pack
- ข้อมูลใช้ id ที่เสถียรและ map กับ canonical subjectId ได้
- ไม่มีการสร้าง V1 lesson payload ใหม่
- ยังไม่มีการเปลี่ยนแปลง runtime/UI จนกว่าจะตรวจฐานข้อมูล Markdown ผ่าน
