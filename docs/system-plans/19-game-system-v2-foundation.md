# System Plan 19: Game System V2 Foundation

Last updated: 2026-05-23

## Goal

วางแผนยกระบบเกมของฝั่งนักเรียนใหม่ให้แยกเป็นโมดูลชัดเจน ไม่ปนกับ dashboard page logic และไม่ผูกระบบเก่ากับระบบใหม่ไว้ในไฟล์เดียว

เป้าหมายหลัก:

- แยก game domain ออกจาก student dashboard shell
- แยก engine, economy, inventory, quest, monster, battle, history ออกจากกัน
- ทำ data contract กลางที่ทุกระบบเกมใช้ร่วมกัน
- ลดการผูกกันแบบ ad hoc ระหว่าง UI, route, และ Prisma JSON
- เปิดทางให้พัฒนาเกมใหม่หรือระบบ battle ใหม่โดยไม่พังระบบ shop, gold, หรือ quest

## Why This Plan Exists

สภาพปัจจุบันของระบบเกมมีปัญหาเชิงโครงสร้าง:

- game tabs ยังถูกประกอบจาก student dashboard โดยตรง
- state หลายส่วนคำนวณใน component ใหญ่ฝั่ง client
- battle เก่าและ battle ใหม่ยังอยู่ใกล้กันเกินไป
- economy, reward, shop, inventory, quest, monster progression มี dependency ข้ามกันหลายจุด
- production build สามารถพังได้จากไฟล์ UI เดียว แม้ business logic ส่วนอื่นจะยังปกติ

ถ้ายังเพิ่ม feature แบบเดิมต่อไป:

- deploy risk จะสูงขึ้น
- debug ยากขึ้น
- test coverage จะกระจายและไม่บอกภาพรวม
- refactor แต่ละระบบจะมี blast radius สูง

## Product Scope

Game System V2 ครอบคลุมระบบต่อไปนี้:

1. Student game shell
2. Economy and gold ledger
3. Inventory and shop
4. Quest and progression
5. Monster ownership and growth
6. Battle engine and battle session
7. Battle rewards and anti-duplication
8. Game history and replay summary
9. Feature flags and migration path

## Current System Map

### Current entry points

- `src/components/student/StudentDashboardClient.tsx`
- `src/components/student/student-dashboard-main-tabs.tsx`
- `src/components/student/student-dashboard-game-tabs.tsx`
- `src/app/student/[code]/page.tsx`

### Current game modules already in repo

- Quests: `src/lib/daily-quests.ts`, `src/components/student/DailyQuestPanel.tsx`
- Shop and items: `src/lib/shop-items.ts`, `src/components/student/ShopDialog.tsx`
- Economy ledger: `src/lib/services/student-economy/*`
- Monster state: `src/lib/classroom-utils.ts`, `src/lib/types/negamon.ts`
- Legacy battle: `src/lib/battle-engine.ts`, `src/components/negamon/BattleArena.tsx`
- Lite battle: `src/lib/negamon-lite/*`, `src/components/negamon/NegamonLiteBattleArena.tsx`
- Reward audit and resync: `src/lib/negamon/*`, `src/__tests__/battle-reward-ledger.test.ts`

### Main architecture problem

หน้าฝั่งนักเรียนตอนนี้ทำหน้าที่มากเกินไป:

- เป็น shell ของ dashboard
- เป็น shell ของ game UI
- เก็บ live state ของ economy บางส่วน
- trigger event polling
- ผูก monster computation กับ classroom config
- ผูก battle consumables, quest gold, and tab state เข้าด้วยกัน

Game V2 ต้องลดหน้าที่นี้ลง ให้ dashboard เป็นเพียง container และให้ game systems มี owner boundary ของตัวเอง

## Target Architecture

## Layer 1: Game Shell

หน้าที่:

- render navigation ของโหมดเกม
- โหลด game summary data
- route ผู้ใช้เข้า module ต่าง ๆ
- แยกจาก dashboard learn mode ให้ชัด

สิ่งที่ควรมี:

- `GameHomeShell`
- `GameTabRouter`
- `GameSummaryHeader`

สิ่งที่ไม่ควรทำ:

- ไม่ resolve battle turn ใน shell
- ไม่คำนวณ inventory mutations ใน shell
- ไม่ผูก API contract ของแต่ละเกมโดยตรง

## Layer 2: Game Core

หน้าที่:

- เก็บ domain contract กลาง
- เก็บ pure logic ที่ไม่ผูก React
- เก็บ serializer/parser ของ game state
- เก็บ reward/economy hooks ที่ชัดเจน

สิ่งที่ควรมี:

- `src/lib/game-core/types.ts`
- `src/lib/game-core/session.ts`
- `src/lib/game-core/rewards.ts`
- `src/lib/game-core/inventory.ts`
- `src/lib/game-core/history.ts`
- `src/lib/game-core/feature-flags.ts`

ตัวอย่าง contract กลาง:

```ts
type GameSessionSummary = {
  id: string;
  kind: "negamon" | "gold-quest" | "crypto-hack";
  status: "pending" | "active" | "finished";
  startedAt: string;
  finishedAt?: string;
};

type RewardResult = {
  gold: number;
  items: string[];
  blockedReason?: "daily_cap" | "pair_cooldown" | "duplicate_finalize";
};

type InventoryChange = {
  consumedItemIds: string[];
  grantedItemIds: string[];
};
```

## Layer 3: Game Modules

แต่ละระบบต้องมี boundary ของตัวเอง:

- `game-negamon`
- `game-quests`
- `game-shop`
- `game-history`

แต่ละ module ควรมี:

- `components/`
- `server/`
- `core/`
- `tests/`

## Layer 4: Persistence and Audit

หน้าที่:

- Prisma writes
- idempotent reward finalization
- audit log
- economy ledger writes
- game history persistence

หลักการ:

- logic ตัดสินผลให้เกิดใน core ก่อน
- persistence layer มีหน้าที่ validate state version, finalize once, และบันทึก side effects

## Recommended Folder Direction

```text
src/
  components/
    game/
      shell/
      negamon/
      quests/
      shop/
      history/
  lib/
    game-core/
      types.ts
      session.ts
      rewards.ts
      inventory.ts
      history.ts
      feature-flags.ts
    game-negamon/
      core/
      server/
      tests/
    game-quests/
      core/
      server/
      tests/
    game-shop/
      core/
      server/
      tests/
```

## Development Order

## Phase 0: Inventory and Freeze

เป้าหมาย:

- หยุดเพิ่ม feature เกมใหม่แบบกระจายไฟล์
- map dependency ของ game systems ทั้งหมด
- ระบุ owner ของ data แต่ละชุด

ต้องทำ:

- list routes, components, libs, tests, docs ที่เกี่ยวกับ game systems
- ระบุ shared state ที่อยู่ใน `StudentDashboardClient`
- ระบุ legacy vs v2 path ของ Negamon
- ระบุ persistence points ของ gold, reward, item, quest progress

exit criteria:

- มี dependency map ชัด
- รู้ว่าระบบไหนแตะข้อมูลไหน
- รู้ว่าไฟล์ไหนเป็น migration hotspot

Status: completed on 2026-05-23.

Phase 0 completion checklist:

- [x] Listed current student game entry points.
- [x] Listed current game modules already in the repo.
- [x] Identified `StudentDashboardClient` as the main mixed-responsibility client shell.
- [x] Identified `student-dashboard-game-tabs.tsx` as the current game tab adapter.
- [x] Identified quest module boundary: `daily-quests.ts` and `DailyQuestPanel`.
- [x] Identified shop and inventory boundary: `shop-items.ts`, `ShopDialog`, `battle-loadout.ts`, and student shop routes.
- [x] Identified economy boundary: `src/lib/services/student-economy/*` and `EconomyTransaction`.
- [x] Identified monster boundary: `classroom-utils.ts`, `types/negamon.ts`, and species catalog helpers.
- [x] Identified legacy battle boundary: `battle-engine.ts`, `BattleArena.tsx`, old battle route, and rollback path.
- [x] Identified V2 battle boundary: `negamon-lite/*`, lite start/choice routes, and `NegamonLiteBattleArena`.
- [x] Identified persistence points for gold, rewards, inventory, battle sessions, and history.
- [x] Marked `npm.cmd run build` as required production validation for future game-system changes.

