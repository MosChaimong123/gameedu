# Architecture Conventions

เอกสารนี้สรุป boundary หลักของ repo หลังรอบ refactor dashboard และ route/service cleanup

## เป้าหมาย

- ลด page และ route ที่ถือ business logic ตรง ๆ
- ทำให้ UI ใช้ view model ชัดเจนแทน shape จาก Prisma หรือ JSON ดิบ
- บังคับให้ side effects วิ่งผ่าน command flow ที่ตรวจสิทธิ์และทดสอบได้

## Layer ที่ควรยึด

1. `page.tsx` / route handler
- ทำหน้าที่รับ input, auth, error mapping, render
- ไม่ควรจับ Prisma query/update ก้อนใหญ่ไว้เองถ้ามี domain logic

2. `src/lib/services/**`
- เป็นจุดหลักของ business logic
- read services คืน view model หรือ typed result
- command services ทำ transaction, validation, authorization-dependent rules

3. `src/components/**`
- แยก orchestration component ออกจาก presentational/section component
- component ใหญ่ควรถูกหั่นเป็น `header`, `toolbar`, `content`, `sidebar`, `dialog`, `panel` ตาม boundary UI

4. `src/__tests__/**`
- route tests คุม authorization และ response contract
- service tests คุม business rules
- component tests คุม orchestration และ wiring สำคัญ

## Read / Write Rule

- read flow ต้องไม่มี `db.update()` หรือ side effect ระหว่าง render
- write flow ต้องอยู่ใน command route หรือ service ที่ตั้งใจชัดเจน
- ถ้าหน้าจอต้อง auto-trigger write ให้ client เรียก command หลัง render แล้ว sync state กลับมา

## Type Rule

- UI ไม่ควร import type จาก component ใหญ่ตัวอื่นเพื่อใช้เป็น source of truth
- ใช้ type/view model กลางใน `src/lib/services/**` หรือไฟล์ `*.types.ts`
- ลด `as` casts ถ้า shape ยังไม่แน่น ให้เพิ่ม parser/schema ก่อน

## Refactor Trigger

ไฟล์ใดเข้าเงื่อนไขต่อไปนี้ควรถูกแยกเพิ่ม:

- เกิน ~400-500 บรรทัดและยังมีหลาย concern ปนกัน
- มีทั้ง fetch, state orchestration, dialog wiring, และ JSX ใหญ่ในไฟล์เดียว
- route ที่ parse payload, auth, business logic, และ response mapping ในไฟล์เดียว

## Current Hotspots

- `src/components/negamon/BattleArena.tsx`
- `src/components/classroom/add-assignment-dialog.tsx`
- `src/components/classroom/toolkit/group-maker.tsx`
- `src/app/dashboard/my-sets/page.tsx`

## Review Checklist

- page/route นี้ยังถือ business logic อยู่หรือไม่
- component นี้ render จาก stable state/view model หรือยังอ่าน mutable source ตรง ๆ
- route นี้คืน error contract ที่สม่ำเสมอหรือยัง
- test ของ flow นี้อยู่ในระดับที่ถูกชั้นหรือยัง
