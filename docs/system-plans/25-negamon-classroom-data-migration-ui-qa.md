# System Plan 25: Negamon Classroom Data Migration and Student UI QA

Last updated: 2026-05-24

## Purpose

Plan 24 completed the new six-species roster, new move set, and targeted balance/test pass at the code level.

However, manual QA showed that real student-facing pages still render legacy roster content because classroom `gamifiedSettings.negamon` data in Mongo still stores the older species catalog and `studentMonsters` mapping.

This plan closes that gap.

## Problem Summary

Manual browser QA on 2026-05-24 found:

- `/student/[code]/negamon` still showed legacy species and moves
- `/student/[code]/negamon/codex` still listed the old species roster
- battle opponent data still returned legacy form names and icons
- responsive shell layout was acceptable, but the visible content was not the new roster

This means the code rework is ahead of the persisted classroom data.

## Product Goal

Students using real classroom data should see the new roster everywhere that matters:

- starter selection
- partner profile
- codex
- battle prep and battle surfaces

Success means the system no longer depends on legacy classroom-stored species content for default Negamon V2 flows.

## Scope

In scope:

- classroom `gamifiedSettings.negamon.species` migration strategy
- classroom `studentMonsters` compatibility strategy
- fallback behavior for legacy species ids
- student-facing surface verification using real local data
- manual QA rerun at `390px` and `1366px`
- plan/checklist updates based on actual verified results

Out of scope:

- new battle mechanics
- reward economy redesign
- shop redesign
- full seed-data overhaul outside Negamon needs
- production deployment work

## Root Cause

The new roster in `src/lib/negamon-species.ts` is correct, but at least one real classroom record still contains an embedded legacy Negamon catalog in Mongo:

- classroom name: `Demo Class 101`
- `gamifiedSettings.negamon.species` contains old species such as `naga`, `garuda`, `mekkala`
- `gamifiedSettings.negamon.studentMonsters` still maps students to legacy species ids

As a result, student routes that read classroom settings continue to render legacy content even though the codebase default roster has already changed.

## Key Questions To Resolve

Before implementation is considered complete, this plan must answer:

1. Should classroom-stored `negamon.species` be ignored in favor of `DEFAULT_NEGAMON_SPECIES` for default V2 usage?
2. If classroom-stored species are still allowed, what is the exact upgrade path from old ids to the new six-species roster?
3. How should legacy `studentMonsters` ids be migrated when the target species no longer exists?
4. Which student-facing surfaces should trust classroom content, and which should always trust current code defaults?

## Current Data And Code Map

Primary code paths to inspect:

- `src/lib/classroom-utils.ts`
- `src/lib/services/classroom-settings/gamification-settings.ts`
- `src/lib/game-negamon/core/species.ts`
- `src/lib/game-negamon/core/monster-snapshot.ts`
- `src/lib/game-negamon/server/lite-battle.ts`
- `src/app/student/[code]/negamon/page.tsx`
- `src/app/student/[code]/negamon/codex/page.tsx`
- `src/components/negamon/StarterSelectionModal.tsx`
- `src/components/negamon/monster-card.tsx`
- `src/components/game/negamon/MonsterProfilePanel.tsx`
- `src/components/negamon/NegamonLiteBattleArena.tsx`

Supporting data verification paths:

- `api/classrooms/[id]/battle/opponents`
- `api/classrooms/[id]/battle/lite/start`
- local Mongo `Classroom` records with `gamifiedSettings.negamon`
- local Mongo `Student` records with login codes for QA

## Strategy

Preferred strategy for pass 1:

- treat `DEFAULT_NEGAMON_SPECIES` as the source of truth for default V2 roster content
- keep classroom config for feature flags and selection rules
- migrate or remap legacy `studentMonsters` ids into the six-species roster
- remove student-facing dependence on embedded legacy species blobs where safe

Why this is preferred:

- it avoids old classroom snapshots silently overriding new content
- it keeps future roster updates centralized
- it reduces the number of data shapes that student UI must support

## Phase 1: Data Contract Audit

Goal:

- identify every place where classroom-stored Negamon species data can override the new code roster

