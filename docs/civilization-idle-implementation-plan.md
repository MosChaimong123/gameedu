# แผนพัฒนา Civilization Idle บน GameEdu

สถานะ: Phase 0-5 เสร็จในระดับโค้ดและ local staging QA; production ยังปิดและยังไม่ได้ deploy/open pilot

สเปกกติกาที่อนุมัติสำหรับ Phase 1: [`civilization-idle-phase-0-gameplay-spec.md`](./civilization-idle-phase-0-gameplay-spec.md)

## เป้าหมายและขอบเขต

ให้นักเรียนสร้างเมืองส่วนตัวในห้องเรียน เก็บทรัพยากร สร้างอาคาร จัดคนงาน และวิจัยจากยุคหินจนถึงยุคสำริด ใช้โปรไฟล์หนึ่งต่อระเบียนนักเรียนในห้องเรียน (`Student.id`) ดังนั้นผู้ใช้ที่อยู่หลายห้องจะมีเมืองแยกกัน เล่นได้โดยไม่ต้องให้ครูเปิดห้องเกมสด

นำกติกา ข้อมูลเกม และคำแปลจาก `D:/Idle/CIVILIZATION_IDLE_HANDOFF.md` และต้นแบบ `D:/Idle/civilization-idle` มาตรวจและปรับใช้ ไม่ยก Vite app, global CSS หรือ Zustand store ทั้งก้อนเข้า GameEdu ไม่ใช้ฟิลด์เกมเดิมใน `Student`/`Classroom`, `BattleSession` หรือ `EconomyTransaction` และไม่เปลี่ยนเกมสด Host/Play

รุ่นแรกไม่เชื่อมคะแนนเก็บ คะแนนพฤติกรรม ทอง หรือรางวัลระบบเดิม และไม่มี PvP, leaderboard, โฆษณา, Prestige หรือการนำเข้าเซฟจากเบราว์เซอร์

## โครงสร้างที่เสนอ

- Engine และข้อมูลเกม: `src/lib/civilization-idle/` ใช้ TypeScript แบบไม่พึ่ง React หรือ browser API รับสถานะ คำสั่ง และเวลาที่กำหนดเป็นอินพุต จึงทดสอบซ้ำได้
- หน้าเกม: `/student/access/civilization` ใช้ session เดิมและเปิดจากหน้าเรียนของห้องที่เลือก ไม่ใช้รหัสนักเรียนจริงใน URL ใหม่
- API: `GET /api/student/access/civilization/state` อ่าน snapshot แบบไม่เขียนฐานข้อมูล, `POST .../command` ใช้คำสั่งเกม, `POST .../sync` ยืนยันความคืบหน้าตามเวลาและสร้างเมืองเมื่อเริ่มครั้งแรก ทั้งหมดตรวจ session และสิทธิ์ฝั่งเซิร์ฟเวอร์
- MongoDB/Prisma: `CivilizationProfile` เก็บ `studentId` แบบ unique, snapshot, `schemaVersion`, `contentVersion`, `revision` และ `lastSimulatedAt` แยกจากข้อมูลเกมเก่า ใช้ Zod ตรวจคำสั่งและ snapshot
- คำสั่งเขียนมี `commandId` และ `expectedRevision` ประมวลผลซ้ำด้วย ID เดิมแล้วต้องไม่คิดต้นทุนซ้ำ การบันทึกผลคำสั่งกับ snapshot ต้องเป็นอะตอมิก และ ID เดิมที่ส่ง payload ต่างกันต้องถูกปฏิเสธ เมื่อ revision ไม่ตรงให้ดึงสถานะล่าสุดก่อนส่งใหม่
- เซิร์ฟเวอร์เป็นเจ้าของเวลา ผลผลิต และต้นทุน Client แสดงค่าประมาณระหว่างรอ sync ได้ แต่ไม่ส่งยอดทรัพยากรมาเขียนทับ ไม่ต้องมี background loop บนเซิร์ฟเวอร์

## ลำดับงานและเกณฑ์ผ่าน

