# Physics Lesson Template Master Plan

แผนนี้กำหนดแนวทางสร้างระบบบทเรียนฟิสิกส์ใหม่ของ TeachPlayEdu โดยเริ่มจาก "เทมเพลตบทเรียนหลัก" ก่อน เพื่อให้บทเรียนที่ครูสร้างหรือ AI ช่วยสร้างมีโครงเดียวกัน อิงหลักสูตรแกนกลาง และลดปัญหาเนื้อหาเก่า/ใหม่ปนกัน

## เป้าหมาย

สร้างระบบบทเรียนฟิสิกส์ที่:

- อิงหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551 ฉบับปรับปรุง พ.ศ. 2560
- ใช้ สสวท. เป็นแหล่งอ้างอิงหลักด้านหลักสูตร มาตรฐาน สาระ และผลการเรียนรู้
- ใช้ Aksorn และ MacEducation เป็นแหล่งอ้างอิงด้านการจัดหมวดระดับชั้น/รายวิชา/รูปแบบหนังสือเรียนเท่านั้น
- ไม่คัดลอกเนื้อหาจากหนังสือหรือสื่อของผู้จัดพิมพ์เข้าระบบโดยตรง
- ทำให้ AI สร้างบทเรียนจากเทมเพลตที่ควบคุมได้ ไม่สร้างเนื้อหาลอยๆ
- เริ่มเฉพาะวิชาฟิสิกส์ก่อน แล้วค่อยขยายไปเคมี ชีววิทยา และวิชาอื่น

## แหล่งอ้างอิงหลัก

- สสวท.: หลักสูตรวิทยาศาสตร์ คณิตศาสตร์ และเทคโนโลยี ฉบับปรับปรุง พ.ศ. 2560 ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551  
  https://www.ipst.ac.th/curriculum
- Aksorn: หมวดหลักสูตรการศึกษาขั้นพื้นฐานและกลุ่มสาระวิทยาศาสตร์และเทคโนโลยี  
  https://www.aksorn.com/store/basic-education-th
- MacEducation: หมวดสินค้า หนังสือเรียนพื้นฐาน/รายวิชาเพิ่มเติม วิทยาศาสตร์และเทคโนโลยี ระดับมัธยมปลาย  
  https://www.maceducation.com/product/

## หลักการออกแบบ

ระบบใหม่ต้องแยกชัดเจน 3 ชั้น:

1. Curriculum Map  
   แผนที่หลักสูตรว่าระดับชั้นใดมีหน่วยใด ผลการเรียนรู้ใด และอยู่ในสาระฟิสิกส์ข้อใด

2. Lesson Template  
   แม่แบบบทเรียนที่ครูหรือ AI ใช้สร้างบทเรียนจริง โดยต้องผูกกับ Curriculum Map เสมอ

3. Lesson Content  
   เนื้อหาที่สร้างแล้ว แก้ไขได้ ใส่สื่อได้ และนำไปใช้ใน Course หรือ Classroom ได้

## โครงข้อมูลหลักที่ต้องมี

### PhysicsCurriculumMap

```ts
type PhysicsCurriculumMap = {
  subject: "physics"
  curriculumCode: "basic_education_2551_revised_2560"
  gradeLevel: "m4" | "m5" | "m6"
  semester?: 1 | 2
  units: PhysicsCurriculumUnit[]
}
```

### PhysicsCurriculumUnit

```ts
type PhysicsCurriculumUnit = {
  id: string
  title: string
  strand: "additional_physics"
  order: number
  learningOutcomes: PhysicsLearningOutcome[]
  recommendedHours?: number
  sourceRefs: CurriculumSourceRef[]
}
```

### PhysicsLearningOutcome

```ts
type PhysicsLearningOutcome = {
  id: string
  code?: string
  text: string
  concepts: string[]
  skills: string[]
  assessmentHints?: string[]
}
```

### PhysicsLessonTemplate

```ts
type PhysicsLessonTemplate = {
  schemaVersion: "physics_lesson_template_v1"
  subject: "physics"
  curriculumCode: "basic_education_2551_revised_2560"
  gradeLevel: "m4" | "m5" | "m6"
  unitId: string
  lessonId: string
  lessonTitle: string
  learningOutcomeIds: string[]
  objectives: string[]
  prerequisites: string[]
  coreConcepts: string[]
  commonMisconceptions: string[]
  sections: PhysicsLessonTemplateSection[]
  mediaPlan: PhysicsMediaPlan
  practicePlan: PhysicsPracticePlan
  assessmentPlan: PhysicsAssessmentPlan
  teacherNotes?: string
  sourceRefs: CurriculumSourceRef[]
}
```

