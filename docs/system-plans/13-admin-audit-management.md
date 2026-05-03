# System Plan 13: Admin / Audit / Management

Last updated: 2026-05-03

## Scope

- Admin dashboard, users, roles, audit log/export, admin sets, teacher news, teacher missions

## Key Files

- `src/app/admin`
- `src/app/api/admin/*`
- Admin components/pages
- Prisma: `User`, `QuestionSet`, `TeacherNewsItem`, `TeacherMission`

## Problem Analysis Checklist

- [ ] ตรวจ admin-only routes
- [ ] ตรวจ role update audit trail
- [ ] ตรวจ audit filters/export
- [ ] ตรวจ admin set delete side effects
- [ ] ตรวจ teacher news/mission validation
- [ ] ตรวจ destructive action confirmations
- [ ] ตรวจ data exposure ใน admin pages

## Improvement Plan

1. Require admin helper in every admin route
2. Expand audit query/export tests
3. Add validation for news/mission lifecycle
4. Add UI confirmation for destructive actions
5. Manual QA with admin account

## Validation

- `npm.cmd test -- src/__tests__/admin-*.test.ts`
- `npm.cmd test -- src/__tests__/audit-log-query.test.ts src/__tests__/admin-audit-export-route.test.ts`
- `npm.cmd run lint`
- `npm.cmd run build`

## Exit Criteria

- Admin routes ไม่เปิดให้ non-admin
- Audit/export ตรวจสอบย้อนหลังได้
