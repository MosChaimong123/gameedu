# Requirements Document

## Introduction

The Battle RPG System is a comprehensive gamification feature for the GameEdu educational platform. It extends the existing RPG Idle Engine with three interconnected systems: a turn-based battle engine supporting co-op boss raids and solo monster farming, a deep item system with 60 items across 4 tiers with enhancement and crafting, and a job class progression system with 25 unique paths. All systems are driven by student academic performance — answering questions correctly earns the resources needed to fight, craft, and advance.

The system integrates with the existing `IdleEngine`, `BattleTurnEngine` skeleton, `Student` model (points, gameStats, stamina, mana, items), and the Socket.io real-time infrastructure already present in GameEdu.

---

## Glossary

- **Battle_Engine**: The server-side `BattleTurnEngine` class that manages all real-time battle state.
- **Battle_Session**: An active game session in `BATTLE_TURN` mode, identified by a PIN.
- **BattlePlayer**: A student participant in a Battle_Session, carrying their full RPG stats.
- **Boss**: A shared high-HP monster that all students in a Co-op Raid fight together.
- **Solo_Monster**: A private monster instance assigned to a single student during Solo Farming.
- **AP**: Action Points — the resource earned by answering questions correctly, spent to perform battle actions.
- **Wave**: A numbered progression tier in Solo Farming; each wave spawns a harder Solo_Monster.
- **Idle_Engine**: The existing `IdleEngine` class (`src/lib/game/idle-engine.ts`) that calculates character stats from behavior points and equipment.
- **CharacterStats**: The computed stat block (HP, ATK, DEF, SPD, CRIT, LUCK, MAG, MP) produced by `IdleEngine.calculateCharacterStats`.
- **Item**: A piece of equipment defined in the `Item` model with a tier, slot, and stat bonuses.
- **StudentItem**: A student's owned instance of an Item, with enhancement level and instance stats.
- **Material**: A crafting resource dropped by monsters, stored in the new `Material` model.
- **Enhancement**: The process of upgrading a StudentItem from +0 to +15 using gold, behavior points, and materials.
- **Set_Bonus**: A stat bonus activated when a student equips a defined number of items from the same set.
- **Job_Class**: A student's chosen RPG archetype (Warrior, Mage, Ranger, Healer, Rogue) that applies stat multipliers and unlocks skills.
- **Job_Tier**: The progression stage of a Job_Class: BASE (Lv.1–19), ADVANCE (Lv.20–49), or MASTER (Lv.50+).
- **Skill**: An active ability belonging to a Job_Class, costing AP or MP to use in battle.
- **Passive**: A permanent stat bonus or effect granted by a Job_Class without activation cost.
- **Result_Screen**: The post-battle UI phase where earned gold, XP, and items are displayed and persisted to the database.
- **Stat_Calculator**: The extended `IdleEngine.calculateCharacterStats` function that incorporates Job_Class multipliers, Set_Bonuses, and special effects.
- **Crafting_System**: The server-side logic that consumes Materials to produce Items.
- **PvP**: Player-versus-player battle mode where two students fight each other using their Job_Class skills.

---

## Requirements

### Requirement 1: Battle Session Lifecycle

**User Story:** As a teacher, I want to launch a Battle_Session from a classroom so that my students can fight together in a structured game flow.

#### Acceptance Criteria

1. WHEN a teacher starts a Battle_Session for a classroom, THE Battle_Engine SHALL transition through the phases LOBBY → PREP → CO-OP_BOSS_RAID → SOLO_FARMING → RESULT in that order.
2. WHEN the Battle_Session enters the PREP phase, THE Battle_Engine SHALL load each student's CharacterStats from the database using `IdleEngine.calculateCharacterStats` before any battle action is processed.
3. WHEN a student joins a Battle_Session in LOBBY phase, THE Battle_Engine SHALL emit a `battle-state` event to all connected clients containing the current player list and session phase.
4. IF a student disconnects during an active Battle_Session, THEN THE Battle_Engine SHALL mark that BattlePlayer as `isConnected: false` and preserve their state for reconnection without ending the session.
5. WHEN the RESULT phase begins, THE Battle_Engine SHALL persist all earned gold, XP, and item drops to the database before emitting the `battle-ended` event to clients.
6. THE Battle_Engine SHALL support a minimum of 1 and a maximum of 40 simultaneous BattlePlayers per Battle_Session.

