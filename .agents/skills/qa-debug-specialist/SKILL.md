---
name: QA & Debugging Specialist
description: เชี่ยวชาญการตรวจสอบโค้ด, วิเคราะห์ Error และควบคุมมาตรฐานความสม่ำเสมอของระบบ (Server/Client, Types, Linting)
---

# QA & Debugging Specialist Skill

ทุกครั้งที่มีการ Debug หรือตรวจสอบความถูกต้องของโค้ด ให้ปฏิบัติตามมาตรฐานนี้:

## 1. การตรวจสอบ Server vs Client Components
- งานที่ใช้ `framer-motion`, `useState`, `useEffect`, หรือ `เหตุการณ์การคลิก` ต้องอยู่ในไฟล์ที่มี `"use client"`
- หากหน้าหลัก (Page) จำเป็นต้องดึงข้อมูลจาก Database (Prisma) ให้ใช้โครงสร้าง **"Server Page + Client View Component"**
    - `page.tsx`: ดึงข้อมูลจาก `auth()` และ `db` แล้วส่ง Prop ไปยัง Client Component
    - `ClientComponent.tsx`: รับ Prop และจัดการ UI/Animation

## 2. การจัดการ Runtime Errors (ReferenceError)
- เมื่อเจอ `[Variable] is not defined`:
    - ตรวจสอบ `import` ที่ด้านบนของไฟล์เสมอ
    - ตรวจสอบว่าตัวแปรถูกส่งผ่าน Prop มายัง Client Component ครบถ้วนหรือไม่
    - ห้ามละเลยการตรวจสอบ `import { motion } from "framer-motion"` เมื่อมีการใช้คอมโพเนนต์ `<motion.div>`

## 3. มาตรฐานการทำ Type Checking & Linting
- ตรวจสอบ `types` ของ Prop ทุกครั้งที่สร้าง Component ใหม่
- หากมีการเปลี่ยน Schema ใน Prisma ให้ใช้การ Cast `as any` ชั่วคราวเฉพาะจุดที่จำเป็น (หาก Prisma Client ยังไม่ได้ Re-generate) แต่ต้องมีคอมเมนต์อธิบาย

## 4. ขั้นตอนการ Debug มาตรฐาน
1. **Analyze**: อ่าน Call Stack จาก Terminal หรือ Browser Console อย่างละเอียด
2. **Isolate**: ตรวจสอบว่าเป็นปัญหาที่ Data (Server) หรือ Logic (Client)
3. **Fix & Verify**: เมื่อแก้ไขแล้ว ต้องรันเช็คว่าไม่กระทบส่วนอื่น (Regression Testing)

## 5. เครื่องมือแนะนำ
- ใช้ `console.log` แบบระบุตำแหน่ง: `console.log("[DEBUG] ComponentName:", data)`
## Communication Standard
- **สรุปงานเป็นภาษาไทยทุกครั้ง**: หลังจากเสร็จสิ้นภารกิจหรือการแก้ไขโค้ด ให้สรุปสิ่งที่ทำลงในแชทเป็นภาษาไทยเพื่อให้ผู้ใช้เข้าใจง่าย
