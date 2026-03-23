# Design Document

## Overview

The Battle RPG System extends the existing `BattleTurnEngine` skeleton and `IdleEngine` into a full-featured turn-based battle experience. It introduces three interconnected subsystems: a real-time Co-op Boss Raid + Solo Farming battle engine, a 60-item equipment system with enhancement and crafting, and a 25-path job class progression system. All systems are driven by student academic performance via the existing question-answer loop.

---

## Architecture

### Extending the Game Engine

```
AbstractGameEngine
  └── BattleTurnEngine (refactored)
        ├── Phase: LOBBY → PREP → CO_OP_BOSS_RAID → SOLO_FARMING → RESULT
        ├── BossRaidManager
        ├── SoloFarmingManager
        └── RewardManager
```

### Stat Calculation Pipeline

Stats are computed in this strict order, encapsulated in `src/lib/game/stat-calculator.ts`:

1. `IdleEngine.calculateCharacterStats(points, equippedItems, level)` — base stats from behavior points + equipment
2. `JobClassMultiplier.apply(stats, jobClass, jobTier)` — multiply primary stats by job class coefficients
3. `SetBonusCalculator.apply(stats, equippedItems)` — apply 2-piece and 4-piece set bonuses
4. `SpecialEffectCalculator.apply(stats, equippedItems)` — apply RARE/EPIC/LEGENDARY special effects

---

## Data Models

### Student (extend existing)

```prisma
jobClass      String?
jobTier       String?   @default("BASE")
advanceClass  String?
jobSkills     Json?
jobSelectedAt DateTime?
```

### Item (extend existing)

```prisma
tier         String  @default("COMMON")
slot         String?
setId        String?
effects      Json?
xpMultiplier Float?  @default(0)
```

### StudentItem (extend existing)

```prisma
spd  Int   @default(0)
crit Float @default(0)
luck Float @default(0)
mag  Int   @default(0)
mp   Int   @default(0)
```

### Material (new model)

```prisma
model Material {
  id        String  @id @default(auto()) @map("_id") @db.ObjectId
  studentId String  @db.ObjectId
  student   Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  type      String
  quantity  Int     @default(1)
  @@unique([studentId, type])
}
```

---

## Battle Engine Design

### Phase State Machine

```typescript
type BattlePhase = "LOBBY" | "PREP" | "CO_OP_BOSS_RAID" | "SOLO_FARMING" | "RESULT";
```

Phase transitions:
- LOBBY → PREP: teacher emits `start-battle`
- PREP → CO_OP_BOSS_RAID: all player stats loaded from DB via StatCalculator
- CO_OP_BOSS_RAID → SOLO_FARMING: boss HP reaches 0
- SOLO_FARMING → RESULT: phase timer expires (default 5 min)
- RESULT → end: rewards persisted, `battle-ended` emitted

### BattlePlayer Type (extended)

```typescript
interface BattlePlayer extends BasePlayer {
  hp: number; maxHp: number;
  ap: number; maxAp: number;       // maxAp = 100
  mp: number; maxMp: number;
  atk: number; def: number; spd: number;
  crit: number; luck: number; mag: number;
  level: number;
  skills: string[];
  isDefending: boolean;
  jobClass: string | null;
  jobTier: string;
  wave: number;
  soloMonster: SoloMonster | null;
  immortalUsed: boolean;
  earnedGold: number;
  earnedXp: number;
  itemDrops: string[];
  materialDrops: MaterialDrop[];
}
```

### Boss State

```typescript
interface BossState {
  id: string; name: string;
  hp: number; maxHp: number;       // baseBossHp + (playerCount x perPlayerHpBonus)
  atk: number;
  lastAttackTick: number;
  attackIntervalMs: number;        // default 15000ms
}
```

Boss attack tick runs every 15 seconds via `setInterval`. On each tick:
1. For each player where `isDefending === false`, deal `max(1, boss.atk - player.def)` damage
2. Emit `player-damaged` to each affected socket
3. Reset all `isDefending` to `false`
4. Emit `boss-damaged` to room

### Solo Monster

```typescript
interface SoloMonster {
  name: string;
  hp: number; maxHp: number;       // baseHp x (1 + wave x 0.15)
  atk: number;                     // baseAtk x (1 + wave x 0.10)
  wave: number;
}
```

On correct answer → auto-deal `player.atk` damage to `player.soloMonster`.
On monster death → roll loot table by wave tier, emit `monster-defeated`, spawn next wave.

---

## Socket Event Contract

### Client to Server

| Event | Payload |
|---|---|
| `start-battle` | `{ classroomId: string }` |
| `battle-action` | `{ type: "ATTACK" or "DEFEND" or "SKILL", skillId?: string, targetId: string }` |
| `farming-action` | `{ type: "SKILL", skillId: string }` |
| `submit-answer` | `{ questionId: string, answerIndex: number }` |

### Server to Client