### PhysicsLessonTemplateSection

```ts
type PhysicsLessonTemplateSection = {
  id: string
  title: string
  purpose: "hook" | "concept" | "worked_example" | "experiment" | "practice" | "reflection"
  expectedContent: string
  suggestedMediaTypes: Array<"video" | "image" | "simulation" | "document">
  required: boolean
}
```

### CurriculumSourceRef

```ts
type CurriculumSourceRef = {
  provider: "ipst" | "aksorn" | "maceducation" | "teacher"
  title: string
  url?: string
  note?: string
  usage: "curriculum_reference" | "structure_reference" | "teacher_note"
}
```

## Template Content Rules

ทุกบทเรียนฟิสิกส์ต้องมี:

- ระดับชั้น
- หน่วยการเรียนรู้
- ผลการเรียนรู้ที่เกี่ยวข้องอย่างน้อย 1 ข้อ
- วัตถุประสงค์การเรียนรู้
- แนวคิดสำคัญ
- ความรู้พื้นฐานก่อนเรียน
- ความเข้าใจผิดที่พบบ่อย
- ส่วนเนื้อหาอย่างน้อย 1 ส่วน
- แผนสื่อการสอน
- แผนฝึกคิด/ฝึกทำโจทย์
- แผนประเมินความเข้าใจ

บทเรียนที่ไม่ผ่านเงื่อนไขนี้ห้าม Publish

## โครงบทเรียนสำหรับครู

เมื่อครูเลือกสร้างบทเรียนจากเทมเพลต ระบบควรให้ flow แบบนี้:

1. เลือกวิชา: ฟิสิกส์
2. เลือกระดับ: ม.4 / ม.5 / ม.6
3. เลือกหน่วยการเรียนรู้
4. เลือกบทเรียนจากเทมเพลต
5. ให้ AI สร้างร่างเนื้อหา
6. ครูแก้ไขเนื้อหา
7. ครูเพิ่มคลิป รูปภาพ simulation หรือเอกสารจาก Media Library
8. Save Draft
9. ตรวจ Quality Gate
10. Publish

## รูปแบบบทเรียนที่นักเรียนเห็น

บทเรียนฟิสิกส์สำหรับนักเรียนควรอ่านง่ายและเรียนตามลำดับ:

1. ชื่อบทเรียน
2. หน่วย/ระดับชั้น
3. วัตถุประสงค์การเรียนรู้
4. คลิปหลักหรือสื่อหลัก
5. เนื้อหาแบ่งหัวข้อสั้นๆ
6. ตัวอย่างการคิด/ตัวอย่างโจทย์
7. เอกสารประกอบ
8. คำถามตรวจความเข้าใจสั้นๆ
9. ปุ่มเรียนจบ/บันทึกความคืบหน้า

## Phase 1: Curriculum Source Map

Goal: ทำแผนที่หลักสูตรฟิสิกส์ก่อนสร้างบทเรียนจริง

Checklist:

- สร้าง `physics-curriculum-map.md`
- แยก ม.4 / ม.5 / ม.6
- ระบุหน่วยหลักของฟิสิกส์ระดับมัธยมปลาย
- ผูกหน่วยกับผลการเรียนรู้
- ใส่แหล่งอ้างอิงจาก สสวท.
- ใส่ Aksorn/MacEducation เป็น structure reference เท่านั้น
- ระบุหัวข้อที่ยังต้องให้ครูตรวจยืนยัน

## Phase 2: Physics Template Contract

Goal: สร้าง schema กลางของเทมเพลตบทเรียนฟิสิกส์

Checklist:

- เพิ่ม type `PhysicsCurriculumMap`
- เพิ่ม type `PhysicsCurriculumUnit`
- เพิ่ม type `PhysicsLearningOutcome`
- เพิ่ม type `PhysicsLessonTemplate`
- เพิ่ม type `PhysicsLessonTemplateSection`
- เพิ่ม type `CurriculumSourceRef`
- เพิ่ม validator สำหรับ template
- เพิ่ม tests สำหรับ valid/invalid template
- กำหนด error code สำหรับ template ที่ไม่ผูก curriculum

## Phase 3: AI Template Prompt

Goal: ให้ AI สร้างบทเรียนตาม template เท่านั้น

Checklist:

- สร้าง prompt สำหรับ Physics Lesson Template
- AI ต้องรับ `gradeLevel`, `unitId`, `learningOutcomeIds`, `sourceText`
- AI สร้างเฉพาะร่างบทเรียน ไม่สร้างข้อสอบเต็ม
- response ต้องมี objectives, coreConcepts, sections, mediaPlan, practicePlan
- validate JSON response
- return `INVALID_AI_RESPONSE` ถ้าโครงไม่ถูก
- เพิ่ม tests สำหรับ prompt response shape

## Phase 4: Teacher Physics Template Library

Goal: ให้ครูเลือก template จากคลัง ไม่ต้องเริ่มจากศูนย์

Checklist:

- เพิ่มหน้า/ส่วนเลือก template ฟิสิกส์
- filter ตามระดับชั้น
- filter ตามหน่วย
- preview ผลการเรียนรู้และหัวข้อ
- ปุ่ม `สร้างบทเรียนจากเทมเพลต`
- เติมข้อมูลเข้า Lesson Create Wizard เดิม
- กัน template ที่ยังไม่ผ่าน curriculum validation

## Phase 5: Lesson Content Builder Integration

Goal: เชื่อม template เข้ากับ `lesson_content_v2`

Checklist:

- map `PhysicsLessonTemplate` ไปเป็น `LessonOutlineDraft`
- map `sections` ไปเป็น topic sections
- map `mediaPlan` ไปเป็น media placeholders
- map `sourceRefs` ไปเก็บใน lesson metadata
- ครูแก้ไขวัตถุประสงค์และเนื้อหาได้
- ครูเพิ่มสื่อจาก Media Library ได้
- save draft ด้วย `lesson_content_v2`

## Phase 6: Physics Quality Gate

Goal: ห้าม publish บทเรียนที่ไม่ครบหรือไม่ผูกหลักสูตร

Checklist:

- ตรวจว่ามี curriculumCode
- ตรวจว่ามี gradeLevel
- ตรวจว่ามี unitId
- ตรวจว่ามี learningOutcomeIds
- ตรวจว่ามี objectives อย่างน้อย 1 ข้อ
- ตรวจว่ามี section อย่างน้อย 1 section
- ตรวจว่ามี media หรือ document อย่างน้อย 1 รายการ
- ตรวจว่าไม่มี AI placeholder เช่น "ไม่แน่ใจ", "ควรตรวจสอบ", "ใส่เนื้อหาที่นี่"
- ครูต้องกดยืนยันความถูกต้องก่อน Publish

## Phase 7: Student Physics Player

Goal: ทำให้บทเรียนฟิสิกส์ฝั่งนักเรียนอ่านง่ายและเรียนต่อเนื่อง

Checklist:

- แสดงชื่อหน่วยและระดับชั้น
- แสดงวัตถุประสงค์ก่อนเริ่มเรียน
- แสดงคลิป/สื่อหลักด้านบน
- แบ่งเนื้อหาเป็นหัวข้อย่อย
- แสดงเอกสารประกอบ
- เพิ่มปุ่มบันทึกความคืบหน้า
- เพิ่มคำถามตรวจความเข้าใจแบบเบื้องต้น
- รองรับ progress ใน Course Player

Status: done

Delivered:

- student lesson player เธญเนเธฒเธ `lesson_content_v2` เนเธเธเธ€เธ”เธตเธขเธง
- เนเธชเธ”เธเธเธทเนเธญเธซเธเนเธงเธข เธฃเธฐเธ”เธฑเธเธเธฑเนเธ เทอม และผลการเรียนรู้จาก metadata
- เนเธชเธ”เธสื่อหลักของบทเรียนที่ด้านบน พร้อมเอกสารประกอบแยก section
- เนเธเนเธเน€เธเธทเนเธญเธซเธฒเน€เธเนเธ topic + section accordion
- เน€เธเธดเนเธกปุ่มบันทึกความคืบหน้า และ sync `courseId` กลับไปที่ course progress route ได้
- เน€เธเธดเนเธก quick check เนเธเธ self-check จาก objectives / sections / practice plan
- ถ้าเปิดมาจาก course player จะใช้ route completion/progress ของ course ได้ทันที
- `npm run build` ผ่าน

## Phase 8: Physics Template Pack 1

Goal: ทำชุดเทมเพลตแรกสำหรับใช้งานจริง

เริ่มจาก ฟิสิกส์ ม.4 เทอม 1 ก่อน

Template Pack 1 ที่แนะนำ:

- บทนำฟิสิกส์และการวัด
- ปริมาณทางฟิสิกส์และหน่วย
- การเคลื่อนที่แนวตรง
- กราฟการเคลื่อนที่
- แรงและกฎการเคลื่อนที่ของนิวตัน
- สมดุลกล
- งานและพลังงาน
- โมเมนตัมและการชน

Checklist:

- ทำ template อย่างน้อย 8 บทเรียน
- แต่ละบทเรียนผูก learning outcomes
- แต่ละบทเรียนมี mediaPlan
- แต่ละบทเรียนมี practicePlan
- ให้ครูตรวจเนื้อหาและลำดับ
- ทดลองสร้าง lesson จาก template อย่างน้อย 2 บท

Status: done

Delivered:

- Pack 1 มี template ฟิสิกส์ ม.4 รวม 13 บท
- ครอบคลุม 7 หน่วยหลัก: `phy-m4-s1-u01`, `phy-m4-s1-u02`, `phy-m4-s1-u03`, `phy-m4-s2-u01`, `phy-m4-s2-u02`, `phy-m4-s2-u03`, `phy-m4-s2-u04`
- ทุก template ผูก `learningOutcomeIds` กับ canonical curriculum unit
- ทุก template มี `mediaPlan` และ `practicePlan`
- เพิ่ม pack helper ใน code เพื่อให้ UI/tests/docs ใช้ชุด Pack 1 เดียวกัน
- เพิ่ม test ว่า template ทุกบทใน Pack 1 build เป็น `lesson_content_v2` ได้จริง

## Phase 9: Release Gate

Goal: ปล่อยระบบ template ฟิสิกส์แบบไม่ทำให้ระบบ lesson/course เดิมพัง

Checklist:

- `lesson_content_v2` เดิมยังอ่านได้
- Course Builder ยังเลือก Lesson V2 ได้
- บทเรียนที่สร้างจาก template ใช้ใน Course ได้
- Student Lesson Player render ได้
- Student Course Player render ได้
- Media Library ใช้กับบทเรียนได้
- tests ของ lesson/course ผ่าน
- manual QA ครูสร้างบทเรียน 1 บท
- manual QA นักเรียนเปิดเรียนจน complete ได้

Status: automated gate passed, manual QA checklist added

Delivered:

- fixed course release-gate tests so Lesson V2 fixtures match current publish rules
- targeted lesson/course/player route suite passed: 10 files, 50 tests
- production build passed
- added `docs/physics-template-pack-manual-qa-checklist.md`
- confirmed Course Builder still filters to Lesson V2 content and publish-ready lessons

## ความเสี่ยง

- ถ้าไม่มี curriculum map ที่ชัด AI จะสร้างบทเรียนไม่ตรงหลักสูตร
- ถ้าคัดลอกเนื้อหาจากสำนักพิมพ์โดยตรงจะมีปัญหาลิขสิทธิ์
- ถ้า Lesson และ Course ไม่แยกหน้าที่ชัด ครูจะสับสนว่าอะไรคือบทเรียน อะไรคือคอร์ส
- ถ้า Quality Gate อ่อน ระบบจะ publish บทเรียนที่ยังไม่พร้อม
- ถ้าไม่คุม sourceRefs ต่อไปจะตรวจที่มาของเนื้อหาไม่ได้

## แนวทางลิขสิทธิ์

- ใช้ สสวท. เป็นแหล่งอ้างอิงหลักสูตรและผลการเรียนรู้
- ใช้ Aksorn/MacEducation เพื่อดูหมวดสินค้า ระดับชั้น และแนวการจัดหมวดเท่านั้น
- ห้ามคัดลอกเนื้อหา ตัวอย่างโจทย์ รูปภาพ ตาราง หรือคำอธิบายจากหนังสือโดยตรง
- AI ต้องสร้างคำอธิบายใหม่จากหลักสูตรและ prompt ของระบบ
- ครูต้องตรวจและยืนยันก่อน Publish

## Definition Of Done

ระบบเทมเพลตบทเรียนฟิสิกส์ถือว่าเสร็จรอบแรกเมื่อ:

- มี curriculum map ฟิสิกส์ ม.4 อย่างน้อย 1 เทอม
- มี schema และ validator
- มี template pack อย่างน้อย 8 บทเรียน
- ครูสร้าง Lesson V2 จาก template ได้
- AI สร้างร่างเนื้อหาตาม template ได้
- ครูแก้ไข เพิ่มสื่อ และบันทึก draft ได้
- Publish guard ทำงาน
- นักเรียนเปิดเรียนและบันทึก progress ได้
- Course Builder ใช้บทเรียนที่สร้างจาก template ได้
