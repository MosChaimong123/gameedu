# Civilization Idle: Phase 1 foundation report

วันที่: 26 พฤศจิกายน 2026
สถานะ: **ผ่านระดับโค้ดและ focused QA; รอ staging pilot**

## สิ่งที่เปลี่ยน

### 1. Offline progress

- เพิ่มเพดานจาก 8 เป็น **72 ชั่วโมง** ต่อการกลับมาเล่นหนึ่งครั้ง เพื่อรองรับวันหยุดและผู้เล่นที่ไม่ได้เข้าเกมทุกวัน
- เวลาที่เกิน 72 ชั่วโมงยังถูกทิ้งและเลื่อน `lastSimulatedAt` ไปเวลาปัจจุบัน ป้องกันการขอเวลาช่วงเดิมซ้ำ
- หน้าสรุป offline ระบุเพดาน 72 ชั่วโมงตรงกับ server; 24 และ 72 ชั่วโมงไม่ถูกตัด, 96 ชั่วโมงคิด 72 และตัด 24 ชั่วโมง

### 2. Simulation ระยะยาว

- เพิ่ม adaptive step สูงสุด 60 วินาทีเฉพาะสถานะคงที่ที่พิสูจน์ว่าไม่เปลี่ยนลำดับคำนวณเดิม
- กรณีประชากรกำลังโต, อาหารมีทั้งผลิตและบริโภค หรือโรงงานกำลังทำงาน ยังคง step สูงสุด 1 วินาที เพื่อรักษาผล starvation, cap และ converter
- มีเทสต์เทียบ fast-forward กับการเดินทีละวินาที และเทสต์จำลอง offline 72 ชั่วโมง

### 3. Net rate และคอขวด

- resource rail แสดงอัตราสุทธิต่อวินาที โดยรวมผลผลิตคนงาน หักอาหารประชากร และหัก/บวกวัตถุดิบโรงงานที่เดินได้จริง
- แสดงคอขวดที่ตรวจจาก engine: อาหารหมด, คลังเต็ม, โรงงานขาด input และ output โรงงานเต็ม
- สูตร UI ใช้ helper เดียวกับ simulation ไม่ทำสูตรเกมซ้ำใน component

### 4. Save compatibility

- ไม่เปลี่ยน `schemaVersion` หรือ `contentVersion`; เซฟยังเป็น version 1
- เพิ่ม fixture เซฟ Stone ก่อน Phase 1 และทดสอบ parse + เดินเวลาต่อได้ โดยรักษาอาคาร คนงาน ระดับ action และ cap เดิม
- ไม่มี migration และไม่มีการเขียนฐานข้อมูลในงานชุดนี้

## QA ที่ผ่าน

- Focused Vitest: 5 files, 49 tests
- ESLint เฉพาะไฟล์ที่แก้: ผ่าน
- TypeScript `tsc --noEmit --incremental false`: ผ่าน
- เคสสำคัญ: net flow, starvation, storage/converter bottleneck, 72-hour cap, command replay, clock rollback, concurrent revision, v1 save compatibility

## สิ่งที่ยังต้องตรวจใน staging

1. ทดลองผู้เล่นกลับมาหลัง 24/48/72 ชั่วโมงและตรวจข้อความ/ผลผลิตกับ server response
2. ทดสอบมือถือและ desktop ว่า resource rail, net rate และข้อความคอขวดไม่ซ้อนกัน
3. เก็บ latency ของเมืองที่เปิด converter หลายระดับ เพราะเส้นทางนี้ยังจำลองทีละวินาที
4. ยืนยันเซฟ staging เดิมเปิดได้, revision ต่อเนื่อง และปิด feature flag แล้วย้อนกลับมาเปิดใหม่ได้

หาก staging ผ่าน ให้ปิด Phase 1 และเริ่ม Phase 2: ขยาย Stone/Bronze พร้อมแก้เงื่อนไขจบ Bronze ให้ต้องใช้โซ่โลหะจริง ไม่ใช่ Science อย่างเดียว
