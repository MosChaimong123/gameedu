# Subject Template Master Pack

Last updated: 2026-06-21  
Status: done

## Goal

สร้าง `lesson template master pack` กลางต่อวิชา เพื่อให้ระบบบทเรียนใหม่ของ TeachPlayEdu มีแม่แบบตั้งต้นที่ใช้โครงเดียวกันทุกวิชาแกนหลัก และพร้อมต่อกับ AI, teacher builder, publish guard, และ student player ใน phase ถัดไป

## What Phase 6 Adds

- เพิ่ม schema กลางใน `src/lib/curriculum/template-master-pack.ts`
- รองรับ `video_first`, `document_first`, `practice_first`
- รองรับ `topic-based lesson structure`
- รองรับ `required blocks` รายวิชา
- รองรับ `media requirements` และ `document requirements`
- รองรับ `teacher override fields`
- มี starter template pack สำหรับ 8 กลุ่มสาระหลัก
- มี targeted tests สำหรับ validate catalog และ crosswalk กับ unit outcomes

## Canonical Contracts

โครงหลักที่เพิ่ม:

- `SubjectLessonTemplate`
- `SubjectLessonTemplatePack`
- `subjectTemplatePedagogySchema`
- `subjectTemplateBlockTypeSchema`
- `subjectTemplateMediaRequirementSchema`
- `subjectTemplateDocumentRequirementSchema`
- `subjectTemplateTeacherOverrideSchema`

แต่ละ template จะระบุอย่างน้อย:

- `subjectId`
- `unitId`
- `title`
- `description`
- `pedagogy`
- `requiredBlocks`
- `suggestedOutcomeIds`
- `topicStructure`
- `mediaRequirements`
- `documentRequirements`
- `teacherOverrides`

## Starter Master Pack Coverage

starter master pack ชุดนี้ครอบคลุม 8 กลุ่มสาระหลัก:

1. ภาษาไทย
2. คณิตศาสตร์
3. วิทยาศาสตร์และเทคโนโลยี
4. สังคมศึกษา ศาสนา และวัฒนธรรม
5. สุขศึกษาและพลศึกษา
6. ศิลปะ
7. การงานอาชีพ
8. ภาษาต่างประเทศ

แต่ละวิชาจะมีอย่างน้อย 1 template ตั้งต้น ที่ผูกกับ:

- unit แรกของ subject starter map pack
- outcome pack ของ unit เดียวกัน
- topic structure ที่ดึงจาก topic จริงใน canonical unit outcome pack

## Pedagogy Modes

### `video_first`

เหมาะกับวิชาที่ใช้สื่อสาธิตหรือคลิปเป็นจุดเริ่ม เช่น:

- วิทยาศาสตร์และเทคโนโลยี
- สุขศึกษาและพลศึกษา
- ภาษาต่างประเทศ

### `document_first`

เหมาะกับวิชาที่ใช้บทอ่าน ข้อความอ้างอิง หรือกรณีศึกษาเป็นแกน เช่น:

- ภาษาไทย
- สังคมศึกษา ศาสนา และวัฒนธรรม

### `practice_first`

เหมาะกับวิชาที่เน้นลงมือทำหรือแก้โจทย์เป็นแกน เช่น:

- คณิตศาสตร์
- ศิลปะ
- การงานอาชีพ

## Required Blocks

ระบบรองรับ block กลางชุดเดียว:

- `objectives`
- `topics`
- `instruction`
- `practice`
- `media`
- `documents`
- `summary`
- `assessment_bridge`

แต่ละวิชาจะเลือก block ที่ต้องมีต่างกันได้ เช่น:

- คณิตศาสตร์เน้น `practice`
- ภาษาไทยเน้น `documents`
- วิทยาศาสตร์เน้น `media` + `practice`

## Teacher Overrides

starter template pack ชุดนี้รองรับ field override กลาง เช่น:

- เปลี่ยนชื่อบทเรียน
- สลับลำดับหัวข้อ
- เพิ่มหัวข้อ
- เปลี่ยนสื่อ
- เปลี่ยนเอกสาร
- trim outcome บางตัวในขอบเขต unit เดิม

ยังไม่ใช่ UI phase แต่เป็น contract ที่ phase ถัดไปสามารถอ่านไปใช้ต่อได้ทันที

## Validation Rules

validator กลางเช็กเรื่องสำคัญดังนี้:

- subject pack แต่ละตัวต้องมี `subjectId` ไม่ซ้ำ
- template id ต้องไม่ซ้ำทั้ง catalog
- template ต้องอยู่ใน subject เดียวกับ pack แม่
- `suggestedOutcomeIds` ต้องมาจาก unit outcome pack เดียวกัน
- `topicStructure.topicIds` ต้องอ้างถึง topic จริงใน unit เดียวกัน
- `topicStructure.outcomeIds` ต้องอ้างถึง outcome จริงใน unit เดียวกัน
- `requiredBlocks` ห้ามซ้ำ

## Relationship To Existing Physics Work

phase นี้ยัง **ไม่รื้อ** physics template flow เดิมใน `src/lib/physics/*`

เหตุผล:

- ให้มี canonical layer กลางก่อน
- ลดความเสี่ยงจากการ refactor physics path เกิน scope ของ phase นี้
- เปิดทางให้ phase หลังเชื่อม physics เข้ามาแบบค่อยเป็นค่อยไป

สรุปคือ physics ยังเป็น subject pack ที่ลึกกว่าเดิมอยู่ แต่ตอนนี้ระบบมี `subject template layer` กลางสำหรับทุกวิชาแล้ว

## Validation

targeted tests:

```powershell
npm.cmd test -- src/lib/curriculum/__tests__/source-registry.test.ts src/lib/curriculum/__tests__/subject-catalog.test.ts src/lib/curriculum/__tests__/grade-model.test.ts src/lib/curriculum/__tests__/map-packs.test.ts src/lib/curriculum/__tests__/unit-learning-outcomes.test.ts src/lib/curriculum/__tests__/template-master-pack.test.ts src/lib/physics/__tests__/curriculum.test.ts src/lib/lessons/__tests__/lesson-content.test.ts
```

## Done Definition

phase นี้ถือว่า done เมื่อ:

- ทุกวิชาแกนหลักสร้าง lesson draft ตั้งต้นจาก template กลางได้
- template ทุกตัวผูกกับ unit/topic/outcome แบบ canonical
- phase ถัดไปสามารถอ่าน `subject template master pack` ไปต่อ builder หรือ AI ได้โดยไม่ต้อง hardcode ต่อวิชาใหม่