---

### Requirement 2: Co-op Boss Raid

**User Story:** As a student, I want to fight a shared Boss with my classmates by answering questions correctly so that we can defeat it together and earn rewards.

#### Acceptance Criteria

1. WHEN a Battle_Session enters CO-OP_BOSS_RAID phase, THE Battle_Engine SHALL spawn exactly one Boss with HP scaled to `baseBossHp + (playerCount × perPlayerHpBonus)`.
2. WHEN a student answers a question correctly during CO-OP_BOSS_RAID, THE Battle_Engine SHALL grant that BattlePlayer 20 AP, capped at the player's `maxAp` of 100.
3. WHEN a student submits a `battle-action` event with type `ATTACK` and has at least 10 AP, THE Battle_Engine SHALL deduct 10 AP from that BattlePlayer and deal damage to the Boss equal to the player's ATK stat multiplied by a base damage coefficient of 1.0.
4. WHEN a student submits a `battle-action` event with type `SKILL`, THE Battle_Engine SHALL validate that the BattlePlayer has the specified skill unlocked and sufficient AP, then execute the skill effect and deduct the skill's AP cost.
5. WHEN a student submits a `battle-action` event with type `DEFEND`, THE Battle_Engine SHALL set that BattlePlayer's `isDefending` flag to `true` until the next Boss attack tick.
6. WHEN 15 seconds elapse during CO-OP_BOSS_RAID, THE Battle_Engine SHALL execute a Boss attack tick that deals damage to all BattlePlayers whose `isDefending` flag is `false`, then reset all `isDefending` flags to `false`.
7. WHEN a Boss attack tick occurs, THE Battle_Engine SHALL emit a `player-damaged` event to each affected client containing the damage value and the player's remaining HP.
8. WHEN a Boss attack tick occurs, THE Battle_Engine SHALL emit a `boss-damaged` event to all clients after any player attack, containing the Boss's current HP and max HP.
9. WHEN the Boss HP reaches 0, THE Battle_Engine SHALL emit a `boss-defeated` event to all clients and transition the session to SOLO_FARMING phase.
10. IF a BattlePlayer's HP reaches 0 during CO-OP_BOSS_RAID, THEN THE Battle_Engine SHALL mark that player as defeated and prevent further actions until the phase ends, without ending the session for other players.
11. WHEN the Boss is defeated, THE Battle_Engine SHALL calculate and queue gold and XP rewards for all BattlePlayers who participated, to be persisted in the RESULT phase.

---

### Requirement 3: Solo Farming

**User Story:** As a student, I want to fight my own monster by answering questions so that I can earn loot and progress through increasingly difficult waves.

#### Acceptance Criteria

1. WHEN a Battle_Session enters SOLO_FARMING phase, THE Battle_Engine SHALL assign each BattlePlayer a unique Solo_Monster instance scaled to that player's current level and the current wave number.
2. WHEN a student answers a question correctly during SOLO_FARMING, THE Battle_Engine SHALL automatically deal damage to that student's Solo_Monster equal to the student's ATK stat.
3. WHEN a student submits a `farming-action` event with type `SKILL`, THE Battle_Engine SHALL execute the specified skill against that student's Solo_Monster if the student has sufficient AP or MP.
4. WHEN a Solo_Monster's HP reaches 0, THE Battle_Engine SHALL emit a `monster-defeated` event to that student's socket containing the loot payload, then spawn a new Solo_Monster for the next wave.
5. WHEN a Solo_Monster is defeated and the current wave is 1–3, THE Battle_Engine SHALL classify the wave as Easy and select loot from the Common drop table.
6. WHEN a Solo_Monster is defeated and the current wave is 4–6, THE Battle_Engine SHALL classify the wave as Medium and select loot from the Common and Rare drop tables.
7. WHEN a Solo_Monster is defeated and the current wave is 7–9, THE Battle_Engine SHALL classify the wave as Hard and select loot from the Rare and Epic drop tables.
8. WHEN a Solo_Monster is defeated and the current wave is 10 or higher, THE Battle_Engine SHALL classify the wave as Boss-tier and select loot from the Epic and Legendary drop tables.
9. WHEN a new wave begins, THE Battle_Engine SHALL emit a `next-wave` event to the affected student's socket containing the new wave number and the new Solo_Monster's stats.
10. WHEN a Solo_Monster is defeated, THE Battle_Engine SHALL scale the next Solo_Monster's HP and ATK using the formula `baseHp × (1 + waveNumber × 0.15)` and `baseAtk × (1 + waveNumber × 0.10)`.
11. THE Battle_Engine SHALL maintain each student's wave progress independently so that one student's wave number does not affect another student's wave number.
12. WHEN the SOLO_FARMING phase timer expires, THE Battle_Engine SHALL transition the session to RESULT phase regardless of individual wave progress.

