# System Plan 09: Negamon Reward Audit / Resync

Last updated: 2026-05-03

## Scope

- Reward audit, skipped players, remediation, effectiveness, resync, reward export

## Key Files

- `src/app/api/classrooms/[id]/negamon/reward-audit`
- `src/app/api/classrooms/[id]/negamon/reward-audit/export`
- `src/app/api/classrooms/[id]/negamon/reward-remediation`
- `src/app/api/classrooms/[id]/negamon/reward-effectiveness`
- `src/app/api/classrooms/[id]/negamon/reward-resync`
- Prisma: `NegamonLiveBattleRewardClaim`, `EconomyTransaction`, `Student`

## Problem Analysis Checklist

- [ ] ตรวจ resync idempotency
- [ ] ตรวจ ambiguous/no match/duplicate student handling
- [ ] ตรวจ reward audit export authorization
- [ ] ตรวจ remediation event improves effectiveness
- [ ] ตรวจ skipped/applied/unresolved count
- [ ] ตรวจ behavior score/economy reward consistency
- [ ] ตรวจ focused game pin filter

## Improvement Plan

1. Treat resync as operational workflow
2. Add tests for every skipped reason
3. Add export and focused filter tests
4. Improve teacher remediation guidance
5. Manual QA reward audit/resync with sample data

## Validation

- `npm.cmd test -- src/__tests__/classroom-negamon-reward-*.test.ts`
- `npm.cmd test -- src/__tests__/negamon-reward-*.test.ts`
- `npm.cmd run lint`
- `npm.cmd run build`
- Manual: `docs/negamon-reward-resync-qa.md`

## Exit Criteria

- Resync ไม่จ่ายซ้ำ
- Teacher เห็นเหตุผลและทางแก้ของ reward ที่ข้าม
