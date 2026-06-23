# Physics Unit-Level Learning Outcomes

เอกสารนี้เป็น Phase 2 ของแผน `Physics Lesson Template Master` ใช้สำหรับแตกผลการเรียนรู้ระดับ `unit` ให้พร้อมต่อยอดไปยัง:

- `PhysicsCurriculumMap` schema
- curriculum validator
- AI lesson template prompt
- teacher lesson builder
- publish quality gate

## Purpose

เอกสารนี้ทำหน้าที่เป็น `platform canonical outcome layer` ระหว่าง:

- `curriculum backbone` จาก สสวท.
- `platform recommended sequence` ของ TeachPlayEdu

กล่าวอีกแบบคือ สสวท. ให้กรอบสาระและผลการเรียนรู้รวมระดับหมวด ส่วนเอกสารนี้แตกกรอบนั้นลงมาเป็น `unit-level learning outcomes` ที่ใช้ทำงานในระบบได้จริง

## Source Rule

ผลการเรียนรู้ในเอกสารนี้:

1. อิงโครงสาระจาก สสวท. เป็นหลัก
2. เรียบเรียงใหม่ในระดับ unit เพื่อให้เหมาะกับการใช้ในระบบ
3. ยังไม่ใช่การถอดรหัสทางการแบบเต็มจากเอกสาร PDF รายผลการเรียนรู้ 67 ข้อ
4. ใช้ `internal outcome ids` ไปก่อน
5. รองรับการ map กลับไปยังเอกสารทางการใน Phase ถัดไป

## ID Convention

รูปแบบรหัส:

`phy-lo-[grade]-[semester]-[unit]-[index]`

ตัวอย่าง:

- `phy-lo-m4-s1-u01-01`
- `phy-lo-m5-s2-u03-02`

## Outcome Structure

แต่ละ outcome ควรพร้อมใช้กับ schema นี้:

```ts
type PhysicsLearningOutcome = {
  id: string
  text: string
  concepts: string[]
  skills: string[]
  assessmentHints?: string[]
}
```

## M4 Semester 1

### Unit: phy-m4-s1-u01 | ธรรมชาติและพัฒนาการทางฟิสิกส์

Source Group: 1

Outcomes:

1. `phy-lo-m4-s1-u01-01`
   - text: อธิบายธรรมชาติของฟิสิกส์ในฐานะวิชาที่ศึกษาปรากฏการณ์ธรรมชาติด้วยหลักฐาน การสังเกต การทดลอง และแบบจำลอง
   - concepts: ธรรมชาติของฟิสิกส์, หลักฐานเชิงประจักษ์, แบบจำลองทางวิทยาศาสตร์
   - skills: อธิบาย, จำแนก, เชื่อมโยงตัวอย่าง
   - assessmentHints: อธิบายจากสถานการณ์, เปรียบเทียบวิทยาศาสตร์กับความเชื่อ
2. `phy-lo-m4-s1-u01-02`
   - text: อธิบายพัฒนาการขององค์ความรู้ทางฟิสิกส์และผลของเทคโนโลยีต่อการค้นพบทางฟิสิกส์
   - concepts: พัฒนาการทางฟิสิกส์, เทคโนโลยีกับการค้นพบ, วิทยาศาสตร์กับสังคม
   - skills: เรียบเรียงลำดับเหตุการณ์, วิเคราะห์ผลกระทบ
   - assessmentHints: timeline, short reflection
3. `phy-lo-m4-s1-u01-03`
   - text: ใช้กระบวนการทางวิทยาศาสตร์ตั้งคำถาม สมมติฐาน และแนวทางตรวจสอบได้ในบริบทฟิสิกส์เบื้องต้น
   - concepts: คำถามวิทยาศาสตร์, สมมติฐาน, ตัวแปร
   - skills: ตั้งคำถาม, ออกแบบการตรวจสอบ, ระบุตัวแปร
   - assessmentHints: mini investigation plan

