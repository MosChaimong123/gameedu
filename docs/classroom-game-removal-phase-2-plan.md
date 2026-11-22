# แผน Phase 2: ลบโค้ดเกมที่ผูกกับห้องเรียน

สถานะ: แผนงาน ยังไม่เริ่มลบโค้ดหรือข้อมูลตามเอกสารนี้

## ฐานและขอบเขต

- Phase 1 ขึ้น production แล้วที่ commit `0157b5008a785f796f96e274ad495cfe78aac306`, Render deploy `dep-dbv47c3rjlhs73e37vv0` (live วันที่ 19 พฤศจิกายน 2569) ตาม [Handoff.Md](../Handoff.Md)
- งานรอบนี้ลบเฉพาะโค้ด UI, API และ service ของเกมในห้องเรียนที่พิสูจน์ว่าไม่มีผู้ใช้แล้ว ไม่ลบเอกสารนักเรียน/ห้องเรียน, collection, field ใน MongoDB หรือ Prisma schema
- คง Host/Play ด้วย PIN, ประวัติเกมสด, Quiz, Worksheet, OMR, คะแนนงาน, แต้มพฤติกรรมครู, Attendance, LINE, บทเรียน และคอร์ส รวมถึง asset หรือ engine ที่ฟีเจอร์เหล่านี้ยังใช้
- Worktree หลักมีงาน Auth/Dashboard/Student ที่ยังไม่ commit จำนวนมาก ให้ทำ release ใน worktree/branch แยกจาก `origin/main` ล่าสุด แล้วคัดเฉพาะ patch ของ Phase 2 ห้าม stage ทั้ง `src` จาก worktree หลัก

## เงื่อนไขก่อนเริ่มลบ

1. ทำ manual QA บน production/staging ด้วยครูและนักเรียนจริง: ห้องเก่า/ใหม่, มือถือ/เดสก์ท็อป, คะแนนทศนิยม, ส่งงาน, LINE และลิงก์เก่า บันทึกผลและผู้ทดสอบ
2. แก้หรือแยกสาเหตุ socket integration 27 เคสที่ได้ `websocket error` ในสภาพแวดล้อมทดสอบ แล้วทดสอบ Host/Play PIN, reconnect, จบเกม และประวัติ โดยเฉพาะ Negamon Battle/AR Quest ที่เชื่อมห้อง
3. ตรวจ log/metrics ของ `410 CLASSROOM_GAME_SYSTEM_RETIRED` และการเรียก route เก่า แยก client เก่า, job, webhook, admin และผู้ใช้จริง ระบุช่วงเวลาสังเกตและเกณฑ์ตัดสินก่อนถอด route; หากยังมี caller ให้คง route แบบ `410` ไว้
4. ตกลงนโยบายแต้มพฤติกรรม (`behaviorPoints`/`PointHistory` ซึ่งอาจปน EXP), Live Game แต่ละโหมด และสิทธิ์อ่านประวัติเกม ห้ามตีความยอดที่มาไม่ชัดว่าเป็นข้อมูลเกมทั้งหมด

## ลำดับงาน

### A. ทำ inventory และ dependency map

- [ ] จาก `origin/main` ล่าสุด ทำตาราง path, HTTP method, caller, owner, data read/write, auth guard, test, และสถานะ `ลบ / คง / รอข้อมูล` สำหรับ `src/app/api/classrooms/[id]/{battle,economy,events,gamification-settings,leaderboard,custom-achievements,negamon}`
- [ ] ทำเช่นเดียวกันกับ `src/app/api/student/[code]` และ `src/app/api/student/access` ในกลุ่ม shop, quest, check-in, battle-loadout, Negamon รวม direct route `src/app/api/student/negamon/select`
- [ ] ไล่ references ของ `src/lib/services/student-economy`, `src/lib/game-shop`, `src/lib/game-quests`, `src/lib/game-negamon`, `src/lib/negamon`, `src/lib/game-engine`, reward runners, socket handlers, scheduled jobs, reports/exports และ QA pages; ชื่อไฟล์เกี่ยวกับเกมไม่ใช่เหตุผลเพียงพอให้ลบ
- [ ] ตรวจ `src/proxy.ts`, `src/lib/classroom-game-system.ts`, feature flags และ tests: route ที่ลบจริงต้องปรับ matcher/contract โดยไม่เปิด mutation เก่ากลับมา

