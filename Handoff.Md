# Handoff: ถอดระบบเกมออกจากห้องเรียน

สถานะ: ดำเนินการ Phase 0 และ Phase 1 แล้ว และ deploy production สำเร็จ ยังไม่ได้ลบ schema, route เก่า หรือข้อมูล production

## บันทึกการดำเนินงานล่าสุด

- วันที่: 19 พฤศจิกายน 2569
- Release branch: `codex/remove-classroom-games`
- Production base commit: `3ca8ead5d9bee14a7b7f85fab48578a5a359c303`
- Deploy commit: `0157b5008a785f796f96e274ad495cfe78aac306` (`Remove classroom game system`)
- Render deploy: `dep-dbv47c3rjlhs73e37vv0` สถานะ `live` เวลา 07:38 น. (Asia/Bangkok)
- Worktree หลักมีงาน Auth/Dashboard/Student ที่ยังไม่ commit อยู่ก่อนเริ่มงาน งานรอบนี้แก้ร่วมกับสถานะนั้นโดยไม่ย้อนการเปลี่ยนแปลงเดิม จึงต้องคัดขอบเขตไฟล์ให้ชัดก่อน commit/deploy
- เพิ่ม server retirement switch `CLASSROOM_GAME_SYSTEM_ENABLED` และ UI rollback switch `NEXT_PUBLIC_CLASSROOM_GAMIFICATION_ENABLED`; ทั้งคู่ปิดเป็นค่าเริ่มต้น การเปิดกลับชั่วคราวต้องตั้งค่าเป็น `true` ทั้งสองจุดตามขอบเขตที่ต้องการ
- ถอด UI เกมจาก toolbar/ตาราง/การ์ดห้องเรียนและ Student Dashboard รวม Economy tab, ยศ, Negamon, Gold, Shop, Quest และ Battle โดยคงห้องเรียน งาน บทเรียน คอร์ส กระดาน ประวัติ แต้มพฤติกรรมครู และ LINE
- mutation เกมของห้องและ API เกมของนักเรียนถูกตอบ `410`; historical read ของ battle/economy/event/rank audit ยังอ่านได้สำหรับตรวจสอบย้อนหลัง
- ปิดการแจก EXP/Gold/Achievement จาก Quiz, Worksheet, LINE assignment, lesson completion, topic assessment, course certificate, Negamon Live reward, AR Quest reward, retry/resync และ rank-up notification โดยยังบันทึก submission/progress/certificate ตามเดิม
- ยังไม่ได้ลบ route/service/schema/collection เพื่อให้ rollback และ audit ข้อมูลเก่าทำได้ตาม Phase 2-3
- Production smoke test ผ่าน: `/api/health` และ `/api/ready` ตอบ `200`; mutation battle และ student check-in ตอบ `410 CLASSROOM_GAME_SYSTEM_RETIRED`; historical economy ledger ยังไม่ถูก retire และตอบ `401 AUTH_REQUIRED` เมื่อไม่มี session

ผลตรวจล่าสุด:

| ชุดตรวจ | ผล |
| --- | --- |
| Retirement/UI/reward focused tests | 65 tests ผ่าน |
| `test:classroom-core` | 108 tests ผ่าน |
| `test:assignment-quiz` | 31 tests ผ่าน |
| `test:student-dashboard` | 44 tests ผ่าน |
| `test:omr` | 24 tests ผ่าน |
| `test:board-social` | 33 tests ผ่าน |
| `test:line` | 134 tests ผ่าน |
| TypeScript `tsc --noEmit` | ผ่าน |
| ESLint เฉพาะไฟล์ที่แก้ในรอบถอดเกม | ผ่าน |
| `npm.cmd run build` | ผ่าน รวม Prisma generate, Next production build และ server TypeScript |
| `test:live-game` baseline | socket integration 27 tests ล้มเหลวจาก `websocket error` เพราะไม่มี test server; 8 tests อื่นผ่าน ต้องทดสอบใหม่บน staging ที่มี socket server |

## เป้าหมายและขอบเขต

ให้ห้องเรียนเป็นพื้นที่จัดการการเรียน โดยไม่เหลือ UI, API หรือการให้รางวัลของระบบเกมที่ผูกกับห้องเรียน ภาพที่แนบใช้ระบุหน้ารายการห้องและหน้ารายละเอียดห้อง โดยเฉพาะหมวด GAMIFICATION, ปุ่มตั้งค่ายศ, Event พิเศษ, มุมมอง Negamon และป้ายบนการ์ดนักเรียน