### Unit: phy-m4-s1-u02 | การเคลื่อนที่แนวตรง

Source Group: 1

Outcomes:

1. `phy-lo-m4-s1-u02-01`
   - text: อธิบายความหมายของตำแหน่ง ระยะทาง การกระจัด อัตราเร็ว ความเร็ว และความเร่งในการเคลื่อนที่แนวตรง
   - concepts: ตำแหน่ง, ระยะทาง, การกระจัด, ความเร็ว, ความเร่ง
   - skills: นิยาม, เปรียบเทียบ, เลือกใช้ปริมาณ
   - assessmentHints: concept check, sorting task
2. `phy-lo-m4-s1-u02-02`
   - text: วิเคราะห์กราฟตำแหน่ง-เวลา กราฟความเร็ว-เวลา และเชื่อมโยงกราฟกับลักษณะการเคลื่อนที่ของวัตถุ
   - concepts: กราฟการเคลื่อนที่, ความชัน, พื้นที่ใต้กราฟ
   - skills: อ่านกราฟ, แปลความ, สรุปลักษณะการเคลื่อนที่
   - assessmentHints: graph interpretation, graph matching
3. `phy-lo-m4-s1-u02-03`
   - text: คำนวณปริมาณที่เกี่ยวข้องกับการเคลื่อนที่แนวตรงในกรณีความเร็วคงตัวและความเร่งคงตัว
   - concepts: สมการการเคลื่อนที่แนวตรง, ความเร่งคงตัว
   - skills: คำนวณ, แทนค่า, ตรวจสอบหน่วย
   - assessmentHints: worked problem, multi-step problem

### Unit: phy-m4-s1-u03 | แรงและกฎการเคลื่อนที่

Source Group: 1

Outcomes:

1. `phy-lo-m4-s1-u03-01`
   - text: อธิบายความสัมพันธ์ระหว่างแรงลัพธ์กับการเปลี่ยนสภาพการเคลื่อนที่ของวัตถุตามกฎการเคลื่อนที่ของนิวตัน
   - concepts: แรงลัพธ์, กฎของนิวตัน, ความเฉื่อย
   - skills: อธิบายเหตุผล, เชื่อมโยงเหตุและผล
   - assessmentHints: conceptual scenario, explanation task
2. `phy-lo-m4-s1-u03-02`
   - text: เขียนและใช้แผนภาพแรงเพื่อวิเคราะห์แรงที่กระทำต่อวัตถุในสถานการณ์ต่าง ๆ
   - concepts: แรงปฏิกิริยา, น้ำหนัก, แรงตึงเชือก, แรงเสียดทาน
   - skills: วาด free-body diagram, จำแนกแรง, วิเคราะห์ทิศทาง
   - assessmentHints: draw-and-label task
3. `phy-lo-m4-s1-u03-03`
   - text: คำนวณผลของแรงต่อการเคลื่อนที่ของวัตถุในกรณีหนึ่งมิติและอธิบายคำตอบอย่างมีเหตุผล
   - concepts: F=ma, แรงเสียดทาน, สมดุลไม่สมบูรณ์
   - skills: คำนวณ, วิเคราะห์โจทย์, อธิบายคำตอบ
   - assessmentHints: numeric problem with reasoning

## M4 Semester 2

### Unit: phy-m4-s2-u01 | สมดุลกล

Source Group: 1

Outcomes:

1. `phy-lo-m4-s2-u01-01`
   - text: อธิบายเงื่อนไขของสมดุลต่อการเคลื่อนที่เชิงเส้นและเชิงหมุนของวัตถุ
   - concepts: สมดุลของแรง, สมดุลของโมเมนต์
   - skills: อธิบาย, แยกกรณี, เชื่อมโยงสถานการณ์จริง
   - assessmentHints: classify equilibrium situations
