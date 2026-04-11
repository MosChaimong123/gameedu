# Implementation Tasks

## Task List

- [x] 1. Database Schema & Core Types
  - [x] 1.1 Add `jobClass`, `jobTier`, `advanceClass`, `jobSkills`, `jobSelectedAt` fields to Student model in `prisma/schema.prisma`
  - [x] 1.2 Add `tier`, `slot`, `setId`, `effects`, `xpMultiplier` fields to Item model in `prisma/schema.prisma`
  - [x] 1.3 Add `spd`, `crit`, `luck`, `mag`, `mp` fields to StudentItem model in `prisma/schema.prisma`
  - [x] 1.4 Add new `Material` model with `studentId`, `type`, `quantity` fields and cascade delete relation to Student
  - [x] 1.5 Run `prisma generate` to update the Prisma client
  - [x] 1.6 Extend `BattlePlayer` interface in `src/lib/types/game.ts` with `mp`, `maxMp`, `atk`, `def`, `spd`, `crit`, `luck`, `mag`, `jobClass`, `jobTier`, `wave`, `soloMonster`, `immortalUsed`, `earnedGold`, `earnedXp`, `itemDrops`, `materialDrops`
  - [x] 1.7 Add `SoloMonster`, `BossState`, `LootPayload`, `MaterialDrop`, `FinalReward` interfaces to `src/lib/types/game.ts`
  - [x] 1.8 Add `BattlePhase` type and update `BattleTurnSession` to use it in `src/lib/types/game.ts`

- [x] 2. Stat Calculator
  - [x] 2.1 Create `src/lib/game/stat-calculator.ts` with `StatCalculator` class
  - [x] 2.2 Implement `StatCalculator.compute(points, equippedItems, level, jobClass, jobTier)` that runs the full 4-step pipeline
  - [x] 2.3 Implement `applyJobMultipliers(stats, jobClass, jobTier)` using the multiplier table from design.md
  - [x] 2.4 Implement `applySetBonuses(stats, equippedItems)` for Dragon, Thunder, Shadow, and Legendary sets
  - [x] 2.5 Implement `applySpecialEffects(stats, equippedItems)` for RARE/EPIC/LEGENDARY item effects
  - [x] 2.6 Write property-based tests for P1 (confluence), P7 (AP cap), P8 (job multiplier positivity) using fast-check or vitest

- [x] 3. Job Class System
  - [x] 3.1 Create `src/lib/game/job-system.ts` with job class definitions, skill unlock tables, and passive definitions for all 5 base classes
  - [x] 3.2 Create `src/lib/game/job-constants.ts` with all 25 job paths, advance class options, and master class options
  - [x] 3.3 Create API route `POST /api/student/[id]/job/select` — validates level ≥ 5, jobClass is null, sets jobClass + jobTier + jobSelectedAt + initial jobSkills
  - [x] 3.4 Create API route `POST /api/student/[id]/job/advance` — validates level ≥ 20 (ADVANCE) or ≥ 50 (MASTER), sets advanceClass + jobTier, appends new skills to jobSkills
  - [x] 3.5 Create API route `GET /api/student/[id]/job` — returns jobClass, jobTier, advanceClass, jobSkills with full skill definitions
  - [x] 3.6 Add level-up skill unlock check to the XP gain flow in `IdleEngine.calculateXpGain` — when level increases, check skill unlock thresholds and update jobSkills

- [x] 4. Item Catalog & Seeding
  - [x] 4.1 Update `prisma/seed-items.ts` to seed all 60 items with correct tier, slot, setId, effects, and stat values per the design
  - [x] 4.2 Seed 4 set definitions: Dragon Set (WEAPON+BODY+HEAD+GLOVES), Thunder Set (WEAPON+GLOVES+BOOTS+ACCESSORY), Shadow Set (BODY+OFFHAND+BOOTS+ACCESSORY), Legendary Set (all 7 slots)
  - [x] 4.3 Verify item distribution: 12 WEAPON, 10 BODY, 8 HEAD, 8 OFFHAND, 8 GLOVES, 8 BOOTS, 6 ACCESSORY

- [x] 5. Enhancement System
  - [x] 5.1 Create `src/lib/game/enhancement-system.ts` with zone detection, success rate calculation, and cost calculation functions
  - [x] 5.2 Update `POST /api/student/inventory/enhance/route.ts` to use the new enhancement system with Safe/Risk/Danger zone logic
  - [x] 5.3 Implement Danger Zone failure (level -1) and Risk Zone failure (no change) in the enhance route
  - [x] 5.4 Add tier max enforcement: COMMON ≤ +9, RARE ≤ +12, EPIC/LEGENDARY ≤ +15
  - [x] 5.5 Write property-based tests for P2 (enhancement bounds) — for all valid inputs, enhancementLevel stays in [0, tierMax]

- [x] 6. Crafting System
  - [x] 6.1 Create `src/lib/game/crafting-system.ts` with recipe definitions for all 4 tiers and material type mappings
  - [x] 6.2 Create API route `GET /api/student/[id]/materials` — returns all Material records for the student
  - [x] 6.3 Create API route `POST /api/student/[id]/craft` — validates materials, runs atomic transaction to deduct materials and create StudentItem
  - [x] 6.4 Write property-based tests for P3 (crafting round-trip) — serialize/deserialize recipe produces equivalent object

