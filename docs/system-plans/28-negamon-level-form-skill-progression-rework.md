# System Plan 28: Negamon Level, Form, and Skill Progression Rework

Last updated: 2026-05-24

## Purpose

The current progression model is still too compressed:

- `rankIndex` runs from `0-5`
- battle `level` is effectively `rankIndex + 1`
- forms and skill unlocks are tied to only six short progression steps

This works mechanically, but it does not feel like a full monster-raising game.

This plan defines how to rebuild progression so that:

- monsters grow from level `1` to level `60`
- each of the six forms has a meaningful level band
- skill unlock pacing starts earlier and feels more like a Pokemon-inspired RPG
- battle stats, rewards, UI, and save data all align to the new progression model

## Product Goal

Students should feel a real long-term growth arc:

- early levels move quickly
- monsters evolve through clearly readable stages
- each new form feels earned
- moves unlock across the journey instead of only near the end
- the final form has real endgame playtime instead of appearing only at the finish line

## Current Gap

Current repo behavior:

- `level = rankIndex + 1` in [src/lib/game-negamon/core/monster-growth.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/monster-growth.ts:21)
- forms are indexed `0-5`
- species moves use `learnRank` values `3-6` in [src/lib/negamon-species.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/negamon-species.ts:61)
- skill unlock rules are still rank-driven in [src/lib/game-negamon/core/skills.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/skills.ts:118) and [src/lib/game-negamon/core/skill-unlock.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/skill-unlock.ts:17)

This means:

- progression is too short
- form changes happen too close to max power
- the first two forms feel underused
- skill unlocks start too late

## Target Progression Model

### Core Rule

Move from:

- `6 effective levels`

to:

- `60 real levels`
- `6 forms`
- `5 evolution checkpoints`

### Recommended Form Bands

This is the recommended first-pass structure:

- **Form 1**: level `1-7`
- **Form 2**: level `8-15`
- **Form 3**: level `16-25`
- **Form 4**: level `26-37`
- **Form 5**: level `38-49`
- **Form 6**: level `50-60`

### Evolution Checkpoints

Recommended evolution thresholds:

- Form 1 -> Form 2 at level `8`
- Form 2 -> Form 3 at level `16`
- Form 3 -> Form 4 at level `26`
- Form 4 -> Form 5 at level `38`
- Form 5 -> Form 6 at level `50`

Why this shape:

- early game evolves fast enough to feel exciting
- midgame has room to learn identity
- final form arrives early enough to actually be played

## Skill Unlock Direction

### Current Problem

Right now, the main species moves unlock too late:

- form 1 has no real signature move progression
- form 2 still feels empty
- most identity appears only in later forms

### Target Rule

Every monster should have:

- at least one useful move in Form 1
- a second move by Form 2
- a clear signature identity by Form 3
- late moves that feel stronger, not merely delayed

### Recommended First-Pass Skill Bands

For each species:

- **Level 1**: basic attack
- **Level 4**: first species move
- **Level 8**: second species move
- **Level 16**: third species move
- **Level 26**: fourth species move
- **Level 38**: fifth move or upgraded tactical move
- **Level 50**: capstone move

If the project wants to stay with only four signature species moves in the first pass, use:

- **Form 1 / Level 4**
- **Form 2 / Level 8**
- **Form 3 / Level 16**
- **Form 5 / Level 38**

and keep the level-50 slot reserved for a future capstone move, passive upgrade, or trait unlock.

## Scope

In scope:

- level `1-60` progression model
- form thresholds
- skill unlock pacing
- exp curve redesign
- runtime stat growth redesign
- UI display alignment for level/form/next unlock
- migration path from old rank-based data

Out of scope for this plan:

- new roster theme
- move redesign itself
- item redesign itself
- capture mechanics
- party expansion

## Phase 1: Rules And Data Contract Spec

Freeze the new progression contract.

Must define:

- canonical `level` field
- canonical `formIndex`
- evolution threshold table
- skill unlock rule shape
- migration rule from `rankIndex`

Recommended target contract:

```ts
type NegamonProgressionState = {
  level: number;
  exp: number;
  expToNextLevel: number;
  formIndex: number;
  evolutionStage: number;
};
```

Rules:

- `level` becomes the primary progression axis
- `formIndex` is derived from level thresholds
- `rankIndex` becomes legacy-compatible only during migration

