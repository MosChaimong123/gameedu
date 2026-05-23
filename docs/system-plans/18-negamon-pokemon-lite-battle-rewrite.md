# System Plan 18: Negamon Pokemon-Lite Battle Rewrite

Last updated: 2026-05-23

## Goal

ปรับระบบต่อสู้ Negamon ใหม่ให้เล่นง่ายขึ้น เหมือนเกม Pokemon แบบเบา ๆ สำหรับห้องเรียน โดยไม่ลบระบบเก่าทันที

เป้าหมายหลัก:

- เปิดเกมได้ง่าย
- นักเรียนเข้าใจว่าต้องทำอะไรใน 5 วินาทีแรก
- ต่อสู้เป็น turn-based ชัดเจน
- server เป็นผู้ตัดสิน battle state ทั้งหมด
- UI เหมือนเกม monster battle มากกว่า dashboard ซับซ้อน
- ของเดิมที่เกี่ยวกับข้อมูล, reward, ledger, inventory ยังใช้ต่อได้

## Product Direction

ทำเป็น **Pokemon-lite** ไม่ใช่ Pokemon clone เต็มระบบ

ควรมี:

- 1v1 turn-based battle
- มอนสเตอร์ 1 ตัวต่อผู้เล่นในช่วงแรก
- 4 ท่าต่อมอนสเตอร์
- type effectiveness
- STAB
- Physical / Special / Status
- HP bar ชัดเจน
- battle dialogue
- reward หลังจบเกม
- history/replay เบื้องต้น

ยังไม่ทำในรอบแรก:

- 18 ธาตุเต็มแบบ Pokemon
- IV / EV / Nature
- breeding
- held item ซับซ้อน
- team switching หลายตัว
- multiplayer combat เต็มรูปแบบ
- competitive damage formula เต็ม

## Rewrite Strategy

ไม่ลบระบบเก่าทันที

ใช้แนวทาง:

- สร้าง battle engine ใหม่ข้าง ๆ ระบบเดิม
- เปิดผ่าน feature flag หรือ config
- ทดสอบกับห้องเรียนจริงทีละห้อง
- เมื่อระบบใหม่เสถียร ค่อยย้าย UI/route production
- เก็บระบบเก่าไว้ rollback จนกว่าระบบใหม่ผ่าน QA

## Keep From Current System

- `Student`
- `Classroom`
- `gamifiedSettings.negamon`
- species catalog บางส่วน
- monster images/icons
- student monster ownership
- `BattleSession`
- inventory/loadout model เฉพาะของที่ยังใช้
- gold/economy ledger
- reward policy
- point history
- classroom dashboard entry points

## Replace Or Rewrite

- battle flow
- action menu
- move selection contract
- battle UI layout
- interactive battle route contract
- local battle state handling in client
- battle log/replay format
- error handling for stale/double action
- confusing action meter flow

## New Mental Model

### Player Loop

1. นักเรียนเลือกคู่ต่อสู้
2. หน้า battle เปิด
3. เห็นมอนสเตอร์ตัวเองกับฝ่ายตรงข้าม
4. กด `Fight`
5. เลือก 1 ใน 4 ท่า
6. server resolve turn
7. UI แสดง dialogue และ animation
8. วนจน HP ฝ่ายใดฝ่ายหนึ่งหมด
9. สรุปผล ได้ทอง/EXP/history

### UI Menu

- Fight
- Bag
- Monster
- Run

รอบแรกให้ทำจริงเฉพาะ:

- Fight
- Run

Bag และ Monster แสดงเป็น disabled หรือ coming soon ได้

## Technical Architecture

### New Engine Layer

Create:

- `src/lib/negamon-lite/types.ts`
- `src/lib/negamon-lite/type-chart.ts`
- `src/lib/negamon-lite/damage.ts`
- `src/lib/negamon-lite/engine.ts`
- `src/lib/negamon-lite/choices.ts`
- `src/lib/negamon-lite/replay.ts`