| Event | Payload |
|---|---|
| `battle-state` | `{ phase, players: BattlePlayer[], boss: BossState }` |
| `player-damaged` | `{ playerId, damage, remainingHp }` |
| `boss-damaged` | `{ currentHp, maxHp, lastAttackerId }` |
| `boss-defeated` | `{ rewards: RewardSummary[] }` |
| `farming-state` | `{ wave, monster: SoloMonster, ap, mp }` |
| `monster-defeated` | `{ loot: LootPayload, nextWave: number }` |
| `next-wave` | `{ wave, monster: SoloMonster }` |
| `battle-ended` | `{ players: FinalReward[], error?: boolean }` |
| `error` | `{ message: string }` |

---

## Item System Design

### Item Catalog (60 items)

| Slot | Count | Primary Stats |
|---|---|---|
| WEAPON | 12 | baseAtk, baseCrit, bossDamageMultiplier |
| BODY | 10 | baseDef, baseHp, goldMultiplier |
| HEAD | 8 | baseDef, baseHp, baseMag |
| OFFHAND | 8 | baseDef, baseMag, baseMp |
| GLOVES | 8 | baseAtk, baseSpd, baseCrit |
| BOOTS | 8 | baseSpd, baseCrit, baseLuck |
| ACCESSORY | 6 | goldMultiplier, baseLuck, xpMultiplier |

Tier distribution per slot: ~40% COMMON, 30% RARE, 20% EPIC, 10% LEGENDARY.
Enhancement stat bonus formula: `itemBaseStat x (1 + enhancementLevel x 0.1)`

### Enhancement Zones

| Zone | Range | Success Rate | On Fail | Cost |
|---|---|---|---|---|
| Safe | +0 to +5 | 100% | none | Gold only |
| Risk | +6 to +10 | 70% to 30% linear | No change | Gold + Behavior Points |
| Danger | +11 to +15 | 20% to 5% linear | Level -1 | Gold + BP + Materials |

### Crafting Recipes

| Target Tier | Material | Quantity |
|---|---|---|
| COMMON | Stone Fragment / Wolf Fang / Iron Ore / Forest Herb | 3 |
| RARE | Dragon Scale / Shadow Essence / Thunder Crystal / Void Shard | 3 |
| EPIC | Phoenix Feather / Abyssal Core / Celestial Dust | 3 |
| LEGENDARY | Ancient Relic | 5 |

### Set Bonuses

| Set | 2-Piece | 4-Piece or Full |
|---|---|---|
| Dragon | ATK+15%, DEF+15% | bossDamageMultiplier+30%, HP+500 |
| Thunder | SPD+20%, CRIT+8% | Chain Lightning on CRIT |
| Shadow | LUCK+10%, goldMultiplier+20% | 15% dodge, steal gold+50% |
| Legendary | none | All Stats+25%, XP x1.5, "Chosen One" title (7-piece) |

---

## Job Class System Design

### Progression Tree

```
Novice (Lv 1-4)
  WARRIOR (Lv 5) -> KNIGHT (Lv 20) -> PALADIN / GUARDIAN (Lv 50)
                 -> BERSERKER (Lv 20) -> WARLORD / DEATH KNIGHT (Lv 50)
  MAGE (Lv 5)    -> ARCHMAGE (Lv 20) -> GRAND WIZARD / ELEMENTALIST (Lv 50)
                 -> WARLOCK (Lv 20) -> LICH / SHADOW MAGE (Lv 50)
  RANGER (Lv 5)  -> SNIPER (Lv 20) -> HAWKEYE / DEADEYE (Lv 50)
                 -> BEASTMASTER (Lv 20) -> BEAST KING / TAMER (Lv 50)
  HEALER (Lv 5)  -> SAINT (Lv 20) -> ARCHBISHOP / DIVINE HERALD (Lv 50)
                 -> DRUID (Lv 20) -> ELDER DRUID / NATURE WARDEN (Lv 50)
  ROGUE (Lv 5)   -> ASSASSIN (Lv 20) -> SHADOW LORD / PHANTOM (Lv 50)
                 -> DUELIST (Lv 20) -> BLADE MASTER / SWORD SAINT (Lv 50)
```

### Base Class Stat Multipliers

| Class | HP | ATK | DEF | SPD | MAG | MP | CRIT |
|---|---|---|---|---|---|---|---|
| WARRIOR | x1.4 | x1.3 | x1.2 | x0.9 | x1.0 | x1.0 | x1.0 |
| MAGE | x0.8 | x0.8 | x0.9 | x1.0 | x1.8 | x1.5 | x1.0 |
| RANGER | x1.0 | x1.1 | x1.0 | x1.3 | x1.0 | x1.0 | x1.3 |
| HEALER | x1.2 | x0.7 | x1.1 | x1.0 | x1.6 | x1.3 | x1.0 |
| ROGUE | x0.9 | x1.2 | x0.9 | x1.4 | x1.0 | x1.0 | x1.5 |