2. `phy-lo-m4-s2-u01-02`
   - text: คำนวณโมเมนต์ของแรงและใช้หลักสมดุลกลแก้ปัญหาอย่างง่าย
   - concepts: โมเมนต์, จุดหมุน, ระยะแขนของแรง
   - skills: คำนวณ, เลือกจุดอ้างอิง, วิเคราะห์แรงหมุน
   - assessmentHints: torque problem set
3. `phy-lo-m4-s2-u01-03`
   - text: ประยุกต์หลักสมดุลกลอธิบายการทำงานของเครื่องมือและสิ่งก่อสร้างในชีวิตประจำวัน
   - concepts: คาน, สมดุลในงานวิศวกรรมเบื้องต้น
   - skills: ยกตัวอย่าง, วิเคราะห์การใช้งานจริง
   - assessmentHints: case-based explanation

### Unit: phy-m4-s2-u02 | งานและพลังงาน

Source Group: 1

Outcomes:

1. `phy-lo-m4-s2-u02-01`
   - text: อธิบายความหมายของงาน กำลัง และพลังงานในบริบทของการเคลื่อนที่เชิงกล
   - concepts: งาน, กำลัง, พลังงานจลน์, พลังงานศักย์
   - skills: นิยาม, เปรียบเทียบ, เชื่อมโยงปริมาณ
   - assessmentHints: concept map
2. `phy-lo-m4-s2-u02-02`
   - text: คำนวณงาน พลังงานจลน์ พลังงานศักย์ และกำลังจากสถานการณ์ที่กำหนด
   - concepts: สูตรงานและพลังงาน, หน่วยพลังงาน
   - skills: คำนวณ, แทนค่า, ตรวจคำตอบ
   - assessmentHints: structured problem set
3. `phy-lo-m4-s2-u02-03`
   - text: ใช้กฎการอนุรักษ์พลังงานกลอธิบายและแก้ปัญหาการเคลื่อนที่ของระบบอย่างง่าย
   - concepts: การอนุรักษ์พลังงาน, การเปลี่ยนรูปพลังงาน
   - skills: วิเคราะห์ระบบ, เลือกหลักการ, อธิบายการเปลี่ยนรูปพลังงาน
   - assessmentHints: multi-step conservation problem

### Unit: phy-m4-s2-u03 | โมเมนตัมและการชน

Source Group: 1

Outcomes:

1. `phy-lo-m4-s2-u03-01`
   - text: อธิบายความหมายของอิมพัลส์และโมเมนตัมและความสัมพันธ์ระหว่างแรงกับการเปลี่ยนโมเมนตัม
   - concepts: อิมพัลส์, โมเมนตัม, การเปลี่ยนโมเมนตัม
   - skills: อธิบาย, เชื่อมโยงกราฟและสมการ
   - assessmentHints: explain from force-time graph
2. `phy-lo-m4-s2-u03-02`
   - text: ใช้กฎการอนุรักษ์โมเมนตัมวิเคราะห์การชนในหนึ่งมิติอย่างง่าย
   - concepts: ระบบปิด, การชนยืดหยุ่น, การชนไม่ยืดหยุ่น
   - skills: คำนวณ, ตั้งสมการ, วิเคราะห์ก่อน-หลังชน
   - assessmentHints: collision problem
3. `phy-lo-m4-s2-u03-03`
   - text: เปรียบเทียบลักษณะการชนแต่ละแบบและอธิบายผลที่เกิดขึ้นกับพลังงานของระบบ
   - concepts: พลังงานจลน์ก่อน-หลังชน
   - skills: เปรียบเทียบ, อธิบายเชิงคุณภาพ
   - assessmentHints: comparison table

### Unit: phy-m4-s2-u04 | การเคลื่อนที่แนวโค้ง

Source Group: 1

Outcomes:

1. `phy-lo-m4-s2-u04-01`
   - text: อธิบายการเคลื่อนที่แบบโปรเจกไทล์โดยแยกองค์ประกอบการเคลื่อนที่ในแนวระดับและแนวดิ่ง
   - concepts: โปรเจกไทล์, การเคลื่อนที่สองมิติ, องค์ประกอบเวกเตอร์
   - skills: แยกเวกเตอร์, อธิบาย, สร้างแบบจำลอง
   - assessmentHints: diagram-based explanation