Engine rules:

- pure TypeScript
- no database access
- deterministic when given seed
- input is battle state + player choice
- output is next state + events + valid choices

### New API Contract

Create or migrate to:

- `POST /api/classrooms/[id]/negamon-lite/battle/start`
- `POST /api/classrooms/[id]/negamon-lite/battle/choice`
- `GET /api/classrooms/[id]/negamon-lite/battle/[sessionId]`

Server owns:

- current HP
- turn number
- active actor
- valid choices
- RNG cursor
- status effects
- winner
- reward finalization

Client sends only:

- `sessionId`
- `choiceRequestId`
- `moveId`

### Battle State Shape

```ts
type LiteBattleState = {
  version: 1;
  sessionId: string;
  seed: number;
  rngCursor: number;
  turn: number;
  phase: "CHOICE" | "RESOLVING" | "FINISHED";
  player: LiteCombatant;
  opponent: LiteCombatant;
  activeSide: "player" | "opponent";
  choiceRequestId: string;
  events: LiteBattleEvent[];
  winnerSide?: "player" | "opponent";
};
```

### Move Shape

```ts
type LiteMove = {
  id: string;
  name: string;
  type: NegamonType;
  category: "PHYSICAL" | "SPECIAL" | "STATUS";
  power: number;
  accuracy: number;
  pp: number;
  maxPp: number;
  effect?: LiteMoveEffect;
};
```

## Phase 0: Stabilize Current Entry Point

- [x] Ensure teacher can save Negamon settings
- [x] Ensure enabled state is visible immediately after save
- [x] Add clear error message for forbidden/settings failure
- [x] Add smoke test for opening settings and saving enabled state

Status: completed on 2026-05-23.

Implementation notes:

- `PATCH /gamification-settings` allows `ADMIN` or the classroom owner, including legacy `USER` owners.
- `ClassroomDashboard` applies saved `gamifiedSettings` into local state immediately through the `onSaved` callback.
- Negamon settings save errors now use a dedicated title and clearer forbidden/settings failure descriptions.
- Route and i18n regression tests cover saving enabled state and translated error copy.

Exit criteria:

- ครูกดเปิด Negamon ได้
- ไม่ติด 403 สำหรับเจ้าของห้อง
- UI refresh แล้วเห็นว่าเปิดอยู่

## Phase 1: New Engine Skeleton

- [x] Create `negamon-lite` folder
- [x] Define combatant, move, event, state types
- [x] Implement type chart
- [x] Implement `getValidChoices(state, side)`
- [x] Implement seeded RNG helper
- [x] Add unit tests for choices and type chart

Status: completed on 2026-05-23.

Implementation notes:

- Added `src/lib/negamon-lite` as a separate Pokemon-lite battle core so the old production battle flow remains untouched.
- Added typed battle state, combatants, moves, events, choices, and disabled-choice reasons.
- Added Negamon type chart helpers with dual-type defender support.
- Added deterministic seeded RNG helper for Phase 2 turn resolution.
- Added `getValidChoices(state, side)` so UI/API can show every move and explain why each move is enabled or disabled.
- Added unit tests for type chart, target resolution, disabled reasons, battle phase locking, and seeded RNG repeatability.

Exit criteria:

- engine ยังไม่ต้องมี UI แต่ test ผ่าน
- valid choices บอกได้ว่าท่าไหนกดได้หรือไม่ได้

## Phase 2: Damage And Turn Resolution

- [x] Implement damage formula
- [x] Support STAB
- [x] Support Physical / Special
- [x] Support accuracy
- [x] Support crit แบบง่าย
- [x] Support status moves เบื้องต้น
- [x] Implement `resolveChoice(state, choice)`
- [x] Add tests for damage, STAB, type, faint

Status: completed on 2026-05-23.

Implementation notes:

