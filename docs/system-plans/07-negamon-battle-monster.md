# System Plan 07: Negamon Classroom Battle / Monster Stability

Last updated: 2026-05-22

## Scope

ระบบ Nagamon ในห้องเรียนครอบคลุมมากกว่า battle engine ตัวเดียว ต้องแก้และทดสอบเป็นชุดเดียวกัน:

- Classroom gamification settings: เปิด/ปิด Nagamon, เลือก species, assign มอนสเตอร์, ตั้งค่า EXP
- Student dashboard game mode: โปรไฟล์มอนสเตอร์, quest/economy, shop inventory, battle loadout
- Teacher classroom dashboard: ตารางมอนสเตอร์, live battle launcher, reward audit/resync
- One-on-one battle API: `BattleSession`, item consumption, gold reward, history
- Live Nagamon Battle: Socket.io lobby/play/host, `ActiveGame`, reconnect, reward sync เข้า `behaviorPoints`
- Economy/progression: `student.gold`, `student.behaviorPoints`, `PointHistory`, `EconomyTransaction`

## Current Diagnosis

### P0: Bugs That Can Break Normal Teacher/Student Use

- `battleLoadout` is not loaded from DB in student dashboard. The service selects `inventory` and `negamonSkills`, but returns `battleLoadout: []`, so saved defensive loadouts appear lost after refresh and battle prep can become inconsistent.
  - File: `src/lib/services/student-dashboard/get-student-dashboard.ts`

- `battleLoadout` is not selected in classroom dashboard. Teacher-side view model also injects `battleLoadout: []`, which hides real student battle presets from any teacher UI that depends on it.
  - Files:
    - `src/lib/services/classroom-dashboard/classroom-dashboard.types.ts`
    - `src/lib/services/classroom-dashboard/get-classroom-dashboard.ts`

- `PATCH /api/classrooms/[id]/gamification-settings` currently allows only `ADMIN`, while the Negamon settings dialog is used by classroom teachers. Result: teachers can open the settings UI but cannot reliably save Nagamon setup.
  - File: `src/app/api/classrooms/[id]/gamification-settings/route.ts`

- `StudentDashboardClient` builds `liveStudent` but passes the stale `student` object to `StudentDashboardMainTabs`. Result: gold, inventory, and battle loadout can stay stale after quest claim, shop purchase, or battle completion.
  - File: `src/components/student/StudentDashboardClient.tsx`

### P1: Stability Risks

- Live Nagamon reward sync sets `negamonClassroomRewardsSynced = true` before the async sync finishes. If DB/audit/notification work fails mid-sync, the game will not retry automatically.
  - File: `src/lib/game-engine/manager.ts`

- Live Nagamon currently rejects new joins once status is `PLAYING`, even when `allowLateJoin` is true. This may be intentional for a knockout-style battle, but it conflicts with classroom usability if students reconnect/arrive late.
  - File: `src/lib/socket/register-game-socket-handlers.ts`

- Live battle reward matching can fall back to player name when `studentId` is missing. This is safer than no reward, but names/nicknames can collide and lead to skipped rewards.
  - File: `src/lib/negamon/sync-negamon-battle-rewards.ts`

- EXP is written into `student.behaviorPoints`, which is also used as classroom behavior/progression points. This makes all ranking, monster evolution, and behavior point displays tightly coupled.
  - Files:
    - `prisma/schema.prisma`
    - `src/lib/classroom-utils.ts`
    - `src/lib/negamon/sync-negamon-battle-rewards.ts`

### P2: Product/UX Risks

- Teacher has reward audit/resync tools, but live failure states are not prominent enough during normal flow.
- Battle history and reward history are separate concepts; students may see gold/EXP changes without clear explanation.
- One-on-one battle and live Nagamon Battle use different reward models: one gives gold via `BattleSession`, the other gives EXP via live reward claim.

## Fix Plan

### Phase 1: Data Truth Fixes

- [x] Load `battleLoadout` in `getStudentDashboard`.
- [x] Load `battleLoadout` in `classroomDashboardSelect`.
- [x] Remove manual `battleLoadout: []` injection where possible, or preserve DB value.
- [x] Pass `liveStudent` into `StudentDashboardMainTabs` so inventory/gold/loadout patches are visible immediately.
- [x] Add regression tests that fail if `battleLoadout` is dropped from student/classroom dashboard view models.

Status: completed on 2026-05-22.

Expected outcome:

- Student defensive battle preset survives refresh.
- Battle prep consumes and removes items consistently.
- UI reflects quest/shop/battle changes without needing reload.