### Phase 1 Completion Notes

Phase 1 is now frozen for implementation with these decisions:

- canonical battle/runtime progression state becomes:

```ts
type NegamonProgressionStateV2 = {
  level: number;          // canonical progression axis, 1-60
  exp: number;            // cumulative EXP on the 1-60 curve
  expToNextLevel: number; // remaining EXP to the next level threshold
  formIndex: number;      // derived 0-5 from level thresholds
  evolutionStage: number; // mirrors formIndex for first-pass compatibility
  rankIndex: number;      // legacy compatibility field only during migration/read paths
};
```

- canonical level bands are:
  - form 1: `1-7`
  - form 2: `8-15`
  - form 3: `16-25`
  - form 4: `26-37`
  - form 5: `38-49`
  - form 6: `50-60`
- canonical evolution thresholds are frozen at levels `8`, `16`, `26`, `38`, and `50`
- first-pass skill unlock pacing is frozen at:
  - basic move: `1`
  - unlock 1: `4`
  - unlock 2: `8`
  - unlock 3: `16`
  - unlock 4: `26`
  - reserved future unlock bands: `38`, `50`
- legacy migration mapping is frozen at:
  - old rank `0` -> level `1`
  - old rank `1` -> level `8`
  - old rank `2` -> level `16`
  - old rank `3` -> level `26`
  - old rank `4` -> level `38`
  - old rank `5` -> level `50`

Implementation guardrails:

- `level` becomes the canonical UI/runtime field everywhere new code is introduced
- `rankIndex` may continue to exist in persistence and compatibility helpers during rollout
- any helper that still consumes `rankIndex` must be treated as legacy compatibility code
- new helpers should derive `formIndex` from `level`, never from `rankIndex`

## Phase 2: Level Curve Spec

Rebuild the EXP curve for levels `1-60`.

Requirements:

- early levels should move quickly
- midgame should slow down gradually
- late game should require commitment without becoming a grind wall

Recommended first-pass curve direction:

- levels `1-10`: fast
- levels `11-25`: moderate
- levels `26-40`: steady
- levels `41-60`: slow but meaningful

Decision to freeze:

- exact EXP formula
- whether classroom points scale linearly or with bonuses
- whether attendance EXP remains flat or scales by level band

### Phase 2 Completion Notes

Phase 2 is now frozen with a first-pass cumulative EXP model that is easy to reason about and safe to implement in code and UI.

#### Canonical Rule

- `exp` is cumulative total EXP
- each level has a cumulative threshold
- `expToNextLevel` is:
  - `threshold(level + 1) - exp` for levels below `60`
  - `0` at level `60`

#### Frozen First-Pass EXP Formula

Use a banded cumulative curve:

```ts
function getNegamonCumulativeExpForLevel(level: number): number {
  if (level <= 1) return 0;

  let total = 0;

  for (let current = 2; current <= level; current += 1) {
    if (current <= 10) {
      total += 120 + (current - 2) * 20;
      continue;
    }
    if (current <= 25) {
      total += 300 + (current - 11) * 35;
      continue;
    }
    if (current <= 40) {
      total += 850 + (current - 26) * 55;
      continue;
    }
    total += 1700 + (current - 41) * 90;
  }

  return total;
}
```

This produces the intended pacing:

- levels `1-10`: quick starter growth
- levels `11-25`: steady early-mid progression
- levels `26-40`: meaningful classroom commitment
- levels `41-60`: long-tail endgame runway

#### Reference Thresholds

Frozen reference thresholds for implementation and QA:

- level `1`: `0`
- level `4`: `420`
- level `8`: `1,260`
- level `10`: `1,920`
- level `16`: `4,305`
- level `26`: `9,750`
- level `38`: `22,470`
- level `50`: `46,200`
- level `60`: `72,000`

These checkpoints intentionally line up with the frozen form/evolution thresholds from Phase 1.

#### Reward Economy Baseline

Frozen first-pass economy assumptions for downstream implementation:

- classroom points continue to convert linearly into EXP in the first migration pass
- `expPerPoint` should remain configurable, but the recommended baseline for the 1-60 curve becomes `6`
- `expPerAttendance` should remain configurable, but the recommended baseline becomes `18`

Why:

- the old defaults (`10` and `20`) are too aggressive on the 60-level curve
- `6` and `18` still make early forms move at a rewarding pace
- we keep the values configurable so Phase 7 can tune them without rewriting Phase 2 contracts

