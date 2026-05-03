# System Plan 07: Negamon Battle / Monster

Last updated: 2026-05-03

## Scope

- Monster state, battle engine, moves, passives, statuses, items, battle UI, codex, loadout

## Key Files

- `src/components/negamon/*`
- `src/lib/game-engine`
- `src/lib/negamon`
- `src/app/api/classrooms/[id]/battle`
- `src/app/api/classrooms/[id]/battle/opponents`
- `src/app/api/student/[code]/battle-loadout`
- `src/app/api/student/[code]/negamon/unlock-skill`
- Prisma: `BattleSession`

## Problem Analysis Checklist

- [ ] ตรวจ battle engine server-authoritative
- [ ] ตรวจ move/status/passive edge cases
- [ ] ตรวจ battle session idempotency
- [ ] ตรวจ loadout item ownership/category limit
- [ ] ตรวจ reward result sync กับ economy
- [ ] ตรวจ battle UI hooks/lint/mobile layout
- [ ] ตรวจ auto mode/speed/rematch

## Improvement Plan

1. Lock battle engine contract with tests
2. Add scenario tests for statuses/passives/items
3. Separate engine fixes from UI polish
4. Add battle UI manual QA checklist
5. Review balance/tuning after correctness

## Validation

- `npm.cmd test -- src/lib/game-engine/__tests__/negamon-battle-engine.test.ts`
- `npm.cmd test -- src/lib/__tests__/negamon-battle-balance.test.ts src/lib/__tests__/battle-loadout-and-gold.test.ts`
- `npm.cmd run lint`
- `npm.cmd run build`

## Exit Criteria

- Battle result เชื่อถือ server ได้
- UI ไม่มี hook lint errors และเล่น flow หลักจบได้