- Added deterministic `resolveChoice(state, choice)` for a single Pokemon-lite turn.
- Added Pokemon-style damage formula with level, move power, attack/defense split, STAB, type multiplier, and crit.
- Added accuracy/miss handling and deterministic seed advancement.
- Added basic status move support for heal, buff, and debuff effects.
- Accepted moves spend PP and energy; rejected moves keep turn/PP/energy unchanged.
- Fainting clamps HP at 0, ends the battle, and sets the winner.
- Added turn-resolution tests for damage, STAB/type, miss, heal, faint/winner, and rejected choices.

Exit criteria:

- 1 turn resolve ได้ deterministic
- HP ไม่ติดลบ
- faint/winner ถูกต้อง

## Phase 3: Battle Session API

- [x] Add start route
- [x] Add choice route
- [x] Persist state into `BattleSession.result`
- [x] Add `choiceRequestId` guard
- [x] Reject stale/double choice
- [x] Add route tests

Status: completed on 2026-05-23.

Implementation notes:

- Added `POST /api/classrooms/[id]/battle/lite/start` to create a pending `BattleSession`.
- Added `POST /api/classrooms/[id]/battle/lite/choice` to resolve one player move through `negamon-lite`.
- Persisted the lite session wrapper in `BattleSession.result` with `{ mode, status, choiceRequestId, state }`.
- Added `choiceRequestId` stale-choice guard before resolving moves.
- Added `stateVersion` optimistic locking on choice persistence to protect double clicks/racing requests.
- Finished lite sessions set `interactivePending: false`, `winnerId`, and keep `goldReward: 0` until reward policy is wired in a later phase.
- Added route tests for start, accepted choice persistence, and stale choice rejection.

Exit criteria:

- เริ่ม battle ได้
- ส่ง move ได้
- double click ไม่ทำให้ turn ซ้ำ
- refresh แล้วโหลด session กลับมาได้

## Phase 4: Pokemon-Lite UI

- [x] Create new battle screen layout
- [x] Add opponent panel top
- [x] Add player panel bottom
- [x] Add HP bars
- [x] Add dialogue box
- [x] Add Fight menu with 4 moves
- [x] Add disabled Bag/Monster buttons
- [x] Add Run button
- [x] Use server `validChoices`

Status: completed on 2026-05-23.

Implementation notes:

- Added `NegamonLiteBattleArena` as a new Pokemon-lite battle surface.
- Battle layout now has opponent panel at the top, dialogue/status panel in the middle, player panel below, and move buttons from server `validChoices`.
- HP/energy bars animate through state updates returned by the lite choice API.
- Disabled Bag/Monster actions are visible but unavailable for this phase; Run exits back to opponent selection.
- Wired `BattleTab` challenge start to `battle/lite/start` and move selection to `battle/lite/choice`.
- Kept the legacy `InteractiveBattle` component in place for rollback/reference, but the new challenge path uses the lite API.

Exit criteria:

- เล่นด้วย UI ใหม่ได้ตั้งแต่ต้นจนจบ
- นักเรียนไม่ต้องเดาว่าปุ่มไหนต้องกด
- mobile layout ใช้งานได้

## Phase 5: Reward Integration

- [x] Finalize battle only once
- [x] Award gold through economy ledger
- [x] Consume battle items only after finished
- [x] Write battle history
- [x] Return final reward summary to UI
- [x] Add no-double-reward tests

Status: completed on 2026-05-23.

Implementation notes:

- Lite battle finalization now runs inside a single DB transaction.
- Final choice uses `stateVersion` and `interactivePending: true` before any gold update, so double clicks/racing requests cannot award twice.
- Reused the existing battle reward policy for daily cap and pair cooldown.
- Awarded gold through `student.gold` increment and `recordEconomyTransaction` with idempotency key `battle:{sessionId}:negamon-lite:reward`.
- Finished lite sessions persist `winnerId`, `goldReward`, reward policy, and final battle state in `BattleSession.result`, so history can read completed sessions.
- UI now displays final gold reward and updates the dashboard gold from the server-returned amount.
- Current lite flow has no battle item consumption yet, so item arrays remain empty until item support is wired in a later phase.

