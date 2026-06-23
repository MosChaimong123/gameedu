# Core Curriculum Source Registry

Last updated: 2026-06-21  
Status: Phase 1 completed

## Goal

เอกสารนี้คือ `source registry` กลางของระบบหลักสูตร ใช้ตอบคำถาม 4 เรื่อง:

1. วิชาไหนอ้างอิงแหล่งทางการจากไหน
2. วิชาไหนยังมีแค่ source ระดับ catalog หรือ source กลาง
3. source ไหนใช้ทำ `curriculum mapping`
4. source ไหนใช้ได้แค่ `structure / naming reference`

เอกสารนี้ต้องอ่านคู่กับ:

- [basic-education-curriculum-master-plan.md](./basic-education-curriculum-master-plan.md)
- [physics-curriculum-map.md](./physics-curriculum-map.md)

## Registry Rules

การใช้ source ในระบบให้ยึดกติกานี้:

- `priority 1` = official curriculum / official subject page
- `priority 2` = official placeholder ที่ยังต้อง capture เพิ่ม
- `priority 3-4` = publisher catalog reference
- `priority 5+` = internal platform sequencing

ถ้า source เป็น `publisher_catalog`:

- ใช้จัดชื่อระดับชั้น
- ใช้จัดหมวดวิชา
- ใช้ช่วยทำ teacher-facing labels
- ห้ามใช้เป็นแหล่งหลักในการกำหนด learning outcomes

ถ้า source เป็น `official_curriculum` หรือ `official_subject_page`:

- ใช้กำหนด curriculum backbone
- ใช้กำหนด unit coverage
- ใช้กำหนด outcome coverage
- ใช้กำหนด assessment blueprint

## Verified Sources

### 1. Core curriculum backbone

- Provider: `core_curriculum`
- Type: `official_curriculum`
- Status: `verified_live`
- URL: [IPST Curriculum](https://www.ipst.ac.th/curriculum)
- Coverage:
  - ภาษาไทย
  - คณิตศาสตร์
  - วิทยาศาสตร์และเทคโนโลยี
  - สังคมศึกษา ศาสนา และวัฒนธรรม
  - สุขศึกษาและพลศึกษา
  - ศิลปะ
  - การงานอาชีพ
  - ภาษาต่างประเทศ
- Use:
  - curriculum_reference
  - structure_reference

หมายเหตุ:

- ใช้เป็น anchor กลางของ Phase 1
- สำหรับวิชาที่ยังไม่มี subject-specific official page ใน registry ให้ใช้ตัวนี้เป็น backbone ชั่วคราวก่อน

### 2. IPST subject-backed curriculum source

- Provider: `ipst`
- Type: `official_subject_page`
- Status: `verified_live`
- URL: [IPST Curriculum](https://www.ipst.ac.th/curriculum)
- Coverage:
  - คณิตศาสตร์
  - วิทยาศาสตร์และเทคโนโลยี
  - ฟิสิกส์
  - เคมี
  - ชีววิทยา
  - โลก ดาราศาสตร์ และอวกาศ
- Use:
  - curriculum_reference
  - subject_reference
  - structure_reference

หมายเหตุ:

- เป็น source ทางการที่พร้อมที่สุดสำหรับสาย science/math ในรอบนี้
- ใช้เป็นฐาน canonical pack ของ physics และวิชาต่อไปได้

### 3. Aksorn catalog reference

- Provider: `aksorn`
- Type: `publisher_catalog`
- Status: `verified_catalog`
- URL: [Aksorn Basic Education Catalog](https://www.aksorn.com/store/basic-education-th)
- Coverage:
  - ทุกกลุ่มสาระหลัก
  - วิชาเพิ่มเติมสายวิทย์
- Use:
  - structure_reference
  - subject_reference

หมายเหตุ:

- ใช้ดูรูปแบบการจัดหมวดระดับชั้นและคำเรียกที่ครูคุ้น
- ห้ามใช้แทนหลักสูตรทางการ

### 4. MacEducation catalog reference

- Provider: `maceducation`
- Type: `publisher_catalog`
- Status: `verified_catalog`
- URL: [MacEducation Product Catalog](https://www.maceducation.com/product/)
- Coverage:
  - ทุกกลุ่มสาระหลัก
  - วิชาเพิ่มเติมสายวิทย์
- Use:
  - structure_reference
  - subject_reference

หมายเหตุ:

- ใช้เป็น reference เสริมฝั่ง catalog
- ไม่ใช่ source ของ outcomes

### 5. TeachPlayEdu internal sequencing

- Provider: `platform`
- Type: `platform_internal`
- Status: `verified_live`
- Coverage:
  - ทุกวิชาที่จะเข้า template pack
- Use:
  - platform_sequence

หมายเหตุ:

- ใช้หลังจาก map official curriculum แล้วเท่านั้น
- ห้ามยกเป็น curriculum authority

## Pending Source Capture

กลุ่มสาระที่ยังต้อง capture official subject-specific sources เพิ่ม:

- ภาษาไทย
- สังคมศึกษา ศาสนา และวัฒนธรรม
- สุขศึกษาและพลศึกษา
- ศิลปะ
- การงานอาชีพ
- ภาษาต่างประเทศ

สถานะตอนนี้:

- ยังเดิน Phase 1 ได้ เพราะมี `core_curriculum backbone` กลางแล้ว
- แต่ก่อนเริ่ม `Subject Curriculum Map Packs` ของวิชาเหล่านี้ ควรเติม official subject pages / PDFs ให้ครบก่อน

## Copyright And Usage Guard

ทุก source ใน registry ต้องถือกติกานี้:

- ใช้เพื่อ mapping โครงหลักสูตร
- ใช้เพื่ออ้างอิงชื่อหน่วย/ระดับชั้น/สาระ
- ใช้เพื่อ coverage และ quality gate
- ห้ามคัดลอกคำอธิบายหนังสือเรียน ตัวอย่างโจทย์ รูปภาพ ตาราง หรือ layout เชิงพาณิชย์เข้าระบบตรงๆ

AI generation ต้อง:

- สร้างคำอธิบายใหม่
- อิง outcome / unit / topic จาก canonical map
- ไม่ copy prose จาก publisher catalog

## Phase 1 Deliverables

Phase 1 รอบนี้ถือว่าส่งมอบแล้วใน 3 ส่วน:

1. แผนกลาง  
   [basic-education-curriculum-master-plan.md](./basic-education-curriculum-master-plan.md)

2. เอกสาร registry นี้  
   [core-curriculum-source-registry.md](./core-curriculum-source-registry.md)

3. registry schema + data ในโค้ด  
   [source-registry.ts](/abs/path/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/curriculum/source-registry.ts)

## Exit Criteria

Phase 1 ถือว่าเสร็จเมื่อ:

- มี source registry กลาง
- แยก official / catalog / platform ได้ชัด
- มี priority ต่อ source
- ระบุวิชาที่ pending capture ชัด
- โค้ดรองรับ source ref กลางที่ไม่ผูกกับ physics อย่างเดียว

## Next Step

งานถัดไปที่เหมาะสุดคือ:

- `Phase 2: Canonical Subject Catalog`

เพราะตอนนี้เรามี source layer แล้ว และพร้อมยกจาก registry ไปเป็น subject ids กลางของทั้งระบบ