### Phase 2: Teacher Settings Authorization

- [x] Change `PATCH /api/classrooms/[id]/gamification-settings` to allow:
  - `ADMIN`
  - owning teacher where `classroom.teacherId === session.user.id`
- [x] Keep plan-limit validation for selected species.
- [x] Add tests:
  - owning teacher can update settings
  - non-owner teacher is forbidden
  - admin can update any classroom
  - invalid settings still return `INVALID_PAYLOAD`

Status: completed on 2026-05-22.

Expected outcome:

- Teacher can actually configure Nagamon from classroom dashboard.
- Unauthorized classroom edits remain blocked.

### Phase 3: Live Battle Reward Reliability

- [x] Move reward sync state to a safer model:
  - mark "sync in progress" separately from "synced"
  - only mark synced after `syncNegamonBattleRewardsToClassroom` succeeds or after an idempotent "already claimed" result
  - log failed sync with enough metadata for resync UI
- [x] Ensure `NegamonLiveBattleRewardClaim.idempotencyKey` remains the source of duplicate protection.
- [x] Consider storing last sync error on `ActiveGame.state` or audit log if not adding schema.
- [x] Add tests for:
  - failed sync can retry
  - duplicate claim remains safe
  - partial success does not double-award on retry

Status: completed on 2026-05-22. Current implementation stores live retry state on the in-memory game instance and logs failed sync attempts to audit metadata; durable manual recovery remains covered by existing reward audit/resync tools.

Expected outcome:

- If production DB hiccups, rewards are not silently lost.
- Manual resync remains available, but system is less dependent on human recovery.

### Phase 4: Live Join/Rejoin Rules

- [x] Decide product rule for `NEGAMON_BATTLE`:
  - Option A: no new late join, only reconnect existing players
  - Option B: allow late join as spectator/current HP participant
  - Option C: allow late join only before round 2 or while more than one active combatant exists
- [x] Record that late-join combat support is out of scope for this phase:
  - no HP/turn/reward rules are introduced for brand-new mid-match players
  - reconnect keeps the original player identity and roster slot
  - future late-join support must define HP, turn timing, ranking, and reward sync before implementation
- [x] Add socket tests for the chosen rule.

Status: completed on 2026-05-22. Chosen rule: Option A. New players cannot join an active `NEGAMON_BATTLE`; existing players with a valid reconnect token can rejoin and receive the current game state. Late-join combat rules are intentionally not implemented in this phase.

Recommended first step:

- Keep new late join blocked for active knockout battle, but make reconnect stronger and show a clearer Thai error. This is safer than adding late-join combat rules immediately.

### Phase 5: Reward/Progression Clarity

- [x] Add a teacher-facing note in economy/reward audit explaining:
  - one-on-one battle rewards gold
  - live Nagamon Battle rewards EXP/behavior points
- [x] Add student history formatting for encoded live battle reward reasons.
- [x] Review whether Nagamon EXP should stay in `behaviorPoints` or become a separate field later.

Status: completed on 2026-05-22. Current decision: keep `behaviorPoints` as the Negamon EXP/progression field for now to avoid schema/report migration risk; clarify the mode-specific reward paths in teacher-facing UI instead of splitting the data model in this phase.

Recommended long-term direction:

- Keep `behaviorPoints` for now to avoid migration risk.
- Plan a future `negamonExp` field only after production stabilizes and reports are audited.

## Key Files

- `prisma/schema.prisma`
- `src/lib/classroom-utils.ts`
- `src/lib/services/student-dashboard/get-student-dashboard.ts`
- `src/lib/services/classroom-dashboard/classroom-dashboard.types.ts`
- `src/lib/services/classroom-dashboard/get-classroom-dashboard.ts`
- `src/components/student/StudentDashboardClient.tsx`
- `src/components/student/student-dashboard-main-tabs.tsx`
- `src/components/negamon/BattleArena.tsx`
- `src/components/negamon/NegamonBattleLauncher.tsx`
- `src/components/negamon/negamon-settings.tsx`
- `src/app/api/classrooms/[id]/gamification-settings/route.ts`
- `src/app/api/classrooms/[id]/battle/route.ts`
- `src/app/api/classrooms/[id]/battle/opponents/route.ts`
- `src/app/api/student/[code]/battle-loadout/route.ts`
- `src/lib/game-engine/negamon-battle-engine.ts`
- `src/lib/game-engine/manager.ts`
- `src/lib/socket/register-game-socket-handlers.ts`
- `src/lib/negamon/sync-negamon-battle-rewards.ts`

