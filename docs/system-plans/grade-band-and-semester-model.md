# Grade Band And Semester Model

Last updated: 2026-06-21  
Status: Phase 3 complete

## Goal

สร้างโมเดล `grade band`, `grade level`, และ `semester` กลาง เพื่อให้ curriculum map ทุกวิชาพูดภาษาเดียวกัน และรองรับทั้งวิชาที่ต้องล็อกเทอม กับวิชาที่ไม่ยึดเทอมแบบแข็ง

ไฟล์อ้างอิงหลัก:

- [grade-model.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/curriculum/grade-model.ts)
- [subject-catalog.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/curriculum/subject-catalog.ts)
- [curriculum.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/physics/curriculum.ts)
- [grade-model.test.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/curriculum/__tests__/grade-model.test.ts)

## Delivered

- เพิ่ม `canonicalGradeBandSchema`
- เพิ่ม `canonicalGradeLevelSchema`
- เพิ่ม `canonicalUpperSecondaryGradeLevelSchema`
- เพิ่ม `canonicalSemesterSchema`
- เพิ่ม `canonicalSemesterModeSchema`
- เพิ่ม `curriculumPlacementSchema`
- เพิ่ม helper สำหรับ label และ grade band mapping
- ให้ physics เริ่ม reuse grade/semester model กลางแล้ว
- เพิ่ม targeted tests

## Canonical enums

### Grade bands

- `p1_p3`
- `p4_p6`
- `m1_m3`
- `m4_m6`

### Grade levels

- `p1` `p2` `p3`
- `p4` `p5` `p6`
- `m1` `m2` `m3`
- `m4` `m5` `m6`

### Semester

- `1`
- `2`

### Semester mode

- `required`
- `optional`
- `not_applicable`

## Why semesterMode exists

ก่อนหน้านี้หลายจุดในระบบมอง semester เป็นแค่เลข `1 | 2` ทำให้แยกไม่ออกว่า:

- วิชานั้น “ต้อง” มีเทอม
- วิชานั้น “มีได้แต่ไม่ควรบังคับ”
- วิชานั้น “ไม่ควรใช้เทอมเลย”

ตอนนี้เราแยก rule นี้ชัดขึ้นด้วย `semesterMode`

## Current usage rule

- วิชาเพิ่มเติมสายวิทยาศาสตร์ เช่น `physics` ใช้ `semesterMode = required`
- กลุ่มสาระหลักที่ยังไม่ได้ล็อก mapping ต่อเทอมละเอียด ใช้ `semesterMode = optional`
- ถ้าในอนาคตมี course/lesson ที่ไม่ควรอิงเทอมเลย ให้ใช้ `not_applicable`

## Helpers ready to use

- `getGradeBandForLevel()`
- `getCanonicalGradeLevelLabel()`
- `getCanonicalGradeBandLabel()`
- `getCanonicalSemesterLabel()`
- `buildCurriculumPlacement()`
- `isCurriculumPlacement()`

## Done criteria

ถือว่า phase นี้ผ่านเมื่อ:

- grade level และ grade band มี schema กลาง
- semester มี schema กลาง
- สามารถบอกได้ว่าวิชาใด required/optional/not_applicable ต่อ semester
- curriculum placement ถูก validate ได้จาก schema เดียว
- physics เริ่มอ้างอิงโมเดลกลางแล้ว
- tests ผ่าน