| ขอบเขต | แนวทาง |
| --- | --- |
| ครู | ถอดยศและรูปตรายศ, Event เกม, Negamon, Economy, Battle, ร้านค้า, คลังไอเทม และอันดับที่มีไว้เพื่อเกม |
| นักเรียน | ถอดหน้า/แท็บ Negamon, Gold, Shop, Quest เกม, Battle, กรอบที่มาจากร้าน และ check-in เพื่อรับรางวัลเกม ไม่รวมการเช็กชื่อของครู |
| การเรียน | คงห้องเรียน รายชื่อ อวตารปกติ เช็กชื่อ สุ่มเลขที่/กลุ่ม กระดาน งาน/แบบทดสอบ/ใบงาน/OMR บทเรียน คอร์ส รายงานการเรียน และ LINE แจ้งงาน/คะแนน |
| คะแนน | คงคะแนนงานทศนิยมสองตำแหน่ง คะแนนเก็บที่แสดงสองตำแหน่ง และหัวตาราง/คอลัมน์เลขที่และชื่อที่ล็อกไว้ แยกแต้มพฤติกรรมของครูออกจาก EXP ก่อนเปลี่ยนนโยบายข้อมูล |
| Live Game | สมมติให้คงระบบ Host/Play ด้วย PIN และประวัติการเล่นนอกห้องเรียน ตัดเฉพาะการเขียน EXP/Gold กลับห้องเรียน หากโหมดใดต้องพึ่งรายชื่อหรือมอนสเตอร์ของห้อง ให้แยกการพึ่งพาหรือขออนุมัติปิดเฉพาะโหมดนั้น ห้ามเปลี่ยนไปเป็นเกมอื่นเงียบ ๆ |

**จุดที่ต้องตกลงก่อนถอดถาวร:** (1) จะเก็บแต้มพฤติกรรมเป็นเครื่องมือครู หรือเลิกทั้งระบบหลังเก็บประวัติ (2) จะคง Live Game ทุกโหมดหรือไม่ โดยเฉพาะ Negamon Battle และ AR Quest ที่มีจุดเชื่อมกับห้อง (3) ระยะเวลาเก็บและผู้มีสิทธิ์เปิดข้อมูลเกมเดิม ค่าเริ่มต้นระหว่างดำเนินงานคือเก็บข้อมูลเดิมและแต้มครูไว้ ไม่รีเซ็ตยอด ไม่แปลง Gold/EXP เป็นคะแนนวิชา

## จุดเริ่มอ่านโค้ด

| ส่วน | ไฟล์/ตำแหน่ง | ตรวจอะไร |
| --- | --- | --- |
| หน้าครู | `src/components/classroom/classroom-dashboard.tsx`, `classroom-dashboard-toolbar.tsx`, `classroom-table.tsx`, `student-avatar.tsx` | มุมมอง Negamon, ป้ายยศ, กรอบร้านค้า, ตัวเลือกเศรษฐกิจ และการใช้ avatar ร่วมกับเครื่องมือสุ่ม |
| ตัวปิดเดิม | `src/lib/classroom-gamification-enabled.ts` | `NEXT_PUBLIC_CLASSROOM_GAMIFICATION_ENABLED` คุม toolbar ไม่ใช่กลไกปิด API หรือหยุดเขียนข้อมูล และอาจยังแสดง Coming Soon |
| API ครู | `src/app/api/classrooms/[id]/` | `battle`, `economy`, `events`, `gamification-settings`, `negamon`, `leaderboard`, `custom-achievements`; จำแนก endpoint เกมล้วนกับ endpoint ที่งานเรียนยังใช้ |
| นักเรียน | `src/app/student/`, `src/components/student/`, `src/app/api/student/` | ลิงก์ตรง, starter modal, game tabs, คำสั่งร้าน/เควสต์ และ API ทั้งเส้นทางเดิม `[code]` และ `access` |
| คะแนนและ LINE | `src/lib/services/classroom-points/award-classroom-points.ts`, `src/lib/services/student-economy/line-assignment-reward.ts`, API ส่ง quiz/worksheet และให้คะแนนงาน | หยุดเฉพาะผลข้างเคียงเกม ตรวจผลตอบกลับที่ UI ใช้และไม่ตัด notification งานหรือการบันทึก submission |
| เกมสด | `src/lib/game-engine/manager.ts`, `src/lib/socket/register-game-socket-handlers.ts`, ตัวซิงก์รางวัล Negamon/AR Quest | แยกจบเกมกับซิงก์รางวัล ตรวจ retry/resync และ reconnect ก่อนตัด dependency |
| ข้อมูล | `prisma/schema.prisma` | `Classroom.levelConfig`, `Classroom.gamifiedSettings`, ฟิลด์เกมใน `Student`, `BattleSession`, `EconomyTransaction`, reward claims และข้อมูลประวัติที่ใช้ร่วมกัน |

