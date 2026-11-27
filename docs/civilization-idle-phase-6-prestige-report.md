# Civilization Idle Phase 6: Prestige Report

วันที่: 27 พฤศจิกายน 2026
สถานะ: เสร็จระดับโค้ดและ local QA; ยังไม่ push schema, deploy หรือเปิด feature flag

## ขอบเขตที่เสร็จ

- เพิ่ม save schema/content v6 และ migration อัตโนมัติจาก v1-v5
- เพิ่ม `runNumber`, `runStartedAt` และรางวัลถาวร 4 แบบ แบบละสูงสุด 5 ระดับ
- จบยุคอวกาศแล้วเลือกได้หนึ่งรางวัลต่อรอบ พร้อมหน้าตรวจสอบและยืนยันสองขั้น
- reset ทรัพยากร ประชากร อาคาร โรงงาน วิจัย automation และโครงการยานกลับเป็นรอบใหม่
- คงหมายเลขรอบ ระดับรางวัลถาวร และประวัติรอบ
- เพิ่ม `CivilizationRunHistory` เก็บ snapshot ก่อน/หลัง reset, รางวัล, เวลา และ revision
- บันทึก profile, run history และ command receipt ใน Prisma transaction เดียว
- ใช้ command idempotency/revision เดิมเพื่อกันรับรางวัลซ้ำจาก retry หรือสองแท็บ

## รางวัลถาวร

| รางวัล | ผลต่อระดับ |
| --- | --- |
| ผืนดินอุดมสมบูรณ์ | ผลผลิตอาหารจากคนงาน +5% |
| หอจดหมายเหตุ | ผลผลิตความรู้ทุกแหล่ง +5% |
| เสบียงผู้ก่อตั้ง | เริ่มด้วยไม้ +10 หิน +5 และความจุไม้/หิน +20 |
| ภูมิปัญญาอุตสาหกรรม | โรงงานทุกแห่งใช้ input ลดลง 2% |

## การตรวจสอบ

- Civilization tests: 91 ผ่าน, 2 skipped ตามเงื่อนไข integration
- Phase 6 focused tests: 69 ผ่าน
- TypeScript, scoped ESLint, Prisma validate และ architecture guard ผ่าน
- Production build ผ่าน
- Desktop QA ผ่าน flow เลือก `founder_stockpile` -> ตรวจสอบ -> ยืนยัน -> ยุคหินรอบ 2
- ยืนยัน state หลัง reset: ไม้ 30/120, หิน 15/120, อาคาร/วิจัย/โรงงานเป็นศูนย์ และรางวัลเพิ่ม 0 -> 1
- Mobile 390x844 แสดง reward dialog แบบ scroll ภายในและไม่มี horizontal overflow ที่สังเกตได้

## ข้อจำกัดก่อนเปิดใช้

1. ต้อง backup ฐานข้อมูล staging แล้ว apply Prisma schema v6 ตาม runbook
2. ทดสอบ atomic reset และ rollback กับ MongoDB staging จริง
3. เปิดเฉพาะ pilot classroom และเฝ้าดู duplicate command, invalid snapshot และ reset latency
4. Balance เวลา 500 ชั่วโมงและค่ารางวัลจาก telemetry/pilot ก่อน production

หลักฐาน QA อยู่ที่ `output/phase6-qa/`.
