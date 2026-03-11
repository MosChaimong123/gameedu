---
name: Data Handler (XLSX/CSV)
description: จัดการการเข้าพะระบบนำเข้า (Import) และส่งออก (Export) ข้อมูลผ่านไฟล์ Excel, CSV หรือ JSON
---

# Instructions
เมื่อต้องจัดการไฟล์ข้อมูลจำนวนมาก ให้ทำตามขั้นตอนดังนี้:

## 1. Libraries
- **xlsx**: สำหรับอ่านและเขียนไฟล์ Excel (.xlsx, .xls, .ods)
- **papaparse**: สำหรับการประมวลผลไฟล์ CSV ขนาดใหญ่ให้มีประสิทธิภาพ

## 2. Import Logic
- ต้องมีการ Validation ข้อมูลด้วย **Zod** ก่อนเสมอเพื่อป้องกันข้อมูลผิดพลาดเข้า Database
- จัดการหน้า UI สำหรับการ Preview ข้อมูลก่อนกดยืนยันการ Import
- จัดการ Error Handling เมื่อข้อมูลในไฟล์ไม่ตรงตาม Metadata ที่กำหนด

## 3. Export Logic
- ออกแบบโครงสร้างไฟล์ output ให้ผู้ใช้นำไปใช้งานต่อได้ง่าย (Header ชัดเจน)
- จัดการเรื่อง Timezone และ Format วันที่ให้เป็นสากล

## 4. UX for Large Files
- แสดง Progress bar หรือ Loading state เมื่อมีการประมวลผลไฟล์ขนาดใหญ่
## Communication Standard
- **สรุปงานเป็นภาษาไทยทุกครั้ง**: หลังจากเสร็จสิ้นภารกิจหรือการแก้ไขโค้ด ให้สรุปสิ่งที่ทำลงในแชทเป็นภาษาไทยเพื่อให้ผู้ใช้เข้าใจง่าย