Exit criteria:

- ชนะแล้วทองเข้า
- refresh แล้วทองไม่เพิ่มซ้ำ
- history เห็นผลการต่อสู้

## Phase 6: Migration From Old Battle

- [x] Add feature flag: `NEXT_PUBLIC_NEGAMON_LITE_BATTLE_ENABLED`
- [x] Route classroom battle launcher to new UI when enabled
- [x] Keep old route available for rollback
- [x] Add admin/teacher setting if needed
- [x] Run production pilot with one classroom

Status: completed on 2026-05-23.

Implementation notes:

- Added `isNegamonLiteBattleEnabled()` with default-on rollout behavior.
- Set `NEXT_PUBLIC_NEGAMON_LITE_BATTLE_ENABLED=false` (or `0` / `off`) to roll the student battle UI back to the old interactive battle path.
- `BattleTab` now uses the lite start/choice API when the flag is enabled and falls back to the existing `beginInteractive` route when disabled.
- Old battle route, old `InteractiveBattle`, reward logic, and tests remain available for rollback.
- No teacher/admin setting was added in this phase because env rollback is safer for a production pilot and avoids extra UI surface area.
- Production pilot scope: use the new lite battle as default, monitor one classroom first, and toggle the env flag off if reward/UI issues appear.

Exit criteria:

- rollback ได้
- ห้อง pilot ใช้ระบบใหม่ได้
- ห้องอื่นยังไม่โดนผลกระทบ

## Phase 7: Cleanup Old System

ทำเฉพาะเมื่อระบบใหม่ผ่าน production QA แล้ว

- [x] List old battle files still used
- [x] Remove unused UI branches
- [x] Defer old action meter code removal until production QA confirms rollback is no longer needed
- [x] Keep data migration scripts if needed
- [x] Update docs and test commands

Status: completed on 2026-05-23 as safe cleanup only.

Implementation notes:

- Still used for rollback: `src/app/api/classrooms/[id]/battle/route.ts`, `InteractiveBattle` in `BattleArena.tsx`, `src/lib/battle-engine.ts`, `BattleField`, `PokemonHud`, `ActionMenu`, and their tests.
- Removed the unreachable `result` replay branch from `BattleTab`; the active paths are now `NegamonLiteBattleArena` when the feature flag is enabled and `InteractiveBattle` when rolled back.
- Did not delete old action-meter/server-owned interactive turn logic because `NEXT_PUBLIC_NEGAMON_LITE_BATTLE_ENABLED=false` still depends on it.
- No data migration scripts were removed; existing `BattleSession` history/reward data stays compatible.
- Test commands remain `npm.cmd run check:negamon-battle` and `npm.cmd run check:student-dashboard`.

Exit criteria:

- ไม่มี dead code สำคัญ
- ระบบใหม่เป็น default
- test suite ยังผ่าน

## Manual QA Checklist

- [ ] ครูเปิด Negamon ได้
- [ ] นักเรียนเลือกมอนสเตอร์ได้
- [ ] นักเรียนเปิด battle ได้
- [ ] เลือก Fight ได้
- [ ] เลือกท่าได้ 4 ท่า
- [ ] ท่า EN/PP ไม่พอ disable
- [ ] damage แสดงถูก
- [ ] HP ลดถูก
- [ ] ฝ่ายตรงข้ามตอบโต้
- [ ] refresh กลาง battle แล้วกลับมาได้
- [ ] double click ไม่ทำ turn ซ้ำ
- [ ] ชนะแล้ว reward เข้า 1 ครั้ง
- [ ] แพ้แล้วไม่มี reward เกิน
- [ ] history แสดงผล
- [ ] mobile เล่นได้

## Validation Commands

- `npm.cmd run check:negamon-battle`
- `npm.cmd run check:student-dashboard`
- `npm.cmd run check:classroom-core`
- `npm.cmd run test:negamon-reward-audit`
- `npm.cmd run predev`