## ลำดับส่งมอบ

### 0. ตั้งฐานและทำรายการพึ่งพา

- [x] ตรวจ `git status --short`, `git worktree list` และ commit ฐาน พร้อมบันทึกความเสี่ยงจากงานที่ยังไม่ commit ใน worktree หลัก
- [x] บันทึก baseline และผลชุดทดสอบหลัก แยก failure ของ Live Game socket เดิมออกจาก regression รอบนี้
- [x] ไล่ผู้เรียกและผู้เขียนข้อมูลจาก UI, URL, API, socket, LINE, admin/resync, report และ export พร้อมเพิ่ม focused tests สำหรับขอบเขตที่ปิด
- [ ] ตรวจ `behaviorPoints` (คีย์ MongoDB คือ `points`) และ `PointHistory`: ยอดเดิมปนแต้มครู/ทักษะกับ EXP จากงานและเกม ห้ามอนุมานว่าทุกรายการเป็นเกม ตรวจแหล่งที่มาที่ระบุได้และแยกรายการกำกวมไว้ตรวจสอบ

### 1. ปิดการใช้งานแบบย้อนกลับได้

- [x] เพิ่มการปิดฝั่งเซิร์ฟเวอร์สำหรับ mutation เกม, API เกมนักเรียน, retry/resync และ reward writers โดยคง auth/role guard และ historical reads เดิม
- [x] แยกคะแนน/การส่งงาน/แต้มที่ครูให้จาก EXP/Gold ปิด rank-up notification และยืนยัน LINE งานเรียนยังผ่านชุดทดสอบ
- [x] ถอด UI เกมฝั่งครูและนักเรียน รวม Economy, ยศ, Negamon, Gold, Shop, Quest และ Battle; URL/API เก่าถูก normalize, redirect หรือคืน `410`
- [ ] ทดสอบ staging ทั้งห้องเดิมที่มีข้อมูลเกม ห้องใหม่ และผู้ใช้จาก client เก่า ก่อนเปิดให้ production ใช้ ไม่มีการแก้ schema หรือลบข้อมูลในรอบนี้

**เกณฑ์ผ่าน:** ไม่มีเมนูหรือ placeholder เกมในห้อง; เรียก mutation เก่าตรง ๆ แล้วไม่เปลี่ยนข้อมูล; ส่งงานและจบ Live Game ตามขอบเขตได้โดยไม่เกิดรางวัลเข้าห้อง; rollback ได้โดยไม่ต้องกู้ฐานข้อมูล

### 2. ลบโค้ดที่ไม่ถูกใช้งานแล้ว

- [ ] ตรวจ log/metrics ว่าไม่มี client หรือ job ที่ยังต้องพึ่ง route เดิม จากนั้นลบ API และ service เกมล้วนตามรายการพึ่งพา รวม adapter ของ API เก่าและใหม่
- [ ] ลบ view state, tab loader, query fields, translation, asset และ dependency ที่ไม่มีผู้เรียกเหลือ ตรวจ shared avatar, dashboard art, รายงานเกม และ Host/Play ก่อนลบไฟล์ใช้ร่วมกัน
- [ ] ย้าย/ปรับ tests ให้ยืนยันพฤติกรรมหลังถอด ไม่ลบทดสอบของ auth, คะแนน, LINE หรือ Live Game เพียงเพราะไฟล์อยู่ใกล้โค้ดเกม

**เกณฑ์ผ่าน:** build ผ่าน ไม่มี import หรืองานเบื้องหลังอ้างส่วนที่ถอด และทดสอบการเข้าใช้งานด้วยครู/นักเรียนจริงใน staging ผ่าน ทั้งบนมือถือและเดสก์ท็อป

### 3. เก็บสำรองและล้างข้อมูล แยกจากรอบลบโค้ด