Tasks:

- trace `getNegamonSettings()` and downstream normalization
- inspect how `resolveNegamonSpeciesCatalog` or equivalent helpers decide between DB data and code defaults
- list every student-facing route/component that still reads legacy embedded species content
- record whether battle APIs also inherit legacy species/forms from classroom data

Exit criteria:

- one clear map of override points exists
- one chosen ownership rule exists for roster source of truth

### Phase 1 Audit Findings

Status:

- completed on 2026-05-24

Roster resolution flow observed in code:

1. `getNegamonSettingsFromGamification()` in `src/lib/services/classroom-settings/gamification-settings.ts`
   - parses `gamifiedSettings.negamon` as stored in classroom JSON
   - does not upgrade or normalize embedded species data against the new roster

2. `getNegamonSettings()` in `src/lib/classroom-utils.ts`
   - simply returns parsed Negamon settings from classroom gamification data
   - therefore any legacy `species` array and legacy `studentMonsters` map survive intact

3. `getStudentMonsterState()` in `src/lib/classroom-utils.ts`
   - resolves species with `DEFAULT_NEGAMON_SPECIES.find(id) ?? negamon.species.find(id)`
   - this means:
     - old ids such as `mekkala` still resolve from classroom data
     - new code defaults only win if the classroom species id already matches a new roster id
   - result: student profile-like surfaces still render legacy species/forms/moves whenever `studentMonsters` contains old ids

4. `resolveNegamonSpeciesCatalog()` in `src/lib/classroom-utils.ts`
   - returns `DEFAULT_NEGAMON_SPECIES` only when classroom `negamon.species` is empty
   - otherwise returns `raw.map((s) => DEFAULT.find(id) ?? s)`
   - this preserves every embedded legacy classroom species whose id is not in the new default roster
   - result: codex pages continue to list old roster entries

5. `findNegamonSpeciesById()` in `src/lib/game-negamon/core/species.ts`
   - builds a merged catalog from `customSpecies` first, then `DEFAULT_NEGAMON_SPECIES`
   - because default species overwrite matching ids, same-id custom variants lose
   - but legacy ids still remain resolvable because they are not overwritten by new ids

6. `createNegamonMonsterSnapshot()` in `src/lib/game-negamon/core/monster-snapshot.ts`
   - reads `speciesId` from `negamonSettings.studentMonsters`
   - resolves species through `findNegamonSpeciesById(speciesId, input.negamonSettings.species)`
   - result: battle/profile snapshot generation still accepts embedded legacy classroom species

Student-facing override points confirmed:

- `src/app/student/[code]/negamon/page.tsx`
  - feeds classroom `gamifiedSettings` into `NegamonMyProfileClient`
- `src/components/negamon/negamon-my-profile-client.tsx`
  - calls `getNegamonSettings()` and `getStudentMonsterState()`
  - uses legacy classroom data transitively
- `src/app/student/[code]/negamon/codex/page.tsx`
  - calls `resolveNegamonSpeciesCatalog(negamon)`
  - codex roster therefore reflects embedded legacy classroom species
- `src/components/student/StudentDashboardClient.tsx`
  - computes `studentMonsterState` with `getStudentMonsterState()`
  - computes `negamonMonsterSnapshot` with `createNegamonMonsterSnapshot()`
  - dashboard monster/battle surfaces inherit the same legacy classroom data path

Battle-facing override points confirmed:

- `src/app/api/classrooms/[id]/battle/opponents/route.ts`
  - uses `getNegamonSettings()` plus `getStudentMonsterState()`
  - opponent form names/icons are therefore legacy if `studentMonsters` still point to legacy ids
- `src/lib/game-negamon/server/lite-battle.ts`
  - uses `getNegamonSettings()` and passes classroom settings into `createNegamonLiteBattleState()` / `createNegamonMonsterSnapshot()`
  - interactive battle state still derives from classroom-stored roster data

Observed real-data confirmation:

- local Mongo classroom `Demo Class 101` stores legacy `gamifiedSettings.negamon.species`
- local Mongo classroom `Demo Class 101` stores legacy `studentMonsters` ids such as `mekkala`, `thotsakan`, `singha`
- manual QA and battle opponent API responses matched those legacy records exactly

