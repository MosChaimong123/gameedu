# System Plan 15: Ops / QA / Production Readiness

Last updated: 2026-05-03

## Scope

- Health/readiness, build, deploy, backup/restore, monitoring, release gates, CI/test maturity

## Key Files

- `src/app/api/health`
- `src/app/api/ready`
- `scripts/check-phase1-readiness.mjs`
- `scripts/smoke-build.mjs`
- `docs/production-readiness-runbook.md`
- `docs/backup-restore-runbook.md`
- `docs/test-ci-maturity-playbook.md`

## Problem Analysis Checklist

- [ ] ตรวจ health/readiness ครอบคลุม DB/config สำคัญ
- [ ] ตรวจ build ใน env จริง
- [ ] ตรวจ missing environment variables
- [ ] ตรวจ backup/restore rehearsal
- [ ] ตรวจ flaky tests
- [ ] ตรวจ manual QA sign-off format
- [ ] ตรวจ deploy rollback path

## Improvement Plan

1. Define release gate commands
2. Add smoke checks for core routes
3. Document required env by environment
4. Rehearse backup/restore
5. Track test flakes and warnings separately

## Validation

- `npm.cmd test -- src/__tests__/health-routes.test.ts src/__tests__/env.test.ts`
- `npm.cmd run lint`
- `npm.cmd run check:i18n:strict`
- `npm.cmd run predev`
- `npm.cmd run build`
- `npm.cmd run check:phase1`

## Exit Criteria

- Production build and readiness checks pass
- Release has documented rollback and QA sign-off