- [ ] ขออนุมัติรายการคอลเล็กชัน/ฟิลด์และนโยบายข้อมูลก่อนรัน จัดทำ snapshot จำกัดสิทธิ์ พร้อม manifest จำนวนรายการและขอบเขต class ID ทดสอบ restore ในฐานแยก
- [ ] ทำ cleanup แบบ dry-run เป็นค่าเริ่มต้น แสดงจำนวนและชนิดข้อมูลที่จะเปลี่ยน ไม่แสดงข้อมูลนักเรียนหรือ login code ใน log; ให้ apply ต้องระบุฐานเป้าหมายและขอบเขตอย่างชัดเจน รันซ้ำได้และตรวจจำนวนหลังรัน
- [ ] ตรวจทุกคีย์ใน `gamifiedSettings` ก่อนล้าง ลบเฉพาะส่วนที่ยืนยันว่าเป็นเกม เก็บ `PointHistory`, submissions, attendance และข้อมูล LINE เดิมตามนโยบาย ห้ามลบเอกสาร Student/Classroom ทั้งรายการเพื่อล้างฟิลด์
- [ ] ตัด schema เมื่อไม่มีแอป/worker เวอร์ชันเก่าอ่านหรือเขียนฟิลด์นั้นแล้ว การเอาฟิลด์ออกจาก Prisma schema ไม่ใช่หลักฐานว่าข้อมูลเดิมใน MongoDB ถูกลบ ตรวจผลกับฐานจริงผ่านขั้นตอนที่อนุมัติแยกกัน

**เกณฑ์ผ่าน:** กู้สำรองได้จริง, dry-run ตรงกับ manifest, จำนวนข้อมูลการเรียนไม่เปลี่ยน และมีผู้อนุมัติก่อนดำเนินการบน production

## QA และแผนปล่อย

| เส้นทางทดสอบ | ผลที่ต้องได้ |
| --- | --- |
| ครูเปิด/สร้างห้อง จัดการนักเรียน เช็กชื่อ สุ่มเลขที่/กลุ่ม | รายชื่อและสิทธิ์ถูกต้อง ไม่มี UI เกม |
| ครูให้คะแนน 1.12 + 2 + 5 เปิดใหม่และเลื่อนตาราง | ผลรวม 8.12, ศูนย์เป็น 0.00, หัวตารางและเลขที่/ชื่อยังล็อก |
| นักเรียนส่ง Quiz/Worksheet และเปิดบทเรียน | คะแนนและสถานะการส่งถูกต้อง ไม่มี EXP/Gold หรือ rank-up เพิ่ม |
| LINE ผูกห้อง แจ้งงาน ทวงงาน ประกาศคะแนน | ทำงานเดิมทั้งห้องที่ผูกและยังไม่ผูก ไม่มีข้อความรางวัลเกม |
| URL/API เกมเก่า, socket, retry/resync | UI มีปลายทางที่เหมาะสม, คำสั่งเกมของห้องถูกปิด, ไม่เกิดการเขียนซ้ำ |
| เปิดเกมสดด้วย PIN, reconnect, จบเกมและเปิดประวัติ | โหมดที่ตกลงเก็บยังทำงาน คะแนนในแมตช์ไม่หาย ไม่มีการจ่ายเข้าห้อง |

รัน `npm.cmd run check:classroom-core`, `npm.cmd run check:assignment-quiz`, `npm.cmd run check:omr`, `npm.cmd run check:board-social`, `npm.cmd run check:live-game` และ `npm.cmd run build` พร้อมชุดทดสอบเฉพาะ API และเงื่อนไขไม่เขียนรางวัลที่เพิ่มในรอบนี้

ปล่อยทีละรอบ: ปิดฟีเจอร์และเฝ้าดู → ลบโค้ดที่ไม่มีผู้เรียก → ล้างข้อมูลหลังอนุมัติ ตรวจ commit ที่ขึ้นจริง, health, error rate และ smoke test หลังแต่ละรอบ หากส่งงาน คะแนน หรือ LINE ถดถอย ให้หยุด rollout และย้อน deployment/config ก่อน หลังล้างข้อมูลแล้วการย้อนโค้ดอย่างเดียวไม่พอ ต้องใช้แผน restore ที่ซ้อมไว้และระวังไม่ทับข้อมูลการเรียนที่เข้ามาใหม่

**ข้อมูลที่ผู้รับงานต้องบันทึก:** branch และ base commit, เจ้าของแต่ละเฟส, ขอบเขตที่อนุมัติ, ผล QA พร้อม failure เดิม, deploy commit, ตำแหน่งสำรองที่จำกัดสิทธิ์ และขั้นตอน rollback ที่ยืนยันแล้ว