Phase 0 inventory map:

| Area | Current owner files | Data owner | Migration risk |
| --- | --- | --- | --- |
| Student game shell | `StudentDashboardClient.tsx`, `student-dashboard-game-tabs.tsx` | React client state plus server page props | High: mixes dashboard, game tabs, live events, economy patching, and monster state |
| Quests | `daily-quests.ts`, `DailyQuestPanel.tsx`, `/api/student/[code]/daily-quests` | Student activity and claim state | Medium: reward claiming must stay idempotent |
| Shop and inventory | `shop-items.ts`, `ShopDialog.tsx`, `/shop/buy`, `/shop/equip`, `battle-loadout.ts` | `Student.inventory`, `Student.battleLoadout`, economy ledger | High: purchase, equip, and consume must not duplicate or lose items |
| Economy and gold | `src/lib/services/student-economy/*`, reward policy helpers | `Student.gold`, `EconomyTransaction` | High: all rewards must finalize once |
| Monster progression | `classroom-utils.ts`, `types/negamon.ts`, `negamon-species.ts` | Classroom gamification settings plus derived student score | Medium: current monster state is mostly derived, not persisted as a clean snapshot |
| Legacy battle | `battle-engine.ts`, `BattleArena.tsx`, old battle route | `BattleSession`, legacy battle result JSON | High: still needed for rollback until production QA is stable |
| Negamon Lite battle | `negamon-lite/*`, lite start/choice routes, `NegamonLiteBattleArena.tsx` | `BattleSession.result`, state version, reward ledger | High: build-safe JSON shape and finalize-once behavior are critical |
| History and replay | `GameHistoryTab.tsx`, point history, battle session result summaries | `PointHistory`, `BattleSession`, economy ledger | Medium: user-facing history and debug audit are not yet unified |

Phase 0 freeze rule:

- No new game features should be added directly to `StudentDashboardClient`.
- New game work should start behind `game-core` contracts or a module-specific adapter.
- Legacy battle code may remain for rollback, but should not be mixed into new battle files.
- Any runtime, route, Prisma, or shared UI change must run `npm.cmd run build` before being called deploy-safe.

## Phase 1: Create Game Core Contracts

เป้าหมาย:

- มี contract กลางให้ทุกระบบใช้

ต้องทำ:

- เพิ่ม `src/lib/game-core/types.ts`
- เพิ่ม session summary contract
- เพิ่ม reward result contract
- เพิ่ม inventory delta contract
- เพิ่ม history summary contract

exit criteria:

- route ใหม่สามารถคืน shape กลางได้
- UI ใหม่ไม่ต้องอ่าน Prisma JSON แบบ ad hoc

Status: completed on 2026-05-23 as contract foundation.

Phase 1 completion checklist:

- [x] Added `src/lib/game-core/types.ts`.
- [x] Added session summary contract and status helpers.
- [x] Added reward result contract and idempotency key helper.
- [x] Added inventory delta contract and stack-aware inventory application helper.
- [x] Added history event contract and stable history id helper.
- [x] Added game feature flag parser for future rollout toggles.
- [x] Added `src/lib/game-core/index.ts` barrel export.
- [x] Added unit tests for contract helper behavior.

Phase 1 implementation notes:

- `game-core` is intentionally not wired into runtime flows yet.
- Existing quest, shop, economy, monster, and battle routes continue to run through their current code paths.
- The new contracts give Phase 2 and Phase 3 a stable target shape before moving UI or persistence logic.
- This keeps the first slice low-risk while still creating a real foundation for the Game System V2 migration.

## Phase 2: Extract Student Game Shell

เป้าหมาย:

- แยก game UI shell ออกจาก dashboard client

ต้องทำ:

- สร้าง `src/components/game/shell/*`
- ลด responsibility ของ `StudentDashboardClient`
- ให้ game tabs ใช้ shell component ใหม่
- ส่งแค่ summary props ที่จำเป็น

exit criteria:

- dashboard learn mode กับ game mode ไม่ปน logic กัน
- game shell สามารถพัฒนาแยกได้

