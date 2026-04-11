/**
 * GameDu — โมเดลคะแนนนักเรียน
 *
 * ### Phase 1.1 — แยกชื่อและที่เก็บชัด
 *
 * ## แต้มเลื่อนยศ (วิชาการ / academic)
 * - **ไม่มีคอลัมน์ใน `Student`** — คำนวณจากผลส่งงาน (`AssignmentSubmission`) ต่อชุดงานในห้อง
 * - ใช้กับแถบความคืบหน้าเลื่อนยศ (`levelConfig`) และ UI ป้ายกำกับว่า "แต้มเลื่อนยศ" / "จากการส่งงาน"
 *
 * ## แต้มพฤติกรรม / progression (`Student.behaviorPoints`)
 * - เก็บใน Mongo ใต้ key เดิม `points` (Prisma `@map("points")`)
 * - แหล่งเพิ่มลด: ครูให้ทักษะ, batch points, custom achievement gold, Negamon EXP จากงาน/แมตช์สด, ฯลฯ
 * - Negamon monster rank อิง **behaviorPoints** (ไม่ใช่ academic total)
 *
 * ### Phase 1.2 — สูตรเดียวกันทั้งระบบ
 * - ใช้ `@/lib/academic-score` สำหรับ decode เช็คลิสต์ (bitmask) และ `sumAcademicTotal(assignments, submissions)`
 * - หลีกเลี่ยงการ `reduce` บน `submission.score` ดิบใน UI ที่มีงานแบบเช็คลิสต์ (คะแนนที่เก็บเป็น bitmask ไม่ใช่ผลรวมแต้ม)
 *
 * ### Phase 1.3 — ข้อความ UI / i18n
 * - ป้ายและคำแปลใน `src/lib/translations.ts` แยกคำว่า **แต้มพฤติกรรม** (behaviorPoints / ทักษะ / ประวัติ PointHistory) กับ **คะแนนเก็บ / แต้มเลื่อนยศ** (academic จากงาน)
 * - กล่องยืนยันรีเซ็ตอธิบายตรงกับ API: แต้มพฤติกรรม = 0, ลบประวัติแต้ม, ลบการส่งงานทั้งหมดในห้อง, ไม่กระทบการเช็คชื่อ
 *
 * ### Phase 1.4 — เก็บหาง i18n (ครู / Analytics)
 * - หน้า Analytics (`AnalyticsDashboard`): หัวเรื่อง, กราฟ, ตาราง, ชื่อชีต Excel — ใช้ `translations` ให้สอดคล้องกับภาษาที่เลือก
 * - ตารางคะแนนห้อง (`classroom-table`): toast บันทึกคะแนนเก็บ/เช็คลิสต์, ป้ายพฤติกรรม–ภารกิง–ควิซ — คำว่า "คะแนน" ในที่เหล่านี้หมายถึง **วิชาการจากงาน** ไม่ใช่แต้มพฤติกรรม
 * - การตั้งค่าห้อง (`classroom-settings-dialog`): ป้ายฟอร์ม, นโยบายควิซเริ่มต้น, สถานะปุ่มบันทึก/รีเซ็ต
 *
 * ### Phase 1.5 — โมดัลภารกิจ (assignments)
 * - `add-assignment-dialog.tsx`: รายการภารกิจ, ฟอร์มสร้าง/แก้ไข, toast, ยืนยันลบ, ตัวเลือกควิซ — ใช้ `translations` (คำว่า **คะแนน** ในที่นี้ = คะแนนเก็บจากงาน)
 * - ป้ายประเภทในรายการใช้คีย์เดียวกับตัวเลือกประเภทในฟอร์ม; ใช้ `assignmentFormTypeLabel` จาก `@/lib/assignment-form-type-label` คู่กับ `t()` เพื่อแปลตามภาษา UI
 *
 * ### Phase 1.6 — แดชบอร์ดห้อง / จัดการนักเรียน / กลุ่ม / ทักษะ / หน้า home นักเรียน
 * - `classroom-dashboard`: เช็คชื่อ toast, ป้ายแถบเครื่องมือ, โหมดเลือกหลายคน
 * - `student-manager-dialog`, `add-student-dialog`, `group-maker`, `skill-management-panel`: ข้อความและ toast ครบ
 * - `student/home`: ดึง UI ไป `student-home-content.tsx` (client) เพื่อใช้ `useLanguage`; วันที่ตาม locale
 *
 * เวลาเพิ่มฟีเจอร์ใหม่: ถ้าเป็นรางวัลจาก "ทำงานส่งแล้ว" ให้พิจารณา academic flow ก่อน;
 * ถ้าเป็นรางวัลจากครู/เกมสด/ร้านในอนาคต ให้ใช้ `behaviorPoints`.
 */

export {};