| เฟส | งาน | เกณฑ์ผ่านก่อนขึ้นเฟสถัดไป |
| --- | --- | --- |
| 0. ขอบเขตและกติกา (เสร็จแล้ว) | เลือกทรัพยากร อาคาร งาน และเทคโนโลยีสำหรับสองยุค กำหนดราคา อัตราผลิต เงื่อนไขอดอยากและเปลี่ยนยุค | ผ่านแล้ว: ดูสเปก Phase 0 ซึ่งมีรายการข้อมูล สูตร และลำดับเล่นถึงจบยุคสำริด |
| 1. Engine ยุคหิน (เสร็จแล้ว) | ทำคำสั่งเก็บทรัพยากร สร้างอาคาร จัดคนงาน วิจัย และจำลองผลผลิต ประชากร และคลัง | ผ่านแล้ว: pure engine, content catalog, invariants และ focused unit tests ครบ รวมการกู้เมืองจากอาหารหมด |
| 2. API และเซฟ (เสร็จแล้ว) | เพิ่ม `CivilizationProfile` และ `CivilizationCommand` ต่อ `Student.id`, ทำ state/command/sync API หลัง student access session, revision และ command receipt | ผ่านแล้วในระดับโค้ด: 36 focused tests ครอบคลุม session, feature flag, payload, replay, ID ชนกัน, revision ล้าสมัย, command ถูกปฏิเสธ และ snapshot เสียโดยไม่เขียนทับ; Prisma validate ผ่าน แต่ยังรอ apply schema ใน dev/staging ก่อนทดสอบ MongoDB จริง |
| 3. หน้าทดลองเล่น (เสร็จระดับโค้ด) | ทำ UI ยุคหิน ปุ่มและสถานะทรัพยากร ไทย/อังกฤษ รองรับจอใหญ่และมือถือ พร้อม client command queue | ผ่านแล้ว: Playwright preview เล่นรอบเก็บ–สร้าง–จัดคนงาน–วิจัยต่อเนื่องได้ revision 4 ไม่มีคิวค้าง, ตรวจภาพ desktop/mobile, จอ 390px ไม่มี horizontal overflow, มี offline/retry/conflict state และ production build ผ่าน; การ reload จาก MongoDB จริงรอ apply schema บน staging |
| 4. ยุคสำริดและ Offline (เสร็จระดับโค้ด) | เพิ่มเงื่อนไขเปลี่ยนยุค โรงแปรรูปขั้นต้น และผลผลิตเมื่อกลับเข้าเกม; Phase 1 ปรับเพดานจาก 8 เป็น 72 ชั่วโมง | ผ่านแล้ว: server simulation จำกัด 72 ชั่วโมง, ตัดเวลาส่วนเกิน, รองรับเวลาย้อน, มี command receipt ป้องกันจ่ายซ้ำ และทดสอบ sync พร้อมกันแล้วมีเพียง revision เดียวที่บันทึกสำเร็จ |
| 5. Pilot และ Deploy (พร้อม rollout) | เปิดหลัง feature flag ที่ปิดโดยค่าเริ่มต้น ทั้งหน้าและ API ทดลองใน staging ก่อนเปิดห้อง pilot | ผ่านระดับ local staging QA: มี pilot allowlist รายห้อง, dark-deploy default, rollback โดยไม่ลบเซฟ, database safety guard/runbook และ regression ระบบหลัก; การ deploy/open pilot จริงรอ staging service และ Classroom ObjectId ที่เลือก |
| 6. ขยายหลัง Pilot | เพิ่มครูเปิดเกมรายห้อง รายงานความคืบหน้า ยุคที่เหลือ และ Specialists ตามผลทดสอบ | ครูเห็นเฉพาะห้องที่ตนมีสิทธิ์และฟีเจอร์ใหม่ไม่เปลี่ยนผลการเรียนหรือรางวัลโดยอัตโนมัติ |

## เงื่อนไขก่อนเปิดใช้งานจริง

- ตรวจ type, lint, unit/integration test, build และ Playwright ใน staging ด้วยบัญชีและข้อมูลทดสอบ
- ยืนยันการเพิ่ม collection/index โดยไม่มีการ cleanup ข้อมูลเดิม มี backup และทดสอบแนวทางกู้คืนก่อนเปิด pilot
- ติดตามข้อผิดพลาด API, การบันทึกชนกัน และความล่าช้าขณะ sync โดยไม่บันทึกรหัสนักเรียนหรือ session token
- Rollback ขั้นแรกคือปิด feature flag ให้การเรียนทำงานต่อได้และเก็บเซฟไว้ ถ้าต้องย้อนเวอร์ชันแอป ให้ตรวจความเข้ากันได้ของ snapshot ก่อนเปิดเกมอีกครั้ง

## ผลลัพธ์ Phase 2

- `GET /api/student/access/civilization/state` อ่านเมืองของนักเรียนใน session และไม่สร้างระเบียนเมื่อยังไม่เริ่มเล่น
- `POST /api/student/access/civilization/command` รับเฉพาะคำสั่งที่ผ่าน Zod และใช้เวลาฝั่งเซิร์ฟเวอร์
- `POST /api/student/access/civilization/sync` จำลองเวลาต่อจาก snapshot ล่าสุดด้วยคำสั่ง `SYNC`
- การเขียน snapshot และ command receipt อยู่ใน transaction เดียว ใช้ `expectedRevision` ป้องกันสองแท็บเขียนทับกัน และ replay `commandId` เดิมที่ payload เดิมโดยไม่ประมวลผลซ้ำ
- `commandId` เดิมที่ payload เปลี่ยนถูกตอบเป็น conflict; snapshot ผิด schema/invariant ถูกหยุดและไม่ถูกซ่อมหรือเขียนทับอัตโนมัติ
- API ทั้งหมดถูกซ่อนด้วย `CIVILIZATION_IDLE_ENABLED` ซึ่งปิดเป็นค่าเริ่มต้น

## ผลลัพธ์ Phase 3