---

### Requirement 4: Battle Socket Protocol

**User Story:** As a developer, I want a well-defined Socket.io event contract for the battle system so that the client and server communicate reliably.

#### Acceptance Criteria

1. THE Battle_Engine SHALL accept the following client-to-server events: `battle-action` with payload `{ type: "ATTACK" | "DEFEND" | "SKILL", skillId?: string, targetId: string }` and `farming-action` with payload `{ type: "SKILL", skillId: string }`.
2. THE Battle_Engine SHALL emit the following server-to-client events: `battle-state`, `player-damaged`, `boss-damaged`, `boss-defeated`, `farming-state`, `monster-defeated`, `next-wave`, and `battle-ended`.
3. WHEN THE Battle_Engine emits `battle-state`, THE payload SHALL contain the current phase, all BattlePlayers' HP/AP/isDefending, and the Boss's current HP and max HP.
4. WHEN THE Battle_Engine emits `farming-state`, THE payload SHALL contain the student's current wave number, Solo_Monster HP/maxHp/name, and the student's current AP.
5. WHEN THE Battle_Engine emits `battle-ended`, THE payload SHALL contain each player's final gold earned, XP earned, and item drops from the session.
6. IF a client emits an event with a missing or invalid payload field, THEN THE Battle_Engine SHALL ignore the event and emit an `error` event back to that socket with a descriptive message.

---

### Requirement 5: Item Tiers and Properties

**User Story:** As a student, I want items to have different tiers with unique effects so that progression feels meaningful and rewarding.

#### Acceptance Criteria

1. THE Item model SHALL support exactly four tiers: COMMON, RARE, EPIC, and LEGENDARY, stored in the `tier` field.
2. THE Item model SHALL support exactly seven equipment slots: HEAD, BODY, WEAPON, OFFHAND, GLOVES, BOOTS, and ACCESSORY, stored in the `slot` field.
3. WHEN a COMMON item is created, THE Item model SHALL allow a maximum enhancement level of +9 and zero special effects.
4. WHEN a RARE item is created, THE Item model SHALL allow a maximum enhancement level of +12 and exactly one special effect stored in the `effects` JSON field.
5. WHEN an EPIC item is created, THE Item model SHALL allow a maximum enhancement level of +15 and exactly two special effects stored in the `effects` JSON field.
6. WHEN a LEGENDARY item is created, THE Item model SHALL allow a maximum enhancement level of +15, exactly three special effects, and a non-null `setId` field.
7. THE Item model SHALL include the following stat fields for each slot category: WEAPON items SHALL have non-zero `baseAtk`, `baseCrit`, and `bossDamageMultiplier`; BODY items SHALL have non-zero `baseDef`, `baseHp`, and `goldMultiplier`; OFFHAND items SHALL have non-zero `baseDef`, `baseMag`, and `baseMp`; GLOVES items SHALL have non-zero `baseAtk`, `baseSpd`, and `baseCrit`; BOOTS items SHALL have non-zero `baseSpd`, `baseCrit`, and `baseLuck`; ACCESSORY items SHALL have non-zero `goldMultiplier`.
8. THE Item catalog SHALL contain exactly 60 items distributed as: 12 WEAPON, 10 BODY, 8 HEAD, 8 OFFHAND, 8 GLOVES, 8 BOOTS, and 6 ACCESSORY.
9. WHEN a student equips an item, THE Stat_Calculator SHALL apply that item's stat bonuses multiplied by `1 + (enhancementLevel × 0.1)` to the student's CharacterStats.

