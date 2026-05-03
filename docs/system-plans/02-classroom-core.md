# System Plan 02: Classroom Core

Last updated: 2026-05-03

## Scope

- Classroom CRUD, students, skills, points, attendance, groups, leaderboard, analytics

## Key Files

- `src/app/dashboard/classrooms`
- `src/app/api/classrooms`
- `src/app/api/classrooms/[id]`
- `src/app/api/classrooms/[id]/students`
- `src/app/api/classrooms/[id]/skills`
- `src/app/api/classrooms/[id]/points`
- `src/app/api/classrooms/[id]/attendance`
- `src/app/api/classrooms/[id]/groups`
- `src/app/api/classrooms/[id]/leaderboard`
- Prisma: `Classroom`, `Student`, `Skill`, `PointHistory`, `AttendanceRecord`, `StudentGroup`

## Problem Analysis Checklist

- [ ] ตรวจ teacher ownership ทุก classroom route
- [ ] ตรวจ student mutation ไม่ข้าม classroom
- [ ] ตรวจ point history มี reason/audit ครบ
- [ ] ตรวจ attendance save/history/delete ไม่ทำข้อมูลหาย
- [ ] ตรวจ groups score sync และ edge case empty group
- [ ] ตรวจ leaderboard/analytics นับตรงกับข้อมูลจริง
- [ ] ตรวจ loading/empty/error states ของ dashboard

## Improvement Plan

1. ทำ ownership guard เป็น shared pattern
2. เพิ่ม tests สำหรับ cross-classroom access
3. ตรวจ data integrity ของ points/attendance/groups
4. ปรับ dashboard state ให้ครบ empty/loading/error
5. เพิ่ม manual QA classroom flow

## Validation

- `npm.cmd test -- src/__tests__/classroom-points-authorization.test.ts src/__tests__/attendance-save.test.ts src/__tests__/points-isolation.test.ts`
- `npm.cmd test -- src/__tests__/classroom-analytics-route.test.ts src/__tests__/classroom-dashboard-component.test.ts`
- `npm.cmd run lint`
- `npm.cmd run predev`
- `npm.cmd run build`

## Exit Criteria

- Classroom data isolation ผ่านทุก route
- คะแนน/เช็กชื่อ/กลุ่มมี regression tests
- Dashboard ใช้งานได้ทั้ง state ว่างและมีข้อมูล
