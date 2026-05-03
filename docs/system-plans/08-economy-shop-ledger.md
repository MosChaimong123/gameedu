# System Plan 08: Economy / Shop / Ledger

Last updated: 2026-05-03

## Scope

- Gold ledger, shop buy/equip, passive gold, admin adjustment, analytics, reconciliation

## Key Files

- `src/app/api/classrooms/[id]/economy/*`
- `src/app/api/student/[code]/shop/buy`
- `src/app/api/student/[code]/shop/equip`
- `src/app/api/student/[code]/claim-passive-gold`
- Prisma: `EconomyTransaction`, `Student`

## Problem Analysis Checklist

- [ ] ตรวจ transaction idempotency
- [ ] ตรวจ balance ไม่ mismatch กับ ledger
- [ ] ตรวจ shop buy/equip ownership และ affordability
- [ ] ตรวจ passive gold duplicate claim
- [ ] ตรวจ teacher adjustment scope
- [ ] ตรวจ CSV export authorization
- [ ] ตรวจ reconciliation รายงาน mismatch ชัด

## Improvement Plan

1. Review ledger write paths
2. Add idempotency keys/service boundary where needed
3. Strengthen reconciliation and export tests
4. Add teacher adjustment UI QA
5. Review economy abuse limits

## Validation

- `npm.cmd test -- src/__tests__/economy-ledger-idempotency.test.ts`
- `npm.cmd test -- src/__tests__/classroom-economy-*-route.test.ts`
- `npm.cmd test -- src/__tests__/student-shop-ledger.test.ts src/__tests__/student-quest-ledger.test.ts`
- `npm.cmd run lint`
- `npm.cmd run build`

## Exit Criteria

- Retry/reload ไม่ duplicate gold
- Reconciliation ตรวจและอธิบาย mismatch ได้