---

### Requirement 6: Enhancement System

**User Story:** As a student, I want to enhance my equipment to make it stronger so that I can tackle harder content.

#### Acceptance Criteria

1. THE Enhancement_System SHALL define three enhancement zones: Safe Zone (+0 to +5), Risk Zone (+6 to +10), and Danger Zone (+11 to +15).
2. WHEN a student attempts enhancement in the Safe Zone, THE Enhancement_System SHALL always succeed and deduct only gold from the student's `gameStats.gold`.
3. WHEN a student attempts enhancement in the Risk Zone, THE Enhancement_System SHALL apply a success probability that decreases linearly from 70% at +6 to 30% at +10, deducting gold and behavior points regardless of outcome.
4. WHEN a Risk Zone enhancement attempt fails, THE Enhancement_System SHALL not change the item's enhancement level and SHALL not consume materials.
5. WHEN a student attempts enhancement in the Danger Zone, THE Enhancement_System SHALL apply a success probability that decreases linearly from 20% at +11 to 5% at +15, deducting gold, behavior points, and materials regardless of outcome.
6. WHEN a Danger Zone enhancement attempt fails, THE Enhancement_System SHALL decrease the item's enhancement level by 1.
7. WHEN an enhancement attempt is made, THE Enhancement_System SHALL validate that the student has sufficient gold, behavior points, and materials before processing; IF any resource is insufficient, THEN THE Enhancement_System SHALL return an error and make no changes.
8. WHEN an enhancement succeeds, THE Enhancement_System SHALL update the `enhancementLevel` field on the StudentItem record and recalculate the instance stat fields.
9. THE Enhancement_System SHALL prevent enhancement beyond the item's tier maximum (+9 for COMMON, +12 for RARE, +15 for EPIC and LEGENDARY).

---

### Requirement 7: Crafting System

**User Story:** As a student, I want to combine materials dropped from monsters to craft new equipment so that I have an alternative path to obtaining items.

#### Acceptance Criteria

1. THE Crafting_System SHALL support a `Material` model with fields: `id`, `studentId`, `type`, and `quantity`.
2. THE Crafting_System SHALL define exactly 12 material types: Stone Fragment, Wolf Fang, Iron Ore, Forest Herb, Dragon Scale, Shadow Essence, Thunder Crystal, Void Shard, Phoenix Feather, Abyssal Core, Celestial Dust, and Ancient Relic.
3. WHEN a Solo_Monster is defeated, THE Battle_Engine SHALL roll for material drops according to the wave tier and add the result to the student's Material records.
4. WHEN a student submits a crafting request for a COMMON item, THE Crafting_System SHALL require exactly 3 units of a Common-tier material and produce one randomly selected COMMON item.
5. WHEN a student submits a crafting request for a RARE item, THE Crafting_System SHALL require exactly 3 units of a Rare-tier material and produce one randomly selected RARE item.
6. WHEN a student submits a crafting request for an EPIC item, THE Crafting_System SHALL require exactly 3 units of an Epic-tier material and produce one randomly selected EPIC item.
7. WHEN a student submits a crafting request for a LEGENDARY item, THE Crafting_System SHALL require exactly 5 units of a Legendary-tier material and produce one randomly selected LEGENDARY item.
8. WHEN a crafting request is processed, THE Crafting_System SHALL atomically deduct the required materials and create the StudentItem record in a single database transaction.
9. IF a student has insufficient materials for a crafting request, THEN THE Crafting_System SHALL return an error and make no changes to the student's inventory.
10. THE Crafting_System SHALL produce a pretty-printable crafting recipe list, and FOR ALL valid crafting inputs, parsing then printing then re-parsing the recipe SHALL produce an equivalent recipe object (round-trip property).

---

### Requirement 8: Set Bonuses

**User Story:** As a student, I want to collect matching equipment sets to unlock powerful bonuses so that building a themed loadout is rewarding.

#### Acceptance Criteria