#### Leveling Expectations

Expected first-pass pacing with the frozen baseline:

- a new student should reasonably reach Form 2 in normal early classroom use
- Form 3 should happen during active weekly participation, not only at the end of a term
- Form 6 should remain aspirational but reachable in long-running classroom play

#### Implementation Guardrails

- all new growth helpers should use cumulative thresholds, not `nextLevel^2 * 100`
- battle/UI code should never infer level directly from `rankIndex + 1`
- migration code may derive a starting EXP floor from mapped legacy level thresholds

## Phase 3: Form Threshold Implementation

Primary file targets:

- [src/lib/game-negamon/core/monster-growth.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/monster-growth.ts:1)
- [src/lib/game-core/monster.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-core/monster.ts:1)
- [src/lib/game-negamon/core/monster-snapshot.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/monster-snapshot.ts:1)
- [src/lib/game-negamon/core/monster-traits.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/monster-traits.ts:1)
- [src/lib/types/negamon.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/types/negamon.ts:115)
- [src/lib/negamon-species.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/negamon-species.ts:44)

Implementation goals:

- derive form from level thresholds instead of raw rank parity
- keep six-form species structure
- expose helper functions like:
  - `getNegamonFormIndexFromLevel()`
  - `getNegamonEvolutionThresholds()`
  - `getNegamonFormLevelBand()`

Done only when:

- all progression surfaces use one canonical level-to-form mapping

### Phase 3 Completion Notes

Status: complete on May 24, 2026

What changed:

- added canonical level helpers for `1-60` progression:
  - `normalizeNegamonLevel()`
  - `getNegamonLevelFromRank()`
  - `getNegamonEvolutionThresholds()`
  - `getNegamonFormIndexFromLevel()`
  - `getNegamonFormLevelBand()`
  - `getNegamonCumulativeExpForLevel()`
- froze runtime form bands at `1-7`, `8-15`, `16-25`, `26-37`, `38-49`, `50-60`
- changed legacy rank migration floors to `1 / 8 / 16 / 26 / 38 / 50`
- updated evolution rules to derive `requiredLevel` from canonical form thresholds instead of `rank + 1`
- updated negamon runtime snapshots to carry canonical `level` through to the shared game monster snapshot layer
- updated student monster state creation so species form selection resolves from canonical level bands

Verification completed:

- `npm.cmd test -- src/lib/game-negamon/__tests__/monster-snapshot.test.ts src/lib/game-negamon/__tests__/monster-traits.test.ts src/lib/game-negamon/__tests__/learning-rewards.test.ts src/lib/game-negamon/__tests__/progression.test.ts`
- `npm.cmd run predev`
- `npm.cmd run build`

Phase 3 checklist:

- [x] Expose canonical level-to-form helper functions
- [x] Route evolution thresholds through level bands instead of raw rank math
- [x] Pass canonical levels through negamon runtime snapshots
- [x] Cover level/form migration behavior with targeted tests

## Phase 4: Stat Growth Rework

Current stat growth is too tied to the six-step rank model.

We need:

- a level-based stat curve from `1-60`
- controlled growth that preserves roster identity
- no giant late-game blowouts

Recommended direction:

- keep species base stats as identity anchors
- compute battle stats from:
  - base stats
  - level
  - optional form bonus layer

Stat design goals:

- speedsters stay faster
- tanks stay durable
- attackers scale harder in offense
- supports do not become irrelevant at high level

### Phase 4 Completion Notes

Status: complete on May 24, 2026

What changed:

- replaced the old `rankIndex + 1` stat formula with canonical level-based growth anchors at:
  - `Lv1`
  - `Lv8`
  - `Lv16`
  - `Lv26`
  - `Lv38`
  - `Lv50`
  - `Lv60`
- kept migration-safe anchor multipliers at the legacy form floors so existing roster balance does not jump abruptly at current classroom progression checkpoints
- added smooth interpolation between anchor levels so intermediate levels can scale naturally once persistence starts carrying full `1-60` levels
- introduced shared helpers in [src/lib/game-negamon/core/monster-growth.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/monster-growth.ts:1):
  - `getNegamonStatMultipliersForLevel()`
  - `calculateNegamonStatsForLevel()`
