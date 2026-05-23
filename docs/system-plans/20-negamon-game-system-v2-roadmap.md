# System Plan 20: Negamon Game System V2 Roadmap

Last updated: 2026-05-23

## Goal

เปลี่ยน Negamon จากระบบเกมที่ logic กระจายอยู่ใน UI, route, catalog เก่า และ battle engine เดิม ให้กลายเป็น Game System V2 ที่แยก domain ชัดเจน:

- character and monster progression
- skill catalog and unlock rules
- battle engine and battle session
- item catalog and inventory effects
- economy, reward, quest, and shop contracts
- history, replay, and analytics

Plan 19 ทำ foundation แล้ว แผนนี้คือแผนพัฒนาระบบ Negamon ใหม่ต่อจาก foundation นั้น

## Current Foundation

งานที่มีแล้วจาก Plan 19:

- `src/lib/game-core/*` สำหรับ contract กลาง
- `src/lib/game-negamon/*` สำหรับ Negamon V2 namespace
- `src/lib/game-quests/*` สำหรับ quest contract
- `src/lib/game-shop/*` สำหรับ shop contract
- `src/components/game/shell/*` สำหรับ game shell
- `src/components/negamon/NegamonLiteBattleArena.tsx` สำหรับ battle UI ใหม่
- `src/app/api/classrooms/[id]/battle/lite/*` สำหรับ Lite Battle session flow

หลักการจากจุดนี้:

- ของใหม่ต้องเพิ่มใน `game-core`, `game-negamon`, `game-quests`, `game-shop`
- ห้ามเพิ่ม game logic ใหม่เข้า `StudentDashboardClient`
- ห้ามให้ React component คำนวณ stat, skill unlock, reward, item effect เอง
- route ต้องเป็น adapter รับ request แล้วเรียก server/core module

## Target Player Loop

ลูปเกมที่ต้องการ:

1. นักเรียนทำกิจกรรมในห้องเรียน
2. ได้ gold, exp, item, quest progress
3. monster เติบโต: level, rank, evolution, skill unlock
4. นักเรียนจัด skill loadout และ item loadout
5. เข้า battle ด้วย snapshot ที่ server สร้าง
6. battle resolve ด้วย engine V2
7. reward finalize ครั้งเดียว
8. history แสดงผลอ่านง่าย และครู trace reward ได้

## Target Data Model

### Character / Monster

Monster V2 ต้องมี snapshot กลางที่ UI, battle, reward, history ใช้ร่วมกัน:

```ts
type NegamonMonsterSnapshot = {
  studentId: string;
  monsterId: string;
  speciesId: string;
  displayName: string;
  formName: string;
  formIcon: string;
  elementTypes: string[];
  level: number;
  exp: number;
  expToNextLevel: number;
  rankIndex: number;
  evolutionStage: number;
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    spd: number;
    energy: number;
  };
  derivedStats: {
    maxHp: number;
    atk: number;
    def: number;
    spd: number;
    maxEnergy: number;
    energyRegen: number;
  };
  abilityId?: string;
  unlockedSkillIds: string[];
  equippedSkillIds: string[];
  equippedItemIds: string[];
};
```

ต้องเพิ่ม:

- species catalog
- growth curve
- stat formula
- level and exp rules
- rank and evolution rules
- skill unlock rules
- snapshot builder จาก student/classroom state

### Skill

Skill V2 ต้องเป็น catalog กลาง ไม่อยู่ใน battle UI:

```ts
type NegamonSkillDefinition = {
  id: string;
  name: string;
  description: string;
  elementType: string;
  category: "attack" | "heal" | "buff" | "debuff" | "status" | "special";
  target: "self" | "enemy" | "allEnemies" | "allAllies";
  power: number;
  accuracy: number;
  energyCost: number;
  cooldownTurns: number;
  priority: number;
  effects: NegamonSkillEffect[];
  unlock: {
    level?: number;
    rankIndex?: number;
    speciesId?: string;
    itemId?: string;
  };
};
```

Skill effect ที่ต้องรองรับ:

- direct damage
- heal
- shield
- burn
- poison
- stun/paralyze
- sleep/freeze/confuse
- atk/def/spd buff
- atk/def/spd debuff
- energy drain
- energy regen
- critical bonus
- ignore defense

### Battle State

Battle V2 ต้อง serializable และ deterministic:

```ts
type NegamonBattleStateV2 = {
  sessionId: string;
  status: "pending" | "active" | "finished";
  turnNumber: number;
  activeActorId: string;
  fighters: NegamonBattleFighterState[];
  fieldEffects: NegamonFieldEffect[];
  pendingChoiceRequestId?: string;
  validChoices: NegamonBattleChoice[];
  eventLog: NegamonBattleEvent[];
  final?: NegamonBattleFinalResult;
};
```

ต้องรองรับ:

- turn order จาก speed
- energy cost and regen
- cooldown
- status tick
- damage formula
- type advantage
- critical hit
- miss/accuracy
- item effect
- surrender/timeout ในอนาคต
- reward finalize once

### Item

Item V2 ต้องใช้ catalog กลางและ effect กลาง:

```ts
type GameItemDefinition = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  itemType: "consumable" | "battle" | "equipment" | "material" | "cosmetic";
  priceGold?: number;
  sellGold?: number;
  stackable: boolean;
  maxStack?: number;
  allowedInBattle: boolean;
  effects: GameItemEffect[];
  requirements?: {
    level?: number;
    rankIndex?: number;
    speciesId?: string;
  };
};
```

Item effect ที่ต้องรองรับ:

- restore hp
- restore energy
- add shield
- cure status
- increase stat for battle
- increase exp
- unlock skill
- evolve material
- cosmetic unlock

## Proposed Folder Direction

```text
src/lib/game-negamon/
  core/
    species.ts
    monster-growth.ts
    monster-snapshot.ts
    skills.ts
    skill-unlock.ts
    status-effects.ts
    battle-state.ts
    battle-engine-v2.ts
    battle-rewards.ts
    battle-items.ts
    type-chart.ts
  server/
    monster-profile.ts
    skill-loadout.ts
    battle-v2.ts
  tests/

src/components/game/negamon/
  MonsterProfilePanel.tsx
  SkillLoadoutPanel.tsx
  BattleV2Arena.tsx
  InventoryItemPanel.tsx
```

## Development Phases

## Phase 9: Character and Monster Contracts

Goal:

- สร้าง monster snapshot กลางที่ทุกระบบใช้ร่วมกัน

Tasks:

- [x] Add `game-negamon/core/species.ts`
- [x] Add `game-negamon/core/monster-growth.ts`
- [x] Add `game-negamon/core/monster-snapshot.ts`
- [x] Define `NegamonMonsterSnapshot`
- [x] Map current `StudentMonsterState` into V2 snapshot
- [x] Add level, exp, rank, evolution helper functions
- [x] Add unit tests for stat growth and snapshot output

Exit criteria:

- battle, monster card, and skill UI can read the same monster snapshot
- no React component calculates monster stat growth directly

Status: completed on 2026-05-23 as character and monster contract foundation.

Phase 9 implementation notes:

- Added Negamon-specific species catalog helpers with default catalog precedence.
- Added growth helpers for rank, level, exp progress, evolution stage, and derived stats.
- Added `NegamonMonsterSnapshot` as the V2 monster shape for battle, skill, item, and profile consumers.
- Updated Negamon Lite battle session creation to build combatants from the V2 monster snapshot.
- Added coverage for snapshot creation, disabled move filtering, equipped skill validation, and legacy state conversion.

## Phase 10: Skill Catalog and Loadout V2

Goal:

- ย้ายสกิลทั้งหมดออกจาก battle logic เป็น catalog กลาง

Tasks:

- [x] Add `game-negamon/core/skills.ts`
- [x] Add `game-negamon/core/skill-unlock.ts`
- [x] Add `game-negamon/server/skill-loadout.ts`
- [x] Define skill categories, effects, energy cost, cooldown
- [x] Add unlock rules from level, rank, species, item
- [x] Add equipped skill validation
- [x] Add unit tests for skill unlock and loadout validation

Exit criteria:

- battle engine uses skill ids from catalog
- UI does not hardcode skill power, cost, or effects

Status: completed on 2026-05-23 as skill catalog and loadout foundation.

Phase 10 implementation notes:

- Added `NegamonSkillDefinition` and skill effect contracts.
- Added species skill catalog generation with basic attack support.
- Added unlock filtering by rank and disabled move ids.
- Added loadout validation with duplicate prevention, rejected ids, max slots, and fallback skills.
- Added server-side skill loadout planning for battle consumers.
- Updated Negamon monster snapshots to expose `skillCatalog`, `unlockedSkillIds`, and validated `equippedSkillIds`.
- Updated Negamon Lite battle combatant creation to use the server loadout plan instead of slicing raw unlocked moves.

