# System Plan 17: Negamon Battle Stabilization

Last updated: 2026-05-23

## Goal

ทำให้ระบบต่อสู้ Negamon เสถียรก่อน แล้วค่อยขยายไปส่วนมอนสเตอร์, reward, progression, live classroom และ UI อื่น ๆ

เป้าหมายระยะสั้นคือ:

- นักเรียนกดต่อสู้แล้วไม่ค้าง
- คะแนน, HP, EN, สถานะ, ทอง และประวัติ ไม่มั่ว
- server เป็น source of truth ของ battle เสมอ
- ครูและนักเรียนเห็นผลลัพธ์ตรงกันหลัง refresh
- มี test ครอบ flow สำคัญก่อน deploy production

## Battle Systems In Scope

- One-on-one Negamon battle
- Interactive battle API
- Auto-resolve battle
- Battle loadout and consumable items
- Gold reward and economy ledger
- Battle history/result display
- Live classroom Negamon Battle เฉพาะส่วนที่เกี่ยวกับ combat state และ reward sync

## Source Files

- `src/lib/battle-engine.ts`
- `src/app/api/classrooms/[id]/battle/route.ts`
- `src/components/negamon/BattleArena.tsx`
- `src/components/negamon/ActionMenu.tsx`
- `src/components/negamon/BattleResultScreen.tsx`
- `src/components/negamon/BattleHistoryPanel.tsx`
- `src/lib/game-engine/negamon-battle-engine.ts`
- `src/lib/socket/register-game-socket-handlers.ts`
- `src/lib/negamon/sync-negamon-battle-rewards.ts`
- `src/lib/battle-loadout.ts`
- `src/lib/services/student-economy/battle-reward-policy.ts`
- `src/lib/services/student-economy/economy-ledger.ts`

## External Architecture Pattern

แนวทางจาก Pokemon Showdown และ `pkmn/engine` ที่ควรนำมาใช้:

- แยก battle engine ออกจาก UI และ database
- client ส่งแค่ intent เช่น move id, join, answer
- server คำนวณ valid choices จาก state ปัจจุบัน
- server resolve turn, damage, status, faint, reward
- ทุก turn มี structured events/logs
- state ต้อง replay/debug ได้จาก seed, cursor, choices, events

## Current Risk Map

### P0: Battle Correctness

- บางห้องเปิด Negamon ไม่ได้ตั้งแต่ settings เพราะ legacy classroom owner ที่ role ยังเป็น `USER` เปิด modal ได้ แต่ `PATCH /gamification-settings` เคยบล็อกก่อนเช็ก ownership
- client ยังมี local state หลายจุด อาจแสดง move/EN/HP ไม่ตรงกับ server หลัง turn
- battle API ยังไม่มี shared protocol type กลาง ทำให้ route/UI/test drift ได้ง่าย
- valid move choices เพิ่งเริ่มส่งจาก server แต่ UI ยังไม่ได้ใช้เป็น source of truth เต็มตัว
- stale click หรือ double click อาจทำให้ request ชนกับ stateVersion แล้วผู้ใช้ไม่เข้าใจ
- reward finalization ต้องกันซ้ำและต้องสัมพันธ์กับ economy ledger ทุกครั้ง

### P1: Live Classroom Combat

- live battle เป็น quiz knockout ไม่ใช่ one-on-one engine เดียวกัน
- ranking ระหว่างเล่นต้องอิง HP/eliminatedAt/score แบบ deterministic
- reconnect ต้องคืน player identity เดิม ไม่สร้างคนซ้ำ
- reward sync หลังจบเกมต้อง retry ได้ และไม่ double award

### P2: UX And Debuggability

- ถ้า battle ค้างหรือ turn conflict ผู้ใช้ต้องเห็นข้อความที่แก้ได้
- ครูควรมีช่องทางดู battle/reward audit ได้ว่า reward ไปทางไหน
- battle events ควรอ่านง่ายพอใช้ debug production ได้

## Phase 1: One-on-One Battle Source Of Truth

- [x] แก้ `PATCH /gamification-settings` ให้ legacy classroom owner เปิด Negamon ได้
- [ ] ใช้ `validMoveChoices` จาก server ใน `ActionMenu`
- [ ] ปิด/disable move จาก server choice data ไม่ใช่คำนวณเองจาก local EN อย่างเดียว
- [ ] แสดงเหตุผลเมื่อกดไม่ได้ เช่น EN ไม่พอ
- [ ] เพิ่ม shared type สำหรับ battle API response/request
- [ ] เพิ่ม test ว่า `beginInteractive` ส่ง `validMoveChoices`
- [ ] เพิ่ม test ว่า `turnInteractive` ส่ง `validMoveChoices` หลังทุก turn

Exit criteria:

- UI move list ตรงกับ server หลังทุก turn
- ผู้เล่นไม่สามารถกด move ที่ server มองว่า invalid ได้จาก UI ปกติ
- route/UI/test ใช้ contract เดียวกัน

## Phase 2: Turn State And Stale Action Guard

- [ ] เพิ่ม `choiceRequestId` หรือ `stateVersion` ใน response ของแต่ละ turn
- [ ] ให้ client ส่ง `choiceRequestId` กลับมาพร้อม move intent
- [ ] reject stale action ด้วย error ที่ชัดเจน เช่น `STALE_BATTLE_ACTION`
- [ ] UI refresh state เมื่อเจอ stale action แทนการค้าง
- [ ] เพิ่ม test double click/stale request

Exit criteria:

- double click ไม่ทำให้ battle state เพี้ยน
- stale UI ได้รับ state ล่าสุดหรือข้อความให้กดใหม่