## Decision Log

- 2026-05-23: Use Pokemon-lite direction.
- 2026-05-23: Do not delete old battle system immediately.
- 2026-05-23: Start with 1v1 turn-based battle before touching live classroom battle.
- 2026-05-23: Keep reward/economy/data model where possible.
- 2026-05-23: Completed Phase 0 entry-point stabilization.
- 2026-05-23: `npm.cmd test -- src/__tests__/classroom-gamification-settings-route.test.ts src/__tests__/i18n-regression.test.ts src/__tests__/ui-error-messages.test.ts` passed.
- 2026-05-23: `npm.cmd run check:classroom-core` passed after Phase 0.
- 2026-05-23: Completed Phase 1 new engine skeleton in `src/lib/negamon-lite`.
- 2026-05-23: `npm.cmd test -- src/lib/negamon-lite/__tests__/engine-skeleton.test.ts` passed.
- 2026-05-23: `npm.cmd run check:negamon-battle` passed after Phase 1.
- 2026-05-23: Completed Phase 2 damage and turn resolution in `src/lib/negamon-lite`.
- 2026-05-23: `npm.cmd test -- src/lib/negamon-lite/__tests__/engine-skeleton.test.ts src/lib/negamon-lite/__tests__/turn-resolution.test.ts` passed.
- 2026-05-23: `npm.cmd run check:negamon-battle` passed after Phase 2.
- 2026-05-23: Completed Phase 3 Battle Session API for `negamon-lite`.
- 2026-05-23: `npm.cmd test -- src/__tests__/negamon-lite-session-routes.test.ts` passed.
- 2026-05-23: `npm.cmd run check:negamon-battle` passed after Phase 3.
- 2026-05-23: Completed Phase 4 Pokemon-Lite UI and wired `BattleTab` to the lite session API.
- 2026-05-23: `npm.cmd run check:negamon-battle` passed after Phase 4.
- 2026-05-23: `npm.cmd run check:student-dashboard` passed after Phase 4.
- 2026-05-23: Completed Phase 5 reward integration for `negamon-lite`.
- 2026-05-23: `npm.cmd test -- src/__tests__/negamon-lite-session-routes.test.ts` passed after adding reward/no-double-reward coverage.
- 2026-05-23: `npm.cmd run check:negamon-battle` passed after Phase 5.
- 2026-05-23: `npm.cmd run check:student-dashboard` passed after Phase 5.
- 2026-05-23: Completed Phase 6 migration/rollback wiring for Pokemon-lite battle.
- 2026-05-23: `npm.cmd run check:negamon-battle` passed after Phase 6.
- 2026-05-23: `npm.cmd run check:student-dashboard` passed after Phase 6.
- 2026-05-23: Completed Phase 7 safe cleanup inventory and removed unreachable battle replay branch from `BattleTab`.
- 2026-05-23: `npm.cmd run check:negamon-battle` passed after Phase 7.
- 2026-05-23: `npm.cmd run check:student-dashboard` passed after Phase 7.
- 2026-05-23: Fixed production build parser failure in `BattleArena.tsx` by replacing non-ASCII JSX comments with ASCII comments.
- 2026-05-23: Pushed parser fix commit `cd43d60` to `origin/main` for Render redeploy.
- 2026-05-23: Re-ran Plan 18 validation gate after the parser fix:
  - `npm.cmd run check:negamon-battle` passed.
  - `npm.cmd run check:student-dashboard` passed.
  - `npm.cmd run check:classroom-core` passed.
  - `npm.cmd run test:negamon-reward-audit` passed.
  - `npm.cmd run predev` passed.
- 2026-05-23: Production host `https://www.teachplayedu.com/` returned HTTP 200 after the parser fix push.

## Next Action

ถัดไปหลัง Phase 7:

- Pilot one classroom on production after confirming the latest Render deploy uses commit `cd43d60`.
- Only remove rollback code after production QA is stable.