## Phase 11: Battle Engine V2 Complete

Goal:

- ทำ battle engine ที่ใช้ snapshot + skill catalog + item effects

Tasks:

- [x] Add `game-negamon/core/battle-state.ts`
- [x] Add `game-negamon/core/battle-engine-v2.ts`
- [x] Add `game-negamon/core/status-effects.ts`
- [x] Add `game-negamon/core/type-chart.ts`
- [x] Add turn order, accuracy, damage, critical, status tick
- [x] Add energy regen and skill cooldown
- [x] Add battle event serializer
- [x] Add route adapter in `game-negamon/server/battle-v2.ts`
- [x] Add tests for deterministic battle resolution

Exit criteria:

- Lite Battle route no longer needs old battle-engine decisions
- battle result can be replayed from event log

Status: completed on 2026-05-23 as Battle Engine V2 core foundation.

Phase 11 implementation notes:

- Added `battle-state.ts` as the V2 battle state boundary and replay summary helper.
- Added `battle-engine-v2.ts` as the Negamon-owned deterministic battle engine adapter.
- Added type chart and status-effect mapping modules under `game-negamon/core`.
- Updated lite battle orchestration to call V2 engine helpers through `game-negamon/core`.
- Updated Lite combatant creation to map V2 skill definitions into battle moves.
- Added deterministic battle engine coverage for valid choices, damage preview, choice resolution, non-mutating advance, and replay summaries.

## Phase 12: Item Effects and Inventory V2

Goal:

- ให้ item มี effect จริงและใช้ร่วมกันใน shop, inventory, battle

Tasks:

- [x] Add item effect contract in `game-core/inventory.ts`
- [x] Add `game-negamon/core/battle-items.ts`
- [x] Move battle item effects out of UI/server ad hoc code
- [x] Validate item use before battle start
- [x] Consume battle items only when battle finalizes or by clear rule
- [x] Add tests for item effect application and inventory mutation

Exit criteria:

- shop buy, equip, battle consume, and reward item grant use the same inventory delta contract

Status: completed on 2026-05-23 as item effect and battle inventory foundation.

Phase 12 implementation notes:

- Added shared `GameItemDefinition`, item rarity/type, and `GameItemEffect` contracts in `game-core`.
- Added `createGameItemDefinition` and `createBattleItemConsumeChange` so battle item usage returns an inventory delta instead of mutating ad hoc state.
- Added `game-negamon/core/battle-items.ts` to map shop battle item effects into V2 item definitions.
- Updated battle loadout validation to delegate to the Negamon V2 battle item validator.
- Added loadout validation output that includes normalized item ids and the consume delta to apply at battle finalization.
- Added tests for battle item effect mapping, item definition creation, catalog generation, loadout category limits, and missing inventory rejection.

## Phase 13: Progression and Rewards

Goal:

- battle and quests can grant exp, gold, and items through one reward pipeline

Tasks:

- [x] Extend `GameRewardResult` with exp and item rewards
- [x] Add monster exp reward calculation
- [x] Add level-up result summary
- [x] Add skill unlock result summary
- [x] Add reward finalization audit entry
- [x] Add history entries for level up and skill unlock
- [x] Add tests for duplicate finalize prevention

Exit criteria:

- one battle cannot duplicate gold, exp, item, or level-up rewards

Status: completed on 2026-05-23 as progression and reward pipeline foundation.

Phase 13 implementation notes:

- Extended `GameRewardResult` with `exp`, `levelUps`, and `unlockedSkillIds` while keeping legacy `xp` compatibility.
- Added `level_up` and `skill_unlocked` history event kinds, plus `expDelta` in history summaries and analytics.
- Added `game-negamon/core/battle-rewards.ts` for battle exp calculation, progression summaries, inventory reward deltas, economy mutation planning, and reward audit events.
- Added idempotency-key based duplicate finalization blocking with `duplicate_finalize`.
- Added tests for battle exp calculation, level-up summaries, skill unlock summaries, full finalization plans, and duplicate finalize prevention.

## Phase 14: Negamon UI V2

Goal:

- สร้าง UI ที่อ่านข้อมูลจาก V2 contracts ไม่อ่าน raw legacy state

Tasks:

- [x] Add `components/game/negamon/MonsterProfilePanel.tsx`
- [x] Add `components/game/negamon/SkillLoadoutPanel.tsx`
- [x] Add `components/game/negamon/BattleV2Arena.tsx`
- [x] Add item effect view in shop/inventory
- [x] Add level-up and skill-unlock result modal
- [x] Add responsive checks for student dashboard

Exit criteria:

- student game tab uses V2 panels for monster, skill, battle, shop summary

Status: completed on 2026-05-23 as Negamon UI V2 foundation.

Phase 14 implementation notes:

- Added `MonsterProfilePanel` that renders from `NegamonMonsterSnapshot` instead of recalculating monster growth in the component.
- Added `SkillLoadoutPanel` that reads `skillCatalog` and `equippedSkillIds` from the V2 snapshot.
- Added `InventoryItemPanel` that shows battle item counts and V2 `GameItemEffect` details from the battle item catalog.
- Added `BattleV2Arena` wrapper under the new `components/game/negamon` namespace and switched the battle tab to use it.
- Added `RewardResultModal` for level-up and skill-unlock reward summaries from `GameRewardResult`.
- Updated the student monster tab to compose the V2 monster, skill, and inventory panels.

## Phase 15: Remove Negamon Legacy

Goal:

- ลบ fallback เก่าหลัง production sign-off

Tasks:

- [x] Remove `LegacyInteractiveBattle`
- [x] Remove old `/api/classrooms/[id]/battle` interactive fallback
- [x] Remove UI dependency on `src/lib/battle-engine.ts`
- [x] Remove `NEXT_PUBLIC_NEGAMON_LITE_BATTLE_ENABLED=false` rollback
- [x] Delete legacy reward tests only after V2 reward tests cover the same cases
- [x] Update docs and release checklist

Exit criteria:

- no mixed old/new battle flow remains
- production build and targeted game tests pass

Status: completed on 2026-05-23 as Negamon legacy removal foundation.

Phase 15 implementation notes:

- Removed the old interactive battle UI path and deleted legacy battle UI components.
- Updated `BattleTab` to always start battles through `/battle/lite/start`.
- Removed the Negamon Lite rollback feature flag and its tests.
- Updated `/api/classrooms/[id]/battle` so `beginInteractive`, `turnInteractive`, and `saveInteractive` return `NEGAMON_LEGACY_BATTLE_REMOVED`.
- Removed legacy interactive reward tests from the active reward ledger suite after V2 reward and lite session tests covered the replacement flow.
- Kept the non-interactive auto battle route for historical/admin compatibility while the student UI uses V2 lite battle.

## Priority Build Order

Recommended order from here:

1. Phase 9: Character and Monster Contracts
2. Phase 10: Skill Catalog and Loadout V2
3. Phase 11: Battle Engine V2 Complete
4. Phase 12: Item Effects and Inventory V2
5. Phase 13: Progression and Rewards
6. Phase 14: Negamon UI V2
7. Phase 15: Remove Negamon Legacy

Do not start Phase 11 before Phase 9 and Phase 10 are stable. Battle depends on monster snapshot and skill catalog.

## Validation Strategy

Targeted tests:

```powershell
npm.cmd test -- src/lib/game-core/__tests__/game-core.test.ts
npm.cmd test -- src/lib/game-negamon
npm.cmd test -- src/lib/game-quests src/lib/game-shop
npm.cmd test -- src/__tests__/negamon-lite-session-routes.test.ts
```

Production gate:

```powershell
npm.cmd run predev
npm.cmd run build
```

Required before deploy-safe:

- targeted tests for changed module pass
- `npm.cmd run build` passes
- docs checklist updated
- no `dist/`, local config, or unrelated work staged with game-system commits

## Risks

- If monster stats stay computed in UI, battle and profile pages will drift.
- If skill catalog is not centralized, balancing will be fragile.
- If item effects mutate inventory outside `game-core`, duplicate or lost items can happen.
- If reward finalization is not idempotent, battle rewards can duplicate.
- If legacy fallback is removed too early, production rollback becomes unsafe.

## First Implementation Slice

Start with Phase 9:

- create `NegamonMonsterSnapshot`
- create species and growth helpers
- map current classroom/student monster state into snapshot
- add tests for level, exp, stat growth, and unlocked skill ids

This gives every later phase a stable character source instead of letting battle, UI, and shop invent their own monster shape.
