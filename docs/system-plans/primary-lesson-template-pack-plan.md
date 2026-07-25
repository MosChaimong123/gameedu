# Primary Lesson Template Pack Strategy

## เป้าหมาย

กำหนดกลยุทธ์สร้างเทมเพลตบทเรียนระดับประถมศึกษา ป.1-ป.6 จากฐานข้อมูล Phase 2:

`docs/curriculum-imports/primary-grade-1-6-course-database.md`

เอกสารนี้เป็น Phase 3: Template Strategy เท่านั้น ยังไม่แก้ `src/lib/curriculum/template-master-pack.ts` และยังไม่สร้าง `lesson_content_v2`

## Input จาก Phase 2

| รายการ | จำนวน |
| --- | ---: |
| course records | 84 |
| raw unit rows | 492 |
| normalized unit records | 489 |
| grade levels | 6 |
| canonical subject ids | 8 |
| course titles per grade | 14 |
| needsReview units | 1 |

จุดที่ต้องตรวจซ้ำก่อน import:

- `science-g1-u02`: ข้อมูลตัวชี้วัดและสาระสำคัญครบ แต่ `estimatedHours` อ่านจาก DOCX ไม่ได้

## Canonical Contract

ระบบปัจจุบันใช้ `subject_template_master_pack_v1` และรองรับ pedagogy หลัก 3 แบบ:

- `document_first`
- `practice_first`
- `video_first`

block ที่ใช้ใน template pack ปัจจุบัน:

- `objectives`
- `topics`
- `instruction`
- `practice`
- `media`
- `documents`
- `summary`
- `assessment_bridge`

กติกาสำคัญ:

- เทมเพลตใหม่ต้องผูกกับ canonical `subjectId`, `unitId`, topic ids และ outcome ids
- ห้ามสร้าง V1 lesson payload ใหม่
- ห้ามให้ template สร้าง quiz โดยตรง ให้ต่อไป `generate-assessment` เท่านั้น
- ต้องเก็บ provenance จาก DOCX และ source registry
- รอบนี้ยังไม่ควรแก้ UI หรือ runtime

## Template Family Strategy

### 1. Reading And Language Practice

ใช้กับ:

- ภาษาไทย หลักภาษาและการใช้ภาษาไทย
- ภาษาไทย วรรณคดีและวรรณกรรม

| field | value |
| --- | --- |
| primary subjectId | `thai` |
| pedagogy | `document_first` |
| template family id | `primary-reading-language` |
| core flow | อ่าน/ฟัง -> อธิบายคำและใจความ -> ฝึกใช้ภาษา -> สรุป -> assessment bridge |
| required blocks | `objectives`, `topics`, `documents`, `instruction`, `practice`, `summary`, `assessment_bridge` |
| media requirements | image 1 |
| document requirements | reference 1, worksheet 1 |

เหมาะสำหรับสร้างบทเรียนที่ใช้ข้อความ วรรณกรรม บทอ่าน หรือแบบฝึกภาษาเป็นฐาน

### 2. Math Concept And Problem Practice

ใช้กับ:

- คณิตศาสตร์

| field | value |
| --- | --- |
| primary subjectId | `mathematics` |
| pedagogy | `practice_first` |
| template family id | `primary-math-practice` |
| core flow | แนวคิดสั้น -> ตัวอย่าง -> ฝึกโจทย์เป็นขั้น -> ตรวจคำตอบ -> summary |
| required blocks | `objectives`, `topics`, `instruction`, `practice`, `summary`, `assessment_bridge` |
| media requirements | slide 1 |
| document requirements | worksheet 1 |

เหมาะกับหน่วยที่ต้องให้เด็กฝึกซ้ำ เช่น จำนวน การวัด เรขาคณิต เศษส่วน ทศนิยม และโจทย์ปัญหา

### 3. Science Observation And Explanation

ใช้กับ:

- วิทยาศาสตร์และเทคโนโลยี

