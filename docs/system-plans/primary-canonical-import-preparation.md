# Primary Grade 1-6 Canonical Import Preparation

## เป้าหมาย

เตรียมข้อมูล Phase 1-3 ให้พร้อมสำหรับนำเข้า canonical curriculum domain ของ GameEdu โดยยังไม่แก้ runtime, UI, หรือ `lesson_content_v2`

แหล่งข้อมูลที่ใช้:

- `docs/curriculum-imports/primary-grade-1-6-extraction-report.md`
- `docs/curriculum-imports/primary-grade-1-6-course-database.md`
- `docs/system-plans/primary-lesson-template-pack-plan.md`
- DOCX ต้นทาง: `C:\Users\IHCK\Downloads\โครงสร้างรายวิชาพื้นฐานตามสาระการเรียนรู้ พื้นฐาน.docx`

## Current Import Metrics

| metric | value |
| --- | ---: |
| course records | 84 |
| raw unit rows | 492 |
| normalized unit records | 489 |
| grade levels | 6 |
| canonical subject ids | 8 |
| template families | 9 |
| course title mappings | 14 |
| unresolved review items | 1 |

จุดที่ต้องตรวจซ้ำก่อน import:

- `science-g1-u02`: ข้อมูลตัวชี้วัดและสาระสำคัญครบ แต่ `estimatedHours` อ่านจาก DOCX ไม่ได้

## Source Registry Preparation

ต้องเพิ่ม source registry entry ใหม่สำหรับ DOCX ประถมศึกษา โดยใช้ provenance แบบ file capture

Proposed entry:

```ts
export const PRIMARY_CORE_DOCX_SOURCE_ID = "primary-core-course-structure-docx"

export const PRIMARY_CORE_DOCX_SOURCE_ENTRY: CurriculumSourceRegistryEntry = {
  id: PRIMARY_CORE_DOCX_SOURCE_ID,
  provider: "teacher",
  title: "โครงสร้างรายวิชาพื้นฐานตามสาระการเรียนรู้ พื้นฐาน",
  officialType: "teacher_uploaded_curriculum_reference",
  verificationStatus: "verified_file_capture",
  subjectIds: [
    "thai",
    "mathematics",
    "science_technology",
    "social_religion_culture",
    "health_physical_education",
    "arts",
    "career",
    "foreign_languages",
  ],
  gradeSpans: ["p1_p3", "p4_p6"],
  priority: 2,
  usages: ["curriculum_reference", "structure_reference", "subject_reference"],
  copyrightPolicy: [
    "Use for curriculum alignment, course structure, unit mapping, and outcome coverage only.",
    "Do not copy textbook prose, publisher-exclusive examples, images, or page layout into generated lessons.",
  ],
  fileCapture: {
    format: "docx",
    originalFileName: "โครงสร้างรายวิชาพื้นฐานตามสาระการเรียนรู้ พื้นฐาน.docx",
    checksumSha256: "8d3f22d7184181aba6090b28dd468108b8a6e01404ce9532555d25e6aa22c0f5",
    capturedAt: "2026-07-04",
  },
}
```

หมายเหตุ:

- `provider: "teacher"` ใช้ได้กับ schema ปัจจุบัน
- `officialType: "teacher_uploaded_curriculum_reference"` ใช้ได้กับ schema ปัจจุบัน
- ไม่ควรใช้ source นี้เป็น official curriculum authority เดี่ยว ต้องคง `core-basic-education-2551-overview` เป็น backbone ด้วย

## Grade Mapping

Phase 2 ใช้ชื่ออ่านง่ายใน Markdown database:

| Phase 2 value | canonical value | grade band |
| --- | --- | --- |
| `grade_1` | `p1` | `p1_p3` |
| `grade_2` | `p2` | `p1_p3` |
| `grade_3` | `p3` | `p1_p3` |
| `grade_4` | `p4` | `p4_p6` |
| `grade_5` | `p5` | `p4_p6` |
| `grade_6` | `p6` | `p4_p6` |

