# System Plan 06: Live Game / Host / Play / Socket

Last updated: 2026-05-03

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

- [ ] ตรวจ host ownership ของ question set
- [ ] ตรวจ join locked/ended/invalid room
- [ ] ตรวจ nickname duplicate
- [ ] ตรวจ reconnect host/player
- [ ] ตรวจ socket event authorization
- [ ] ตรวจ race start/end/join
- [ ] ตรวจ game history save

## Improvement Plan

1. Document socket event contract
2. Add lifecycle tests: create, join, start, answer, end, reconnect
3. Standardize socket error codes and i18n mapping
4. Harden server-authoritative state
5. Manual QA multi-tab host/player

## Validation

- `npm.cmd test -- src/lib/socket/__tests__/register-game-socket-handlers.integration.test.ts`
- `npm.cmd test -- src/__tests__/battle-read-auth-routes.test.ts`
- `npm.cmd run lint`
- `npm.cmd run build`
- Manual socket QA from `docs/socket-review-checklist.md`

## Exit Criteria

- Socket lifecycle ไม่มี state leak หรือ duplicate room
- Reconnect และ error paths test ได้