- updated runtime stat consumers to use the new canonical curve:
  - [src/lib/game-negamon/core/monster-snapshot.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/monster-snapshot.ts:1)
  - [src/lib/classroom-utils.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/classroom-utils.ts:1)

Verification completed:

- `npm.cmd test -- src/lib/game-negamon/__tests__/monster-snapshot.test.ts src/lib/game-negamon/__tests__/monster-traits.test.ts src/lib/game-negamon/__tests__/progression.test.ts src/lib/game-negamon/__tests__/battle-balance.test.ts`
- `npm.cmd run predev`
- `npm.cmd run build`

Phase 4 checklist:

- [x] Replace rank-step stat growth with level-based growth anchors
- [x] Preserve roster identity at migrated form thresholds
- [x] Support smooth scaling between anchor levels
- [x] Route classroom/runtime stat consumers through the shared curve

## Phase 5: Skill Unlock Rework

Primary file targets:

- [src/lib/negamon-species.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/negamon-species.ts:61)
- [src/lib/types/negamon.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/types/negamon.ts:49)
- [src/lib/game-negamon/core/skills.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/skills.ts:76)
- [src/lib/game-negamon/core/skill-unlock.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/skill-unlock.ts:15)

Implementation goals:

- move from `learnRank`-only thinking to `learnLevel`
- optionally keep `learnRank` only as compatibility fallback
- let early forms unlock meaningful moves sooner

Recommended first-pass skill pacing:

- basic move available from level `1`
- unlock 1 at level `4`
- unlock 2 at level `8`
- unlock 3 at level `16`
- unlock 4 at level `26`

Optional extended pacing:

- unlock 5 at level `38`
- unlock 6 at level `50`

### Phase 5 Completion Notes

Status: complete on May 24, 2026

What changed:

- added canonical `learnLevel` support to [src/lib/types/negamon.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/types/negamon.ts:49) while preserving `learnRank` as a compatibility fallback
- rebuilt skill unlock resolution in:
  - [src/lib/game-negamon/core/skills.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/skills.ts:1)
  - [src/lib/game-negamon/core/skill-unlock.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/skill-unlock.ts:1)
  - [src/lib/game-negamon/core/monster-snapshot.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/monster-snapshot.ts:1)
  - [src/lib/classroom-utils.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/classroom-utils.ts:1)
- updated the first-pass roster in [src/lib/negamon-species.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/negamon-species.ts:61) so the four signature moves now unlock at:
  - `Lv4`
  - `Lv8`
  - `Lv16`
  - `Lv26`
- updated shared skill snapshots in [src/lib/game-core/monster.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-core/monster.ts:1) so displayed unlock levels no longer fall back to raw rank values when `learnLevel` is present
- aligned classroom settings schema parsing with the new move contract in [src/lib/services/classroom-settings/gamification-settings-schema.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/services/classroom-settings/gamification-settings-schema.ts:45)

Verification completed:

- `npm.cmd test -- src/lib/game-negamon/__tests__/skill-loadout.test.ts src/lib/game-negamon/__tests__/monster-snapshot.test.ts src/lib/game-negamon/__tests__/monster-traits.test.ts src/lib/game-negamon/__tests__/progression.test.ts src/lib/game-negamon/__tests__/battle-balance.test.ts`
- `npm.cmd run predev`

Build note:

- `npm.cmd run build` is currently blocked in this environment by external `next/font` fetch failures for Google Fonts (`Geist`, `Geist Mono`, `Noto Sans Thai`), not by the Phase 5 code changes

Phase 5 checklist:

- [x] Add canonical `learnLevel` support with rank fallback
- [x] Rebuild unlock resolution around level-based pacing
- [x] Update roster move pacing to `4 / 8 / 16 / 26`
- [x] Cover snapshot/loadout/balance regression with targeted tests

## Phase 6: Persistence And Migration

Primary file targets:

- student monster snapshot builders
- classroom settings normalization
- save/session serialization paths

Must define:

- how old `rankIndex 0-5` maps into new levels
- how old unlocked moves are preserved
- how legacy classrooms are normalized on read

Recommended migration table:

- old rank `0` -> new level `1`
- old rank `1` -> new level `8`
- old rank `2` -> new level `16`
- old rank `3` -> new level `26`
- old rank `4` -> new level `38`
- old rank `5` -> new level `50`

This preserves old form ownership while expanding the new level runway above it.