| field | value |
| --- | --- |
| primary subjectId | `science_technology` |
| pedagogy | `video_first` |
| template family id | `primary-science-observe-explain` |
| core flow | สังเกตปรากฏการณ์ -> อธิบายแนวคิด -> ทดลอง/จำลอง -> บันทึกผล -> summary |
| required blocks | `objectives`, `topics`, `media`, `instruction`, `practice`, `summary`, `assessment_bridge` |
| media requirements | video 1, image or simulation 1 |
| document requirements | worksheet 1 |

เหมาะกับหน่วยสิ่งมีชีวิต วัสดุ แรง พลังงาน โลก อวกาศ และสิ่งแวดล้อม

### 4. Computing Mission And Step Practice

ใช้กับ:

- เทคโนโลยี (วิทยาการคำนวณ)

| field | value |
| --- | --- |
| primary subjectId | `science_technology` |
| pedagogy | `practice_first` |
| template family id | `primary-computing-mission` |
| core flow | ภารกิจ -> แตกปัญหา -> ลำดับขั้นตอน/อัลกอริทึม -> ทดลองทำ -> reflection |
| required blocks | `objectives`, `topics`, `instruction`, `practice`, `media`, `summary`, `assessment_bridge` |
| media requirements | image 1 or simulation 1 |
| document requirements | worksheet 1 |

หมายเหตุ: ยัง map อยู่ใต้ `science_technology` ตาม subject catalog เดิม แต่ควรใช้ `courseKey: computing-science` เพื่อแยก template family

### 5. Social Inquiry And Context Reading

ใช้กับ:

- สังคมศึกษา ศาสนา และวัฒนธรรม
- พระพุทธศาสนา
- ประวัติศาสตร์
- ภูมิศาสตร์

| field | value |
| --- | --- |
| primary subjectId | `social_religion_culture` |
| pedagogy | `document_first` |
| template family id | `primary-social-inquiry` |
| core flow | อ่านข้อมูล/กรณีศึกษา -> ตั้งคำถาม -> เชื่อมบริบท -> อภิปราย -> summary |
| required blocks | `objectives`, `topics`, `documents`, `instruction`, `summary`, `assessment_bridge` |
| media requirements | image 1 |
| document requirements | reference 1 |

เพิ่ม specialization ตาม courseKey:

| courseKey | specialization |
| --- | --- |
| `social-studies` | กฎ กติกา หน้าที่ ชุมชน เศรษฐกิจเบื้องต้น |
| `buddhism` | ศาสนา ศีลธรรม การปฏิบัติตน |
| `history` | timeline, evidence, sequence |
| `geography` | map, place, environment |

### 6. Health Skill Demonstration

ใช้กับ:

- สุขศึกษาและพลศึกษา

| field | value |
| --- | --- |
| primary subjectId | `health_physical_education` |
| pedagogy | `video_first` |
| template family id | `primary-health-skill-demo` |
| core flow | ดูตัวอย่าง -> อธิบายความปลอดภัย -> ฝึกปฏิบัติ -> self check -> summary |
| required blocks | `objectives`, `topics`, `media`, `practice`, `summary`, `assessment_bridge` |
| media requirements | video 1, image 1 |
| document requirements | worksheet 1 |

เหมาะกับทักษะสุขภาพ การเคลื่อนไหว เกม กีฬา และการดูแลตนเอง

### 7. Arts Create And Reflect

ใช้กับ:

- ทัศนศิลป์
- ดนตรี-นาฏศิลป์

| field | value |
| --- | --- |
| primary subjectId | `arts` |
| pedagogy | `practice_first` |
| template family id | `primary-arts-create-reflect` |
| core flow | ดูตัวอย่าง -> สาธิตเทคนิค -> สร้างงาน/ฝึกทักษะ -> สะท้อนผลงาน -> summary |
| required blocks | `objectives`, `topics`, `media`, `practice`, `summary`, `assessment_bridge` |
| media requirements | image 1, audio optional |
| document requirements | reference 1 |

แยก media focus:

- `visual-arts`: image-first, artifact reference
- `music-dance`: audio/video-first, rhythm or movement practice

### 8. Career Task And Product

