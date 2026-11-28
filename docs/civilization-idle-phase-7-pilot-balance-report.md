# Civilization Idle Phase 7: Staging Pilot and Balance

วันที่: 27 พฤศจิกายน 2026

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
- Staging Civilization state endpoint ตอบ 401 เมื่อไม่ล็อกอิน แสดงว่า global feature flag เปิดอยู่; ต้องตรวจว่ามี classroom allowlist ก่อนเชิญผู้ทดสอบ
- Local `DATABASE_URL` ชี้ `localhost/gamedu` แต่ MongoDB local ไม่ตอบภายใน 20 วินาที
- ยังไม่มี Staging `DATABASE_URL` ใน local environment จึงยังไม่รัน backup, schema push หรือ remote persistence QA

## งานที่ต้องทำใน Staging

1. ตั้ง `DATABASE_URL` ของฐาน Staging ใน shell แบบชั่วคราว
2. รัน `npm run db:print-target` และยืนยัน host/database
3. สร้าง backup พร้อม checksum และ restore rehearsal
4. รัน `npx prisma db push` เฉพาะหลัง backup ผ่าน
5. รัน remote persistence/prestige QA และ allowlist smoke test
6. เปิด pilot เฉพาะ classroom ObjectId ที่อนุมัติ

สถานะ Phase 7: local balance gate ผ่านแล้ว; remote staging pilot ยังรอขั้นตอนข้างต้น