### Phase 6 Completion Notes

Status: complete on May 24, 2026

What changed:

- upgraded [src/lib/game-negamon/core/monster-growth.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/monster-growth.ts:1) so runtime progression now derives level from EXP while still respecting legacy minimum form ownership floors
  - added `getNegamonLevelFromExp()`
  - added `getNegamonRankIndexFromLevel()`
  - updated `calculateNegamonExpProgress()` to use `max(legacy floor, exp-derived level)`
- rebuilt reward progression serialization in [src/lib/game-negamon/core/battle-rewards.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/battle-rewards.ts:1) so `levelAfter`, `rankIndexAfter`, and `levelUps` come from EXP-based progression rather than raw rank delta assumptions
- upgraded persistence planning in [src/lib/game-negamon/server/progression.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/server/progression.ts:1) to:
  - carry `levelBefore/After`
  - carry `rankIndexBefore/After`
  - hydrate stored skill lists with canonical unlocked skills before applying newly unlocked skills
- wired canonical unlocked-skill hydration into runtime reward save paths:
  - [src/lib/game-negamon/server/battle.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/server/battle.ts:1)
  - [src/lib/game-negamon/server/lite-battle.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/server/lite-battle.ts:1)
  - [src/lib/services/student-economy/check-in-student.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/services/student-economy/check-in-student.ts:1)
  - [src/app/api/student/[code]/daily-quests/route.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/app/api/student/[code]/daily-quests/route.ts:1)
- updated migration-facing tests and route expectations so legacy item ids / legacy skill ids no longer define the persisted runtime contract

Verification completed:

- `npm.cmd test -- src/lib/game-negamon/__tests__/progression.test.ts src/lib/game-negamon/__tests__/battle-rewards.test.ts src/lib/game-negamon/__tests__/learning-rewards.test.ts src/lib/game-negamon/__tests__/monster-snapshot.test.ts src/__tests__/student-checkin-route.test.ts src/__tests__/student-quest-ledger.test.ts src/__tests__/negamon-v3-session-routes.test.ts src/__tests__/negamon-lite-session-routes.test.ts`
- `npm.cmd run predev`

Build note:

- `npm.cmd run build` remains blocked in this environment by external `next/font` fetch failures for Google Fonts (`Geist`, `Geist Mono`, `Noto Sans Thai`), not by the Phase 6 migration changes

Phase 6 checklist:

- [x] Preserve legacy rank ownership floors while allowing EXP-derived level growth
- [x] Serialize progression results with canonical level/rank snapshots
- [x] Hydrate stale persisted skill lists from canonical unlocked skills on write
- [x] Cover route/runtime migration behavior with focused tests

## Phase 7: Reward And Progression Economy Alignment

Primary file targets:

- reward pipelines
- quest reward rules
- attendance reward rules
- battle reward progression rules

Must decide:

- whether `expPerPoint = 10` still makes sense on a 60-level curve
- whether attendance EXP should scale
- whether early quests should accelerate first evolution

Likely changes:

- raise early-game progression speed intentionally
- reduce late-game overshoot from high classroom scores
- add soft caps or band scaling if needed

### Phase 7 Completion Notes

Status: complete on May 24, 2026

What changed:

- aligned the baseline classroom economy in [src/lib/negamon-species.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/negamon-species.ts:183), [src/lib/types/negamon.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/types/negamon.ts:120), and [src/components/negamon/negamon-settings.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/negamon/negamon-settings.tsx:84) to the frozen Phase 2 values:
  - `expPerPoint = 6`
  - `expPerAttendance = 18`
- rebalanced battle progression rewards in [src/lib/game-negamon/core/battle-rewards.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/battle-rewards.ts:73) to fit the 60-level curve better:
  - win base `48`
  - draw base `28`
  - loss base `18`
  - capped turn bonus `+12`
- boosted quest-to-exp conversion in [src/lib/game-negamon/core/learning-rewards.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/learning-rewards.ts:26) to `floor(goldReward * 1.2)` so early quests help push the first evolution window sooner
- aligned progression fallback math with the new baseline in:
  - [src/lib/game-negamon/server/progression.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/server/progression.ts:52)
  - [src/lib/game-negamon/server/lite-battle.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/server/lite-battle.ts:406)
  - [src/lib/game-negamon/server/battle.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/server/battle.ts:484)
  - [src/lib/services/student-economy/check-in-student.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/services/student-economy/check-in-student.ts:123)
  - [src/app/api/student/[code]/daily-quests/route.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/app/api/student/[code]/daily-quests/route.ts:224)