1. THE Stat_Calculator SHALL define four equipment sets: Dragon Set, Thunder Set, Shadow Set, and Legendary Set, each identified by a unique `setId`.
2. WHEN a student has exactly 2 equipped items sharing the Dragon Set `setId`, THE Stat_Calculator SHALL apply ATK +15% and DEF +15% to the student's CharacterStats.
3. WHEN a student has exactly 4 equipped items sharing the Dragon Set `setId`, THE Stat_Calculator SHALL additionally apply `bossDamageMultiplier +30%` and HP +500 to the student's CharacterStats.
4. WHEN a student has exactly 2 equipped items sharing the Thunder Set `setId`, THE Stat_Calculator SHALL apply SPD +20% and CRIT +8% to the student's CharacterStats.
5. WHEN a student has exactly 4 equipped items sharing the Thunder Set `setId`, THE Stat_Calculator SHALL additionally activate the chain lightning on CRIT passive effect.
6. WHEN a student has exactly 2 equipped items sharing the Shadow Set `setId`, THE Stat_Calculator SHALL apply LUCK +10% and `goldMultiplier +20%` to the student's CharacterStats.
7. WHEN a student has exactly 4 equipped items sharing the Shadow Set `setId`, THE Stat_Calculator SHALL additionally apply a 15% dodge chance and a steal gold +50% effect.
8. WHEN a student has all 7 equipped items sharing the Legendary Set `setId`, THE Stat_Calculator SHALL apply All Stats +25%, XP multiplier +50%, and grant the "Chosen One" title to the student.
9. THE Stat_Calculator SHALL evaluate set bonuses after applying individual item stats and job class multipliers, in that order.
10. FOR ALL combinations of equipped items, THE Stat_Calculator SHALL produce the same CharacterStats regardless of the order in which items are evaluated (confluence property).

---

### Requirement 9: Special Item Effects

**User Story:** As a student, I want higher-tier items to have special effects that change how I play so that rare drops feel exciting and impactful.

#### Acceptance Criteria

