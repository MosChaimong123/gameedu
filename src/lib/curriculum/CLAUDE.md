# ระบบหลักสูตร (Curriculum) — CLAUDE.md

Claude โหลดไฟล์นี้อัตโนมัติเมื่อทำงานใน `src/lib/curriculum/`

---

## ระบบนี้ทำอะไร

เก็บโครงสร้างหลักสูตรแห่งชาติ (หลักสูตรแกนกลาง 2551) ในรูปแบบ TypeScript ที่ใช้งานได้จริง เพื่อให้ระบบ AI สร้างแผนการสอนที่ตรงกับมาตรฐานและตัวชี้วัดได้อย่างถูกต้อง

---

## ไฟล์ในโฟลเดอร์นี้ทำอะไร

```
grade-model.ts           — ระดับชั้น p1–m6, ช่วงชั้น, โหมดเทอม
subject-catalog.ts       — วิชาหลัก 8 กลุ่ม + วิชาเพิ่มเติม (ฟิสิกส์/เคมี/ชีวะ/โลก)
source-registry.ts       — บันทึกว่าข้อมูลมาจากแหล่งไหน (สพฐ., สสวท., ฯลฯ)
strands-and-standards.ts — ต้นไม้สาระ/มาตรฐานของแต่ละวิชา
indicators.ts            — ตัวชี้วัด (ชั้นปี/ช่วงชั้น) ที่ผูกกับมาตรฐานและระดับชั้น
canonical-indicators.ts  — คลังตัวชี้วัดหลักระดับมัธยม (authoritative)
course-catalog.ts        — รายวิชา: วิชา × ชั้น × เทอม × รายการสาระ
map-packs.ts             — แพ็คแผนที่หลักสูตร: หน่วย → สาระ → มาตรฐาน → ตัวชี้วัด
unit-learning-outcomes.ts — ผลการเรียนรู้ระดับหน่วยการเรียน (ULO)
template-master-pack.ts  — สเปคเทมเพลทบทเรียนต่อวิชา (pedagogy, block types, สื่อ)
ai-curriculum-rules.ts   — กฎที่ AI ใช้สร้างแผนการสอน (มาจาก template pack)
assessment-blueprints.ts — blueprint: น้ำหนัก Bloom level × ตัวชี้วัด
import/                  — pipeline นำเข้าจากไฟล์ docx (ทำครั้งเดียว)
```

---

## ลำดับการพึ่งพา — ห้าม import ย้อนทาง

ข้อมูลไหลจากบนลงล่างเท่านั้น:

```
grade-model → subject-catalog → source-registry
                    ↓
         strands-and-standards
                    ↓
         indicators / canonical-indicators
                    ↓
              course-catalog
                    ↓
               map-packs
                    ↓
     unit-learning-outcomes / template-master-pack
                    ↓
       ai-curriculum-rules / assessment-blueprints
```

---

## ชนิดข้อมูลสำคัญ

| Type | ไฟล์ | ค่าที่ใช้ |
|------|------|-----------|
| `CanonicalGradeLevel` | `grade-model.ts` | `"p1"` ถึง `"m6"` |
| `CanonicalGradeBand` | `grade-model.ts` | `"p1_p3" \| "p4_p6" \| "m1_m3" \| "m4_m6"` |
| `CanonicalCoreSubjectId` | `subject-catalog.ts` | `"thai" \| "mathematics" \| "science_technology" \| …` (8 วิชา) |
| `CanonicalAdditionalSubjectId` | `subject-catalog.ts` | `"physics" \| "chemistry" \| "biology" \| "earth_space_science"` |
| `CurriculumStrand` / `CurriculumStandard` | `strands-and-standards.ts` | สาระ/มาตรฐาน พร้อม `sourceRefs[]` |
| `CurriculumIndicator` | `indicators.ts` | รหัส regex `^[ปม]\.\d+\/\d+$` |
| `CanonicalCourseEntry` | `course-catalog.ts` | วิชา × ชั้น × เทอม × strandIds |
| `SubjectCurriculumMapPack` | `map-packs.ts` | หน่วยพร้อม strand/standard/indicator refs |
| `SubjectTemplateMasterPack` | `template-master-pack.ts` | pedagogy + block types + สื่อที่ต้องการ |

---

## รหัสตัวชี้วัด — ต้องรู้

- `ป.x/y` = **ตัวชี้วัดชั้นปี** (during-grade) — วัดได้ตอนจบปีนั้น
- `ม.x/y` = **ตัวชี้วัดช่วงชั้น** (terminal) — วัดตอนจบช่วงชั้น
- regex ที่ใช้ validate: `/^[ปม]\.\d+\/\d+$/u`

---

## Schema Versioning

ทุก data structure หลักมี const บอก version เช่น:

```ts
SUBJECT_CURRICULUM_MAP_PACK_SCHEMA_VERSION = "subject_curriculum_map_pack_v1"
SUBJECT_TEMPLATE_MASTER_PACK_SCHEMA_VERSION = "subject_template_master_pack_v1"
CURRICULUM_INDICATOR_SCHEMA_VERSION = "curriculum_indicator_v1"
```

ถ้าเพิ่ม field ใหม่ให้ทำเป็น optional เสมอ (backward compat) — bump version เมื่อ shape เปลี่ยนแบบ breaking

---

## Import Pipeline (`import/`) — ทำครั้งเดียว

หลักสูตรมัธยมถูกนำเข้าจากไฟล์ `.docx` ของ สพฐ. ผ่าน pipeline นี้:

```
secondary-core-docx-source.ts      — entry point + SECONDARY_CORE_DOCX_SOURCE_ID
secondary-core-docx-extractor.ts   — อ่านตารางจาก docx
secondary-core-course-source.ts    — แปลงเป็น CanonicalCourseEntry[]
secondary-core-course-rows.json    — rows ที่ cache ไว้ (commit แล้ว)
secondary-core-indicator-rows.json — indicator rows ที่ cache ไว้ (commit แล้ว)
```

ไม่ต้องรัน pipeline ซ้ำ ยกเว้นไฟล์ docx ต้นฉบับเปลี่ยน

---

## รัน Tests

```bash
# รัน test ทั้งหมดในโฟลเดอร์นี้
node ./node_modules/vitest/vitest.mjs run --config vitest.config.mts --pool threads src/lib/curriculum/__tests__/

# type-check ด้วย
npx tsc --project tsconfig.server.json --noEmit
```

(ยังไม่มี `check:curriculum` script — ต้องรันแยก)