ใช้กับ:

- การงานอาชีพ

| field | value |
| --- | --- |
| primary subjectId | `career` |
| pedagogy | `practice_first` |
| template family id | `primary-career-task-product` |
| core flow | โจทย์งานจริง -> ขั้นตอน -> ลงมือทำ -> ตรวจชิ้นงาน -> summary |
| required blocks | `objectives`, `topics`, `media`, `documents`, `practice`, `summary`, `assessment_bridge` |
| media requirements | video 1 |
| document requirements | worksheet 1, reference 1 |

เหมาะกับหน่วยงานบ้าน งานเกษตร งานประดิษฐ์ งานอาชีพ และทักษะกระบวนการทำงาน

### 9. Language Communication Mission

ใช้กับ:

- ภาษาอังกฤษ Smile

| field | value |
| --- | --- |
| primary subjectId | `foreign_languages` |
| pedagogy | `video_first` |
| template family id | `primary-english-communication` |
| core flow | ฟัง/ดูสถานการณ์ -> คำศัพท์/ประโยค -> ฝึกพูด/อ่าน/เขียน -> ภารกิจภาษา -> summary |
| required blocks | `objectives`, `topics`, `media`, `practice`, `summary`, `assessment_bridge` |
| media requirements | video 1, audio 1 |
| document requirements | worksheet 1 |

เหมาะกับบทเรียนภาษาอังกฤษที่ใช้บทสนทนา คำศัพท์ เพลง เกม หรือสถานการณ์สื่อสาร

## Course To Template Mapping

| courseTitle | courseKey | subjectId | template family |
| --- | --- | --- | --- |
| หลักภาษาและการใช้ภาษาไทย | `thai-language-use` | `thai` | `primary-reading-language` |
| วรรณคดีและวรรณกรรม | `thai-literature` | `thai` | `primary-reading-language` |
| คณิตศาสตร์ | `mathematics` | `mathematics` | `primary-math-practice` |
| วิทยาศาสตร์และเทคโนโลยี | `science` | `science_technology` | `primary-science-observe-explain` |
| เทคโนโลยี (วิทยาการคำนวณ) | `computing-science` | `science_technology` | `primary-computing-mission` |
| สังคมศึกษา ศาสนา และวัฒนธรรม | `social-studies` | `social_religion_culture` | `primary-social-inquiry` |
| พระพุทธศาสนา | `buddhism` | `social_religion_culture` | `primary-social-inquiry` |
| ประวัติศาสตร์ | `history` | `social_religion_culture` | `primary-social-inquiry` |
| ภูมิศาสตร์ | `geography` | `social_religion_culture` | `primary-social-inquiry` |
| สุขศึกษาและพลศึกษา | `health-physical-education` | `health_physical_education` | `primary-health-skill-demo` |
| ทัศนศิลป์ | `visual-arts` | `arts` | `primary-arts-create-reflect` |
| ดนตรี-นาฏศิลป์ | `music-dance` | `arts` | `primary-arts-create-reflect` |
| การงานอาชีพ | `career` | `career` | `primary-career-task-product` |
| ภาษาอังกฤษ Smile | `english-smile` | `foreign_languages` | `primary-english-communication` |

## Proposed Template Record Shape

Markdown database records should be converted into template records after Phase 4 creates canonical unit/outcome ids:

```ts
{
  id: "primary-thai-language-use-g1-u01-template-01",
  subjectId: "thai",
  unitId: "thai-language-use-g1-u01",
  gradeLevel: "grade_1",
  courseKey: "thai-language-use",
  templateFamilyId: "primary-reading-language",
  title: "...",
  pedagogy: "document_first",
  estimatedMinutes: 50,
  requiredBlocks: ["objectives", "topics", "documents", "instruction", "practice", "summary", "assessment_bridge"],
  suggestedOutcomeIds: ["..."],
  topicStructure: [...],
  mediaRequirements: [...],
  documentRequirements: [...],
  sourceRefs: [...]
}
```