Status: completed on 2026-05-23 as shell extraction foundation.

Phase 2 completion checklist:

- [x] Added `src/components/game/shell/student-game-tabs.tsx`.
- [x] Moved quest, battle, and game history tab ownership into the game shell namespace.
- [x] Updated `StudentDashboardMainTabs` to consume `StudentGameTabs` from `components/game/shell`.
- [x] Kept `components/student/student-dashboard-game-tabs.tsx` as a compatibility re-export.
- [x] Preserved the current UI and runtime behavior while creating a clean Game V2 shell entry point.
- [x] Updated main-tabs test mocking to target the new shell import.

Phase 2 implementation notes:

- This is intentionally a narrow extraction, not a full dashboard rewrite.
- `StudentDashboardClient` still owns cross-cutting state such as mode, active tab, live events, and economy patching until later slices.
- Future game modules should be added under `src/components/game/*` instead of `src/components/student/*`.

## Phase 3: Normalize Economy and Inventory

เป้าหมาย:

- ทำให้ทอง, item, equip, consume, reward ใช้ flow เดียวกัน

ต้องทำ:

- รวม inventory mutation helper กลาง
- รวม reward finalize helper กลาง
- แยก UI patch state ออกจาก server truth
- ทำ idempotency rules กลาง

exit criteria:

- battle, shop, quest reward ใช้ reward/inventory contract เดียวกัน
- ลด duplicate gold / duplicate item risk

Status: completed on 2026-05-23 as economy/inventory foundation.

Phase 3 completion checklist:

- [x] Added `GameEconomyMutation` and related economy source/type contracts.
- [x] Added `game-core/economy.ts` for gold balance calculation, mutation normalization, and balance assertion.
- [x] Expanded `game-core/inventory.ts` with grant/consume changes, strict application, item counting, and stack-aware ownership checks.
- [x] Reused game-core inventory helpers from `battle-loadout.ts`.
- [x] Preserved best-effort client inventory patch behavior for battle consumables.
- [x] Preserved strict server-side inventory consumption behavior for battle item finalization.
- [x] Added tests for economy mutation normalization and strict vs non-strict inventory changes.

Phase 3 implementation notes:

- Shop and quest transaction flows are not fully migrated yet; they still use their current service paths.
- This phase establishes the shared economy/inventory contract and starts reducing duplicated inventory mutation logic.
- Later slices should migrate shop purchase, quest claiming, and battle reward finalization to the same game-core mutation shape.

## Phase 4: Normalize Monster Domain

เป้าหมาย:

- แยก monster growth และ monster snapshot ออกจาก classroom helper ขนาดใหญ่

ต้องทำ:

- สร้าง `monster snapshot` model กลาง
- แยก species lookup, rank growth, unlocked moves, display state
- ลด dependency ตรงจาก component ไป `classroom-utils.ts`

exit criteria:

- battle UI, monster UI, reward UI ใช้ monster snapshot shape เดียวกัน

Status: completed on 2026-05-23 as monster snapshot foundation.

Phase 4 completion checklist:

- [x] Added `game-core/monster.ts` for monster and skill snapshot normalization.
- [x] Added shared helpers for monster level, types, and skill categories.
- [x] Kept the new monster contract structural so it does not depend directly on Negamon-only catalog types.
- [x] Reused monster snapshot level/type normalization in Negamon Lite combatant creation.
- [x] Added unit coverage for monster snapshots and skill category normalization.

Phase 4 implementation notes:

- `classroom-utils.ts` remains the current source for deriving `StudentMonsterState` from classroom settings.
- This phase creates the shared contract first; it does not persist monster snapshots yet.
- Battle is the first consumer because battle level/type data has already caused production build and runtime risk.
- Later slices should migrate monster card UI, reward history, and skill display to the same `GameMonsterSnapshot` shape.

## Phase 5: Finish Negamon Battle V2

เป้าหมาย:

- ให้ battle ใหม่เป็นระบบหลักที่แยกชัดเจนจาก legacy

ต้องทำ:

- ย้าย lite battle ไป namespace ที่เสถียร
- แยก legacy battle ออกใต้ `legacy/`
- เพิ่ม session read route
- ทำ replay/history summary แบบ V2
- ปรับ reward finalize ให้ใช้ game-core contracts

exit criteria:

- battle route ใหม่ไม่พึ่ง legacy UI
- legacy battle rollback อยู่ได้ แต่ไม่ปนในไฟล์เดียว

Status: completed on 2026-05-23 as Negamon Battle V2 foundation.

Phase 5 completion checklist:

- [x] Added stable `game-negamon` namespace for V2 battle-facing contracts.
- [x] Added `game-negamon/core/lite-session.ts` to convert raw `BattleSession.result` into a read-safe V2 session view.
- [x] Added `GET /api/classrooms/[id]/battle/lite/session` for authenticated session reads.
- [x] Kept legacy `/api/classrooms/[id]/battle` untouched so rollback remains available.
- [x] Added route coverage for reading active lite sessions and returning valid player choices.

Phase 5 implementation notes:

- This phase does not delete or move legacy battle yet; it creates the V2 read path first.
- Lite start and choice routes still live under `/battle/lite/*`, but orchestration now lives in `game-negamon/server`.
- Reward finalization still uses the existing battle reward policy and economy ledger path, with economy mutation shape derived from game-core.
- Replay/history summary now has a `NegamonLiteSessionView` helper; UI migration remains a later slice.

Phase 5 remaining follow-up checklist:

- [x] Move more lite battle orchestration from route files into `game-negamon/server`.
- [x] Add V2 replay/history summary based on `NegamonLiteSessionView`.
- [x] Wrap reward finalization with game-core reward/economy helpers.
- [ ] Rename or isolate legacy battle UI/API paths after production QA confirms V2 is stable.

Phase 5 follow-up completion notes:

- Added `game-negamon/server/lite-battle.ts` for lite battle start and choice orchestration.
- Reduced lite start/choice routes to request parsing and response adapters.
- Added `createNegamonLiteSessionHistorySummary` for V2 battle history summaries from session views.
- Updated Negamon Lite reward ledger creation to use `createGameEconomyMutation`.

## Phase 6: Quests and Shop V2

เป้าหมาย:

- ทำ quest กับ shop ให้เป็น game modules จริง ไม่ใช่ dashboard subpanels ที่มี logic ฝัง

ต้องทำ:

- แยก quest progress calculation
- แยก quest reward claiming flow
- แยก shop catalog / purchase / equip flow
- ทำ UI และ route contract ใหม่ให้ consistent

exit criteria:

- quest กับ shop ใช้ game-core economy contracts เดียวกัน
- UI state ไม่ต้อง patch ทองหลายที่

Status: completed on 2026-05-23 as Quests and Shop V2 foundation.

Phase 6 completion checklist:

- [x] Added `game-quests` namespace for quest claim reward and economy contracts.
- [x] Added `game-shop` namespace for shop purchase economy and inventory contracts.
- [x] Updated quest claim ledger creation to derive its economy mutation from the shared quest contract.
- [x] Updated shop purchase service to derive spend mutation and inventory grant from the shared shop contract.
- [x] Preserved existing route behavior for daily/weekly/challenge quests, buy, and equip.
- [x] Added unit coverage for quest claim plans and shop purchase plans.

Phase 6 implementation notes:

- Quest definitions still live in `daily-quests.ts` and `quest-system.ts`, but progress snapshot orchestration now has a `game-quests/core` adapter.
- Shop item definitions still live in `shop-items.ts`, but catalog lookup and battle-item grouping now have a `game-shop/core` adapter.
- Equip flow now returns a game-core inventory equipment change and shared game state patch.
- Quest and shop routes keep legacy fields while also returning shared `gameState` for gold/inventory/equipped-frame updates.

Phase 6 remaining follow-up checklist:

- [x] Move quest progress calculation into `game-quests/core`.
- [x] Move shop catalog grouping and item lookup into `game-shop/core`.
- [x] Add a shared route response shape for gold/inventory updates.
- [x] Route shop equip through a game-core inventory equipment change.
- [x] Reduce direct dashboard state patching after quest/shop mutations.

Phase 6 follow-up completion notes:

