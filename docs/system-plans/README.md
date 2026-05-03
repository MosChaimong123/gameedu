# System Plans Index

Last updated: 2026-05-03

ใช้โฟลเดอร์นี้สำหรับวิเคราะห์ปัญหาและวางแผนพัฒนาทีละระบบของ GameEdu

## Recommended Order

1. [Auth / User / Security](./01-auth-user-security.md)
2. [Classroom Core](./02-classroom-core.md)
3. [Student Dashboard / Student Code](./03-student-dashboard-code.md)
4. [Assignment / Quiz / Manual Score](./04-assignment-quiz-manual-score.md)
5. [Question Sets / Editor / Upload / AI Import](./05-question-sets-editor-upload.md)
6. [Live Game / Host / Play / Socket](./06-live-game-host-play-socket.md)
7. [Negamon Battle / Monster](./07-negamon-battle-monster.md)
8. [Economy / Shop / Ledger](./08-economy-shop-ledger.md)
9. [Negamon Reward Audit / Resync](./09-negamon-reward-audit-resync.md)
10. [OMR](./10-omr.md)
11. [Board / Classroom Social](./11-board-classroom-social.md)
12. [Billing / Plan / Subscription](./12-billing-plan-subscription.md)
13. [Admin / Audit / Management](./13-admin-audit-management.md)
14. [i18n / Localization / Accessibility](./14-i18n-localization-accessibility.md)
15. [Ops / QA / Production Readiness](./15-ops-qa-production-readiness.md)

## How To Use

1. เลือกระบบเดียวจากรายการ
2. ทำ Inventory และ Problem Analysis Checklist ในไฟล์นั้น
3. เพิ่ม tests ก่อนแก้จุดเสี่ยงถ้าเป็น behavior สำคัญ
4. แก้แบบ scoped เฉพาะระบบ
5. รัน validation ในไฟล์แผนนั้น
6. บันทึกผลและ remaining risks ก่อนย้ายไประบบถัดไป

## Global Baseline Commands

```powershell
npm.cmd run lint
npm.cmd run check:i18n:strict
npm.cmd run predev
```

ถ้าแตะ runtime, page, route, Prisma, config หรือ shared component:

```powershell
npm.cmd run build
```

ถ้าแตะ tests หรือ logic เฉพาะระบบ:

```powershell
npm.cmd test -- <targeted test files>
```

## Master Plan

ภาพรวมใหญ่ยังอยู่ที่:

- [System Analysis and Improvement Master Plan](../system-analysis-and-improvement-master-plan.md)
