# Classroom Improvement — Design

## Architecture Overview

การปรับปรุงแบ่งเป็น 4 ชั้น:
1. **API Layer** — แก้ bug + consolidate routes
2. **Teacher UI** — ปรับ Toolbar grouping + เพิ่มปุ่มที่ขาด
3. **Student UI** — เพิ่ม UX improvements
4. **Test Layer** — Property-based tests สำหรับ correctness properties

---

## D1 — API Layer Changes

### D1.1 Fix Boss Route (Critical)

**File:** `src/app/api/classroom/[id]/boss/route.ts`

**POST — ปัจจุบัน (bug):**
```ts
data: {
  gamifiedSettings: { boss: { ... } }  // ❌ overwrite ทั้งก้อน
}
```

**POST — แก้ไข:**
```ts
// Read existing settings first
const existing = classroom.gamifiedSettings as any || {};
data: {
  gamifiedSettings: {
    ...existing,           // ✅ preserve events, customAchievements
    boss: { ... }
  }
}
```

**DELETE — ปัจจุบัน (bug):**
```ts
data: { gamifiedSettings: null }  // ❌ ลบทุกอย่าง
```

**DELETE — แก้ไข:**
```ts
const existing = classroom.gamifiedSettings as any || {};
const { boss, ...rest } = existing;
data: {
  gamifiedSettings: rest  // ✅ ลบแค่ boss key
}
```

**Schema change ที่ต้องทำ:** Boss POST ต้อง `select: { gamifiedSettings: true }` ก่อน update

---

### D1.2 API Route Consolidation Plan

**Phase 1 (ทำใน spec นี้):** แก้ bug ใน singular routes
**Phase 2 (future):** ย้าย singular → plural prefix พร้อม redirect

Routes ที่ต้องย้าย (future):
| Singular (เดิม) | Plural (ใหม่) |
|---|---|
| `/api/classroom/[id]/boss` | `/api/classrooms/[id]/boss` |
| `/api/classroom/[id]/events` | `/api/classrooms/[id]/events` |
| `/api/classroom/[id]/custom-achievements` | `/api/classrooms/[id]/custom-achievements` |
| `/api/classroom/[id]/leaderboard` | `/api/classrooms/[id]/leaderboard` |

---

## D2 — Teacher Toolbar Redesign

### D2.1 New Toolbar Group Structure

```
[Class Info + View Toggle] | [🛠 เครื่องมือ] | [👤 นักเรียน] | [🎮 Gamification] | [⚙️ Actions]
```

**Group 1: Class Info** (ไม่เปลี่ยน)
- Class emoji + name + student count + connection status
- View toggle (Grid / Table)

**Group 2: 🛠 เครื่องมือ** (ไม่เปลี่ยน)
- Timer, Random Picker, Group Maker

**Group 3: 👤 นักเรียน** (ลด scope)
- Add Student
- Student Manager
- Student Logins

**Group 4: 🎮 Gamification** (ใหม่ — ย้ายมาจาก Group 3)
- Summon Boss
- Custom Achievement
- Event Manager

**Group 5: ⚙️ Actions** (ใหม่)
- เช็คชื่อ (Attendance Mode toggle)
- เลือกหลายคน (Multi-Select toggle)
- Settings

### D2.2 Attendance & Multi-Select Buttons

```tsx
// ใน Group 5: Actions
<Button onClick={() => setIsAttendanceMode(true)} variant="secondary" size="sm">
  <ClipboardCheck className="w-4 h-4 mr-1.5 text-emerald-300" />
  เช็คชื่อ
</Button>

<Button 
  onClick={() => setIsSelectMultiple(v => !v)} 
  variant="secondary" 
  size="sm"
  className={isSelectMultiple ? "bg-indigo-500 text-white" : "bg-white/15 text-white"}
>
  <CheckSquare className="w-4 h-4 mr-1.5" />
  เลือกหลายคน {isSelectMultiple && `(${selectedStudentIds.length})`}
</Button>
```

---

## D3 — Student UI Improvements

### D3.1 SkillTab — Active Effect Indicator

