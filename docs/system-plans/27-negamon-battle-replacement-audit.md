# Negamon Battle Replacement Audit

Date: 2026-05-26
Status: closed

## Goal

หยุดใช้ battle flow ที่ผสมกันระหว่าง `negamon-lite`, compatibility layer, และ `Pokemon V3 Runtime` เวอร์ชันเฉพาะกิจของโปรเจกต์นี้ แล้วเปลี่ยนไปใช้ battle engine เดียวที่ชัดเจน, server-authoritative, และลบเส้นทาง legacy ออกจริง

## Current Problems

### 1. UI ยังรองรับสอง engine พร้อมกัน

ไฟล์ [src/components/negamon/NegamonLiteBattleArena.tsx](C:\Users\IHCK\GAMEEDU\gamedu\src\components\negamon\NegamonLiteBattleArena.tsx) ยังใช้ union state:

- `ArenaBattleState = NegamonLiteBattleState | NegamonBattleStateV3`
- มี helper text แยก `Legacy lite choice`
- หน้า battle ยังแสดงชื่อ runtime แบบสลับ `Pokemon V3 Runtime` กับ `Pokemon-Lite`

ผลคือ component เดียวแบก state shape สองแบบ, choice payload สองแบบ, และ copy สองแบบพร้อมกัน ทำให้ debug ยากและเสี่ยงหลุด edge case

### 2. Route ใหม่ยังวิ่งบน path เก่า

ไฟล์ [src/app/api/classrooms/[id]/battle/route.ts](C:\Users\IHCK\GAMEEDU\gamedu\src\app\api\classrooms\[id]\battle\route.ts) ระบุชัดว่า interactive battle ถูกเสิร์ฟที่ `/battle/lite/*`

ไฟล์ [src/app/api/classrooms/[id]/battle/lite/session/route.ts](C:\Users\IHCK\GAMEEDU\gamedu\src\app\api\classrooms\[id]\battle\lite\session\route.ts) ยัง parse ได้ทั้ง:

- `parseNegamonBattleSessionResultV3`
- `parseNegamonLiteSessionResult`

ผลคือ endpoint หลักยังเป็นชื่อ `lite` ทั้งที่พยายามใช้ V3 แล้ว ทำให้ migration ไม่เคยขาดจริง

### 3. Server battle flow ยังแบก legacy session mode

ไฟล์ [src/lib/game-negamon/server/battle.ts](C:\Users\IHCK\GAMEEDU\gamedu\src\lib\game-negamon\server\battle.ts):

- import `parseNegamonLiteSessionResult`
- มี `mapResultToEngineMode`
- ยังมีข้อความ `Legacy negamon-lite sessions are readable but no longer accept production battle actions.`

ผลคือ server ยังต้องรับผิดชอบทั้งการอ่าน session เก่าและเขียน session ใหม่ในเส้นเดียวกัน ทำให้ flow ซับซ้อนเกินจำเป็น

### 4. Monster snapshot ยังมี compatibility fallback

ไฟล์ [src/lib/game-negamon/core/monster-snapshot.ts](C:\Users\IHCK\GAMEEDU\gamedu\src\lib\game-negamon\core\monster-snapshot.ts):

- ใช้ `resolveNegamonAssignedSpeciesId` และ `resolveNegamonRuntimeSpeciesCatalog` จาก `negamon-compat`
- ยังมี `fallbackSkillCatalogFromMoves`
- เมื่อ species/catalog ไม่ครบ จะถอยกลับไปสร้าง skill catalog จาก move state เก่า

ผลคือ character build, unlock rules, และ battle loadout ไม่ได้อ่านจาก canonical source เดียวเสมอ

### 5. Classroom settings ยัง normalize ผ่าน compatibility layer

ไฟล์ [src/lib/classroom-utils.ts](C:\Users\IHCK\GAMEEDU\gamedu\src\lib\classroom-utils.ts) และ [src/lib/services/classroom-settings/gamification-settings.ts](C:\Users\IHCK\GAMEEDU\gamedu\src\lib\services\classroom-settings\gamification-settings.ts) ยังอิง `negamon-compat`

ผลคือ data migration ยังไม่ปิด และ runtime behavior ขึ้นกับ adapter มากกว่าสัญญาใหม่โดยตรง

## Why The Battle Feels Wrong

แม้ test ชุดหลักของ V3 จะผ่าน แต่สิ่งที่ผู้เล่นเจอจริงยังเพี้ยนได้เพราะ:

1. UI, route, and server ใช้คำว่า `lite`, `v3`, `legacy` ปนกัน
2. session state กับ choice contract มีหลาย shape
3. monster snapshot ยัง fallback ได้จากข้อมูลเก่า
4. battle page พยายาม render engine ใหม่บนชื่อและเส้นทางเดิม
5. regression test ยังเน้น engine logic มากกว่า real production migration path

สรุป: battle engine ใหม่ไม่ได้ยืนอยู่บนฐานข้อมูลและ endpoint ใหม่แบบสะอาด มันยังครอบอยู่บนโครงเก่า

## Replacement Recommendation

## Do not copy proprietary Pokemon game code

ไม่ควรคัดโค้ดจากเกม Pokemon เชิงพาณิชย์หรือเอา asset/game data ปิดมาใช้ตรงๆ

สิ่งที่ใช้ได้จริงคือการย้ายไปใช้ battle simulator/engine แบบ open-source ที่มี license ชัดเจน แล้ว map เข้ากับ content ของ Negamon เอง

## Candidate A: Pokemon Showdown battle simulator

Source:

- [smogon/pokemon-showdown](https://github.com/smogon/pokemon-showdown)

เหตุผล:

- repo ระบุว่าเป็น JavaScript library สำหรับ simulating Pokemon battles
- มี server, sim, protocol, architecture document ครบ
- license เป็น MIT
- เข้ากับ stack TypeScript/Node ของโปรเจกต์นี้ง่ายที่สุด

ข้อดี:

- mature มาก
- มี protocol และ state model ชัด
- ใช้เป็นฐานของ server-authoritative battle ได้
- เหมาะกับการทำ custom roster และ custom move logic

ข้อเสีย:

- model ใหญ่และผูกกับ ecosystem ของ Pokemon ค่อนข้างมาก
- ต้องทำ abstraction layer ให้ Negamon ไม่รั่วชื่อ Pokemon/data schema เข้ามา

## Candidate B: pkmn/engine

Source:

- [pkmn/engine](https://github.com/pkmn/engine)

เหตุผล:

- repo ระบุว่าเป็น minimal battle simulation engine
- มี TypeScript driver
- license เป็น MIT

ข้อดี:

- low-level และเร็วมาก
- เหมาะถ้าต้องการ engine core ที่เข้มและ deterministic

ข้อเสีย:

- integration หนักกว่า
- มี native/WASM/Zig dependency
- ไม่เหมาะเป็น first replacement ถ้าต้องรีบ stabilise หน้า battle ในโปรเจกต์นี้

## Recommended Direction

เลือก `Pokemon Showdown` เป็นฐาน replacement รอบแรก

เหตุผล:

1. โปรเจกต์นี้เป็น Next.js + TypeScript อยู่แล้ว
2. เราต้องการเปลี่ยน battle flow ให้เสถียรก่อน ไม่ใช่เพิ่ม native toolchain
3. โครงของ Showdown เหมาะกับการทำ server battle protocol ก่อน แล้วค่อย custom rules/content

## Migration Plan

### Phase A. Freeze and Audit

- [x] หยุดเพิ่ม feature ใหม่ใน battle เดิม
- [x] mark `negamon-lite` เป็น read-only migration path
- [x] เก็บรายการไฟล์ legacy ที่ต้องลบ

## Phase A Result

Phase A ปิดในเชิง audit แล้ว โดยนิยาม freeze สำหรับงาน battle ว่า:

- ห้ามเพิ่ม feature ใหม่ใน `negamon-lite`
- ห้ามเพิ่ม route ใหม่ใต้ `/battle/lite/*`
- ห้ามเพิ่ม fallback ใหม่ผ่าน `negamon-compat`
- ให้ใช้เอกสารนี้เป็น source of truth สำหรับลบ legacy ระยะถัดไป

## Legacy Inventory

### A. Battle UI and presentation

ไฟล์ที่ยังผูกกับ battle flow เก่าหรือชื่อเก่า:

- `src/components/negamon/NegamonLiteBattleArena.tsx`
- `src/components/negamon/BattleArena.tsx`
- `src/components/game/negamon/BattleV2Arena.tsx`
- `src/components/game/negamon/ui-content.ts`

หมายเหตุ:

- `NegamonLiteBattleArena` ยังรับ union state ของ lite และ V3
- `BattleV2Arena` ตอนนี้เป็น wrapper ของ arena เดิม ไม่ใช่ arena ใหม่จริง

### B. Routes and session endpoints

ไฟล์ route ที่ยังยึด path `lite`:

- `src/app/api/classrooms/[id]/battle/route.ts`
- `src/app/api/classrooms/[id]/battle/lite/session/route.ts`

ไฟล์ test ที่ยืนยันพฤติกรรม path เดิม:

- `src/__tests__/negamon-lite-session-routes.test.ts`
- `src/__tests__/negamon-v3-session-routes.test.ts`
- `src/__tests__/battle-reward-ledger.test.ts`
- `src/__tests__/student-dashboard-production-qa.test.ts`

### C. Server battle runtime

ไฟล์ server battle ที่ยังผสม legacy:

- `src/lib/game-negamon/server/battle.ts`
- `src/lib/game-negamon/server/lite-battle.ts`

จุดที่ยังปน:

- อ่านผลลัพธ์ได้ทั้ง lite และ V3
- map session mode ได้หลายแบบ
- ยังมีข้อความและพฤติกรรม migration สำหรับ `negamon-lite`

### D. Core engine and shared runtime

ไฟล์ core ที่ยังอิง `negamon-lite` โดยตรง:

- `src/lib/game-negamon/core/battle-state.ts`
- `src/lib/game-negamon/core/battle-engine-v2.ts`
- `src/lib/game-negamon/core/lite-session.ts`
- `src/lib/game-negamon/core/battle-balance.ts`
- `src/lib/game-negamon/core/item-effects.ts`
- `src/lib/game-negamon/core/type-chart.ts`
- `src/lib/game-negamon/core/status-effects.ts`
- `src/lib/game-negamon/core/skill-effects.ts`

ไฟล์ทดสอบที่ยังยืนยัน behavior ของ lite:

- `src/lib/game-negamon/__tests__/battle-engine-v2.test.ts`
- `src/lib/game-negamon/__tests__/item-effects.test.ts`
- `src/lib/game-negamon/__tests__/skill-effects.test.ts`
- `src/lib/negamon-lite/__tests__/turn-resolution.test.ts`
- `src/lib/negamon-lite/__tests__/engine-skeleton.test.ts`

### E. Compatibility and fallback layers

ไฟล์ที่ยังอิง `negamon-compat`:

- none in `src` after Phase E migration

จุด fallback สำคัญ:

- migrated to `src/lib/negamon-catalog.ts`
- removed `fallbackSkillCatalogFromMoves`

### F. Raw counts

สถานะ ณ วันที่ audit:

- คำว่า `negamon-lite` ยังโผล่ใน `0` ไฟล์ภายใต้ `src`
- `negamon-compat` ยังโผล่ใน `0` ไฟล์ภายใต้ `src`
- `battle/lite` ยังโผล่ใน `7` ไฟล์ภายใต้ `src`

## Freeze Rules

ใช้กติกานี้จนกว่า V4 replacement จะ live:

1. แก้ bug ใน battle เดิมได้ แต่ห้ามเพิ่ม feature
2. route ใหม่ทั้งหมดต้องไปทาง `battle/v4`
3. state contract ใหม่ต้องไม่ union กับ lite
4. test ใหม่ต้องเขียนกับ V4 เป็นหลัก
5. ถ้าจำเป็นต้องอ่าน session เก่า ให้แยกไว้ใน migration reader ไม่ใช่ main runtime

## Phase B Entry Criteria

จะเริ่ม Phase B ได้เมื่อ:

- [x] มีรายการไฟล์ legacy ครบ
- [x] มี freeze rules ชัดเจน
- [x] มีทางเลือก engine replacement ที่ license ชัด
- [x] ตัดสินใจ adapter target แน่ชัด
- [x] นิยาม V4 battle state contract เดียว

### Phase B. Introduce New Engine Adapter

- [x] สร้าง `src/lib/game-negamon/engine-showdown/`
- [x] แยก adapter layer:
  - `target.ts`
  - `state.ts`
  - `mapper.ts`
  - `adapter.ts`
- [x] export adapter scaffold ผ่าน `src/lib/game-negamon/index.ts`
- [x] ให้ UI อ่าน battle state shape เดียวเท่านั้น

## Phase B Result

สิ่งที่เพิ่มเข้ามา:

- `src/lib/game-negamon/engine-showdown/target.ts`
- `src/lib/game-negamon/engine-showdown/state.ts`
- `src/lib/game-negamon/engine-showdown/mapper.ts`
- `src/lib/game-negamon/engine-showdown/adapter.ts`
- `src/lib/game-negamon/engine-showdown/index.ts`
- `src/lib/game-negamon/__tests__/showdown-adapter.test.ts`

ผลลัพธ์ของเฟสนี้:

- มี adapter target กลางที่ประกาศชัดว่า V4 จะยึด `pokemon-showdown`
- มี `NegamonBattleStateV4` เป็น contract ใหม่ที่ไม่ union กับ lite
- มี mapper จาก canonical `NegamonMonsterSnapshot` ไปสู่ engine seed กลาง
- มี server-side adapter facade สำหรับ `createBattle`, `listChoices`, และ `resolveTurn`
- ติดตั้ง package `pokemon-showdown@0.11.10` และต่อ `BattleStream` เข้ากับ adapter แล้ว
- adapter เก็บ command log, replay runtime ตาม seed เดิม, parse request กลับมาเป็น choice/HP/status สำหรับ state V4

ผลทดสอบ:

- `src/lib/game-negamon/__tests__/showdown-adapter.test.ts` ผ่าน
- `src/lib/game-negamon/__tests__/monster-snapshot.test.ts` ผ่านร่วมกัน

### Phase C. New Session and Routes

- เปลี่ยน route ใหม่เป็น `/api/classrooms/[id]/battle/v4/*`
- ห้าม parse `negamon-lite` ใน route ใหม่
- เขียน session result schema ใหม่ที่ไม่มี union กับ lite

### Phase D. UI Replacement

- เปลี่ยน `NegamonLiteBattleArena.tsx` เป็น `NegamonBattleArenaV4.tsx`
- รับเฉพาะ battle state เดียว
- ตัดคำว่า `Lite`, `Legacy`, `Pokemon-Lite`

### Phase E. Data Migration

- [x] ย้าย classroom settings จาก `negamon-compat` ไป canonical catalog
- [x] ย้าย student monster assignment ให้เหลือ id ใหม่ชุดเดียว
- [x] ลบ fallback skill catalog

### Phase F. Remove Legacy

- [x] ลบ `src/lib/negamon-lite/`
- [x] ลบ parser/view สำหรับ lite sessions
- [x] ลบ route `/battle/lite/*`
- [x] ลบ `negamon-compat` เมื่อ data migration เสร็จ

## Immediate Work Order

1. Audit every import of `negamon-lite` and `negamon-compat`
2. Define a new single battle state contract for V4
3. Replace battle UI to consume only V4 state
4. Add adapter prototype for Showdown-based server turn resolution
5. Keep current content catalog, rewards, quests, inventory, and progression outside the engine

## What Should Not Be Rebuilt

สิ่งที่ควรเก็บไว้:

- monster/species catalog
- skill/item/reward catalog ids
- economy and reward finalization
- progression and history
- teacher visibility reports

สิ่งที่ควรเปลี่ยน:

- turn resolution engine
- battle session schema
- battle routes
- battle UI state contract
- legacy compat/fallback layers

## Expected Outcome

เมื่อ migration นี้เสร็จ:

- battle page จะใช้ engine เดียว
- route จะไม่อิง `lite`
- ไม่มี union state ระหว่าง old/new
- monster snapshot จะอ่านจาก canonical catalog เท่านั้น
- legacy files ถูกลบออกจริง ไม่ใช่แค่ซ่อนไว้

## Closure

แผน `Negamon Battle Replacement Audit` ปิดงานแล้ว

- [x] Phase A. Freeze and Audit
- [x] Phase B. Introduce New Engine Adapter
- [x] Phase C. New Session and Routes
- [x] Phase D. UI Replacement
- [x] Phase E. Data Migration
- [x] Phase F. Remove Legacy

ผลลัพธ์สุดท้ายของแผนนี้:

- battle route หลักย้ายไป `v4`
- UI battle หลักอ่าน state shape เดียว
- classroom settings และ student monster assignment ถูก normalize เป็น canonical catalog
- `negamon-compat` ถูกลบออก
- `src/lib/negamon-lite/` และ route `/battle/lite/*` ถูกลบออก
- test และ type check ของเส้นหลักผ่าน

งานถัดไปควรไปอยู่ในแผนใหม่แยกจาก audit/migration นี้ เช่น production hardening, reward integration ที่เหลือ, teacher visibility, และ release/deploy workflow