### B. ลบส่วนที่ปลอดภัยเป็นชุดเล็ก

- [ ] ชุด UI: เก็บหน้าห้อง/นักเรียนเฉพาะงานเรียน ลบ component, state, translation และ asset ที่ไม่มี caller หลังตรวจ import ทั้ง repo; ดู avatar/shared art และหน้าจอ Host/Play ก่อนลบ
- [ ] ชุด student game commands: ลบ route/service เกมล้วนที่ไม่มี caller หลังช่วงสังเกต พร้อม tests ที่ยืนยัน `404/410` ตามสัญญาใหม่และไม่มี reward write; คง authentication และ student access routes งานเรียน
- [ ] ชุด teacher game commands: ลบ mutation ยศ, event เกม, economy adjust, battle, achievement และ reward resync ที่ retire แล้วเป็นกลุ่ม; historical reads/audit/export คงไว้จนมีนโยบาย retention และทางเข้าที่ได้รับสิทธิ์
- [ ] ชุด reward integration: ลบ adapter ที่ไม่ถูกเรียก แต่คงการบันทึก submission/progress/certificate และผลเกมสด; ตรวจทั้ง call path ปกติ, retry, resync และ socket
- [ ] ทำแต่ละชุดเป็น commit แยกพร้อมรายการไฟล์ที่ลบ, เหตุผล, ผล `rg` caller และผล test เพื่อให้ย้อนเฉพาะชุดได้

### C. ตรวจและปล่อย

- [ ] รัน focused tests ของ route ที่ลบ/คง, auth/role, no-reward-write, classroom, assignment/quiz, student dashboard, OMR, board, LINE และ Live Game socket
- [ ] รัน TypeScript, ESLint เฉพาะไฟล์ที่แตะ และ production build; ตรวจ `git diff --check` และ `git diff --name-status` ว่าไม่มี Auth/Dashboard งานอื่นหรือ schema ปะปน
- [ ] Manual QA สองขนาดหน้าจอและสองบทบาท: เข้า URL เก่า, สร้าง/เปิดห้อง, ให้คะแนนและเลื่อนตาราง, ส่ง Quiz/Worksheet, LINE, Host/Play PIN และประวัติ
- [ ] Deploy แบบแยก commit บน Render เฝ้าสถานะจน `live`; ตรวจ `/api/health`, `/api/ready`, route เกมเก่า, historical read, error rate และ logs หลังปล่อย

## เกณฑ์หยุดและ rollback

- หยุดลบ route หากยังพบ caller จริง, audit access ยังไม่มีทางทดแทน, หรือ socket/Host-Play ทดสอบไม่ได้; คง `410` ไว้ได้โดยไม่ต้องเร่งลบ
- หากส่งงาน คะแนน LINE หรือ Live Game ถดถอย ให้หยุด rollout และ rollback deploy/commit เฉพาะชุดล่าสุด ตรวจข้อมูลที่เขียนระหว่าง deploy ก่อนเปิดใช้งานซ้ำ
- อย่าใช้การเปิด `CLASSROOM_GAME_SYSTEM_ENABLED` เพื่อแก้ปัญหาแบบกว้างโดยไม่ประเมินว่ามันเปิด reward mutations กลับมาหรือไม่

## Phase 3 แยกต่างหาก: ข้อมูลและ schema

ต้องมีอนุมัติรายการ field/collection, นโยบาย retention, snapshot จำกัดสิทธิ์, restore rehearsal, dry-run พร้อมจำนวนรายการ และผลตรวจว่า submission, attendance, LINE, คะแนนงาน และ PointHistory ที่กำกวมไม่หาย จึงค่อยทำ cleanup แบบระบุฐาน/ขอบเขตชัดเจนและตรวจหลังรัน การถอด Prisma field เป็นขั้นสุดท้าย ไม่ใช่การลบข้อมูลใน MongoDB

## ผลส่งมอบที่ต้องบันทึก

Dependency map และ caller evidence, ผล manual/socket QA, รายการ commit/ไฟล์, ผลทดสอบ, deploy ID, health/log monitoring, ขั้นตอน rollback ที่ลองแล้ว และรายการที่ยังต้องคงไว้พร้อมเหตุผล