- [x] 7. Battle Engine Refactor
  - [x] 7.1 Refactor `src/lib/game-engine/battle-turn-engine.ts` to replace `turnPhase` with `battlePhase: BattlePhase`
  - [x] 7.2 Implement PREP phase: load each player's full CharacterStats from DB using `StatCalculator.compute`, populate BattlePlayer fields
  - [x] 7.3 Implement CO_OP_BOSS_RAID phase: spawn boss with `baseBossHp + (playerCount × perPlayerHpBonus)`, start 15-second attack tick interval
  - [x] 7.4 Implement boss attack tick: deal damage to non-defending players, emit `player-damaged`, reset `isDefending`, emit `boss-damaged`
  - [x] 7.5 Implement `battle-action` handler for ATTACK (10 AP cost, deal ATK damage to boss), DEFEND (set isDefending), SKILL (validate jobSkills, execute effect)
  - [x] 7.6 Implement boss defeat: clear tick interval, emit `boss-defeated`, transition to SOLO_FARMING
  - [x] 7.7 Implement SOLO_FARMING phase: assign each player a SoloMonster scaled to their level and wave 1
  - [x] 7.8 Implement correct-answer handler in SOLO_FARMING: auto-deal player.atk to soloMonster, check for monster death
  - [x] 7.9 Implement monster defeat: roll loot table by wave tier, emit `monster-defeated`, spawn next wave monster
  - [x] 7.10 Implement wave scaling: `baseHp × (1 + wave × 0.15)`, `baseAtk × (1 + wave × 0.10)`
  - [x] 7.11 Implement SOLO_FARMING phase timer (configurable, default 5 minutes), transition to RESULT on expiry
  - [x] 7.12 Write property-based tests for P4 (boss HP monotonicity) and P5 (wave isolation)

- [x] 8. Special Item Effects in Battle
  - [x] 8.1 Implement Lifesteal effect: on DAMAGE battle-event, heal player by 10% of damage if they have Lifesteal equipped
  - [x] 8.2 Implement Immortal effect: intercept HP reaching 0, set to 1, set `immortalUsed = true`, disable for remainder of session
  - [x] 8.3 Implement Mana Flow effect: on correct answer, increment player.mp by 5 if they have Mana Flow equipped
  - [x] 8.4 Implement Time Warp effect: reduce boss attack tick interval by 3000ms for players with Time Warp equipped

- [x] 9. Reward Persistence
  - [x] 9.1 Implement `RewardManager` in the battle engine: on RESULT phase, calculate XP gain using `IdleEngine.calculateXpGain` for each player
  - [x] 9.2 Implement atomic per-student reward transaction: update gold, XP/level, create StudentItem records, upsert Material records
  - [x] 9.3 Implement retry logic: retry failed transactions up to 3 times before emitting `battle-ended` with `error: true`
  - [x] 9.4 Emit `battle-ended` with full reward summary after all players' rewards are persisted
  - [x] 9.5 Write property-based tests for P6 (reward atomicity) — mock DB failures and verify no partial writes

- [x] 10. PvP Balance
  - [x] 10.1 Extend `StudentBattle` resolution logic to apply PvP matchup multipliers (×1.2) based on attacker/defender job class
  - [x] 10.2 Implement PvP skill effects: Shield Wall (50% damage reduction for 2 turns), Meteor (MAG × 3.0), Backstab+Execution combo (×2.5 on target <30% HP)
  - [x] 10.3 Implement RANGER CRIT bonus in PvP: deal 150% base attack on crit trigger
  - [x] 10.4 Implement HEALER MP drain win condition: prevent skill use when opponent MP reaches 0

- [x] 11. UI — Battle Arena
  - [x] 11.1 Create `src/app/game/battle/[pin]/page.tsx` as the main battle screen with phase-based rendering
  - [x] 11.2 Create `src/components/battle/BossRaidView.tsx` with boss HP bar, all players' HP/AP bars, and ATTACK/DEFEND/SKILL action buttons
  - [x] 11.3 Create `src/components/battle/SoloFarmingView.tsx` with monster HP bar, wave counter, and auto-attack feed
  - [x] 11.4 Create `src/components/battle/ResultScreen.tsx` displaying gold earned, XP earned, level-ups, and item drops per player

- [x] 12. UI — RPG Character Panel
  - [x] 12.1 Create `src/components/rpg/JobSelectionModal.tsx` for job class selection at Lv5, advance at Lv20, master at Lv50
  - [x] 12.2 Create `src/components/rpg/JobClassCard.tsx` displaying job stats, skill list with unlock levels, and passive bonuses
  - [x] 12.3 Create `src/components/rpg/EquipmentSlots.tsx` with 7-slot grid, equipped item display, and set bonus indicator
  - [x] 12.4 Create `src/components/rpg/EnhancementModal.tsx` with zone indicator (Safe/Risk/Danger), success rate display, and cost breakdown
  - [x] 12.5 Create `src/components/rpg/CraftingModal.tsx` with material inventory grid and crafting recipe list
  - [x] 12.6 Create `src/components/rpg/MaterialInventory.tsx` showing all 12 material types with current quantities