Canonical code ต้องใช้ `p1`-`p6` เท่านั้น เพราะ `canonicalGradeLevelSchema` ไม่รองรับ `grade_1`

## Course Id Mapping

Phase 2 `courseId` เป็น Markdown id เช่น:

- `thai-language-use-g1`
- `mathematics-g4`
- `english-smile-g6`

Canonical `course-catalog.ts` ปัจจุบันใช้รูปแบบ:

```ts
`${subjectId}:${courseDefinitionId}:${gradeLevel}`
```

ข้อเสนอสำหรับ primary:

| Phase 2 courseId | Canonical course id |
| --- | --- |
| `thai-language-use-g1` | `thai:thai-language-use:p1` |
| `thai-literature-g6` | `thai:thai-literature:p6` |
| `mathematics-g4` | `mathematics:mathematics:p4` |
| `science-g3` | `science_technology:science:p3` |
| `computing-science-g5` | `science_technology:computing-science:p5` |
| `social-studies-g2` | `social_religion_culture:social-studies:p2` |
| `english-smile-g6` | `foreign_languages:english-smile:p6` |

เหตุผล:

- สอดคล้องกับ `buildCourseId(...)` เดิม
- กรองด้วย subject/grade ได้เหมือน secondary
- ไม่ปน `g1` กับ canonical grade `p1`

## Proposed Module Layout

เพิ่มไฟล์ใหม่โดยไม่ปะปนกับ secondary import:

```text
src/lib/curriculum/import/
  primary-core-docx-source.ts
  primary-core-course-source.ts
  primary-core-course-rows.json
  primary-core-course-rows-payload.ts
  primary-core-unit-rows-source.ts
  primary-core-unit-rows.json
  primary-core-unit-rows-payload.ts
```

เพิ่มหรือแก้ไฟล์ canonical:

```text
src/lib/curriculum/source-registry.ts
src/lib/curriculum/course-catalog.ts
src/lib/curriculum/course-detail-catalog.ts
src/lib/curriculum/map-packs.ts
src/lib/curriculum/unit-learning-outcomes.ts
src/lib/curriculum/template-master-pack.ts
src/lib/curriculum/ai-curriculum-rules.ts
```

เพิ่ม tests:

```text
src/lib/curriculum/__tests__/primary-core-course-source.test.ts
src/lib/curriculum/__tests__/primary-core-unit-rows.test.ts
src/lib/curriculum/__tests__/primary-course-catalog.test.ts
src/lib/curriculum/__tests__/primary-template-master-pack.test.ts
```

## Schema Decisions Before Import

### Decision 1: Add Primary Course Definitions

แนะนำให้เพิ่ม primary definitions แยกจาก `SECONDARY_CORE_COURSE_DEFINITIONS`

```ts
type PrimaryCoreCourseDefinition = {
  id: string
  coreSubjectId: CanonicalCoreSubjectId
  titleTh: string
  titleEn: string | null
  gradeLevels: CanonicalGradeLevel[]
  sourceTitleTh: string | ((gradeLevel: CanonicalGradeLevel) => string)
}
```

### Decision 2: Unit Ownership

มี 2 ทาง:

1. ใช้ subject-level `map-packs.ts` เดิม แล้วเพิ่ม primary unit ids เข้า pack เดิม
2. เพิ่ม course-aware primary unit source แล้วให้ course detail อ่าน units จาก `primary-core-unit-rows`

ข้อเสนอ: ใช้ทางที่ 2 ก่อน เพราะ Phase 2 มี 489 normalized units ที่เป็น course/grade specific มากกว่าหน่วย subject-wide แบบ starter pack เดิม

### Decision 3: Template Schema

`SubjectLessonTemplate` ปัจจุบันไม่มี:

- `gradeLevel`
- `courseId`
- `courseKey`
- `templateFamilyId`

ข้อเสนอ: ขยาย schema อย่างจำกัด:

