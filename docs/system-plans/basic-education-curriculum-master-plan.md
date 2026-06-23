# Basic Education Curriculum Master Plan

Last updated: 2026-06-21  
Status: Planning

## Goal

สร้าง `master plan` สำหรับพัฒนาระบบหลักสูตรและบทเรียนของ TeachPlayEdu ให้รองรับ `หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน` ครบทุกวิชา โดยใช้โครงสร้างข้อมูลกลางเดียวกันทั้งระบบ ตั้งแต่:

- curriculum map
- unit / topic outcomes
- lesson templates
- AI lesson generation
- assessment
- classroom assignment
- student progress
- teacher analytics

แผนนี้ตั้งใจให้เป็น `แผนกลางทั้งแพลตฟอร์ม` ไม่ใช่แค่แผนของฟิสิกส์วิชาเดียว

## Source Baseline

ข้อมูลอ้างอิงรอบแรกที่ใช้วางแผนนี้:

1. สสวท. หลักสูตรวิทยาศาสตร์ คณิตศาสตร์ และเทคโนโลยี ตามหลักสูตรแกนกลาง 2551 ฉบับปรับปรุง 2560  
   [IPST Curriculum](https://www.ipst.ac.th/curriculum)

2. หน้าเดียวกันของ สสวท. ระบุว่า:
   - กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี แบ่งเป็น 4 สาระหลัก
   - มีสาระเพิ่มเติม 4 สาระ ได้แก่ ชีววิทยา เคมี ฟิสิกส์ และโลก ดาราศาสตร์และอวกาศ
   - กลุ่มสาระคณิตศาสตร์ แบ่งเป็น 3 สาระหลัก  
   อ้างอิงจาก [IPST Curriculum](https://www.ipst.ac.th/curriculum)

3. อักษรเอ็ดดูเคชั่น ใช้เป็น reference ฝั่งการจัดหมวดระดับชั้น/สินค้าตามหลักสูตรการศึกษาขั้นพื้นฐาน  
   [Aksorn Basic Education Catalog](https://www.aksorn.com/store/basic-education-th)

4. แม็คเอ็ดดูเคชั่น ใช้เป็น reference ฝั่งการจัดหมวดสื่อและหนังสือเรียนตามระดับชั้น  
   [MacEducation Product Catalog](https://www.maceducation.com/product/)

## What We Can Safely Use

เราใช้แหล่งข้อมูลเหล่านี้คนละหน้าที่:

- `หลักสูตรทางการ`: ใช้กำหนด subject map, unit map, learning outcomes, assessment coverage
- `catalog publisher`: ใช้ช่วยดูรูปแบบการจัดระดับชั้น/การแบ่งหน่วย/ภาษาที่ครูคุ้นเคย
- `platform canonical model`: ใช้เป็นโครงข้อมูลกลางของระบบเรา

ข้อสำคัญ:

- ห้ามคัดลอกเนื้อหาหนังสือเรียนหรือบทอธิบายเชิงพาณิชย์เข้าระบบตรงๆ
- ให้ใช้หลักสูตรและโครงสาระเป็นฐาน แล้วสร้าง lesson template และ lesson content ใหม่ในระบบเรา

## Curriculum Scope

แผนนี้ครอบคลุม `8 กลุ่มสาระการเรียนรู้` ของหลักสูตรแกนกลาง:

1. ภาษาไทย
2. คณิตศาสตร์
3. วิทยาศาสตร์และเทคโนโลยี
4. สังคมศึกษา ศาสนา และวัฒนธรรม
5. สุขศึกษาและพลศึกษา
6. ศิลปะ
7. การงานอาชีพ
8. ภาษาต่างประเทศ

และต้องรองรับทั้ง:

- ระดับประถมศึกษา
- ระดับมัธยมศึกษาตอนต้น
- ระดับมัธยมศึกษาตอนปลาย

สำหรับสายวิชาเพิ่มเติมในมัธยมปลาย ให้รองรับอย่างน้อย:

- ฟิสิกส์
- เคมี
- ชีววิทยา
- โลก ดาราศาสตร์ และอวกาศ

## Platform Principle

ระบบใหม่ต้องแยกชัด 5 ชั้น:

1. `Curriculum Source Layer`
   - เก็บแหล่งอ้างอิงหลักสูตร
   - เก็บ metadata ว่าแต่ละวิชามาจากแหล่งใด

2. `Canonical Curriculum Layer`
   - subject
   - grade band
   - term / semester
   - unit
   - topic
   - learning outcomes
   - assessment coverage

3. `Template Layer`
   - แม่แบบบทเรียน
   - แม่แบบคอร์ส
   - แม่แบบแบบทดสอบ

4. `Content Layer`
   - lesson content
   - topic content
   - media attachments
   - assessment items

5. `Runtime Layer`
   - teacher builder
   - publish gate
   - classroom assign
   - student player
   - progress / pass-fail / analytics

## Proposed Canonical Subject Map

```ts
type CanonicalSubjectId =
  | "thai"
  | "mathematics"
  | "science_technology"
  | "social_religion_culture"
  | "health_physical_education"
  | "arts"
  | "career"
  | "foreign_languages"

type CanonicalAdditionalSubjectId =
  | "physics"
  | "chemistry"
  | "biology"
  | "earth_space_science"
```

## Proposed Grade Structure

```ts
type GradeBand =
  | "p1_p3"
  | "p4_p6"
  | "m1_m3"
  | "m4_m6"

type GradeLevel =
  | "p1" | "p2" | "p3" | "p4" | "p5" | "p6"
  | "m1" | "m2" | "m3" | "m4" | "m5" | "m6"
```

## Proposed Curriculum Contracts

```ts
type CurriculumSourceRef = {
  provider: "core_curriculum" | "ipst" | "aksorn" | "maceducation" | "teacher"
  title: string
  url?: string
  note?: string
  usage:
    | "curriculum_reference"
    | "structure_reference"
    | "subject_reference"
    | "teacher_override"
}

type CurriculumSubjectMap = {
  subjectId: CanonicalSubjectId | CanonicalAdditionalSubjectId
  curriculumCode: "basic_education_2551"
  revisedCode?: "revised_2560"
  displayNameTh: string
  gradeLevels: GradeLevel[]
  units: CurriculumUnit[]
  sourceRefs: CurriculumSourceRef[]
}

type CurriculumUnit = {
  id: string
  subjectId: CanonicalSubjectId | CanonicalAdditionalSubjectId
  gradeLevel: GradeLevel
  semester?: 1 | 2
  title: string
  order: number
  topics: CurriculumTopic[]
  learningOutcomeIds: string[]
}

type CurriculumTopic = {
  id: string
  title: string
  order: number
  description?: string
}

type LearningOutcome = {
  id: string
  text: string
  concepts: string[]
  skills: string[]
  assessmentHints?: string[]
}
```

## Rollout Priority

เราควรแบ่งการทำงานเป็น 3 wave:

### Wave A: Foundation

- subject catalog กลาง
- curriculum contracts
- validators
- source registry
- publish rules
- assessment rules

### Wave B: Core Subjects

เริ่มจากวิชาที่มี demand สูงและใช้ซ้ำได้กว้าง:

1. คณิตศาสตร์
2. วิทยาศาสตร์และเทคโนโลยี
3. ภาษาไทย
4. ภาษาอังกฤษ / ภาษาต่างประเทศ

### Wave C: Remaining Subjects

1. สังคมศึกษา ศาสนา และวัฒนธรรม
2. สุขศึกษาและพลศึกษา
3. ศิลปะ
4. การงานอาชีพ

## Current Repo Position

จากสิ่งที่มีอยู่ใน repo ตอนนี้:

- เรามีฐาน `physics` ลึกที่สุดแล้ว
- มีเอกสารและ schema ระดับวิชานำร่องสำหรับฟิสิกส์
- มี lesson/course/player/assessment flow ที่ใช้ต่อยอดเป็นแกนกลางได้

ดังนั้นงานต่อไปไม่ควรเขียนระบบบทเรียนใหม่ทั้งก้อนอีกครั้ง แต่ควร:

1. ยกของที่ทำกับ physics ให้เป็น `subject-agnostic platform layer`
2. แยกส่วนที่ hardcode physics ออกไปเป็น subject pack
3. ทำ curriculum packs ทีละวิชา

## Development Phases

## Phase 1: Core Curriculum Source Registry

Goal: สร้างทะเบียนแหล่งข้อมูลหลักสูตรกลางของระบบ

Checklist:

- สร้างไฟล์หรือ data source กลางสำหรับ curriculum sources
- แยก source ตาม subject และ provider
- ระบุ source priority ต่อวิชา
- ระบุว่าข้อมูลไหนเป็น official curriculum
- ระบุว่าข้อมูลไหนเป็น catalog reference เท่านั้น
- ใส่ข้อจำกัดด้านลิขสิทธิ์และการใช้งาน

Definition of done:

- ทุกวิชามี source registry ขั้นต้น
- science/math ผูกกับ IPST ได้ชัด
- วิชาอื่นมี placeholder source slots พร้อมเก็บข้อมูลจริง

Status: done

Delivered:

- เพิ่ม registry schema กลางใน `src/lib/curriculum/source-registry.ts`
- เพิ่ม canonical source data สำหรับ core curriculum, IPST, Aksorn, MacEducation, และ platform sequencing
- เพิ่มเอกสาร [core-curriculum-source-registry.md](./core-curriculum-source-registry.md)
- แยก `CurriculumSourceRef` ออกจาก physics-only schema เพื่อให้วิชาอื่นใช้ต่อได้

## Phase 2: Canonical Subject Catalog

Goal: ทำรหัสวิชากลางที่ใช้ร่วมทั้ง lesson, course, assessment, analytics

Status: done

Checklist:

- เพิ่ม canonical subject ids
- เพิ่ม display names ไทย/อังกฤษ
- เพิ่ม grade coverage ต่อวิชา
- เพิ่ม subject metadata สำหรับ UI
- เพิ่ม validators
- เพิ่ม tests

Delivered:

- เพิ่ม `src/lib/curriculum/subject-catalog.ts`
- ครอบคลุม 8 กลุ่มสาระหลัก + 4 รายวิชาเพิ่มเติมสายวิทยาศาสตร์
- เพิ่ม parent-child model ระหว่าง `science_technology` กับ `physics/chemistry/biology/earth_space_science`
- เพิ่ม helper สำหรับ map label ไทย/อังกฤษกลับเป็น canonical subject id
- เพิ่ม source registry linkage ต่อวิชา
- เพิ่ม targeted tests ใน `src/lib/curriculum/__tests__/subject-catalog.test.ts`

Definition of done:

- route, builder, player, analytics ใช้ subject id ชุดเดียวกันได้

## Phase 3: Grade Band and Semester Model

Goal: ทำโมเดลระดับชั้นและภาคเรียนกลาง

Status: done

Checklist:

- สร้าง grade level enum กลาง
- สร้าง grade band enum กลาง
- รองรับภาคเรียน 1/2
- รองรับวิชาที่ไม่ยึด semester แบบแข็ง
- เพิ่ม validator และ tests

Delivered:

- เพิ่ม `src/lib/curriculum/grade-model.ts`
- เพิ่ม `canonicalSemesterModeSchema` เพื่อแยก `required | optional | not_applicable`
- เพิ่ม `curriculumPlacementSchema` สำหรับ validate grade/semester placement แบบชุดเดียว
- เพิ่ม helper สำหรับ label และการ map `gradeLevel -> gradeBand`
- ปรับ `src/lib/curriculum/subject-catalog.ts` ให้ใช้ grade model กลาง
- ปรับ `src/lib/physics/curriculum.ts` ให้ reuse grade/semester schema กลาง
- เพิ่ม targeted tests ใน `src/lib/curriculum/__tests__/grade-model.test.ts`

Definition of done:

- curriculum map ทุกวิชาผูก grade/semester ได้แบบเดียวกัน

## Phase 4: Subject Curriculum Map Packs

Goal: แปลงแต่ละวิชาเป็น curriculum map แบบเดียวกัน

Status: done

Checklist:

- สร้าง curriculum map สำหรับภาษาไทย
- สร้าง curriculum map สำหรับคณิตศาสตร์
- สร้าง curriculum map สำหรับวิทยาศาสตร์และเทคโนโลยี
- สร้าง curriculum map สำหรับสังคมศึกษา ศาสนา และวัฒนธรรม
- สร้าง curriculum map สำหรับสุขศึกษาและพลศึกษา
- สร้าง curriculum map สำหรับศิลปะ
- สร้าง curriculum map สำหรับการงานอาชีพ
- สร้าง curriculum map สำหรับภาษาต่างประเทศ

Delivered:

- เพิ่ม `src/lib/curriculum/map-packs.ts`
- เพิ่ม schema `SubjectCurriculumMapPack` และ `SubjectCurriculumUnitOutline`
- เพิ่ม starter curriculum map pack สำหรับ 8 กลุ่มสาระหลัก
- เพิ่ม helper สำหรับอ่าน pack ตาม `subjectId` และ filter units ตาม `gradeBand`
- แยกชัดว่ากลุ่มสาระหลักใช้ starter pack ส่วน `physics` ยังใช้ detailed curriculum map เดิม
- เพิ่ม targeted tests ใน `src/lib/curriculum/__tests__/map-packs.test.ts`

Definition of done:

- ทุกกลุ่มสาระมี unit map ขั้นต้นในรูปแบบเดียวกัน

## Phase 5: Unit-Level Learning Outcomes

Goal: แตก outcomes ต่อหน่วยให้พร้อมใช้งานในระบบ

Status: done

Checklist:

- สร้าง learning outcomes ระดับ unit
- ผูก outcomes กับ unit/topic
- เพิ่ม concepts และ skills
- เพิ่ม assessment hints
- เพิ่ม crosswalk rules
- เพิ่ม tests

Delivered:

- เพิ่ม `src/lib/curriculum/unit-learning-outcomes.ts`
- เพิ่ม schema `SubjectUnitTopic`, `SubjectUnitLearningOutcome`, `SubjectUnitLearningOutcomePack`
- เพิ่ม `topics` และ `learningOutcomes` สำหรับ core 8 learning-area starter packs
- เพิ่ม `crosswalkRules` และ selection validator สำหรับกันการอ้าง outcome ข้าม unit แบบไม่ตั้งใจ
- รักษา physics detailed outcomes เดิมไว้แยกจาก core starter outcomes
- เพิ่ม targeted tests ใน `src/lib/curriculum/__tests__/unit-learning-outcomes.test.ts`

Definition of done:

- lesson template และ assessment generator อ้าง outcome ได้โดยตรง

## Phase 6: Subject Template Master Pack

Goal: ทำ lesson template master ต่อวิชา

Status: done

Checklist:

- สร้าง subject template schema กลาง
- แยก required blocks ต่อวิชา
- รองรับ video-first, document-first, practice-first template
- รองรับ topic-based lesson structure
- รองรับ media requirements
- รองรับ teacher override fields

Delivered:

- เพิ่ม `src/lib/curriculum/template-master-pack.ts`
- เพิ่ม schema `SubjectLessonTemplate`, `SubjectLessonTemplatePack`, `subjectTemplatePedagogySchema`
- เพิ่ม starter template master pack สำหรับ 8 กลุ่มสาระหลัก
- เพิ่ม canonical support สำหรับ `video_first`, `document_first`, `practice_first`
- เพิ่ม `topicStructure`, `mediaRequirements`, `documentRequirements`, `teacherOverrides`
- เพิ่ม helper สำหรับอ่าน pack/template ตาม `subjectId` และ `templateId`
- เพิ่ม targeted tests ใน `src/lib/curriculum/__tests__/template-master-pack.test.ts`

Definition of done:

- ทุกวิชาสร้าง lesson draft จาก template ได้

## Phase 7: AI Curriculum-to-Lesson Rules

Goal: ให้ AI สร้างบทเรียนโดยยึด curriculum map ไม่ลอย

Status: done

Checklist:

- แยก prompt policy ต่อ subject family
- บังคับ AI เลือก unit/topic ก่อนสร้าง content
- validate response ทุกชั้น
- บังคับห้ามสร้างนอก outcome coverage
- รองรับ outline generation
- รองรับ topic content generation

Delivered:

- เพิ่ม `src/lib/curriculum/ai-curriculum-rules.ts`
- เพิ่ม `aiLessonCurriculumSelectionSchema` และ resolver สำหรับ `subjectId` / `unitId` / `templateId`
- เพิ่ม prompt policy ต่อ subject family
- เพิ่ม curriculum-aware validation สำหรับ outline และ topic content
- เชื่อม rules เข้ากับ `POST /api/ai/lessons/generate-outline`
- เชื่อม rules เข้ากับ `POST /api/ai/lessons/generate-topic-content`
- เพิ่ม targeted tests ใน
  - `src/lib/curriculum/__tests__/ai-curriculum-rules.test.ts`
  - `src/__tests__/ai-generate-lesson-outline-route.test.ts`
  - `src/__tests__/ai-generate-lesson-topic-content-route.test.ts`

Definition of done:

- AI สร้างบทเรียนได้จาก curriculum structure เดียวกันทุกวิชา

## Phase 8: Assessment Blueprint Per Subject

Goal: ทำแม่แบบข้อสอบและ pass/fail coverage ต่อวิชา

Checklist:

- กำหนด assessment blueprint ต่อวิชา
- ระบุรูปแบบข้อสอบที่เหมาะต่อวิชา
- รองรับ topic quiz และ lesson quiz
- ผูก pass/fail กับ outcomes
- เพิ่ม remediation rules
- เพิ่ม tests

Definition of done:

- ทุกวิชามี quiz structure ที่ไม่มั่วรวมกัน

## Phase 9: Teacher Builder Integration

Goal: ให้ teacher flow ใช้งาน curriculum packs ได้จริง

Checklist:

- เพิ่มหน้าเลือกวิชา
- เพิ่มหน้าเลือก grade / term / unit
- เพิ่มหน้าเลือก template
- เพิ่มหน้า AI generate outline/content
- เพิ่มหน้า edit media/documents
- เพิ่ม publish guard ตาม coverage

Definition of done:

- ครูสร้างบทเรียนใหม่จากหลักสูตรกลางได้โดยไม่ต้องประกอบเองทุกครั้ง

## Phase 10: Student Player and Progress Model

Goal: ให้นักเรียนเรียนและเก็บ progress ได้สอดคล้องกันทุกวิชา

Checklist:

- render lesson/player จาก schema เดียว
- track completion ระดับ topic / lesson
- รองรับ quiz attempts
- รองรับ pass/fail
- รองรับ continue learning / resume
- เพิ่ม student-facing analytics เบื้องต้น

Definition of done:

- นักเรียนเล่นบทเรียนของทุกวิชาด้วย runtime เดียวกันได้

## Phase 11: Course Catalog and Assignment

Goal: รวม lesson เป็น course / classroom package

Checklist:

- course builder อ่าน curriculum-linked lessons ได้
- assign เป็นรายห้องได้
- รองรับ required / optional lesson
- รองรับ pacing ต่อห้อง
- รองรับ teacher override sequence
- รองรับ release rules

Definition of done:

- ครูจัดคอร์สจากบทเรียนหลายวิชาได้

## Phase 12: Analytics, QA, and Release Gate

Goal: ปิดงานระดับ production

Checklist:

- teacher analytics ต่อวิชา
- unit coverage analytics
- lesson completion analytics
- assessment pass/fail analytics
- build/test/manual QA checklist
- release checklist ต่อวิชา

Definition of done:

- วิชาที่ผ่าน gate สามารถเปิดใช้งานจริงได้

## Subject Delivery Order Recommendation

ถ้าจะเดินงานแบบคุมความเสี่ยงและได้ของใช้จริงเร็ว แนะนำลำดับนี้:

1. ฟิสิกส์
   - เพราะมีฐานเดิมแล้ว
2. คณิตศาสตร์
   - โครงสาระจาก IPST ชัด และข้อสอบสร้างมาตรฐานได้ง่าย
3. วิทยาศาสตร์ภาคบังคับ
   - reuse runtime จาก physics ได้บางส่วน
4. ภาษาไทย
   - สำคัญมากต่อ coverage ห้องเรียนจริง
5. ภาษาอังกฤษ / ภาษาต่างประเทศ
6. สังคมศึกษา
7. สุขศึกษาและพลศึกษา
8. การงานอาชีพ
9. ศิลปะ

## Risks

- ถ้าไม่แยก `curriculum layer` ออกจาก `lesson content layer` วิชาใหม่จะปนกันอีก
- ถ้าใช้ publisher catalog แทน official curriculum มากเกินไป โครงวิชาจะเอียงตามสินค้า ไม่ใช่หลักสูตร
- ถ้าไม่มี canonical subject ids ระบบ assessment, analytics, assignment จะ hardcode เป็นรายวิชา
- ถ้าไม่กำหนด pass/fail coverage ต่อวิชา รูปแบบข้อสอบจะไม่เหมาะกับสาระ
- ถ้า physics ยังคงเป็น special case ใน codebase วิชาอื่นจะต่อยากมาก

## Immediate Next Step

สิ่งที่ควรทำต่อจากแผนนี้:

1. สร้าง `curriculum source registry` กลาง
2. ยก `physics` schema ปัจจุบันให้เป็น generic curriculum schema
3. เริ่ม `คณิตศาสตร์` เป็นวิชาที่สอง
4. ทำ `subject curriculum map template` สำหรับทั้ง 8 กลุ่มสาระ

## Definition Of Success

แผนนี้ถือว่าสำเร็จเมื่อ:

- ทุกกลุ่มสาระมี canonical subject map
- ทุกวิชามี lesson template flow แบบเดียวกัน
- AI สร้าง outline/content จาก curriculum structure ได้
- assessment ผูกกับ outcomes ได้จริง
- teacher assign และ student progress ใช้ runtime ชุดเดียวกัน
- physics ไม่ใช่ special-case ที่ผูกติดกับระบบบทเรียนทั้งก้อนอีกต่อไป