- Added `createQuestProgressSnapshot` under `game-quests/core`.
- Added shop catalog lookup and battle item grouping helpers under `game-shop/core`.
- Added `GameStatePatch` and `createGameStatePatch` in game-core.
- Updated quest claim, shop buy, and shop equip responses to include `gameState`.
- Updated quest/shop UI consumers to prefer `gameState` while preserving old response fields.

## Phase 7: History and Analytics

เป้าหมาย:

- ให้ผู้เล่นเห็นประวัติที่อ่านง่าย และให้ทีม debug reward/game state ได้

ต้องทำ:

- เพิ่ม game history summary model
- แยก battle result summary จาก raw session JSON
- ทำ timeline สำหรับ quest/shop/battle rewards
- ทำ analytics hooks สำหรับ game engagement

exit criteria:

- player history ใช้งานจริงได้
- admin/teacher trace reward state ได้

Status: completed on 2026-05-23 as History and Analytics foundation.

Phase 7 completion checklist:

- [x] Added `GameHistorySummary` and `GameHistoryAnalytics` contracts in game-core.
- [x] Added helpers to create battle history summaries from `BattleSession` rows.
- [x] Added lightweight history analytics aggregation for wins, losses, gold earned/spent, item grants, and game-kind counts.
- [x] Updated battle history route to return `gameHistory` and `gameHistoryAnalytics` alongside the existing `sessions` response.
- [x] Preserved the existing `BattleHistoryPanel` response path so UI migration can happen separately.
- [x] Added unit and route coverage for battle history summaries and analytics output.

Phase 7 implementation notes:

- The existing `sessions` response remains supported for current API compatibility.
- `BattleHistoryPanel` now renders from `gameHistory` and falls back to legacy `sessions` only when needed.
- `gameHistory` is now available as the V2 read shape for battle, quest, and shop timeline summaries.
- Economy ledger rows now expose quest/shop summaries and lightweight analytics for teacher/admin tracing.

Phase 7 remaining follow-up checklist:

- [x] Migrate `BattleHistoryPanel` to render from `gameHistory`.
- [x] Add quest/shop history summaries from economy ledger rows.
- [x] Add teacher/admin trace view that combines reward, inventory, and battle summaries.
- [x] Add engagement analytics by student and game module.

Phase 7 follow-up completion notes:

- Added `createEconomyLedgerHistorySummary` for quest/shop economy rows.
- Added `gameHistory` and `gameHistoryAnalytics` to the economy ledger route.
- Added `byStudent` to `GameHistoryAnalytics`.
- Migrated `BattleHistoryPanel` to prefer the V2 `gameHistory` response while preserving legacy fallback.

## Phase 8: Remove Legacy

เป้าหมาย:

- ลบระบบเก่าที่ไม่จำเป็นหลัง production QA ผ่าน

ต้องทำ:

- remove unreachable battle branches
- remove old component coupling
- delete legacy routes ที่ไม่มี rollback need แล้ว
- update docs, tests, and release checklist

exit criteria:

- ไม่มี mixed old/new battle flow ในไฟล์เดียว
- production deploy risk ลดลงชัดเจน

Status: completed on 2026-05-23 as legacy isolation foundation.

Phase 8 completion checklist:

- [x] Confirmed Lite Battle remains the default production path through `isNegamonLiteBattleEnabled`.
- [x] Kept legacy `/api/classrooms/[id]/battle` rollback paths intact because reward/finalization tests still cover them.
- [x] Removed the unused legacy replay placeholder from `BattleArena.tsx`.
- [x] Renamed the old interactive fallback component to `LegacyInteractiveBattle` so the remaining legacy UI boundary is explicit.
- [x] Verified battle reward, read auth, lite session, and feature flag tests still pass after isolation.

Phase 8 implementation notes:

- This phase intentionally does not delete the legacy battle route yet; it is still the rollback target when the lite battle flag is disabled.
- The remaining old/new mixing is now easier to see: `LegacyInteractiveBattle` is the fallback UI and `/api/classrooms/[id]/battle` is the fallback server path.
- Full removal should happen only after production QA confirms no rollback need for the old interactive server battle.