- หน้า `/student/access/civilization` ตรวจ feature flag และ student access session ฝั่งเซิร์ฟเวอร์ก่อน render
- UI ยุคหินมี resource rail, ภาพชุมชน, manual actions, buildings, workers, research และ event log พร้อมภาษาไทย/อังกฤษ
- client ส่งคำสั่งแบบ serial queue สร้าง `commandId` คงที่ต่อคำสั่ง เก็บคำสั่งไว้เมื่อ network ขาด และโหลด canonical state ใหม่เมื่อ revision ชนกัน
- dashboard แสดงทางเข้า Civilization Idle เฉพาะเมื่อ `CIVILIZATION_IDLE_ENABLED=true`
- มี development-only preview สำหรับ visual QA โดย production จะตอบ not found เสมอ
- Browser QA ตรวจคำสั่งต่อเนื่อง 4 ขั้น, desktop, mobile 390px, state inspection และ console/page errors แล้ว
- 44 focused tests, TypeScript, scoped ESLint, architecture guard และ production build ผ่าน

## ผลลัพธ์ Phase 4

- ทุกคำสั่งจำลองเวลาที่ผ่านไปฝั่งเซิร์ฟเวอร์ก่อนประมวลผล โดยจำกัดผลผลิต offline สูงสุด 72 ชั่วโมงและเลื่อน timestamp ไปเวลาปัจจุบันเพื่อไม่ให้ขอช่วงเวลาส่วนเกินซ้ำ
- command receipt เก็บสรุปเวลาที่ร้องขอ เวลาที่จำลอง เวลาที่ตัดออก การตรวจเวลาย้อน และผลต่างทรัพยากร ทำให้ replay command เดิมคืนผลเดิมโดยไม่จ่ายซ้ำ
- client ส่ง `SYNC` หลังโหลด canonical state และแสดงหน้าสรุปผลผลิตเมื่อกลับเข้าเกม รวมข้อความเพดาน 72 ชั่วโมงและกรณีเวลาระบบย้อน
- เมื่อวิจัย Agriculture สำเร็จ ผู้เล่นยืนยันเข้าสู่ยุคสำริดผ่าน `ADVANCE_ERA`; UI เปลี่ยนภาพเมือง ทรัพยากร กิจกรรม อาคาร งานวิจัย และเปิดแท็บโรงงาน
- โรงงานทองแดง สำริด และเหล็กแสดงต้นทุน input/output ซื้อและหยุด/เปิดได้ผ่าน command queue เดิม โดย server engine เป็นผู้คำนวณผลผลิต
- 45 focused tests, TypeScript, scoped ESLint, architecture guard และ production build ผ่าน; Playwright ตรวจ transition, ซื้อ/หยุด converter, state revision, console errors และมือถือ 390px ที่ไม่มี horizontal overflow

## ผลลัพธ์ Phase 5

- เพิ่ม `CIVILIZATION_IDLE_PILOT_CLASSROOM_IDS` เพื่อจำกัด dashboard, page และ API ตาม `classId` จาก student access session โดย exact match
- Render Blueprint คง `CIVILIZATION_IDLE_ENABLED=false` หลัง deploy และให้ pilot IDs เป็น secret environment value
- เพิ่ม persistence integration QA ที่สร้าง profile/receipt จริง ทดสอบ replay/reload และ cleanup พร้อม launcher ที่ปฏิเสธ remote database ถ้าไม่ได้ยืนยัน staging
- สำรอง `localhost/gamedu` แล้ว apply Prisma schema สำเร็จ; local persistence QA ผ่าน
- ทดสอบปิด flag แล้ว service ไม่ถูกเรียก และเปิดกลับอ่าน state/revision เดิมได้
- regression งาน/คะแนน/เช็กชื่อและ LINE ผ่าน 44 เคส; Host/Play ผ่าน 35 เคสเมื่อรัน test socket server นอก network sandbox
- production-mode dark-deploy smoke ผ่าน: `/api/ready` ตอบ 200 ขณะที่หน้า Civilization และ state API ตอบ 404 เมื่อ flag ปิด
- local pilot smoke ผ่านด้วยห้อง `QA Core Classroom`: ห้อง pilot ตอบ 200, ห้องควบคุมตอบ 404 และ session ชั่วคราวถูก cleanup เหลือ 0
- เพิ่ม readiness command สำหรับแสดงเฉพาะ Classroom ObjectId/ชื่อ/ชั้น/จำนวนนักเรียน และ smoke command ที่ไม่เปิดเผย login code หรือ cookie
- ขั้นตอน staging, dark deploy, pilot monitoring และ rollback อยู่ใน [`civilization-idle-pilot-runbook.md`](./civilization-idle-pilot-runbook.md)

## งานถัดไป

ก่อนเปิดผู้ใช้จริง ให้เชื่อม staging database/service ที่แยกจาก production, ทำ backup และ dark deploy ตาม runbook แล้วรัน readiness/pilot smoke บน staging จากนั้นเก็บ monitoring evidence ก่อนตัดสินใจเปิด pilot; production ต้องคง flag ปิดจนกว่าจะผ่าน exit criteria