2. `phy-lo-m4-s2-u04-02`
   - text: คำนวณตำแหน่ง เวลา ระยะไกล และความสูงของวัตถุในการเคลื่อนที่แบบโปรเจกไทล์
   - concepts: สมการโปรเจกไทล์
   - skills: คำนวณ, ใช้สมการ, แปลผล
   - assessmentHints: projectile problem set
3. `phy-lo-m4-s2-u04-03`
   - text: ประยุกต์แนวคิดการเคลื่อนที่แนวโค้งอธิบายปรากฏการณ์หรือการออกแบบในชีวิตจริง
   - concepts: มุมยิง, วิถีการเคลื่อนที่
   - skills: ประยุกต์ใช้, อธิบายเชิงสถานการณ์
   - assessmentHints: design or sports application

## M5 Semester 1

### Unit: phy-m5-s1-u01 | การเคลื่อนที่แบบฮาร์มอนิกอย่างง่าย

Source Group: 2

Outcomes:

1. `phy-lo-m5-s1-u01-01`
   - text: อธิบายลักษณะของการสั่นและการเคลื่อนที่แบบฮาร์มอนิกอย่างง่าย
   - concepts: SHM, คาบ, ความถี่, แอมพลิจูด
   - skills: นิยาม, จำแนก, อธิบาย
   - assessmentHints: identify SHM vs non-SHM
2. `phy-lo-m5-s1-u01-02`
   - text: เชื่อมโยงปริมาณที่เกี่ยวข้องกับ SHM และแปลความหมายจากกราฟการสั่น
   - concepts: กราฟการสั่น, เฟส, ความสัมพันธ์คาบ-ความถี่
   - skills: อ่านกราฟ, เปรียบเทียบ, สรุป
   - assessmentHints: graph interpretation
3. `phy-lo-m5-s1-u01-03`
   - text: ประยุกต์แนวคิด SHM กับระบบมวล-สปริงหรือลูกตุ้มอย่างง่าย
   - concepts: ระบบมวล-สปริง, ลูกตุ้ม
   - skills: วิเคราะห์ระบบ, อธิบายปัจจัยที่มีผล
   - assessmentHints: simple lab or model analysis

### Unit: phy-m5-s1-u02 | คลื่น

Source Group: 2

Outcomes:

1. `phy-lo-m5-s1-u02-01`
   - text: อธิบายธรรมชาติของคลื่นและการส่งผ่านพลังงานโดยไม่ส่งผ่านสสารทั้งหมด
   - concepts: คลื่นกล, การส่งผ่านพลังงาน
   - skills: อธิบาย, ยกตัวอย่าง, เปรียบเทียบ
   - assessmentHints: concept question
2. `phy-lo-m5-s1-u02-02`
   - text: ใช้ความสัมพันธ์ระหว่างอัตราเร็วคลื่น ความถี่ และความยาวคลื่นแก้ปัญหาได้
   - concepts: v=fλ
   - skills: คำนวณ, แทนค่า, วิเคราะห์หน่วย
   - assessmentHints: calculation problem set
3. `phy-lo-m5-s1-u02-03`
   - text: อธิบายและแปลความหมายปรากฏการณ์ของคลื่น เช่น การสะท้อน การหักเห การแทรกสอด และการเลี้ยวเบน
   - concepts: ปรากฏการณ์ของคลื่น
   - skills: อธิบายเชิงภาพ, เปรียบเทียบปรากฏการณ์
   - assessmentHints: waveform analysis

### Unit: phy-m5-s1-u03 | แสงเชิงคลื่น

Source Group: 2

Outcomes:

1. `phy-lo-m5-s1-u03-01`
   - text: อธิบายหลักฐานที่สนับสนุนว่าแสงมีสมบัติแบบคลื่น
   - concepts: ธรรมชาติของแสง, สมบัติแบบคลื่น
   - skills: อธิบาย, เชื่อมโยงหลักฐาน
   - assessmentHints: evidence-based response
2. `phy-lo-m5-s1-u03-02`
   - text: อธิบายการแทรกสอดและการเลี้ยวเบนของแสงจากสถานการณ์หรือการทดลองอย่างง่าย
   - concepts: แทรกสอด, เลี้ยวเบน
   - skills: วิเคราะห์รูปแบบ, อธิบายผลทดลอง
   - assessmentHints: fringe pattern interpretation
3. `phy-lo-m5-s1-u03-03`
   - text: ประยุกต์แนวคิดแสงเชิงคลื่นอธิบายการเกิดลวดลายหรืออุปกรณ์ที่เกี่ยวข้อง
   - concepts: ความยาวคลื่นของแสง, ปรากฏการณ์เชิงคลื่น
   - skills: ประยุกต์ใช้, อธิบายเชิงสถานการณ์
   - assessmentHints: application short essay

### Unit: phy-m5-s1-u04 | แสงเชิงรังสี

Source Group: 2

Outcomes:

1. `phy-lo-m5-s1-u04-01`
   - text: ใช้กฎการสะท้อนและการหักเหอธิบายเส้นทางการเดินทางของแสงได้
   - concepts: การสะท้อน, การหักเห, ดัชนีหักเห
   - skills: วาดรังสี, ใช้กฎ, อธิบาย
   - assessmentHints: ray diagram
2. `phy-lo-m5-s1-u04-02`
   - text: วิเคราะห์การเกิดภาพจากกระจกและเลนส์ในสถานการณ์ต่าง ๆ
   - concepts: ภาพจริง, ภาพเสมือน, กระจก, เลนส์
   - skills: สร้างภาพรังสี, วิเคราะห์ลักษณะภาพ
   - assessmentHints: image formation task
3. `phy-lo-m5-s1-u04-03`
   - text: ประยุกต์แนวคิดแสงเชิงรังสีกับเครื่องมือทางทัศนศาสตร์ในชีวิตจริง
   - concepts: เครื่องมือทัศนศาสตร์
   - skills: เชื่อมโยงทฤษฎีกับการใช้งาน
   - assessmentHints: device explanation

## M5 Semester 2

### Unit: phy-m5-s2-u01 | เสียง

Source Group: 2

Outcomes:

1. `phy-lo-m5-s2-u01-01`
   - text: อธิบายการเกิดเสียง การเคลื่อนที่ของเสียง และการได้ยินของมนุษย์
   - concepts: แหล่งกำเนิดเสียง, คลื่นเสียง, การได้ยิน
   - skills: อธิบาย, เชื่อมโยงระบบ
   - assessmentHints: audio concept response
2. `phy-lo-m5-s2-u01-02`
   - text: วิเคราะห์ความสัมพันธ์ของความถี่ ความเข้มเสียง และคุณภาพเสียงกับการรับรู้
   - concepts: ความถี่, ความเข้มเสียง, คุณภาพเสียง
   - skills: เปรียบเทียบ, แปลผลข้อมูล
   - assessmentHints: compare sound samples or charts
3. `phy-lo-m5-s2-u01-03`
   - text: อธิบายปรากฏการณ์ที่เกี่ยวข้องกับเสียง เช่น การสั่นพ้อง คลื่นนิ่ง หรือดอปเพลอร์อย่างง่าย
   - concepts: สั่นพ้อง, คลื่นนิ่ง, ดอปเพลอร์
   - skills: อธิบายปรากฏการณ์, ยกตัวอย่าง
   - assessmentHints: scenario explanation

### Unit: phy-m5-s2-u02 | ไฟฟ้าสถิต

Source Group: 3

Outcomes:

1. `phy-lo-m5-s2-u02-01`
   - text: อธิบายการเกิดประจุไฟฟ้าและแรงระหว่างประจุด้วยกฎของคูลอมบ์
   - concepts: ประจุไฟฟ้า, กฎของคูลอมบ์
   - skills: อธิบาย, คำนวณ, เปรียบเทียบ
   - assessmentHints: Coulomb-law problem
2. `phy-lo-m5-s2-u02-02`
   - text: อธิบายแนวคิดสนามไฟฟ้าและใช้แทนการอธิบายแรงที่กระทำต่อประจุ
   - concepts: สนามไฟฟ้า, เส้นสนาม
   - skills: แปลความ, วาดภาพ, อธิบาย
   - assessmentHints: field-line interpretation
3. `phy-lo-m5-s2-u02-03`
   - text: อธิบายศักย์ไฟฟ้าและความสัมพันธ์กับพลังงานศักย์ไฟฟ้าในสถานการณ์อย่างง่าย
   - concepts: ศักย์ไฟฟ้า, พลังงานศักย์ไฟฟ้า
   - skills: เชื่อมโยงปริมาณ, อธิบายเชิงแนวคิด
   - assessmentHints: conceptual and numeric mixed item

### Unit: phy-m5-s2-u03 | ไฟฟ้ากระแส

Source Group: 3

Outcomes:

1. `phy-lo-m5-s2-u03-01`
   - text: อธิบายความหมายของกระแสไฟฟ้า ความต่างศักย์ ความต้านทาน และความสัมพันธ์ตามกฎของโอห์ม
   - concepts: กระแสไฟฟ้า, ความต่างศักย์, ความต้านทาน, กฎของโอห์ม
   - skills: นิยาม, เชื่อมโยง, คำนวณ
   - assessmentHints: direct substitution and explanation
2. `phy-lo-m5-s2-u03-02`
   - text: วิเคราะห์วงจรไฟฟ้ากระแสตรงอย่างง่ายทั้งแบบอนุกรมและขนาน
   - concepts: วงจรอนุกรม, วงจรขนาน
   - skills: เขียนวงจร, วิเคราะห์, คำนวณ
   - assessmentHints: circuit analysis
3. `phy-lo-m5-s2-u03-03`
   - text: คำนวณพลังงานไฟฟ้าและกำลังไฟฟ้าและอธิบายการใช้ไฟฟ้าอย่างเหมาะสม
   - concepts: พลังงานไฟฟ้า, กำลังไฟฟ้า
   - skills: คำนวณ, ตีความ, ประยุกต์ใช้
   - assessmentHints: household electricity problem

## M6 Semester 1

### Unit: phy-m6-s1-u01 | แม่เหล็กและไฟฟ้า

Source Group: 3

Outcomes:

1. `phy-lo-m6-s1-u01-01`
   - text: อธิบายสนามแม่เหล็กและแรงแม่เหล็กที่กระทำต่อประจุไฟฟ้าหรือกระแสไฟฟ้า
   - concepts: สนามแม่เหล็ก, แรงแม่เหล็ก
   - skills: อธิบาย, ใช้กฎมือ, วิเคราะห์ทิศทาง
   - assessmentHints: direction reasoning task
2. `phy-lo-m6-s1-u01-02`
   - text: อธิบายการเหนี่ยวนำแม่เหล็กไฟฟ้าและความสัมพันธ์กับกฎของฟาราเดย์
   - concepts: การเหนี่ยวนำแม่เหล็กไฟฟ้า, ฟลักซ์แม่เหล็ก, กฎของฟาราเดย์
   - skills: อธิบาย, วิเคราะห์เหตุและผล, แปลผลการทดลอง
   - assessmentHints: induction scenario
3. `phy-lo-m6-s1-u01-03`
   - text: ประยุกต์แนวคิดแม่เหล็กและไฟฟ้าอธิบายหลักการทำงานของอุปกรณ์อย่างง่าย
   - concepts: เครื่องกำเนิดไฟฟ้า, มอเตอร์, หม้อแปลงเบื้องต้น
   - skills: เชื่อมโยงแนวคิดกับอุปกรณ์
   - assessmentHints: device principle explanation

