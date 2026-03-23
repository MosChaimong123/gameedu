# Classroom Improvement — Tasks

## Phase 1: Critical Bug Fixes (เร่งด่วน)

- [x] 1. แก้ Boss DELETE ไม่ให้ลบ gamifiedSettings ทั้งก้อน
  - [x] 1.1 อ่าน gamifiedSettings เดิมก่อน update ใน DELETE handler
  - [x] 1.2 ใช้ destructuring `{ boss, ...rest }` แล้ว set `gamifiedSettings: rest`
  - [x] 1.3 เพิ่ม `select: { gamifiedSettings: true }` ใน findUnique query

- [x] 2. แก้ Boss POST ไม่ให้ overwrite gamifiedSettings ทั้งก้อน
  - [x] 2.1 อ่าน gamifiedSettings เดิมก่อน update ใน POST handler
  - [x] 2.2 ใช้ spread `{ ...existing, boss: { ... } }` แทนการ set ตรงๆ
  - [x] 2.3 เพิ่ม `select: { gamifiedSettings: true, teacherId: true }` ใน findUnique query

- [x] 3. เขียน property-based test สำหรับ Boss operations
  - [x] 3.1 ติดตั้ง fast-check ถ้ายังไม่มี
  - [x] 3.2 เขียน test: Boss DELETE preserves events และ customAchievements
  - [x] 3.3 เขียน test: Boss POST preserves events และ customAchievements
  - [x] 3.4 รัน tests และยืนยันว่า pass

## Phase 2: Teacher UI Improvements

- [x] 4. Refactor Toolbar — แยก Gamification group ออกจาก Student Management
  - [x] 4.1 สร้าง Group 4 "🎮 Gamification" ใน classroom-dashboard.tsx
  - [x] 4.2 ย้าย SummonBossDialog, CustomAchievementManagerButton, EventManagerButton ไปอยู่ใน Group 4
  - [x] 4.3 Group 3 "👤 นักเรียน" ให้มีเฉพาะ AddStudent, StudentManager, StudentLogins

- [x] 5. เพิ่มปุ่ม Attendance Mode และ Multi-Select ใน Toolbar
  - [x] 5.1 สร้าง Group 5 "⚙️ Actions" ใน Toolbar
  - [x] 5.2 เพิ่มปุ่ม "เช็คชื่อ" ที่ toggle `isAttendanceMode`
  - [x] 5.3 เพิ่มปุ่ม "เลือกหลายคน" ที่ toggle `isSelectMultiple` พร้อมแสดงจำนวนที่เลือก
  - [x] 5.4 เพิ่มปุ่ม Settings ที่ link ไปยัง classroom settings

- [x] 6. รวม Tab "reports" เข้ากับ "analytics"
  - [x] 6.1 เปลี่ยน tab value จาก "reports" เป็น "analytics" ใน page.tsx
  - [x] 6.2 อัปเดต TranslatedTabsTriggers ให้ใช้ value "analytics"
  - [x] 6.3 ตรวจสอบว่าไม่มี link อื่นที่ชี้ไปที่ `?tab=reports`

## Phase 3: Student UI Improvements

- [x] 7. InventoryTab — เปลี่ยน confirm() เป็น AlertDialog
  - [x] 7.1 เพิ่ม state `sellConfirmItem` สำหรับ item ที่กำลังจะขาย
  - [x] 7.2 สร้าง AlertDialog component สำหรับยืนยันการขาย
  - [x] 7.3 แทนที่ `confirm()` ด้วย AlertDialog ใน handleSellItem
  - [x] 7.4 ตรวจสอบว่า dialog แสดงชื่อ item และราคาขายถูกต้อง

- [x] 8. DailyQuestCard — เพิ่มปุ่ม Refresh
  - [x] 8.1 แยก fetch logic ออกเป็น function `refetchQuests()`
  - [x] 8.2 เพิ่มปุ่ม refresh icon ใน header ของ DailyQuestCard
  - [x] 8.3 เพิ่ม loading state ขณะ refresh

- [x] 9. WorldBossBar — เพิ่ม Damage Log
  - [x] 9.1 เพิ่ม state `damageLog` array ใน WorldBossBar
  - [x] 9.2 อัปเดต damageLog หลังโจมตีสำเร็จ (เก็บ 5 รายการล่าสุด)
  - [x] 9.3 แสดง damage log ใต้ HP bar (compact format)

- [x] 10. เพิ่มปุ่ม Refresh ใน Student Tabs
  - [x] 10.1 เพิ่มปุ่ม refresh ใน AchievementsTab
  - [x] 10.2 เพิ่มปุ่ม refresh ใน LeaderboardTab
  - [x] 10.3 เพิ่มปุ่ม refresh ใน ShopTab

## Phase 4: API Consolidation (Refactor)

- [x] 11. ย้าย Boss route จาก singular ไป plural prefix
  - [x] 11.1 สร้าง `/api/classrooms/[id]/boss/route.ts` (POST + DELETE) ด้วย logic ที่แก้แล้ว
  - [x] 11.2 อัปเดต `summon-boss-dialog.tsx` ให้เรียก `/api/classrooms/[id]/boss`
  - [x] 11.3 เพิ่ม redirect ใน singular route เพื่อ backward compatibility

- [x] 12. ย้าย Events route จาก singular ไป plural prefix
  - [x] 12.1 สร้าง `/api/classrooms/[id]/events/route.ts`
  - [x] 12.2 อัปเดต `EventManagerButton.tsx` ให้เรียก plural endpoint
  - [x] 12.3 เพิ่ม redirect ใน singular route

- [x] 13. ย้าย Custom Achievements route จาก singular ไป plural prefix
  - [x] 13.1 สร้าง `/api/classrooms/[id]/custom-achievements/route.ts`
  - [x] 13.2 อัปเดต `CustomAchievementManager.tsx` ให้เรียก plural endpoint
  - [x] 13.3 เพิ่ม redirect ใน singular route

- [x] 14. ลบ Reports API ที่ซ้ำซ้อน
  - [x] 14.1 ตรวจสอบว่าไม่มี component ใดเรียก `/api/classrooms/[id]/reports` อีกแล้ว
  - [x] 14.2 ลบหรือ deprecate reports route
  - [x] 14.3 ลบ ReportsTab component ถ้าไม่ได้ใช้แล้ว

## Phase 5: Property-Based Tests (Correctness Validation)

- [x] 15. เขียน PBT สำหรับ Points Award isolation
  - [x] 15.1 เขียน test: award points ต้องไม่กระทบ student ที่ไม่ได้รับ
  - [x] 15.2 เขียน test: batch award ต้องกระทบเฉพาะ targetStudents

- [x] 16. เขียน PBT สำหรับ Attendance Save
  - [x] 16.1 เขียน test: save attendance ต้องไม่เปลี่ยน points ของนักเรียน
  - [x] 16.2 เขียน test: save attendance ต้องไม่เปลี่ยน name ของนักเรียน
