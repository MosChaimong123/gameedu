# Subject Curriculum Map Packs

Last updated: 2026-06-21  
Status: Phase 4 complete

## Goal

แปลงแต่ละกลุ่มสาระหลักให้มี `starter unit map` ในรูปแบบเดียวกัน เพื่อให้ระบบ lesson builder, assessment blueprint, และ curriculum-driven AI ใช้โครงเดียวกันได้ก่อนจะลงลึกถึง outcome รายหน่วยใน phase ถัดไป

ไฟล์อ้างอิงหลัก:

- [map-packs.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/curriculum/map-packs.ts)
- [map-packs.test.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/curriculum/__tests__/map-packs.test.ts)
- [subject-catalog.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/curriculum/subject-catalog.ts)
- [grade-model.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/curriculum/grade-model.ts)
- [physics/curriculum.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/physics/curriculum.ts)

## Delivered

- เพิ่ม schema กลาง `SubjectCurriculumMapPack`
- เพิ่ม schema กลาง `SubjectCurriculumUnitOutline`
- เพิ่ม starter curriculum map pack สำหรับ 8 กลุ่มสาระหลัก
- เพิ่ม helper อ่าน pack ตาม `subjectId`
- เพิ่ม helper filter unit ตาม `gradeBand`
- เพิ่ม targeted tests

## Scope split

Phase นี้แยกขอบเขตแบบตั้งใจ:

- `core 8 learning areas` ใช้ `starter unit map pack`
- `physics` ยังใช้ detailed curriculum map เดิมใน [curriculum.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/physics/curriculum.ts)

เหตุผลคือ physics มี `grade + semester + unit + learning outcome` ละเอียดอยู่แล้ว ขณะที่วิชาอื่นใน phase นี้ยังปิดงานที่ระดับ `unit map ขั้นต้น`

## Canonical core packs delivered

### ภาษาไทย

- การฟัง การดู และการพูด
- การอ่าน
- การเขียน
- หลักการใช้ภาษาไทย
- วรรณคดีและวรรณกรรม

### คณิตศาสตร์

- จำนวนและพีชคณิต
- การวัดและเรขาคณิต
- สถิติและความน่าจะเป็น
- การแก้ปัญหาและการให้เหตุผล

### วิทยาศาสตร์และเทคโนโลยี

- วิทยาศาสตร์ชีวภาพ
- วิทยาศาสตร์กายภาพ
- โลกและอวกาศ
- เทคโนโลยีและวิทยาการคำนวณ

### สังคมศึกษา ศาสนา และวัฒนธรรม

- ศาสนา ศีลธรรม และจริยธรรม
- หน้าที่พลเมือง วัฒนธรรม และการดำเนินชีวิตในสังคม
- เศรษฐศาสตร์
- ประวัติศาสตร์
- ภูมิศาสตร์

### สุขศึกษาและพลศึกษา

- การเจริญเติบโตและพัฒนาการของมนุษย์
- ชีวิตและครอบครัว
- การเคลื่อนไหว การออกกำลังกาย เกม และกีฬา
- การสร้างเสริมสุขภาพและความปลอดภัย

### ศิลปะ

- ทัศนศิลป์
- ดนตรี
- นาฏศิลป์และการแสดง

### การงานอาชีพ

- การดำรงชีวิตและทักษะการทำงาน
- การออกแบบและเทคโนโลยี
- อาชีพและผู้ประกอบการ

### ภาษาต่างประเทศ

- ภาษาเพื่อการสื่อสาร
- ภาษาและวัฒนธรรม
- ภาษากับความสัมพันธ์กับกลุ่มสาระอื่น
- ภาษากับความสัมพันธ์กับชุมชนและโลก

## Current modeling rule

แต่ละ pack มี:

- `subjectId`
- `curriculumCode`
- `packStatus`
- `coverageGradeBands`
- `coverageGradeLevels`
- `semesterMode`
- `sourceRefs`
- `unitOutlines`

แต่ละ unit outline มี:

- `id`
- `title`
- `order`
- `gradeBands`
- `gradeLevels`
- `semesterMode`
- `semester`
- `sourceRefs`
- `notes`

## Interpretation rule

pack ชุดนี้เป็น `starter_core_map` ไม่ใช่ final textbook sequence หรือ final official unit breakdown รายระดับชั้นแบบละเอียดทั้งหมด  
หน้าที่ของมันคือทำให้:

- UI เลือก unit ได้แบบไม่ลอย
- AI รู้โครงหลักของวิชา
- phase 5 สามารถแตกเป็น `unit-level learning outcomes` ต่อได้

## Done criteria

ถือว่า phase นี้ผ่านเมื่อ:

- core 8 learning areas มี unit map ขั้นต้นครบ
- ใช้ schema เดียวกันทุกวิชา
- ผูกกับ canonical subject ids ได้
- ผูกกับ grade model กลางได้
- physics detailed map ยังแยกชัดและไม่โดน regression
- tests ผ่าน