### Unit: phy-m6-s1-u02 | ความร้อนและแก๊ส

Source Group: 4

Outcomes:

1. `phy-lo-m6-s1-u02-01`
   - text: อธิบายความสัมพันธ์ระหว่างความร้อน อุณหภูมิ และการเปลี่ยนสถานะของสสาร
   - concepts: ความร้อน, อุณหภูมิ, การเปลี่ยนสถานะ
   - skills: อธิบาย, เปรียบเทียบ, แปลกราฟ
   - assessmentHints: heating curve interpretation
2. `phy-lo-m6-s1-u02-02`
   - text: ใช้กฎของแก๊สอธิบายและคำนวณความสัมพันธ์ของความดัน ปริมาตร และอุณหภูมิ
   - concepts: กฎของแก๊ส
   - skills: คำนวณ, ตั้งสมการ, วิเคราะห์สถานการณ์
   - assessmentHints: gas-law problem set
3. `phy-lo-m6-s1-u02-03`
   - text: อธิบายทฤษฎีจลน์ของแก๊สและเชื่อมโยงกับสมบัติระดับมหภาคของแก๊ส
   - concepts: ทฤษฎีจลน์, พลังงานภายใน
   - skills: เชื่อมโยงจุลภาค-มหภาค, อธิบายเหตุผล
   - assessmentHints: microscopic explanation

### Unit: phy-m6-s1-u03 | ของแข็งและของไหล

Source Group: 4

Outcomes:

1. `phy-lo-m6-s1-u03-01`
   - text: อธิบายสมบัติเชิงกลของของแข็งและความสัมพันธ์กับการยืดหยุ่นของวัสดุ
   - concepts: ความเค้น, ความเครียด, มอดุลัสของยัง
   - skills: อธิบาย, คำนวณเบื้องต้น, เปรียบเทียบวัสดุ
   - assessmentHints: material comparison task
2. `phy-lo-m6-s1-u03-02`
   - text: อธิบายความดันในของไหล แรงพยุง และหลักของอาร์คิมีดีส
   - concepts: ความดัน, แรงพยุง, อาร์คิมีดีส
   - skills: อธิบาย, คำนวณ, วิเคราะห์สถานการณ์
   - assessmentHints: buoyancy problem
3. `phy-lo-m6-s1-u03-03`
   - text: อธิบายการไหลของของไหลโดยใช้หลักการของของไหลอุดมคติและสมการแบร์นูลลีอย่างง่าย
   - concepts: อัตราการไหล, แบร์นูลลี
   - skills: อธิบาย, ประยุกต์ใช้, ตีความ
   - assessmentHints: fluid application case

## M6 Semester 2

### Unit: phy-m6-s2-u01 | คลื่นแม่เหล็กไฟฟ้า

Source Group: 3

Outcomes:

1. `phy-lo-m6-s2-u01-01`
   - text: อธิบายธรรมชาติและช่วงต่าง ๆ ของสเปกตรัมคลื่นแม่เหล็กไฟฟ้า
   - concepts: คลื่นแม่เหล็กไฟฟ้า, สเปกตรัม
   - skills: จำแนก, เรียงลำดับ, อธิบาย
   - assessmentHints: spectrum ordering
2. `phy-lo-m6-s2-u01-02`
   - text: เชื่อมโยงสมบัติของคลื่นแม่เหล็กไฟฟ้ากับการใช้งานและข้อควรระวังในชีวิตประจำวัน
   - concepts: พลังงาน, ความถี่, การใช้งาน
   - skills: วิเคราะห์การใช้งาน, ประเมินความเหมาะสม
   - assessmentHints: real-world application chart

### Unit: phy-m6-s2-u02 | ฟิสิกส์อะตอม

Source Group: 4

Outcomes:

1. `phy-lo-m6-s2-u02-01`
   - text: อธิบายพัฒนาการของแบบจำลองอะตอมและข้อจำกัดของแต่ละแบบจำลอง
   - concepts: แบบจำลองอะตอม, โบร์
   - skills: เปรียบเทียบ, อธิบายวิวัฒนาการแนวคิด
   - assessmentHints: model comparison
2. `phy-lo-m6-s2-u02-02`
   - text: อธิบายปรากฏการณ์โฟโตอิเล็กทริกและความหมายต่อแนวคิดควอนตัมเบื้องต้น
   - concepts: โฟตอน, โฟโตอิเล็กทริก, ควอนตัม
   - skills: อธิบาย, เชื่อมโยงหลักฐานกับแนวคิด
   - assessmentHints: evidence-response item
3. `phy-lo-m6-s2-u02-03`
   - text: อธิบายทวิภาวะของคลื่นและอนุภาคในระดับเบื้องต้น
   - concepts: ทวิภาวะของคลื่นและอนุภาค
   - skills: อธิบายเชิงแนวคิด, เปรียบเทียบ
   - assessmentHints: short conceptual essay

### Unit: phy-m6-s2-u03 | ฟิสิกส์นิวเคลียร์และฟิสิกส์อนุภาค

Source Group: 4

Outcomes:

1. `phy-lo-m6-s2-u03-01`
   - text: อธิบายกัมมันตภาพรังสี ชนิดของรังสี และผลกระทบเบื้องต้น
   - concepts: กัมมันตภาพรังสี, รังสีแอลฟา เบตา แกมมา
   - skills: จำแนก, อธิบาย, ประเมินความเสี่ยงเบื้องต้น
   - assessmentHints: radiation classification
2. `phy-lo-m6-s2-u03-02`
   - text: อธิบายแรงนิวเคลียร์ ปฏิกิริยานิวเคลียร์ และพลังงานนิวเคลียร์อย่างเป็นเหตุผล
   - concepts: แรงนิวเคลียร์, ฟิชชัน, ฟิวชัน
   - skills: อธิบาย, เปรียบเทียบ, วิเคราะห์ข้อดีข้อจำกัด
   - assessmentHints: compare fission/fusion
3. `phy-lo-m6-s2-u03-03`
   - text: อธิบายภาพรวมของอนุภาคมูลฐานและการศึกษาฟิสิกส์อนุภาคในระดับมัธยมปลาย
   - concepts: อนุภาคมูลฐาน, ฟิสิกส์อนุภาค
   - skills: สรุปภาพรวม, เชื่อมโยงกับพัฒนาการทางฟิสิกส์สมัยใหม่
   - assessmentHints: summary card or short response

## Crosswalk Rule

การใช้งาน outcome เหล่านี้ในระบบ:

- 1 unit ต้องมี outcomes อย่างน้อย 2 ข้อ
- 1 lesson ต้องผูก outcomes อย่างน้อย 1 ข้อ
- 1 template สามารถเลือก 1 primary outcome และหลาย supporting outcomes
- quality gate ควรตรวจว่า lesson ไม่ผูก outcome ข้าม unit โดยไม่มี teacher override

## Validator Notes

สิ่งที่ validator ควรเช็กใน Phase ถัดไป:

- `learningOutcomeIds` ทุกตัวต้องมีอยู่จริงใน canonical list
- outcome ต้องอยู่ใน `unitId` เดียวกับ lesson/template
- outcome ต้องสอดคล้องกับ `gradeLevel` และ `semester`
- ถ้ามี teacher override ต้องมีเหตุผลกำกับ

## Recommended Next Step

หลังเอกสารนี้ งานที่ควรทำต่อคือ:

1. สร้าง canonical JSON/TS source ของ outcomes ทั้งหมด
2. เพิ่ม `PhysicsCurriculumMap` validator
3. เพิ่ม `PhysicsLessonTemplate` validator
4. เริ่ม template pack จาก `phy-m4-s1-u01` ถึง `phy-m4-s1-u03`
