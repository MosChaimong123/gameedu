# Civilization Idle Phase 7: Staging Pilot and Balance

วันที่เริ่ม: 27 พฤศจิกายน 2026

อัปเดต Staging Pilot: 28 พฤศจิกายน 2026

## ขอบเขต

- วัด pacing ของรอบแรกด้วย deterministic engine เดียวกับเกมจริง
- เปรียบเทียบ 4 กลยุทธ์: สมดุล, อาหาร/ประชากร, วิทยาศาสตร์ และอุตสาหกรรม
- วัดเวลาเข้าแต่ละยุค, milestone gap, bottleneck และการจบยุคอวกาศ
- เตรียมกรอบ Staging Pilot โดยไม่เปิด Production feature flag

## คำสั่ง

```powershell
npm run qa:civilization-balance
```

## เกณฑ์ผ่านเบื้องต้น

- ทั้ง 4 กลยุทธ์ต้องรันด้วย command engine โดยไม่เกิด invariant error
- ไม่มีกลยุทธ์ติดตั้งแต่ช่วงเริ่มเกม
- เป้าหมาย pacing รอบแรกคือค่ากลาง 400-600 ชั่วโมงตามปฏิทิน
- ทดสอบจริงต้องยืนยันว่าผู้เล่นยังมีการตัดสินใจที่มีความหมาย ไม่ใช่รอเวลาอย่างเดียว

## ผล deterministic balance

| กลยุทธ์ | Bronze | Industrial | Information | Space | จบรอบ |
| --- | ---: | ---: | ---: | ---: | ---: |
| สมดุล | 32 ชม. | 64 ชม. | 424 ชม. | 472 ชม. | 512 ชม. |
| อาหาร/ประชากร | 32 ชม. | 64 ชม. | 672 ชม. | 712 ชม. | 752 ชม. |
| วิทยาศาสตร์ | 32 ชม. | 72 ชม. | 640 ชม. | 688 ชม. | 728 ชม. |
| อุตสาหกรรม | 32 ชม. | 64 ชม. | 200 ชม. | 248 ชม. | 288 ชม. |

- ทั้ง 4 กลยุทธ์จบโครงการอวกาศครบ 4 ขั้น
- เวลาเฉลี่ยจบรอบ 570 ชั่วโมง; ช่วง 288-752 ชั่วโมงสะท้อนความต่างของกลยุทธ์
- ค่ากลางอยู่ 620 ชั่วโมง จึงควรติดตามข้อมูลผู้เล่นจริง โดยเฉพาะสายประชากรและวิทยาศาสตร์
- คอขวดหลักคือกำลังไฟของสายถลุง, ความจุทรัพยากร และวิทยาศาสตร์ช่วงกลางเกม

## ปัญหาที่พบและแก้แล้ว

1. เพิ่มเพดานวิทยาศาสตร์เริ่มต้นจาก 1,000 เป็น 2,000 เพื่อไม่ให้ `coal_geology` เกิดวงจรปลดล็อกไม่ได้
2. เพิ่มความจุวิทยาศาสตร์จาก Network Station และ Test Center สำหรับงานวิจัยปลายเกม
3. ให้ Data Center จ่าย compute ต่อได้เมื่อคลัง data เต็ม
4. หยุดการเติบโตของประชากรเมื่อกำลังผลิตอาหารรองรับคนถัดไปไม่ได้
5. ให้แรงงานผลิตอาหารทำงานเต็มอัตราระหว่างอดอยาก เพื่อให้เมืองมีทางฟื้นตัว
6. ลดช่วงจำลอง QA จาก 60 เป็น 10 วินาที ลดความคลาดเคลื่อนจากการชนเพดานคลัง โดยเกมจริงยังใช้ช่วง 1 วินาทีตามเดิม
7. เปลี่ยน classroom rollout เป็น fail-closed: allowlist ว่างไม่เปิดห้องใด และต้องใช้ `*` อย่างชัดเจนสำหรับ global rollout

## สถานะ Environment

- Dark deploy Production สำเร็จที่ commit `c477756`; health ผ่านและ feature flag ยังปิด
- Staging `https://teach-play-edu-line-staging.onrender.com/api/health` ตอบ 200 เมื่อ 27 พฤศจิกายน 2026
- Staging deploy commit `1347a61` จาก branch `codex/staging-release-readiness`
- Pilot classroom `6b0a9b01e1469bb9b37b7807` อยู่ใน allowlist และ feature flag เปิดเฉพาะ Staging
- สำรองฐาน `gamedu_staging` เป็น `gamedu-staging-20261128-162304.archive.gz` ขนาด 50,625 bytes
- Backup SHA256: `4A973357333645EEC3C667D1699141C239CCDF6DDC4B5F992D6C921ED8F3ECA5`
- `npx prisma db push` สร้าง `CivilizationRunHistory` และ indexes สำเร็จ
- Remote Mongo persistence QA ผ่าน 1/1: create, command replay และ reload โดยไม่เขียนซ้ำ
- Restore rehearsal ไปฐานแยก `gamedu_restore_rehearsal` สำเร็จ 260 documents และล้มเหลว 0 documents
- Remote Mongo persistence QA บนฐาน restore ผ่าน 1/1 ก่อนสลับ `DATABASE_URL` กลับ `gamedu_staging`
- Remote Prestige QA บนฐาน restore ผ่าน 1/1: atomic reset, retry/replay protection, revision conflict, run history restore และ classroom economy isolation
- Allowlist smoke ผ่าน: pilot status 200 และ control status 404

## งานที่ยังต้องทำใน Staging

1. ทดสอบเล่นจริงด้วย Pilot Student: initial state, command, reload, offline progress และเปลี่ยนยุค
2. ยืนยัน Control Student ยังไม่เห็นทางเข้าและเข้าหน้า/API ไม่ได้
3. เก็บ pacing, error และ feedback ระหว่าง pilot ก่อน Production sign-off

สถานะ Phase 7: automated balance, Staging allowlist smoke, restore rehearsal และ remote Prestige QA ผ่านแล้ว; manual pilot ยังดำเนินต่อ