## Test Plan

### Automated Checks

- `npm.cmd run test:negamon-battle`
- `npm.cmd run test:student-dashboard`
- `npm.cmd run test:classroom-core`
- `npm.cmd run test:negamon-reward-audit`
- `npm.cmd run predev`

### Targeted Regression Tests To Add

- [x] Student dashboard selects and returns stored `battleLoadout`.
- [x] Classroom dashboard returns stored `battleLoadout`.
- [x] `PATCH /gamification-settings` allows owning teacher.
- [x] `PATCH /gamification-settings` rejects non-owner teacher.
- [x] `StudentDashboardClient` passes patched/live student state to game tabs.
- [x] Reward sync retry does not double-award when claims already exist.

### Manual QA

- Teacher enables Nagamon, selects species, saves, refreshes, and sees settings persist.
- Teacher assigns/randomizes monsters and confirms every student row has correct monster.
- Student chooses starter, refreshes, and still has the monster.
- Student buys/sets battle item, refreshes, and loadout still appears.
- Student fights one-on-one battle; item is consumed, winner gold changes, history appears.
- Teacher launches live Nagamon Battle from classroom; students join with login codes; host sees linked identities.
- End live battle; EXP/behavior points increase once only.
- Run reward audit/resync for the game pin and confirm no duplicate awards.
- Reconnect student during live game and confirm identity remains linked.

## Deployment Order

1. Fix Phase 1 and Phase 2 first.
2. Run targeted dashboard/settings tests plus `npm.cmd run test:negamon-battle`.
3. Deploy to production.
4. Verify on production classroom:
   - settings save
   - battle loadout persists
   - one-on-one battle reward
5. Fix Phase 3 reward retry after production data path is stable.
6. Decide Phase 4 late-join product rule before changing live battle behavior.

## Exit Criteria

- Teachers can save Nagamon settings without admin-only access.
- Student and classroom dashboards preserve `battleLoadout` from DB.
- Student game tabs use live gold/inventory/loadout state after updates.
- One-on-one battle gold reward and item consumption remain idempotent.
- Live Nagamon reward sync either succeeds or leaves a recoverable audit/resync path.
- Existing command `npm.cmd run test:negamon-battle` stays green.

## Latest Validation

- `npm.cmd run test:negamon-battle` passed on 2026-05-22.
- Result: 9 files passed, 70 tests passed. Re-run after Phase 2 passed on 2026-05-22.
- `npm.cmd test -- student-dashboard-page student-dashboard-client classroom-dashboard-access` passed on 2026-05-22.
- Result: 3 files passed, 6 tests passed.
- `npm.cmd run check:student-dashboard` passed on 2026-05-22.
- Result: 18 files passed, 40 tests passed, plus `tsc --project tsconfig.server.json`.
- `npm.cmd run check:classroom-core` passed on 2026-05-22.
- Result: 17 files passed, 106 tests passed, plus `tsc --project tsconfig.server.json`.
- `npm.cmd test -- classroom-gamification-settings-route` passed on 2026-05-22.
- Result: 1 file passed, 7 tests passed.
- `npm.cmd run check:negamon-battle` passed on 2026-05-22.
- Result: 10 files passed, 74 tests passed, plus `tsc --project tsconfig.server.json`.
- `npm.cmd run test:negamon-reward-audit` passed on 2026-05-22.
- Result: 11 files passed, 34 tests passed.
- `npm.cmd test -- src/lib/socket/__tests__/register-game-socket-handlers.integration.test.ts` passed on 2026-05-22.
- Result: 1 file passed, 24 tests passed.
- `npm.cmd run check:live-game` passed on 2026-05-22.
- Result: 3 files passed, 30 tests passed, plus `tsc --project tsconfig.server.json`.
- `npm.cmd test -- src/__tests__/i18n-regression.test.ts` passed on 2026-05-22.
- Result: 1 file passed, 24 tests passed.
- `npm.cmd test -- src/__tests__/point-history-reason.test.ts src/__tests__/i18n-regression.test.ts` passed on 2026-05-22.
- Result: 2 files passed, 28 tests passed.
- `npm.cmd run test:negamon-reward-audit` passed again after Phase 5 on 2026-05-22.
- Result: 11 files passed, 34 tests passed.
- `npm.cmd run predev` passed after Phase 5 on 2026-05-22.
- Result: `tsc --project tsconfig.server.json`.
