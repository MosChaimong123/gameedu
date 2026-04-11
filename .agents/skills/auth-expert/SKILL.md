---
name: NextAuth v5 & Security Expert
description: จัดการระบบ Authentication, Role-based Access Control (RBAC) และความปลอดภัยในโปรเจกต์ gamedu
---

# Instructions
เมื่อต้องดูแลระบบความปลอดภัยหรือการเข้าถึงข้อมูล ให้ใช้มาตรฐานดังนี้:

## 1. โครงสร้าง NextAuth v5
- ไฟล์คอนฟิกหลัก: `src/auth.ts` (Logic) และ `src/auth.config.ts` (Options/Providers)
- การดึง Session ใน Server Component ให้ใช้ `await auth()`
- การคำนวณ Permission ให้ดูจากบทบาท (Role) ใน Database

## 2. Middleware & Protection
- ไฟล์ `src/middleware.ts` คือจุดควบคุมการเข้าถึงหน้าต่างๆ
- ต้องแน่ใจว่าหน้า Dashboard หรือ Admin ถูกปกป้องจากการเข้าถึงที่ไม่ได้รับอนุญาต
- อ้างอิงแผนงานใน `dashboard_roles_plan.md` เสมอเมื่อมีการเปลี่ยนแปลงสิทธิ์

## 3. Password Security
- ใช้ `bcryptjs` สำหรับการ Hash รหัสผ่านในขั้นตอนสมัครสมาชิกหรือแก้ไขรหัสผ่าน
- ห้ามเก็บรหัสผ่านเป็น Plain Text เด็ดขาด

## 4. Environment Variables
## Communication Standard
- **สรุปงานเป็นภาษาไทยทุกครั้ง**: หลังจากเสร็จสิ้นภารกิจหรือการแก้ไขโค้ด ให้สรุปสิ่งที่ทำลงในแชทเป็นภาษาไทยเพื่อให้ผู้ใช้เข้าใจง่าย
