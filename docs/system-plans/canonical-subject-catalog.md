# Canonical Subject Catalog

Last updated: 2026-06-21  
Status: Phase 2 complete

## Goal

สร้าง `subject catalog` กลางของระบบ เพื่อให้ lesson, course, assessment, analytics และ curriculum packs ใช้ `subject id` ชุดเดียวกันก่อนจะไปเชื่อม runtime ทั้งระบบใน phase ถัดไป

ไฟล์อ้างอิงหลัก:

- [src/lib/curriculum/subject-catalog.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/curriculum/subject-catalog.ts)
- [src/lib/curriculum/source-registry.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/curriculum/source-registry.ts)
- [src/lib/curriculum/__tests__/subject-catalog.test.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/curriculum/__tests__/subject-catalog.test.ts)

## Delivered

- เพิ่ม canonical ids สำหรับ 8 กลุ่มสาระหลัก
- เพิ่ม canonical ids สำหรับ 4 รายวิชาเพิ่มเติมสายวิทยาศาสตร์
- เพิ่มชื่อวิชาไทย/อังกฤษ
- เพิ่ม `parentSubjectId` สำหรับ additional science subjects
- เพิ่ม grade coverage ต่อวิชา
- เพิ่ม subject metadata สำหรับ UI
- เพิ่ม helper สำหรับ map label/alias ไปเป็น canonical subject
- เพิ่ม source registry linkage ต่อวิชา
- เพิ่ม targeted tests

## Canonical Subject Set

### Core learning areas

- `thai`
- `mathematics`
- `science_technology`
- `social_religion_culture`
- `health_physical_education`
- `arts`
- `career`
- `foreign_languages`

### Additional science subjects

- `physics`
- `chemistry`
- `biology`
- `earth_space_science`

## Current model

แต่ละวิชามี metadata กลางดังนี้:

- `id`
- `displayNameTh`
- `displayNameEn`
- `shortCode`
- `groupType`
- `parentSubjectId` สำหรับรายวิชาเพิ่มเติม
- `gradeBands`
- `gradeLevels`
- `supportsSemester`
- `sourceRegistryIds`
- `keywords`
- `aliases`
- `ui.icon`
- `ui.colorToken`
- `ui.accentToken`

## Parent-child rule

- กลุ่มสาระหลักใช้ `groupType = core_learning_area`
- รายวิชาเพิ่มเติมใช้ `groupType = additional_subject`
- ตอนนี้รายวิชาเพิ่มเติมทั้งหมดต้องผูก `parentSubjectId = science_technology`

## Grade coverage rule

- กลุ่มสาระหลักครอบคลุม `p1` ถึง `m6`
- รายวิชาเพิ่มเติมชุดแรกครอบคลุม `m4` ถึง `m6`
- phase นี้ระบุ coverage ระดับวิชาแล้ว
- phase ถัดไปจะทำ `grade band / semester model` ให้เป็น layer กลางที่ละเอียดขึ้น

## Helpers ready to use

- `isCanonicalSubjectId()`
- `isCanonicalSubjectCatalog()`
- `validateCanonicalSubjectCatalog()`
- `getCanonicalSubjectById()`
- `getCanonicalSubjectDisplayName()`
- `getCanonicalSubjectsByGroupType()`
- `getCanonicalChildSubjects()`
- `findCanonicalSubjectByLabel()`
- `getCanonicalSubjectSourceEntries()`

## What this phase intentionally does not do

- ยังไม่รีแฟกเตอร์ทุก route/page ให้บังคับใช้ catalog นี้ทันที
- ยังไม่ทำ semester model กลางทั้งระบบ
- ยังไม่สร้าง unit map ของทุกวิชา
- ยังไม่ย้าย lesson/course records เดิมทั้งหมด

Phase นี้ทำหน้าที่วาง `canonical subject center` ให้พร้อมก่อน เพื่อให้ phase 3-4 ไปต่อได้แบบไม่ต้อง hardcode รายวิชาใหม่อีกรอบ

## Done criteria

ถือว่า phase นี้ผ่านเมื่อ:

- มี `subject id` กลางชุดเดียว
- วิชาหลักและวิชาเพิ่มเติมใช้ schema เดียวกัน
- สามารถ map label ไทย/อังกฤษกลับมาเป็น subject เดียวกันได้
- ทุกวิชามี source registry linkage กลับไปหา curriculum source ได้
- tests ผ่าน