Chosen ownership rule for pass 1:

- `DEFAULT_NEGAMON_SPECIES` should be the source of truth for the default Negamon V2 roster
- classroom `negamon` settings should continue to own:
  - feature enablement
  - student choice rules
  - disabled moves
  - progression coefficients
  - student-to-species assignment
- classroom-embedded `negamon.species` should not be allowed to keep the legacy default roster alive in student-facing default flows
- legacy classroom `studentMonsters` ids must be remapped through a centralized compatibility layer before snapshot/profile/codex/battle resolution

Phase 1 conclusion:

- the main regression is not in UI components themselves
- the main regression is the data contract that still treats classroom-embedded legacy species data as valid runtime content
- Phase 3 should fix this centrally rather than patching student pages one by one

## Phase 2: Legacy Mapping Spec

Goal:

- define exactly how old species ids map into the new six-species roster

Tasks:

- write a stable mapping from old ids to new ids
- define what happens to any classroom/student data that references unknown ids
- define whether migration is one-time data rewrite, runtime compatibility map, or both
- define how form names/icons should be rebuilt after remap

Recommended first-pass mapping:

- `garuda` -> `aerolisk`
- `naga` -> `tidemaw`
- `singha` -> `terranoir`
- `kinnaree` -> `lumilune`
- `mekkala` -> `voltshade`
- `thotsakan` -> `pyronox`
- `hanuman` -> `aerolisk` or `pyronox` depending on final role preference
- `suvannamaccha` -> `tidemaw` or `lumilune` depending on final support/bruiser fit

Note:

- the exact final mapping should prioritize gameplay role continuity over type purity

Exit criteria:

- one approved legacy-to-new species mapping table exists

### Phase 2 Mapping Decision

Status:

- completed on 2026-05-24

Mapping principle:

- preserve battle role identity first
- preserve broad visual/type intuition second
- avoid splitting one old species into multiple new targets unless there is a strong reason
- keep the first migration deterministic so the same classroom data always upgrades the same way

Approved legacy-to-new mapping table:

| Legacy species id | Legacy role tendency | New species id | Reason |
| --- | --- | --- | --- |
| `naga` | sustain / dark-water bruiser | `tidemaw` | keeps the water bruiser identity and durable front-line feel |
| `garuda` | fast pressure attacker | `aerolisk` | keeps the wind-speed attacker identity most closely |
| `singha` | tank / earth-fire bruiser | `terranoir` | keeps the heavy durable front-line role |
| `kinnaree` | support / heal / speed utility | `lumilune` | keeps the clearest support-heal identity |
| `thotsakan` | dark-fire burst attacker | `pyronox` | keeps the aggressive dark-fire closer role |
| `hanuman` | fast physical attacker | `aerolisk` | keeps speed pressure better than the slower rework options |
| `mekkala` | thunder control caster | `voltshade` | keeps the control/caster role with energy denial and paralysis pressure |
| `suvannamaccha` | water-light sustain tank | `lumilune` | keeps the support/sustain identity more closely than bruiser mapping |

Role continuity summary:

- legacy fast attackers collapse into `aerolisk`
- legacy dark-fire offense collapses into `pyronox`
- legacy tanks collapse into `terranoir`
- legacy supports/sustainers collapse into `lumilune`
- legacy control caster collapses into `voltshade`
- legacy water bruiser collapses into `tidemaw`

ID handling rule:

1. if `studentMonsters[studentId]` already points to one of the six new ids, preserve it unchanged
2. else if it points to a known legacy id in the mapping table above, remap to the mapped new id
3. else if it points to an unknown id that exists only inside embedded classroom species data, treat it as unsupported legacy content
4. unsupported legacy ids should not keep rendering in student-facing default flows

Fallback rule for unsupported ids:

- preferred runtime behavior:
  - return `null` monster assignment
  - let the student re-enter starter selection if student choice is enabled
- preferred non-choice fallback:
  - if choice is disabled and a student must still have a partner, assign the first allowed new-species id from the resolved default roster
