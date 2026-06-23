# AI Curriculum-to-Lesson Rules

Last updated: 2026-06-21  
Status: done

## Goal

ทำให้ AI สร้างบทเรียนโดยอิง `canonical curriculum layer` จริง ไม่หลุดหน่วย ไม่หลุดหัวข้อ และไม่อ้าง outcome นอก scope ที่เลือก

## What Phase 7 Adds

- เพิ่ม `src/lib/curriculum/ai-curriculum-rules.ts`
- เพิ่ม schema `aiLessonCurriculumSelectionSchema`
- เพิ่ม resolver สำหรับ subject/unit/template/topic/outcome selection
- เพิ่ม prompt policy ต่อ subject family
- เพิ่ม curriculum-aware validation สำหรับ outline generation
- เพิ่ม curriculum-aware validation สำหรับ topic content generation
- เชื่อม rules เข้ากับ
  - `POST /api/ai/lessons/generate-outline`
  - `POST /api/ai/lessons/generate-topic-content`
- เพิ่ม targeted tests ทั้ง helper layer และ route layer

## Canonical Selection Contract

AI route รองรับ `curriculumSelection` แบบ optional:

```ts
{
  subjectId: CanonicalCoreSubjectId
  unitId: string
  templateId?: string
  topicIds?: string[]
  learningOutcomeIds?: string[]
}
```

เมื่อส่งเข้ามา ระบบจะ:

1. resolve subject จาก canonical subject catalog
2. resolve unit จาก subject map pack
3. resolve outcomes จาก unit outcome pack
4. resolve template จาก subject template master pack ถ้ามี
5. จำกัด allowed topics และ allowed outcomes ให้เหลือเฉพาะ scope ที่เลือก

## Subject-Family Prompt Policies

ระบบแยก prompt family เพื่อไม่ให้ AI เขียนทุกวิชาในน้ำเสียงเดียวกัน:

- `language_literacy`
- `stem_science`
- `civic_humanities`
- `wellbeing_movement`
- `creative_performance`
- `career_applied`

แต่ละ family จะมี policy text ช่วยบังคับโทนและรูปแบบการอธิบายให้เหมาะกับธรรมชาติของวิชา

## Outline Generation Rules

เมื่อ `curriculumSelection` ถูกส่งมา:

- outline route จะบังคับ AI ให้อยู่ใน subject/unit ที่เลือก
- ถ้ามี `templateId` จะบังคับให้สร้างเพียง 1 lesson
- AI ต้องใช้เฉพาะ allowed topic ids
- ห้าม invent topic ใหม่
- หลัง AI ตอบกลับ ระบบจะ validate อีกชั้น

ถ้าผ่าน validation:

- ระบบจะ normalize outline กลับสู่ canonical titles/topic ids
- ถ้ามี template จะใช้ title/description จาก template กลาง

## Topic Content Generation Rules

เมื่อ `curriculumSelection` ถูกส่งมา:

- topic-content route จะเช็กว่า `topicId` อยู่ใน scope ที่เลือกจริง
- prompt จะใส่ allowed outcomes ของ topic นั้นลงไป
- AI ถูกบังคับให้อยู่ใน selected topic เท่านั้น
- ถ้าผลลัพธ์กลับมาผิด `topicId` จะถูก reject

## Validation Strategy

validation มี 2 ชั้น:

### 1. Selection-time validation

เช็กก่อนเรียก AI:

- subject ต้องมีอยู่จริง
- unit ต้องมีอยู่จริง
- template ต้องอยู่ subject/unit เดียวกัน
- topicIds และ learningOutcomeIds ต้องอยู่ใน unit/template scope

### 2. Response-time validation

เช็กหลัง AI ตอบ:

- outline ต้องไม่มี topic นอก allowed scope
- template-bound outline ต้องมี lesson เดียว
- topic content ต้องอยู่ใน selected topic เดิม

## Compatibility

phase นี้ยังคง backward compatible:

- ถ้าไม่ส่ง `curriculumSelection` route เดิมยังใช้งานได้
- flow เดิมของ create wizard ยังไม่ถูกบังคับให้เลือก canonical template ทันที
- physics-specific flow เดิมยังอยู่ได้

สรุปคือ phase นี้เพิ่ม “กติกากลาง” ให้พร้อมใช้งาน โดยยังไม่บังคับ UI ทั้งระบบให้เปลี่ยนพร้อมกัน

## Validation

targeted tests:

```powershell
npm.cmd test -- src/lib/curriculum/__tests__/source-registry.test.ts src/lib/curriculum/__tests__/subject-catalog.test.ts src/lib/curriculum/__tests__/grade-model.test.ts src/lib/curriculum/__tests__/map-packs.test.ts src/lib/curriculum/__tests__/unit-learning-outcomes.test.ts src/lib/curriculum/__tests__/template-master-pack.test.ts src/lib/curriculum/__tests__/ai-curriculum-rules.test.ts src/__tests__/ai-generate-lesson-outline-route.test.ts src/__tests__/ai-generate-lesson-topic-content-route.test.ts src/lib/physics/__tests__/curriculum.test.ts src/lib/lessons/__tests__/lesson-content.test.ts
```

## Done Definition

phase นี้ถือว่า done เมื่อ:

- AI outline generation รู้จัก subject/unit/template scope
- AI topic content generation รู้จัก topic/outcome scope
- response ถูก reject ได้เมื่อหลุด canonical curriculum
- phase ถัดไปสามารถเอา selection contract นี้ไปเสียบกับ teacher builder UI ได้เลย
