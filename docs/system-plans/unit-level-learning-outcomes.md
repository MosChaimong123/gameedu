# Unit-Level Learning Outcomes

Last updated: 2026-06-21  
Status: Phase 5 complete

## Goal

แตก `learning outcomes` ต่อหน่วยให้พร้อมใช้งานในระบบ โดย outcome แต่ละตัวต้องอ้างถึงหน่วยและหัวข้อย่อยได้ชัด มี concepts, skills, assessment hints และมีกติกา crosswalk สำหรับ lesson/assessment runtime

ไฟล์อ้างอิงหลัก:

- [unit-learning-outcomes.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/curriculum/unit-learning-outcomes.ts)
- [unit-learning-outcomes.test.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/curriculum/__tests__/unit-learning-outcomes.test.ts)
- [map-packs.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/curriculum/map-packs.ts)
- [physics/curriculum.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/physics/curriculum.ts)

## Delivered

- เพิ่ม schema `SubjectUnitTopic`
- เพิ่ม schema `SubjectUnitLearningOutcome`
- เพิ่ม schema `SubjectUnitLearningOutcomePack`
- เพิ่ม `topics` ต่อ unit
- เพิ่ม `learningOutcomes` ต่อ unit สำหรับ core 8 learning areas
- เพิ่ม `crosswalkRules`
- เพิ่ม helper lookup และ selection validator
- เพิ่ม targeted tests

## Current scope

Phase นี้ครอบคลุม 2 ชั้นพร้อมกัน:

- `core 8 learning areas`
  - outcome packs ระดับ unit สำหรับ starter packs
- `physics`
  - detailed outcomes เดิมยังคงอยู่ใน [curriculum.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/physics/curriculum.ts)

ดังนั้น runtime ถัดไปจะมีทั้ง:

- `core starter unit outcomes`
- `physics detailed unit outcomes`

โดยยังไม่บังคับ merge เป็น schema เดียวทั้งโลกใน phase นี้

## Outcome pack structure

แต่ละ unit outcome pack มี:

- `subjectId`
- `unitId`
- `unitTitle`
- `topics`
- `learningOutcomes`
- `crosswalkRules`

แต่ละ outcome มี:

- `id`
- `text`
- `concepts`
- `skills`
- `topicIds`
- `assessmentHints`
- `sourceRefs`

## Crosswalk rules added

ตอนนี้ outcome packs กลางมีกติกาเริ่มต้นดังนี้:

- `sameSubjectOnly = true`
- `sameUnitOnly = true`
- `minPrimaryOutcomeCount = 1`
- `allowSupportingOutcomes = true`
- `allowTeacherOverride = true`

แปลว่า lesson หรือ assessment ที่เลือก outcome ต้องมี primary outcome อย่างน้อย 1 ตัว และโดยค่าเริ่มต้น outcome ทุกตัวต้องอยู่ใน unit เดียวกันก่อน

## Runtime helpers ready

- `getSubjectUnitLearningOutcomePack()`
- `listSubjectUnitLearningOutcomes()`
- `findSubjectUnitLearningOutcome()`
- `validateSubjectUnitOutcomeSelection()`

ตัว validator จะกันกรณี:

- subject id ไม่ถูก
- unit ไม่มี pack
- primary outcome ไม่มี
- supporting outcome อยู่คนละ unit
- supporting outcome ซ้ำกัน

## Done criteria

ถือว่า phase นี้ผ่านเมื่อ:

- unit maps เริ่มมี outcomes ใช้ได้จริง
- outcomes ผูกกับ topics ได้
- มี concepts / skills / assessment hints ครบ
- มี crosswalk rules ชัดเจน
- lesson template และ assessment generator สามารถอ้าง outcome ได้ตรง unit
- tests ผ่าน