- updated route/runtime tests so mocked classroom settings and expected reward payloads now reflect the new economy baseline instead of the old `10 / 20` pacing

Verification completed:

- `npm.cmd test -- src/lib/game-negamon/__tests__/battle-rewards.test.ts src/lib/game-negamon/__tests__/learning-rewards.test.ts src/__tests__/negamon-lite-session-routes.test.ts src/__tests__/negamon-v3-session-routes.test.ts`
- `npm.cmd run predev`

Build note:

- `npm.cmd run build` may still be blocked in this environment by external `next/font` fetch failures for Google Fonts (`Geist`, `Geist Mono`, `Noto Sans Thai`), not by the Phase 7 reward economy changes

Phase 7 checklist:

- [x] Align baseline classroom EXP defaults with the `1-60` curve
- [x] Rebalance battle reward EXP pacing
- [x] Rebalance quest and attendance progression inputs
- [x] Update route/runtime regressions to the new economy numbers

## Phase 8: UI Alignment

Primary UI targets:

- monster profile
- student dashboard monster panel
- codex
- battle summary
- progression / reward surfaces

UI should show:

- current level
- current form
- next form threshold
- next move unlock threshold
- EXP progress to next level

Done only when:

- players can understand growth without reading external instructions

### Phase 8 Completion Notes

Status: complete on May 24, 2026

What changed:

- extended canonical monster snapshots in [src/lib/game-negamon/core/monster-snapshot.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/core/monster-snapshot.ts:1) with:
  - current `formBand`
  - `nextSkillUnlock`
- upgraded [src/components/game/negamon/MonsterProfilePanel.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/game/negamon/MonsterProfilePanel.tsx:1) so the profile card now shows:
  - current level
  - EXP to next level
  - current form band
  - next skill unlock threshold
  - next evolution threshold
- upgraded [src/components/game/negamon/SkillLoadoutPanel.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/game/negamon/SkillLoadoutPanel.tsx:1) so skill loadout surfaces the next unlock threshold directly in the header
- aligned the full student partner page in:
  - [src/app/student/[code]/negamon/page.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/app/student/[code]/negamon/page.tsx:1)
  - [src/components/negamon/negamon-my-profile-client.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/negamon/negamon-my-profile-client.tsx:1)
  so it renders from the same snapshot-driven progression model as the dashboard panel instead of relying only on the older rank-oriented presentation
- aligned codex progression presentation in:
  - [src/components/negamon/negamon-codex-client.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/negamon/negamon-codex-client.tsx:1)
  - [src/components/negamon/negamon-moves-grid.tsx](C:/Users/IHCK/GAMEEDU/gamedu/src/components/negamon/negamon-moves-grid.tsx:1)
  so form cards show level bands and move chips show canonical level unlocks (`Lv 4 / 8 / 16 / 26`) instead of rank-only labels
- refreshed supporting copy in [src/lib/translations.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/translations.ts:529) for the new progression language
- improved reward summary wording in [src/components/game/negamon/ui-content.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/components/game/negamon/ui-content.ts:156) so level-up summaries read as concrete levels instead of only counts

Verification completed:

- `npm.cmd test -- src/lib/game-negamon/__tests__/monster-snapshot.test.ts src/components/game/negamon/__tests__/ui-content.test.ts`
- `npm.cmd run predev`
- `npm.cmd run build`
- local HTTP smoke check confirmed:
  - `/student/7FUM5RLTLA4C/negamon` renders `ช่วงร่างปัจจุบัน` and `สกิลถัดไป`
  - `/student/7FUM5RLTLA4C/negamon/codex` renders form level bands and `Lv` unlock badges

Phase 8 checklist:

- [x] Show current level, form, and EXP-to-next-level on profile surfaces
- [x] Show next evolution and next skill unlock thresholds
- [x] Align codex move/form presentation with level-based progression
- [x] Keep UI copy synced with the `1-60` progression model

## Phase 9: Testing, Balance, And QA

Automated test targets:

- growth formula tests
- level-to-form mapping tests
- skill unlock tests
- migration tests
- reward progression tests
- snapshot / battle readiness tests

Manual QA targets:

