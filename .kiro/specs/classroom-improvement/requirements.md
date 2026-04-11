# Classroom Improvement — Requirements

## Overview

ปรับปรุงระบบ Classroom ทั้งฝั่งครูและนักเรียน ครอบคลุม 3 ด้านหลัก:
1. แก้ Bug ที่ทำให้ข้อมูลสูญหาย (Critical)
2. ปรับปรุง UI/UX ฝั่งครู
3. ปรับปรุง UI/UX ฝั่งนักเรียน
4. รวม API ที่ซ้ำซ้อนและ refactor โครงสร้าง

---

## R1 — Critical Bug Fixes

### R1.1 Boss DELETE ลบ gamifiedSettings ทั้งก้อน
**ปัญหา:** `DELETE /api/classroom/[id]/boss` ใช้ `gamifiedSettings: null` ทำให้ events และ customAchievements หายไปด้วย

**ความต้องการ:**
- Boss DELETE ต้องลบเฉพาะ `boss` key ใน gamifiedSettings โดย preserve ข้อมูลอื่น (events, customAchievements)
- ต้องใช้ spread operator เพื่อ merge ข้อมูลเดิม

**Acceptance Criteria:**
- เมื่อลบ Boss แล้ว events ที่มีอยู่ต้องยังคงอยู่
- เมื่อลบ Boss แล้ว customAchievements ที่มีอยู่ต้องยังคงอยู่
- Boss POST ต้องไม่ overwrite gamifiedSettings ทั้งก้อน

### R1.2 Boss POST overwrite gamifiedSettings
**ปัญหา:** `POST /api/classroom/[id]/boss` set `gamifiedSettings: { boss: {...} }` โดยไม่ spread ของเดิม

**ความต้องการ:**
- Boss POST ต้อง read gamifiedSettings เดิมก่อน แล้ว merge เฉพาะ boss key

---

## R2 — Teacher UI Improvements

### R2.1 Toolbar Grouping ไม่สอดคล้อง
**ปัญหา:** SummonBoss, CustomAchievement, EventManager อยู่ใน group "จัดการนักเรียน" ซึ่งไม่ตรงกับหน้าที่จริง

**ความต้องการ:**
- แยก group ใหม่ชื่อ "🎮 Gamification" สำหรับ SummonBoss, CustomAchievement, EventManager
- Group "👤 จัดการนักเรียน" ควรมีเฉพาะ: AddStudent, StudentManager, StudentLogins

### R2.2 ไม่มีปุ่ม Attendance Mode ใน Toolbar
**ปัญหา:** ครูไม่รู้ว่าจะเปิด Attendance Mode ได้อย่างไร (ปุ่มซ่อนอยู่ใน Bottom Action Bar)

**ความต้องการ:**
- เพิ่มปุ่ม "เช็คชื่อ" ใน Toolbar ที่มองเห็นได้ชัดเจน
- ปุ่มควรอยู่ใน group ที่เหมาะสม (เช่น group เครื่องมือ หรือ group แยกต่างหาก)

### R2.3 ไม่มีปุ่ม Multi-Select ที่ชัดเจน
**ปัญหา:** ครูไม่รู้ว่ามีฟีเจอร์ Multi-Select อยู่

**ความต้องการ:**
- เพิ่มปุ่ม "เลือกหลายคน" ใน Toolbar
- เมื่อ active ให้แสดง indicator ที่ชัดเจน

### R2.4 ไม่มีปุ่ม Settings ใน Toolbar หลัก
**ปัญหา:** Settings button อยู่แยกต่างหาก ไม่ integrate กับ Toolbar

**ความต้องการ:**
- เพิ่มปุ่ม Settings ใน Toolbar หรือ accessible จาก Toolbar

### R2.5 Tab "reports" ซ้ำกับ "analytics"
**ปัญหา:** Tab ชื่อ "reports" ใน page.tsx render `<AnalyticsDashboard>` เหมือนกันทุกอย่าง ไม่มีความแตกต่าง

**ความต้องการ:**
- เปลี่ยนชื่อ tab "reports" เป็น "analytics" หรือรวมเป็น tab เดียว
- ลบ `/api/classrooms/[id]/reports` route ที่ซ้ำซ้อน