เพิ่ม state สำหรับ active skills:
```tsx
const [activeSkills, setActiveSkills] = useState<Record<string, { expiresAt: number }>>({});
```

แสดง badge "ACTIVE" บน skill card ถ้า skill กำลัง active

### D3.2 DailyQuestCard — Refresh Button

```tsx
<Button variant="ghost" size="sm" onClick={() => refetchQuests()}>
  <RefreshCw className="w-3.5 h-3.5" />
</Button>
```

### D3.3 WorldBossBar — Damage Log

เพิ่ม state:
```tsx
const [damageLog, setDamageLog] = useState<{ damage: number; isCrit: boolean; time: Date }[]>([]);
```

แสดง 3 รายการล่าสุดใต้ HP bar

### D3.4 InventoryTab — Custom Sell Confirmation Dialog

แทนที่ `confirm()` ด้วย:
```tsx
<AlertDialog>
  <AlertDialogTrigger>ขาย</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>ยืนยันการขาย</AlertDialogTitle>
      <AlertDialogDescription>
        ต้องการขาย {item.name} ในราคา {sellPrice} ทอง?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
      <AlertDialogAction onClick={confirmSell}>ยืนยัน</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## D4 — Tab Consolidation

### D4.1 Remove Duplicate "reports" Tab

**File:** `src/app/dashboard/classrooms/[id]/page.tsx`

เปลี่ยน tab value จาก "reports" เป็น "analytics" และลบ tab ซ้ำ:
```tsx
// ก่อน
<TabsContent value="reports">
  <AnalyticsDashboard classId={classroom.id} />
</TabsContent>

// หลัง — ใช้ value "analytics" แทน
<TabsContent value="analytics">
  <AnalyticsDashboard classId={classroom.id} />
</TabsContent>
```

อัปเดต `TranslatedTabsTriggers` ให้ใช้ value "analytics"

---

## D5 — Property-Based Tests Design

### D5.1 Boss Preservation Test

```ts
// test: boss-preservation.test.ts
import fc from "fast-check";

test("Boss DELETE preserves events and customAchievements", () => {
  fc.assert(fc.property(
    fc.record({
      events: fc.array(fc.record({ id: fc.string(), title: fc.string() })),
      customAchievements: fc.array(fc.record({ id: fc.string(), name: fc.string() })),
      boss: fc.option(fc.record({ name: fc.string(), maxHp: fc.integer() }))
    }),
    (gamifiedSettings) => {
      const { boss, ...rest } = gamifiedSettings;
      // After delete, rest should equal original minus boss
      expect(rest.events).toEqual(gamifiedSettings.events);
      expect(rest.customAchievements).toEqual(gamifiedSettings.customAchievements);
    }
  ));
});
```

### D5.2 Points Isolation Test

```ts
test("Points award only affects targeted students", () => {
  fc.assert(fc.property(
    fc.array(fc.record({ id: fc.uuid(), points: fc.integer({ min: 0, max: 1000 }) }), { minLength: 2 }),
    fc.integer({ min: 1, max: 10 }),
    (students, delta) => {
      const targetId = students[0].id;
      const result = applyPointDelta(students, [targetId], delta);
      // Non-targeted students must be unchanged
      students.slice(1).forEach(s => {
        expect(result.find(r => r.id === s.id)?.points).toBe(s.points);
      });
    }
  ));
});
```

---

## Component Dependency Map

```
classroom-dashboard.tsx
  ├── summon-boss-dialog.tsx → /api/classroom/[id]/boss (singular — has bug)
  ├── EventManagerButton.tsx → /api/classroom/[id]/events (singular)
  ├── CustomAchievementManager.tsx → /api/classroom/[id]/custom-achievements (singular)
  └── [page.tsx] → tabs: classroom, attendance, reports(→analytics), board

StudentDashboardClient.tsx
  ├── WorldBossBar → /api/classrooms/[id]/boss/attack (plural — correct)
  ├── DailyQuestCard → /api/student/[code]/daily-quests
  ├── SkillTab → /api/student/skill
  └── InventoryTab → /api/student/inventory, /api/inventory/equip
```
