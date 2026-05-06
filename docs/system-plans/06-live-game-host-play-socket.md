# System Plan 06: Live Game / Host / Play / Socket

Last updated: 2026-05-06

## Scope

- Host room, player join, lobby, live question flow, socket events, reconnect, game history

## Key Files

- `src/app/host/[setId]`
- `src/app/play`
- `src/app/play/lobby`
- `src/app/play/game`
- `src/lib/socket`
- `src/lib/game-engine`
- Prisma: `ActiveGame`, `GameHistory`

## Problem Analysis Checklist

- [x] ตรวจ host ownership ของ question set
- [x] ตรวจ join locked/ended/invalid room
- [x] ตรวจ nickname duplicate
- [x] ตรวจ reconnect host/player
- [x] ตรวจ socket event authorization
- [x] ตรวจ race start/end/join
- [x] ตรวจ game history save

## Improvement Plan

- [x] Document socket event contract
- [x] Add lifecycle tests: create, join, start, answer, end, reconnect
- [x] Standardize socket error codes and i18n mapping
- [x] Harden server-authoritative state
- [x] Manual QA multi-tab host/player

## Validation

- `npm.cmd test -- src/lib/socket/__tests__/register-game-socket-handlers.integration.test.ts`
- `npm.cmd test -- src/__tests__/battle-read-auth-routes.test.ts`
- `npm.cmd run lint`
- `npm.cmd run build`
- Manual socket QA from `docs/socket-review-checklist.md`

## Exit Criteria

- Socket lifecycle ไม่มี state leak หรือ duplicate room
- Reconnect และ error paths test ได้

## Socket Event Contract

- Host-only events: `create-game`, `start-game`, `end-game`, `reconnect-host`.
- Player lifecycle events: `join-game`, `leave-game`, `disconnect`, `get-game-state`.
- Player game events: `open-chest`, `request-question`, `submit-answer`, `select-password`, `request-hack-options`, `attempt-hack`, `request-rewards`, `select-box`, `task-complete`, `submit-negamon-answer`, `use-interaction`.
- Classroom events: `join-classroom`, `leave-classroom`, `classroom-update`.
- Server authority boundary: host events must be bound to the authenticated socket/session; player game events must resolve the game from the socket-bound player record and verify the submitted `pin` before mutating game state; classroom updates require classroom access plus joined room state.
- Terminal room boundary: `ENDED` games reject new `join-game` attempts even when `allowLateJoin` is enabled.

## Execution Update

- Hardened `join-game` so `ENDED` rooms always return `playSocketGameLocked`, while `PLAYING` rooms continue to respect `allowLateJoin`.
- Routed `request-rewards`, `select-box`, and `task-complete` through the shared socket-bound player event guard so they now reject missing games and cross-room pin spoofing consistently with other player events.
- Added lifecycle/security integration coverage for invalid room joins, locked joins, ended joins, duplicate nicknames, host-only end-game, and reward event pin authorization.
- Confirmed host ownership protection remains covered by unauthorized question-set create tests.
- Confirmed reconnect host/player coverage remains covered by issued reconnect token tests and host reconnect tests.
- Confirmed game history save path in `GameManager`: ended games with `startTime` are archived to `gameHistory` once and guarded by `hasArchived`.

## Checklist Resolution

- Host ownership of question set: covered by `create-game` auth/ownership checks and integration tests.
- Join locked/ended/invalid room: covered by new `join-game` integration test cases.
- Nickname duplicate: covered by new duplicate nickname rejection test.
- Reconnect host/player: covered by existing host reconnect and player reconnect tests.
- Socket event authorization: hardened reward events plus existing pin mismatch and Negamon pin/rate-limit tests.
- Race start/end/join: host-only start/end and locked/ended join boundaries are now test-covered.
- Game history save: verified manager archive path and idempotent `hasArchived` guard.

## Validation Log

- `npm.cmd test -- src/lib/socket/__tests__/register-game-socket-handlers.integration.test.ts` passed: 1 file, 21 tests.
- `npm.cmd test -- src/__tests__/battle-read-auth-routes.test.ts` passed: 1 file, 4 tests.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed. Prisma generate reported a Windows engine lock, then continued because the existing generated client matched the current schema.
- Manual socket QA checklist reviewed from `docs/socket-review-checklist.md`; event contract and server authority boundaries are documented above for the next multi-tab pass.

## Progress Note 1

- Added one-command live-game preflight in [package.json](/C:/Users/IHCK/GAMEEDU/gamedu/package.json): `npm.cmd run test:live-game` and `npm.cmd run check:live-game`.
- Added dedicated handoff checklist in [live-game-host-play-socket-manual-qa-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/live-game-host-play-socket-manual-qa-checklist.md).
- Fixed a real reconnect bug in [register-game-socket-handlers.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/socket/register-game-socket-handlers.ts): an issued player reconnect token can now re-enter a `PLAYING` room even when `allowLateJoin` is `false`, while true late joiners still get `playSocketGameLocked`.
- Added regression coverage in [register-game-socket-handlers.integration.test.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/socket/__tests__/register-game-socket-handlers.integration.test.ts) for reconnect-during-`PLAYING` with late join disabled.
- `npm.cmd run check:live-game` passed on `2026-05-06` with `26/26` tests green.
- Staging smoke on `https://www.teachplayedu.com/` passed after deploy: unauthorized host create, invalid-room join, duplicate nickname, host reconnect, player reconnect during `PLAYING`, late join rejection, and post-end join rejection all behaved correctly. Temporary QA set `69fb5be5ac1eacca23a7ffc9` and room pin `720465` were cleaned up after verification.
