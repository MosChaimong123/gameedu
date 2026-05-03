# System Plan 03: Student Dashboard / Student Code

Last updated: 2026-05-03

## Scope

- Student code login, student dashboard, sync account, check-in, quests, notifications, shop entry

## Key Files

- `src/app/student`
- `src/app/student/[code]`
- `src/app/api/student/[code]/sync`
- `src/app/api/student/[code]/checkin`
- `src/app/api/student/[code]/daily-quests`
- `src/app/api/student/[code]/notifications`
- `src/app/api/student/[code]/shop/buy`
- `src/app/api/student/[code]/shop/equip`
- Prisma: `Student`, `Notification`, `EconomyTransaction`, `StudentAchievement`

## Problem Analysis Checklist

- [ ] ตรวจ student code validation และ expired/invalid code
- [ ] ตรวจ student เห็นเฉพาะ classroom ของตัวเอง
- [ ] ตรวจ sync account ไม่สร้าง duplicate identity
- [ ] ตรวจ check-in/passive gold idempotency
- [ ] ตรวจ notifications ไม่ leak classroom อื่น
- [ ] ตรวจ dashboard tabs และ empty/locked states
- [ ] ตรวจ Thai/English text บน mobile

## Improvement Plan

1. ทำ student code route inventory
2. เพิ่ม tests สำหรับ invalid/unauthorized student code
3. เพิ่ม idempotency tests สำหรับ check-in/rewards
4. ตรวจ dashboard component state และ i18n
5. ทำ manual QA ด้วย student login code จริง

## Validation

- `npm.cmd test -- src/__tests__/student-login-code.test.ts src/__tests__/student-sync-route.test.ts`
- `npm.cmd test -- src/__tests__/student-checkin-route.test.ts src/__tests__/student-passive-gold-route.test.ts src/__tests__/student-notifications-route.test.ts`
- `npm.cmd test -- src/__tests__/student-dashboard-*.test.ts`
- `npm.cmd run lint`
- `npm.cmd run build`

## Exit Criteria

- Student code flow ปลอดภัยและไม่ leak ข้อมูล
- Dashboard ใช้งานได้ครบทั้ง teacher-linked และ code-only states