## Phase 3: Deterministic Replay And Debug Logs

- [ ] บันทึก seed, rng cursor, submitted choices, actorSide, events ต่อ turn
- [ ] เพิ่ม helper สร้าง replay summary จาก `BattleSession.result`
- [ ] เพิ่ม test ว่า replay จาก state ให้ final winner/HP ตรงเดิม
- [ ] ทำ structured event ให้ครบ damage, heal, status, energy, faint, reward
- [ ] ลด reliance ต่อข้อความ log ภาษาไทยใน test

Exit criteria:

- เปิด BattleSession แล้ว debug ได้ว่า turn ไหนเกิดอะไร
- test อ่าน structured event ไม่ผูกกับข้อความแปล

## Phase 4: Reward And Ledger Reliability

- [ ] ตรวจ interactive finalization ว่า update session, consume item, award gold, ledger อยู่ใน transaction เดียวกัน
- [ ] ตรวจ auto battle ให้ใช้ idempotency key เดียวต่อ session
- [ ] เพิ่ม regression test no double reward on retry
- [ ] เพิ่ม test inventory mismatch ไม่จ่าย reward
- [ ] เพิ่ม reward summary ใน final response ให้ UI แสดงชัด

Exit criteria:

- battle reward ไม่ซ้ำแม้ retry
- ledger ตรงกับ `student.gold`
- item ถูกใช้เฉพาะเมื่อ battle finalize สำเร็จ

## Phase 5: Balance And Mechanics Audit

- [ ] ตรวจ damage formula กับ type multiplier
- [ ] ตรวจ crit, STAB, variance, action meter
- [ ] ตรวจ status duration ไม่ tick ซ้ำผิดจังหวะ
- [ ] ตรวจ boost/debuff ไม่ stack เกิน design
- [ ] ตรวจ energy regen และ move fallback
- [ ] เพิ่ม snapshot tests สำหรับ species หลักทุกตัว

Exit criteria:

- ทุก species มี power band ที่สมเหตุสมผล
- move ultimate ไม่แรงหรือถูกเกินจน meta พัง
- status ไม่ทำให้ battle stall หรือ one-shot แบบผิดคาด

## Phase 6: Live Classroom Battle Combat State

- [ ] แยก concept `score`, `battleHp`, `rank`, `eliminatedAt` ให้ชัด
- [ ] ทำ ranking function pure และ test ได้
- [ ] host/play ใช้ ranking source เดียวกัน
- [ ] reconnect ไม่สร้าง duplicate player
- [ ] จบเกมแล้ว final ranking ไม่เปลี่ยนหลัง reward sync

Exit criteria:

- คะแนนอันดับระหว่างเล่นไม่มั่ว
- host และ student เห็นอันดับตรงกัน
- reconnect แล้วกลับเข้าคนเดิม

## Phase 7: Live Reward Sync

- [ ] ยืนยัน reward sync ใช้ `studentId` เป็นหลัก
- [ ] name fallback ต้อง audit และ skip เมื่อ ambiguous
- [ ] sync failure ต้อง retry ได้
- [ ] resync ต้อง idempotent
- [ ] reward history ต้องบอกได้ว่า live battle ให้ EXP/behavior points ไม่ใช่ทอง

Exit criteria:

- live reward ไม่หายเงียบ
- resync ไม่ให้รางวัลซ้ำ
- ครูตรวจย้อนหลังได้

## Phase 8: Manual QA Before Production

- [ ] นักเรียน A เริ่ม one-on-one battle และชนะ ได้ทองครั้งเดียว
- [ ] นักเรียน B ชนะ ได้ทองตาม policy
- [ ] กด move ที่ EN ไม่พอ ต้อง disable หรือ fallback ชัดเจน
- [ ] refresh ระหว่าง battle แล้ว state ไม่หาย
- [ ] double click move ไม่ทำให้ turn ซ้ำ
- [ ] ใช้ battle item แล้วจบเกม item ถูกหัก
- [ ] battle item ไม่ถูกหักถ้า session error ก่อน finalize
- [ ] ครูเปิด live battle นักเรียนเข้า 2 คนขึ้นไป เริ่มได้
- [ ] reconnect ระหว่าง live battle ยังเป็นผู้เล่นเดิม
- [ ] จบ live battle แล้ว reward sync เข้า history

## Validation Commands

- `npm.cmd run check:negamon-battle`
- `npm.cmd run test:negamon-reward-audit`
- `npm.cmd run check:live-game`
- `npm.cmd run check:student-dashboard`
- `npm.cmd run predev`

## Work Log

- [x] 2026-05-23: Reviewed Pokemon-like battle engine patterns.
- [x] 2026-05-23: Added server-owned `validMoveChoices` to battle API responses.
- [x] 2026-05-23: Added regression test for server-owned move choices.
- [x] 2026-05-23: `npm.cmd run check:negamon-battle` passed.
- [x] 2026-05-23: Fixed Negamon settings save for legacy `USER` classroom owners.
- [x] 2026-05-23: `npm.cmd test -- src/__tests__/classroom-gamification-settings-route.test.ts` passed.
- [x] 2026-05-23: `npm.cmd run check:classroom-core` passed.

## Next Action

เริ่ม Phase 1 ต่อจากจุดที่คุ้มที่สุด:

- เชื่อม `validMoveChoices` เข้า `BattleArena` และ `ActionMenu`
- ให้ปุ่มท่าใช้ server choice data
- เพิ่ม test response contract ของ `beginInteractive` และ `turnInteractive`