Phase 8 remaining removal checklist:

- [x] Move `LegacyInteractiveBattle` into a dedicated `components/negamon/legacy/` file.
- [ ] Move old interactive server route logic out of the shared `/battle` route or delete it after rollback is retired.
- [ ] Remove `battle-engine.ts` UI dependencies once Lite Battle owns all student battle flows.
- [ ] Delete legacy battle reward tests only after equivalent V2 reward coverage exists.
- [ ] Remove `NEXT_PUBLIC_NEGAMON_LITE_BATTLE_ENABLED=false` rollback path after production sign-off.

Phase 8 remaining removal notes:

- Moved the legacy interactive fallback UI to `src/components/negamon/legacy/LegacyInteractiveBattle.tsx`.
- `BattleArena.tsx` now keeps only the V2 Lite Battle path plus an explicit import for rollback UI.
- The legacy server route and rollback flag are intentionally still present until production sign-off.

## System Workstreams

### Economy and Gold

focus:

- single source of truth for gold
- reward finalization once only
- battle, quest, and shop use same ledger rules

deliverables:

- reward contract กลาง
- idempotency helper กลาง
- economy mutation tests

### Shop and Inventory

focus:

- buy, equip, consume, reward item grant ใช้ mutation pipeline เดียว
- clear ownership and stack rules

deliverables:

- inventory delta helper
- shop purchase contract
- consume-on-battle-finalize rules

### Quest System

focus:

- quest progress ไม่คำนวณซ้ำหลายที่
- claim reward contract ชัด

deliverables:

- quest progress evaluator
- quest claim route contract
- daily reset rules

### Monster System

focus:

- monster snapshot สำหรับ UI
- progression and unlocked moves แยกจาก UI

deliverables:

- monster summary model
- monster battle snapshot model
- evolution and rank progression rules

### Battle System

focus:

- deterministic turn resolution
- session serialization ที่ build-safe
- finalization and anti-duplication

deliverables:

- battle core module
- session read/start/choice/finalize flow
- replay/history summary

### History and Replay

focus:

- player-readable history
- support debugging and audits

deliverables:

- game history summary records
- battle summary serializer
- reward event timeline

## Validation Strategy

Global validation:

```powershell
npm.cmd run lint
npm.cmd run check:i18n:strict
npm.cmd run predev
npm.cmd run build
```

Game validation:

```powershell
npm.cmd run check:negamon-battle
npm.cmd run check:student-dashboard
npm.cmd run check:classroom-core
npm.cmd run test:negamon-reward-audit
```

New expectation for every game-system refactor:

- อย่ายืนยันว่า deploy-safe ถ้ายังไม่ได้รัน `npm.cmd run build`
- targeted tests ใช้ยืนยัน regression เฉพาะทาง
- `build` ใช้ยืนยัน production gate

## Risks

- แยกโครงสร้างเร็วเกินไปโดยไม่ทำ adapter layer จะทำให้ dashboard พังหลายจุด
- legacy battle ยังต้องอยู่ช่วงหนึ่งเพื่อ rollback
- economy and reward เป็น data-sensitive area ถ้าขยับพร้อม battle และ shop จะเสี่ยงสูง
- ถ้าไม่ทำ contracts กลางก่อน จะย้าย UI แล้วปัญหาจะย้ายที่แทนที่จะหาย

## First Implementation Slice

งานชิ้นแรกที่ควรเริ่มทันที:

1. สร้าง `game-core` contracts
2. แยก `game shell` ออกจาก `StudentDashboardClient`
3. แยก Negamon legacy path ออกจาก lite path ให้ชัด
4. เพิ่ม `build` เป็น required validation ในเอกสารและ workflow ของ game systems

## Success Criteria

- หน้าเกมพัฒนาได้โดยไม่ต้องแก้ dashboard shell ทุกครั้ง
- battle, quest, shop ใช้ reward/economy contracts ร่วมกัน
- game state หลักไม่ถูกเก็บแบบ JSON shape ที่เปราะบางโดยไม่มี adapter
- build pipeline จับปัญหาได้ก่อน push
- legacy กับ v2 อยู่ร่วมกันแบบมี boundary ชัดเจน