หมายเหตุ: schema ปัจจุบันของ `SubjectLessonTemplate` ยังไม่มี `gradeLevel`, `courseKey`, หรือ `templateFamilyId` ดังนั้น Phase 4 ต้องเลือกอย่างใดอย่างหนึ่ง:

1. ขยาย schema อย่างระวังพร้อม tests
2. เก็บค่าเหล่านี้ใน metadata/source notes รอบแรก แล้วค่อย migrate schema ภายหลัง

ข้อเสนอเบื้องต้น: ขยาย schema ใน Phase 4 เพราะ primary template ต้องกรองตามชั้นและรายวิชาย่อย ไม่ใช่แค่ `subjectId`

## Estimated Minutes Guidance

| grade band | default minutes | notes |
| --- | ---: | --- |
| grade_1-grade_3 | 45 | ใช้ session สั้น แบ่ง topic เล็ก |
| grade_4-grade_6 | 50 | รองรับ reading/practice ยาวขึ้น |
| math practice-heavy | 50-60 | เพิ่มเวลาฝึกโจทย์ |
| arts/career product task | 60 | ต้องมีเวลาลงมือทำ |
| health physical activity | 50 | รวม warm-up และ self check |

## Topic Structure Rules

สำหรับแต่ละ normalized unit:

1. สร้าง 2-4 topics ต่อหน่วยตามความยาวของ `keyConcept`
2. Topic แรกควรเป็น introduction/context
3. Topic กลางควรเป็น concept/practice/activity
4. Topic สุดท้ายควรเป็น summary หรือ applied task
5. ถ้า unit มีหลาย indicators ให้กระจาย indicator refs ไป topics แทนการยัดทั้งหมดใน topic เดียว
6. อย่าสร้าง quiz ใน template ให้ใส่ `assessment_bridge` เพื่อส่งต่อ assessment flow

## Media And Document Rules

| family | media | documents |
| --- | --- | --- |
| primary-reading-language | image | reference, worksheet |
| primary-math-practice | slide | worksheet |
| primary-science-observe-explain | video, image/simulation | worksheet |
| primary-computing-mission | image/simulation | worksheet |
| primary-social-inquiry | image | reference |
| primary-health-skill-demo | video, image | worksheet |
| primary-arts-create-reflect | image/audio/video | reference |
| primary-career-task-product | video | worksheet, reference |
| primary-english-communication | video, audio | worksheet |

## Phase 4 Implementation Plan

1. ตรวจ `science-g1-u02` และเติม/mark `estimatedHours`
2. สร้าง primary source registry entry จาก DOCX
3. ออกแบบ primary map pack contract ที่รองรับ `gradeLevel` และ `courseKey`
4. แปลง course database เป็น unit outlines และ learning outcomes
5. สร้าง template pack จาก template family mapping
6. เพิ่ม validators สำหรับ:
   - course ids ไม่ซ้ำ
   - unit ids ไม่ซ้ำ
   - template ids ไม่ซ้ำ
   - template subjectId ตรงกับ course subjectId
   - template unitId resolve ได้
   - indicator refs มี source/provenance
7. รัน curriculum tests ก่อนแตะ UI

## QA Checklist

- มี template family ครอบคลุม 14 course titles
- ทุก template family map ไป canonical `subjectId` ได้
- ทุก family ใช้ pedagogy ที่ schema ปัจจุบันรองรับ
- ไม่มี family ใดสร้าง quiz โดยตรง
- `assessment_bridge` อยู่ในทุก family
- media/document requirements สอดคล้องกับวัยประถม
- มีแผนรองรับ `gradeLevel` และ `courseKey` ก่อน import
- ยังไม่มีการสร้าง `lesson_content_v2`

## Definition Of Done

- มี strategy ครบ 9 template families
- มี mapping ครบ 14 course titles
- ระบุ required blocks, pedagogy, media, documents ครบทุก family
- ระบุข้อจำกัด schema ปัจจุบันและแผน Phase 4 ชัดเจน
- เอกสารนี้ใช้เป็น input สำหรับสร้าง canonical primary template pack ได้