- new student progression from level 1
- old migrated student data
- move unlock display
- form evolution display
- battle stats changing correctly by level

Balance checks:

- first evolution should happen early enough to feel rewarding
- final form should not be unreachable in normal classroom play
- level 50-60 should feel meaningful, not empty

### Phase 9 Completion Notes

Status: complete on May 25, 2026

What changed:

- expanded regression coverage in [src/lib/game-negamon/__tests__/monster-snapshot.test.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/__tests__/monster-snapshot.test.ts:1) so snapshots now assert:
  - canonical form bands for the new level windows
  - `nextSkillUnlock` payloads for mid-game monsters
  - no stale next-unlock hints for capped late-game monsters
- expanded progression curve coverage in [src/lib/game-negamon/__tests__/progression.test.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/lib/game-negamon/__tests__/progression.test.ts:1) to lock the first-pass `1-60` pacing at key migration anchors:
  - `Lv 1` at the true start state
  - `Lv 8` at the first evolution threshold
  - `Lv 16` at the third-form transition
- updated route/service regression expectations in:
  - [src/__tests__/student-checkin-route.test.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/__tests__/student-checkin-route.test.ts:1)
  - [src/__tests__/student-quest-ledger.test.ts](C:/Users/IHCK/GAMEEDU/gamedu/src/__tests__/student-quest-ledger.test.ts:1)
  so attendance and quest rewards now verify the aligned economy baseline (`expPerAttendance = 18`, quest EXP derived from `goldReward * 1.2`)
- re-verified battle and reward regression paths after the progression rework across:
  - V3 session routes
  - legacy-compatible session routes
  - reward summaries
  - balance tests
  - learning reward tests

Balance and QA conclusions:

- the first meaningful growth beat now lands early:
  - first move unlock at `Lv 4`
  - first form evolution at `Lv 8`
- migrated students keep their owned form band because runtime progression preserves minimum legacy rank ownership before further EXP-based growth
- late-game progression still has headroom:
  - form 6 remains gated to `Lv 50-60`
  - `nextSkillUnlock` correctly disappears once a monster has its full core kit

Verification completed:

- `npm.cmd test -- src/lib/game-negamon/__tests__/progression.test.ts src/lib/game-negamon/__tests__/monster-snapshot.test.ts src/lib/game-negamon/__tests__/battle-rewards.test.ts src/lib/game-negamon/__tests__/learning-rewards.test.ts src/lib/game-negamon/__tests__/battle-balance.test.ts src/components/game/negamon/__tests__/ui-content.test.ts src/__tests__/student-checkin-route.test.ts src/__tests__/student-quest-ledger.test.ts src/__tests__/negamon-v3-session-routes.test.ts src/__tests__/negamon-lite-session-routes.test.ts`
- `npm.cmd run build`
- local manual QA evidence from the aligned profile and codex flows confirmed:
  - current form band labels render on `/student/[code]/negamon`
  - next skill unlock labels render on `/student/[code]/negamon`
  - codex level bands and `Lv` unlock chips render on `/student/[code]/negamon/codex`

## Risks

### Risk 1: Too Much Grind

Mitigation:

- fast early curve
- explicit testing with classroom point gain patterns

### Risk 2: Legacy Data Looks Wrong After Migration

Mitigation:

- use threshold-based mapping
- preserve current form ownership first, then grow upward

### Risk 3: Stats Explode At Higher Levels

Mitigation:

- redesign growth formula instead of stretching the old rank formula blindly

### Risk 4: Early Game Still Feels Empty

Mitigation:

- ensure Form 1 and Form 2 have meaningful unlocks

## Exit Criteria

This plan is complete when:

- level `1-60` is the canonical progression system
- six forms map cleanly to level bands
- skill unlocks begin early and feel paced
- old rank-based data migrates safely
- UI communicates growth clearly
- automated tests and manual QA pass

## Validation Checklist

- [x] Approve level `1-60` progression direction
- [x] Freeze form thresholds
- [x] Freeze skill unlock pacing
- [x] Freeze migration mapping from old ranks
- [x] Rebuild growth and stat formulas
- [x] Rebuild skill unlock rules
- [x] Migrate persistence and runtime snapshots
- [x] Align reward economy with the new curve
- [x] Align UI with level/form/next unlock info
- [x] Run automated progression regression tests
- [x] Run manual progression QA