1. THE Stat_Calculator SHALL support the following RARE-tier special effects: Gold Finder (increases `goldMultiplier` by 15%), Quick Learner (increases XP gain by 10%), and Tough Skin (reduces incoming damage by 5%).
2. THE Stat_Calculator SHALL support the following EPIC-tier special effects: Lifesteal (heals the student for 10% of damage dealt), Mana Flow (regenerates 5 MP per correct answer), and Lucky Strike (increases CRIT by 5% when LUCK exceeds 0.5).
3. THE Stat_Calculator SHALL support the following LEGENDARY-tier special effects: Immortal (prevents the student's HP from reaching 0 once per battle session), God's Blessing (increases all stat multipliers by 10%), and Time Warp (reduces Boss attack tick interval by 3 seconds for that player's benefit).
4. WHEN a student equips an item with the Lifesteal effect, THE Battle_Engine SHALL heal that student by 10% of the damage value on every `battle-event` of type DAMAGE emitted by that student.
5. WHEN a student equips an item with the Immortal effect, THE Battle_Engine SHALL set that student's HP to 1 instead of 0 the first time it would reach 0, then disable the Immortal effect for the remainder of the session.
6. WHEN a student equips an item with the Mana Flow effect, THE Battle_Engine SHALL increment that student's MP by 5 each time they submit a correct answer.
7. THE Stat_Calculator SHALL apply special effects after base stats and set bonuses are computed.

---

### Requirement 10: Job Class Selection

**User Story:** As a student, I want to choose a job class when I reach level 5 so that my character has a unique identity and playstyle.

#### Acceptance Criteria

1. WHEN a student's `gameStats.level` reaches 5 for the first time and `jobClass` is null, THE Job_System SHALL present the student with a job selection prompt for the five base classes: WARRIOR, MAGE, RANGER, HEALER, and ROGUE.
2. WHEN a student selects a job class, THE Job_System SHALL set the student's `jobClass`, `jobTier` to "BASE", and `jobSelectedAt` to the current timestamp in the database.
3. WHEN a student's `jobClass` is set, THE Stat_Calculator SHALL apply the following stat multipliers to the student's CharacterStats: WARRIOR (HP×1.4, ATK×1.3, DEF×1.2, SPD×0.9), MAGE (MAG×1.8, MP×1.5, HP×0.8), RANGER (SPD×1.3, CRIT×1.3, HP×1.0), HEALER (MAG×1.6, HP×1.2, ATK×0.7), ROGUE (SPD×1.4, CRIT×1.5, HP×0.9).
4. THE Job_System SHALL prevent a student from changing their `jobClass` after `jobSelectedAt` is set, unless an explicit reset is performed by a teacher.
5. WHEN a student is at level 1–4 with no `jobClass`, THE Job_System SHALL assign the student the NOVICE role, granting access to 2 basic skills.
6. THE Job_System SHALL store the student's unlocked skill IDs in the `jobSkills` JSON field on the Student model.

---

### Requirement 11: Job Class Skills

**User Story:** As a student, I want my job class to unlock unique skills as I level up so that my character grows more powerful over time.

#### Acceptance Criteria

1. WHEN a student's `jobClass` is WARRIOR, THE Job_System SHALL unlock skills in this order by level: Slash (Lv.5), Shield Wall (Lv.8), War Cry (Lv.12), Whirlwind (Lv.16), Devastate (Lv.20), Heroic Strike (Lv.25).
2. WHEN a student's `jobClass` is MAGE, THE Job_System SHALL unlock skills in this order by level: Fireball (Lv.5), Blizzard (Lv.8), Thunder (Lv.12), Mana Surge (Lv.16), Meteor (Lv.20), Arcane Nova (Lv.25).
3. WHEN a student's `jobClass` is RANGER, THE Job_System SHALL unlock skills in this order by level: Arrow Shot (Lv.5), Poison Arrow (Lv.8), Wind Shot (Lv.12), Eagle Eye (Lv.16), Barrage (Lv.20), Snipe (Lv.25).
4. WHEN a student's `jobClass` is HEALER, THE Job_System SHALL unlock skills in this order by level: Cure (Lv.5), Barrier (Lv.8), Regenerate (Lv.12), Holy Light (Lv.16), Resurrection (Lv.20), Divine Intervention (Lv.25).
5. WHEN a student's `jobClass` is ROGUE, THE Job_System SHALL unlock skills in this order by level: Backstab (Lv.5), Dodge (Lv.8), Poison Blade (Lv.12), Shadow Step (Lv.16), Execution (Lv.20), Death Mark (Lv.25).
6. WHEN a student levels up, THE Job_System SHALL check the new level against the skill unlock thresholds and add any newly unlocked skill IDs to the student's `jobSkills` field.
7. EACH job class SHALL grant exactly 3 passive bonuses that are permanently active once the job is selected, stored as passive entries in the `jobSkills` field.
8. WHEN a student uses a skill in battle, THE Battle_Engine SHALL validate that the skill ID exists in the student's `jobSkills` field before executing the skill effect.

---

### Requirement 12: Job Class Advancement

**User Story:** As a student, I want to advance my job class at level 20 and master it at level 50 so that my character reaches its full potential.

#### Acceptance Criteria

1. WHEN a student's `gameStats.level` reaches 20 and `jobTier` is "BASE", THE Job_System SHALL present the student with two advance class options specific to their `jobClass`: WARRIOR → KNIGHT or BERSERKER; MAGE → ARCHMAGE or WARLOCK; RANGER → SNIPER or BEASTMASTER; HEALER → SAINT or DRUID; ROGUE → ASSASSIN or DUELIST.
2. WHEN a student selects an advance class, THE Job_System SHALL set `advanceClass` and update `jobTier` to "ADVANCE" in the database.
3. WHEN a student's `gameStats.level` reaches 50 and `jobTier` is "ADVANCE", THE Job_System SHALL present the student with two master class options derived from their `advanceClass`.
4. WHEN a student selects a master class, THE Job_System SHALL update `advanceClass` to the master class name and set `jobTier` to "MASTER" in the database.
5. WHEN `jobTier` is "ADVANCE" or "MASTER", THE Stat_Calculator SHALL apply an additional stat multiplier of 1.2× to the primary stats of the student's job class on top of the base class multipliers.
6. THE Job_System SHALL unlock 2 additional skills per advancement tier, appended to the student's `jobSkills` field upon advancement.

---

### Requirement 13: PvP Balance

**User Story:** As a student, I want PvP battles to have a rock-paper-scissors balance between job classes so that no single class dominates all others.

#### Acceptance Criteria

1. WHEN a WARRIOR student battles a HEALER student in PvP, THE Battle_Engine SHALL apply a 1.2× damage multiplier to the WARRIOR's attacks against the HEALER.
2. WHEN a MAGE student battles a WARRIOR student in PvP, THE Battle_Engine SHALL apply a 1.2× damage multiplier to the MAGE's attacks against the WARRIOR.
3. WHEN a ROGUE student battles a MAGE student in PvP, THE Battle_Engine SHALL apply a 1.2× damage multiplier to the ROGUE's attacks against the MAGE.
4. WHEN a RANGER student battles a HEALER student in PvP, THE Battle_Engine SHALL apply a 1.2× damage multiplier to the RANGER's attacks against the HEALER.
5. WHEN a WARRIOR student uses Shield Wall in PvP, THE Battle_Engine SHALL reduce incoming damage to that WARRIOR by 50% for 2 turns.
6. WHEN a MAGE student uses Meteor in PvP, THE Battle_Engine SHALL deal damage to the opponent equal to the MAGE's MAG stat multiplied by 3.0.
7. WHEN a ROGUE student uses Backstab followed by Execution on a target below 30% HP in PvP, THE Battle_Engine SHALL apply a 2.5× damage multiplier to the Execution skill.
8. WHEN a HEALER student's opponent's MP reaches 0 in PvP, THE Battle_Engine SHALL prevent that opponent from using any skills for the remainder of the battle.
9. WHEN a RANGER student's CRIT triggers in PvP, THE Battle_Engine SHALL deal bonus damage equal to 150% of the base attack value.

---

### Requirement 14: Database Schema Extensions

**User Story:** As a developer, I want the database schema to support all battle RPG data so that all game state is persisted correctly.

#### Acceptance Criteria

1. THE Student model SHALL be extended with the following fields: `jobClass String?`, `jobTier String? @default("BASE")`, `advanceClass String?`, `jobSkills Json?`, and `jobSelectedAt DateTime?`.
2. THE Item model SHALL be extended with the following fields: `tier String @default("COMMON")`, `slot String?`, `setId String?`, `effects Json?`, and `xpMultiplier Float? @default(0)`.
3. THE StudentItem model SHALL be extended with the following fields: `spd Int @default(0)`, `crit Float @default(0)`, `luck Float @default(0)`, `mag Int @default(0)`, and `mp Int @default(0)`.
4. THE schema SHALL include a new `Material` model with fields: `id String @id @default(auto()) @map("_id") @db.ObjectId`, `studentId String @db.ObjectId`, `type String`, and `quantity Int @default(1)`.
5. WHEN a Material record is created or updated, THE database SHALL enforce that `quantity` is greater than or equal to 0.
6. WHEN a StudentItem's `enhancementLevel` is updated, THE database SHALL enforce that the value is between 0 and 15 inclusive.
7. THE schema SHALL maintain referential integrity such that deleting a Student cascades to delete all associated Material and StudentItem records.

---

### Requirement 15: Reward Persistence

**User Story:** As a student, I want my battle rewards to be saved to my account so that my progress is not lost when the session ends.

#### Acceptance Criteria

1. WHEN the Battle_Session transitions to RESULT phase, THE Battle_Engine SHALL call `IdleEngine.calculateXpGain` for each BattlePlayer and update the student's `gameStats.xp` and `gameStats.level` in the database.
2. WHEN the Battle_Session transitions to RESULT phase, THE Battle_Engine SHALL add all earned gold to each student's `gameStats.gold` field in the database.
3. WHEN a loot item is awarded to a student, THE Battle_Engine SHALL create a StudentItem record in the database with `quantity: 1` and `enhancementLevel: 0`.
4. WHEN a material is awarded to a student, THE Battle_Engine SHALL upsert a Material record, incrementing `quantity` by the dropped amount.
5. WHEN reward persistence completes for all players, THE Battle_Engine SHALL emit the `battle-ended` event with the full reward summary.
6. IF the database transaction for reward persistence fails, THEN THE Battle_Engine SHALL retry the transaction up to 3 times before emitting a `battle-ended` event with an `error` flag and logging the failure.
7. THE reward persistence operation SHALL be atomic per student — either all of a student's rewards (gold, XP, items, materials) are saved or none are.
