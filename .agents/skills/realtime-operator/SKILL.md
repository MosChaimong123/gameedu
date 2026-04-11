---
name: Real-time & Socket.io Operator
description: จัดการระบบเชื่อมต่อ Real-time, Events และความเสถียรของการส่งข้อมูลผ่าน Socket.io
---

# Instructions
เมื่อต้องทำงานกับระบบ Real-time ให้ปฏิบัติตามเกณฑ์ดังนี้:

## 1. Server-side (server.ts)
- จัดการ Namespace และ Room ให้เป็นระเบียบตามบริบทของเกม
- จัดการการเชื่อมต่อ (Connect/Disconnect) และทำความสะอาดทรัพยากรเมื่อเลิกใช้งาน
- ใช้ Logging เพื่อติดตามสถานะการส่งข้อมูล

## 2. Client-side Implementation
- ใช้ Custom Hooks ใน `src/hooks` เพื่อจัดการสถานะการเชื่อมต่อ
- ตรวจสอบสถานะ Online/Offline และจัดการ Reconnection โดยอัตโนมัติ

## 3. Event Naming Convention
- ใช้ชื่อ Event ที่สื่อความหมายชัดเจน เช่น `game:start`, `player:move`, `score:update`

## 4. Security & Validation
- ตรวจสอบสิทธิ์ของผู้เล่นก่อนอนุญาตให้ Join Room หรือส่ง Event บางอย่าง
- ใช้ Zod หรือ Validation อื่นๆ ตรวจสอบโครงสร้างข้อมูลที่ส่งผ่าน Socket
## Communication Standard
- **สรุปงานเป็นภาษาไทยทุกครั้ง**: หลังจากเสร็จสิ้นภารกิจหรือการแก้ไขโค้ด ให้สรุปสิ่งที่ทำลงในแชทเป็นภาษาไทยเพื่อให้ผู้ใช้เข้าใจง่าย