---

## R3 — Student UI Improvements

### R3.1 SkillTab ไม่แสดง Cooldown หรือ Effect Duration
**ปัญหา:** SkillTab แสดงแค่ mana cost แต่ไม่แสดงว่า skill มี cooldown หรือ effect ยังคงอยู่หรือไม่

**ความต้องการ:**
- แสดง cooldown timer ถ้า skill มี cooldown
- แสดง active effect indicator ถ้า skill กำลัง active

### R3.2 DailyQuestCard ไม่มีปุ่ม Refresh
**ปัญหา:** ถ้า quest ถูก trigger จากภายนอก (เช่น ครูให้คะแนน) นักเรียนต้อง reload หน้าเพื่อเห็น quest ที่ complete

**ความต้องการ:**
- เพิ่มปุ่ม refresh ใน DailyQuestCard
- หรือ subscribe to socket event เพื่อ auto-update

### R3.3 WorldBossBar ไม่แสดง Damage Log
**ปัญหา:** หลังโจมตีบอส นักเรียนไม่เห็นว่าตัวเองทำ damage ไปเท่าไหร่ในประวัติ

**ความต้องการ:**
- แสดง recent damage log (3-5 รายการล่าสุด) ใน WorldBossBar
- หรือแสดง total damage ที่นักเรียนคนนี้ทำไปแล้ว

### R3.4 InventoryTab ใช้ `confirm()` แทน Dialog
**ปัญหา:** `handleSellItem` ใช้ `confirm()` ซึ่งเป็น native browser dialog ที่ดูไม่สวยงาม

**ความต้องการ:**
- เปลี่ยนจาก `confirm()` เป็น custom confirmation dialog ที่ match กับ design system

### R3.5 StudentDashboard ไม่มีปุ่ม Refresh ใน Tabs หลัก
**ปัญหา:** ข้อมูลใน tabs (Achievements, Leaderboard, Shop) อาจ stale ถ้าไม่ reload

**ความต้องการ:**
- เพิ่มปุ่ม refresh ใน tabs ที่ยังไม่มี (Achievements, Leaderboard, Shop)

---

## R4 — API Consolidation

### R4.1 API Prefix ไม่สอดคล้อง
**ปัญหา:** มี 2 prefix ที่ทำงานคล้ายกัน:
- `/api/classroom/[id]/` (singular) — boss, custom-achievements, events, leaderboard
- `/api/classrooms/[id]/` (plural) — boss/attack, analytics, groups, etc.

**ความต้องการ:**
- รวม singular routes เข้า plural prefix `/api/classrooms/[id]/`
- อัปเดต frontend ให้เรียก endpoint ใหม่
- Redirect หรือ deprecate singular routes

### R4.2 Reports API ซ้ำกับ Analytics
**ปัญหา:** `/api/classrooms/[id]/reports` return ข้อมูลที่เป็น subset ของ `/api/classrooms/[id]/analytics`

**ความต้องการ:**
- ลบ reports route หรือ redirect ไปที่ analytics
- ลบ ReportsTab component ถ้าไม่ได้ใช้แล้ว

---

## R5 — Correctness Properties (สำหรับ Property-Based Testing)

### P1: Boss Operations ต้อง preserve gamifiedSettings
```
∀ classroom C, ∀ operation op ∈ {POST_boss, DELETE_boss}:
  op(C).gamifiedSettings.events === C.gamifiedSettings.events
  op(C).gamifiedSettings.customAchievements === C.gamifiedSettings.customAchievements
```

### P2: Points Award ต้อง idempotent ต่อ student ที่ไม่ได้รับ
```
∀ classroom C, ∀ student s ∉ targetStudents:
  awardPoints(C, targetStudents, delta).students[s].points === C.students[s].points
```

### P3: Attendance Save ต้อง preserve student data อื่น
```
∀ classroom C, ∀ student s:
  saveAttendance(C, updates).students[s].points === C.students[s].points
  saveAttendance(C, updates).students[s].name === C.students[s].name
```