ADVANCE and MASTER tiers apply an additional x1.2 on top of base class primary stats.

### Skills Per Class

WARRIOR: Slash (Lv5, 10AP), Shield Wall (Lv8, 15AP), War Cry (Lv12, 20AP), Whirlwind (Lv16, 25AP), Devastate (Lv20, 30AP), Heroic Strike (Lv25, 35AP)
Passives: Iron Body (+10% DEF), Battle Hardened (+5% HP), Weapon Mastery (+5% ATK)

MAGE: Fireball (Lv5, 15MP), Blizzard (Lv8, 20MP), Thunder (Lv12, 25MP), Mana Surge (Lv16, 30MP), Meteor (Lv20, 40MP), Arcane Nova (Lv25, 50MP)
Passives: Arcane Mind (+10% MAG), Mana Well (+15% MP), Spell Focus (+3% CRIT)

RANGER: Arrow Shot (Lv5, 10AP), Poison Arrow (Lv8, 15AP), Wind Shot (Lv12, 20AP), Eagle Eye (Lv16, 25AP), Barrage (Lv20, 30AP), Snipe (Lv25, 40AP)
Passives: Keen Eye (+8% CRIT), Swift Feet (+5% SPD), Hunter's Mark (+5% ATK)

HEALER: Cure (Lv5, 15MP), Barrier (Lv8, 20MP), Regenerate (Lv12, 25MP), Holy Light (Lv16, 30MP), Resurrection (Lv20, 50MP), Divine Intervention (Lv25, 60MP)
Passives: Holy Aura (+10% MAG), Blessed (+8% HP), Mana Blessing (+10% MP)

ROGUE: Backstab (Lv5, 10AP), Dodge (Lv8, 15AP), Poison Blade (Lv12, 20AP), Shadow Step (Lv16, 25AP), Execution (Lv20, 30AP), Death Mark (Lv25, 40AP)
Passives: Shadow Veil (+10% CRIT), Nimble (+8% SPD), Predator (+5% ATK)

### PvP Matchup Table

| Attacker | Defender | Multiplier |
|---|---|---|
| WARRIOR | HEALER | x1.2 |
| MAGE | WARRIOR | x1.2 |
| ROGUE | MAGE | x1.2 |
| RANGER | HEALER | x1.2 |
| HEALER | ROGUE | x1.2 |

---

## API Routes

### New Routes

| Method | Path | Description |
|---|---|---|
| POST | `/api/battle/[pin]/action` | Submit battle action |
| POST | `/api/battle/[pin]/farming-action` | Submit farming skill |
| GET | `/api/student/[id]/job` | Get job class info |
| POST | `/api/student/[id]/job/select` | Select base job class |
| POST | `/api/student/[id]/job/advance` | Select advance or master class |
| GET | `/api/student/[id]/materials` | Get material inventory |
| POST | `/api/student/[id]/craft` | Craft item from materials |
| POST | `/api/student/[id]/enhance` | Enhance a StudentItem |

### Existing Routes to Extend

- `GET /api/student/inventory` — include materials and job class in response
- `POST /api/student/inventory/equip` — trigger full StatCalculator pipeline

---

## UI Components

| Component | Path | Purpose |
|---|---|---|
| BattleArena | `src/app/game/battle/[pin]/page.tsx` | Main battle screen |
| BossRaidView | `src/components/battle/BossRaidView.tsx` | Boss HP bar, AP bars, action buttons |
| SoloFarmingView | `src/components/battle/SoloFarmingView.tsx` | Monster HP, wave counter |
| ResultScreen | `src/components/battle/ResultScreen.tsx` | Post-battle rewards |
| JobSelectionModal | `src/components/rpg/JobSelectionModal.tsx` | Job class picker |
| JobClassCard | `src/components/rpg/JobClassCard.tsx` | Job stats and skills display |
| EnhancementModal | `src/components/rpg/EnhancementModal.tsx` | Enhancement UI with zone indicator |
| CraftingModal | `src/components/rpg/CraftingModal.tsx` | Material inventory and recipes |
| EquipmentSlots | `src/components/rpg/EquipmentSlots.tsx` | 7-slot equipment grid |
| MaterialInventory | `src/components/rpg/MaterialInventory.tsx` | 12 material types with quantities |

---

## Property-Based Testing

- P1: Stat Calculator Confluence — same CharacterStats regardless of item evaluation order
- P2: Enhancement Bounds — enhancementLevel always in [0, tierMax]
- P3: Crafting Round-Trip — serialize/deserialize recipe produces equivalent object
- P4: Boss HP Monotonicity — boss HP never increases from player actions
- P5: Wave Isolation — player A wave changes never affect player B wave
- P6: Reward Atomicity — all or nothing per-student reward persistence
- P7: AP Cap — player.ap always in [0, player.maxAp] after any action
- P8: Job Multiplier Positivity — all stats remain strictly positive after job multipliers