```ts
gradeLevel: canonicalGradeLevelSchema.optional()
courseId: z.string().trim().min(1).optional()
courseKey: z.string().trim().min(1).optional()
templateFamilyId: z.string().trim().min(1).optional()
```

เหตุผล:

- ยัง compatible กับ starter pack เดิม
- primary template เลือกได้ละเอียดตามชั้น/รายวิชา
- UI สามารถ filter subject -> grade -> course -> unit -> template ได้

### Decision 4: Outcome Creation

ยังไม่ควรสร้าง outcome จากข้อความ raw แบบเต็มทันที

ข้อเสนอรอบแรก:

- สร้าง topic ids จาก normalized unit title และ keyConcept
- สร้าง learning outcome แบบ platform-aligned จาก `keyConcept` + `indicatorRefs`
- เก็บ `indicatorRefs` เป็น provenance แต่ไม่ claim ว่าเป็น official indicator ids จนกว่าจะ crosswalk กับ canonical indicators ผ่าน

## Import Order

1. Fix/confirm `science-g1-u02` estimated hours
2. Add `primary-core-docx-source.ts`
3. Add primary course/unit source schemas and JSON payloads
4. Add source registry entry
5. Add primary course definitions to `course-catalog.ts`
6. Add primary course detail resolver behavior
7. Add primary unit/topic/outcome mapping
8. Add primary template pack generation from Phase 3 strategy
9. Extend AI curriculum rules to accept primary course/unit/template metadata
10. Run targeted curriculum tests
11. Only after tests pass, wire UI filters if needed

## Validation Rules

Phase 4 import must validate:

- source registry id exists
- every course id is unique
- every course grade is canonical `p1`-`p6`
- every course subject is a canonical core subject
- every course has at least one unit
- every unit id is unique within the import
- every unit has title, key concept, and estimated hours or explicit `needsReview`
- every template id is globally unique
- every template `subjectId` matches its course subject
- every template `courseId` resolves when present
- every template `gradeLevel` matches course grade when present
- every template includes `assessment_bridge`
- no template generates quiz questions directly

## Test Plan

Run after import implementation:

```powershell
npx.cmd vitest run src/lib/curriculum/__tests__/source-registry.test.ts src/lib/curriculum/__tests__/course-catalog.test.ts src/lib/curriculum/__tests__/course-detail-catalog.test.ts
npx.cmd vitest run src/lib/curriculum/__tests__/primary-core-course-source.test.ts src/lib/curriculum/__tests__/primary-core-unit-rows.test.ts
npx.cmd vitest run src/lib/curriculum/__tests__/unit-learning-outcomes.test.ts src/lib/curriculum/__tests__/template-master-pack.test.ts src/lib/curriculum/__tests__/ai-curriculum-rules.test.ts
```

Full safety check before UI work:

```powershell
npx.cmd tsc --noEmit
npx.cmd vitest run src/lib/curriculum/__tests__
```

## Risks

- Phase 2 `grade_1` naming must not leak into canonical code
- Primary unit ids are course-specific, while current `map-packs.ts` is subject-level
- Existing `template-master-pack.ts` assumes one pack per subject, not per grade/course
- Indicator refs from DOCX are text references, not guaranteed to match canonical indicator ids until crosswalked
- Large import can make template catalog very large if generating one template per 489 units

## Recommendation

Do canonical import in two commits/phases:

1. Data import foundation:
   - source registry
   - primary course/unit source schemas
   - course catalog/detail support
   - tests

2. Template import:
   - schema extension for `gradeLevel`, `courseId`, `courseKey`, `templateFamilyId`
   - primary template generation
   - AI rule filtering
   - tests

This keeps breakage easier to locate and avoids mixing course catalog behavior with template behavior.

## Definition Of Done

- Phase 4 plan identifies exact canonical files to change
- Source registry entry is ready with checksum
- Grade/course id mapping is specified
- Schema decisions are documented
- Import order is clear
- Validation and tests are listed
- No canonical source code has been changed yet
