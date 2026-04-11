---
name: Database & Prisma Specialist
description: เชี่ยวชาญการจัดการ Prisma Schema, MongoDB Query และสคริปต์จัดการข้อมูลสำหรับโปรเจกต์ gamedu
---

# Instructions
เมื่อต้องทำงานที่เกี่ยวข้องกับ Database ให้ปฏิบัติตามมาตรฐานดังนี้:

## 1. การจัดการ Prisma Schema
- ไฟล์ Schema หลักอยู่ที่ `prisma/schema.prisma`
- หากมีการเปลี่ยนโครงสร้าง DB ให้รัน `npx prisma generate` เสมอ
- สำหรับ MongoDB: ต้องระบุ `@map("_id") @db.ObjectId` สำหรับ Primary Key

## 2. มาตรฐานการเขียน Query
- ใช้ Prisma Client ที่ถูกตั้งค่าไว้แล้วในโปรเจกต์
- หลีกเลี่ยงการเขียน Raw Query หากไม่จำเป็น
- การดึงข้อมูลที่มีความสัมพันธ์ (Relation) ให้ใช้ `include` หรือ `select` อย่างระมัดระวังเพื่อ Performance

## 3. สคริปต์จัดการข้อมูล (Scripts)
- หากต้องรันสคริปต์ใน Root ให้ใช้ `ts-node` สำหรับไฟล์ `.ts` หรือ `node` สำหรับไฟล์ `.js`
- ตัวอย่างสคริปต์เดิมที่มี: `fix-students.js`, `init-mongo.js`, `check-groups.ts`
- **ข้อควรระวัง**: ตรวจสอบ `.env` และเชื่อมต่อ MongoDB ให้ถูกต้องก่อนรันสคริปต์เสมอ

## 4. การจัดการแผนงาน (Plan Files)
## Communication Standard
- **สรุปงานเป็นภาษาไทยทุกครั้ง**: หลังจากเสร็จสิ้นภารกิจหรือการแก้ไขโค้ด ให้สรุปสิ่งที่ทำลงในแชทเป็นภาษาไทยเพื่อให้ผู้ใช้เข้าใจง่าย