- do not silently keep unsupported embedded species content alive just because it exists in classroom JSON

Migration mode decision:

- use both:
  - centralized runtime compatibility remap for safe reads
  - one-time data rewrite for known demo/local classrooms

Why both are needed:

- runtime remap protects older classrooms immediately
- data rewrite removes repeated legacy drift in local QA and demo records
- using only a DB rewrite would leave old classrooms vulnerable if another stale snapshot appears later

`studentMonsters` rewrite rule:

- rewrite every mapped legacy id to its approved new id
- preserve student ids unchanged
- do not try to keep old species ids around after migration in upgraded classrooms

`negamon.species` rewrite rule:

- classroom-embedded default roster snapshots should be replaced with the current six-species `DEFAULT_NEGAMON_SPECIES`
- custom species support is not part of this migration pass
- if a classroom is using the old default roster, it should be treated as stale default content, not as intentional custom content

Forms and icons reconstruction rule:

- after remap, form name, icon, color, stats, and move list must always be rebuilt from the target new species plus the student's current `rankIndex`
- do not try to preserve legacy form names or legacy image paths after remap
- this keeps profile, codex, battle prep, and battle state visually consistent

Codex rule after migration:

- codex should show only the six-species default roster for classrooms using the default Negamon V2 content
- embedded legacy species arrays must not continue to populate codex lists

Battle rule after migration:

- battle opponent picker, lite battle state, and reward snapshot logic should all consume the remapped six-species ids
- battle-facing API responses must expose target-species form names/icons from the new roster only

Phase 2 conclusion:

- the migration spec is approved for pass 1
- Phase 3 should implement a centralized compatibility layer using this exact table and fallback behavior

## Phase 3: Runtime Compatibility And Migration

Goal:

- make real student/classroom flows resolve to the new roster

Tasks:

- update roster-resolution helpers so legacy classroom species blobs do not keep winning by accident
- add compatibility remapping for legacy `studentMonsters`
- ensure monster snapshot generation resolves forms/moves from the new species definitions
- ensure codex and profile pages derive visible roster content from the upgraded source
- decide whether to add a migration script for local/demo classrooms

Implementation rule:

- prefer a centralized compatibility layer over scattered per-page fixes

Exit criteria:

- a legacy classroom record renders upgraded roster content without page-specific hacks

### Phase 3 Implementation Notes

Status:

- completed on 2026-05-24 for runtime compatibility scope

What was implemented:

1. Centralized compatibility helper
   - added `src/lib/negamon-compat.ts`
   - owns:
     - approved legacy id map
     - default-roster catalog resolution
     - student assignment remap/fallback rules
     - runtime Negamon settings normalization

2. Runtime normalization at settings read time
   - `getNegamonSettingsFromGamification()` now returns runtime-normalized Negamon settings
   - embedded classroom legacy `species` arrays are remapped into the current default roster
   - legacy `studentMonsters` ids are remapped before downstream consumers read them

3. Shared roster-resolution updates
   - `src/lib/classroom-utils.ts`
     - `getStudentMonsterState()` now resolves student species through the centralized compatibility layer
     - `resolveNegamonSpeciesCatalog()` now returns the runtime-normalized roster instead of preserving stale legacy ids
   - `src/lib/game-negamon/core/monster-snapshot.ts`
     - snapshot generation now remaps legacy student assignments before resolving forms/moves
   - `src/lib/game-negamon/core/species.ts`
     - custom classroom species input is normalized against the current default roster before catalog merge

4. Starter selection backend alignment
   - `src/app/api/student/negamon/select/route.ts` now reads normalized Negamon settings
   - allowed species validation no longer rejects new roster ids just because the classroom still stores a legacy species array

Fallback behavior now enforced:

- if a student assignment already uses one of the six new ids, it is preserved
- if a student assignment uses an approved legacy id, it is remapped deterministically
- if a student assignment is unsupported and student choice is enabled, runtime returns no partner assignment
- if a student assignment is unsupported and student choice is disabled, runtime falls back to the first allowed new species id

Verification completed in code:

- targeted tests passed:
  - `src/lib/game-negamon/__tests__/monster-snapshot.test.ts`
  - `src/__tests__/negamon-lite-session-routes.test.ts`
- `npm.cmd run predev` passed

Phase 3 conclusion:

- runtime compatibility is now centralized instead of page-specific
- roster/profile/snapshot/select resolution paths no longer need classroom legacy ids to render the new default roster
- live classroom data rewrite and browser verification still remain for Phase 4 and Phase 5

## Phase 4: Demo Data Upgrade

Goal:

- prepare local QA data that exposes the real new roster

Tasks:

- inspect demo classrooms currently used in local QA
- upgrade or reseed at least one classroom with Negamon enabled and student logins that work
- ensure at least one student can open starter selection if no partner is chosen
- ensure at least one student already has a migrated partner for profile/codex/battle verification

Preferred QA classroom setup:

- one empty-choice student
- one attacker student
- one tank or support student
- one valid battle-opponent pool

Exit criteria:

- local browser QA can cover starter, profile, codex, and battle without manual DB guesswork

## Phase 5: Manual Student UI QA Rerun

Goal:

- verify the new roster appears in real student-facing flows

Required surfaces:

- starter selection
- partner profile
- codex
- battle prep / opponent picker
- active battle surface if practical

Required viewport checks:

- mobile `390px`
- desktop `1366px`

What must be true:

- starter selection shows only the six new species
- profile page shows new species name, form, types, and moves
- codex shows only the new six-species roster
- battle-related opponent or session data uses new form names/icons
- no obvious clipping, overflow, or overlap at required widths

Exit criteria:

- verified screenshots and notes confirm the new roster is visible end to end

### Phase 5 QA Notes

Status:

- partially completed on 2026-05-24

QA target used:

- classroom: `Demo Class 101`
- student: `Alice`
- login code: `cmnbsf5su0001uv1hl8gqnbdk`

Verified results:

1. Profile page now resolves the migrated roster
   - `/student/[code]/negamon` rendered `Voltshade` as the partner species
   - visible profile heading and partner section resolved to the new roster naming instead of the old `Mekkala` display path
   - page HTML still contains legacy ids/forms inside hydrated classroom JSON, but the rendered profile content now uses the runtime-normalized species output

2. Codex page now resolves the migrated roster
   - `/student/[code]/negamon/codex` rendered the six-species roster
   - confirmed species present in output:
     - `Aerolisk`
     - `Lumilune`
     - `Pyronox`
     - `Terranoir`
     - `Tidemaw`
     - `Voltshade`
   - old codex species names such as `Garuda` and `Kinnaree` were not found in the rendered codex output

3. Battle-facing opponent data now resolves the migrated roster
   - `GET /api/classrooms/69c92744b57d21e0f3242fbe/battle/opponents?studentId=69c92744b57d21e0f3242fc6&studentCode=cmnbsf5su0001uv1hl8gqnbdk`
   - returned new-form names such as:
     - `Dreadflame Rex`
     - `Eclipse Tyrant`
     - `Catacomb Titan`
   - this confirms battle-facing roster resolution is now pulling from the new mapped species/forms instead of the legacy classroom ids

4. Viewport checks now pass for the verified profile/codex surfaces
   - Playwright screenshots were captured at:
     - desktop `1366px`
     - mobile `390px`
   - verified pages:
     - `/student/[code]/negamon`
     - `/student/[code]/negamon/codex`
   - no horizontal overflow was detected in the browser runtime:
     - profile desktop `scrollWidth = 1366`
     - codex desktop `scrollWidth = 1366`
     - profile mobile `scrollWidth = 390`
     - codex mobile `scrollWidth = 390`
   - visual review showed the new roster content fitting within the viewport on both target sizes for the checked pages

Remaining blockers in Phase 5:

- starter selection was not verified with a real eligible student login in this pass
  - every Negamon-enabled student in `Demo Class 101` already has a mapped partner assignment
  - Phase 4 data prep is still needed to guarantee one starter-selection QA student

Phase 5 conclusion for this pass:

- runtime migration fixed the major content regression on profile, codex, and battle-facing data
- viewport confirmation is now complete for the checked student surfaces
- the remaining open work is now starter-selection QA coverage completeness, not roster-resolution correctness

## Phase 6: Cleanup And Closeout

Goal:

- finish documentation and prevent regression

Tasks:

- update Plan 24 checklist/status where Phase 5 was previously blocked
- add completion notes describing how legacy classroom data was neutralized or migrated
- add targeted regression tests if roster source-of-truth behavior changed
- note any remaining seed-data or teacher-side follow-up work

Exit criteria:

- the plan file and upstream plan status both match the verified state

### Phase 6 Closeout Notes

Status:

- partially completed on 2026-05-24

Completed in this pass:

1. Upstream plan alignment
   - Plan 24 Phase 5 notes/checklist were updated to reflect the resolved content-level regression
   - profile, codex, and battle-facing roster verification now match the real local QA outcome instead of the earlier blocked state

2. Migration behavior documentation
   - Plan 25 now records that legacy classroom species ids are neutralized by centralized runtime normalization
   - the main remaining risk is no longer roster-resolution correctness
   - the main remaining risk is QA completeness for starter selection and viewport screenshots

3. Regression coverage state
   - targeted regression coverage for roster source-of-truth behavior was already added in Phase 3
   - runtime normalization and legacy-id remap behavior are covered in:
     - `src/lib/game-negamon/__tests__/monster-snapshot.test.ts`
     - `src/__tests__/negamon-lite-session-routes.test.ts`

Remaining open work before full closeout:

- prepare one real Negamon-enabled student with no assigned partner for starter-selection QA
- complete viewport-confirmed visual checks at `390px` and `1366px`
- optionally note teacher-side cleanup for stale classroom settings UI if manual assignment controls still surface old ids anywhere outside student flows

Phase 6 conclusion for this pass:

- documentation is now aligned with the verified runtime state
- the plan is not fully closed yet because QA coverage is still incomplete in two specific areas:
  - starter selection with a real eligible student
  - final visual viewport confirmation

## Validation Checklist

Tasks:

- [x] Audit roster source-of-truth paths
- [x] Approve legacy species id mapping
- [x] Implement centralized compatibility/migration behavior
- [ ] Upgrade or reseed local QA classroom data
- [ ] Verify starter selection with a real student login
- [x] Verify profile page with migrated roster data
- [x] Verify codex page with migrated roster data
- [x] Verify battle-facing data uses the new roster
- [x] Check mobile `390px`
- [x] Check desktop `1366px`
- [x] Update plan notes/checklists after verification

## Risks

- If classroom-stored species blobs remain authoritative, legacy content will keep resurfacing.
- If mapping is inconsistent across routes, profile and battle may disagree on the same student monster.
- If migration touches only demo data and not runtime compatibility, older classrooms can still regress later.
- If starter selection is not tested with a real eligible student, the plan can appear complete while the first-run flow is still broken.

## Validation Commands

Suggested code checks:

```powershell
npm.cmd test -- src/lib/game-negamon/__tests__/content-catalog.test.ts src/lib/game-negamon/__tests__/skill-effects.test.ts src/lib/game-negamon/__tests__/battle-engine-v2.test.ts src/lib/game-negamon/__tests__/battle-balance.test.ts src/lib/game-negamon/__tests__/monster-snapshot.test.ts src/lib/game-negamon/__tests__/skill-loadout.test.ts src/__tests__/negamon-lite-session-routes.test.ts src/__tests__/student-battle-loadout-v2.test.ts
```

Suggested local data checks:

```powershell
node -e "/* inspect Classroom and Student Negamon records */"
```

Suggested manual QA targets:

- `/student/[real-code]/negamon`
- `/student/[real-code]/negamon/codex`
- student dashboard monster/battle surfaces where available

## Definition Of Done

This plan is done when:

- real local classroom/student data no longer forces legacy roster content into student-facing Negamon flows
- starter, profile, codex, and battle-facing surfaces all show the new roster where applicable
- required viewport QA is complete
- the related plan checklists reflect actual verified results
