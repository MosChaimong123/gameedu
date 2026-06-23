# Student Lesson Player — UI Redesign Plan

## ที่มาและปัญหาปัจจุบัน

จาก screenshot และการอ่าน code `src/app/student/[code]/lessons/[lessonId]/page.tsx` พบปัญหา 6 จุด:

1. **Section heading ซ้ำ** — `normalizeLessonContentForRender` สร้าง heading เป็น `"${topic.title}: ${section.heading}"` ทำให้ได้ "หลักฐานเชิงประจักษ์และแบบจำลองทางวิทยาศาสตร์: หลักฐานเชิงประจักษ์และแบบจำลองทางวิทยาศาสตร์"
2. **Outcome ID โชว์ให้นักเรียนเห็น** — `phy-lo-m4-s1-u01-03` ไม่มีความหมายสำหรับนักเรียน
3. **Layout single column ยาว** — นักเรียนต้องเลื่อนผ่านหลายส่วนก่อนถึงเนื้อหา
4. **Progress + Actions card** — ข้อมูลสำคัญซ่อนในกริด 2 คอลัมน์ บน mobile กดยาก
5. **ปุ่ม "ทำบทเรียนนี้เสร็จ" ไม่ติดหน้าจอ** — นักเรียนต้องเลื่อนกลับขึ้นไปหา
6. **เนื้อหา whitespace-pre-wrap** — อ่านยากถ้า AI generate เป็น paragraph ยาว

---

## เทียบ Pattern จาก Platform ออนไลน์

| Platform | Pattern หลัก | สิ่งที่เอามาใช้ |
|----------|-------------|----------------|
| **SkillLane** (TH) | วิดีโอ full-width ด้านบน, tab เนื้อหา/ไฟล์/สรุป | Tab navigation + วิดีโอ first |
| **Coursera** | Single column สะอาด, วิดีโอ → เนื้อหา → quiz | ลำดับ: video → read → check |
| **Khan Academy** | Progress ติดซ้าย (desktop) / บน (mobile), เนื้อหาขวา | Sticky progress sidebar |
| **Udemy** | Curriculum sidebar collapsible, video หลัก | Topic list แบบ sidebar |
| **YouTube** | Video full-width, description collapsed | Media prominent |

**ข้อสรุปสำหรับนักเรียน ม. ปลาย บนมือถือ:**
- วิดีโอ/สื่อต้องอยู่ด้านบนสุด เห็นทันที
- Tab แบ่งส่วนชัดเจน ไม่ต้องเลื่อนยาว
- ปุ่ม "เรียนจบ" ต้อง sticky ที่ bottom
- Typography ใหญ่พอ อ่านสบาย

---

## โครงสร้าง UI ใหม่

```
┌─────────────────────────────────────┐
│  ← กลับ          [35% ██░░░░]      │  ← Sticky top bar (progress inline)
├─────────────────────────────────────┤
│                                     │
│   ฟิสิกส์ · ม.4 · เทอม 1           │
│   ชื่อบทเรียน (ใหญ่)               │
│   หน่วยเรียน: ธรรมชาติและพัฒนาการ  │
│                                     │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │       VIDEO / สื่อหลัก        │  │  ← สื่อหลักขึ้นก่อนทุกอย่าง
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  [เนื้อหา] [วิดีโอ] [เอกสาร] [เช็ก] │  ← Tab bar
├─────────────────────────────────────┤
│                                     │
│  Tab: เนื้อหา                       │
│  ┌─ วัตถุประสงค์ (collapsed)      ─┐│
│  └──────────────────────────────── ┘│
│                                     │
│  ── หัวข้อ 1 ──────────────────     │
│  เนื้อหา paragraph...               │
│  [วิดีโอ section]                   │
│                                     │
│  ── หัวข้อ 2 ──────────────────     │
│  ...                                │
│                                     │
├─────────────────────────────────────┤
│  [บันทึกความคืบหน้า] [✓ เรียนจบ]   │  ← Sticky bottom bar
└─────────────────────────────────────┘
```

---

## 4 Tabs

### Tab 1: เนื้อหา (default)
- วัตถุประสงค์ accordion (collapsed by default, expand ได้)
- Topics และ sections แสดงเต็ม ไม่ accordion แล้ว — เลื่อนอ่านตามลำดับ
- แต่ละ section มี **"อ่านแล้ว ✓"** button ให้กด (แทน checkbox ตอนนี้)
- เนื้อหา render เป็น paragraph สะอาด (ไม่ใช้ `whitespace-pre-wrap`)

### Tab 2: วิดีโอ/สื่อ
- รวมสื่อทุกชิ้นจากทุก topic และทุก section ไว้ในหน้าเดียว
- แสดงชื่อสื่อ + ว่ามาจาก topic ไหน

### Tab 3: เอกสาร
- Teaching media documents ทั้งหมด
- ถ้าไม่มีเอกสาร ซ่อน tab หรือ disable

### Tab 4: เช็กความเข้าใจ
- comprehensionPrompts checkboxes (เหมือนเดิม แต่ UI ใหม่)
- แสดง progress ว่าทำไปกี่ข้อแล้ว

---

## Bug Fixes ที่ต้องทำพร้อมกัน

### Fix 1: Section heading ซ้ำ
```ts
// ใน normalizeLessonContentForRender — แก้จาก:
heading: `${topic.title}: ${section.heading}`,
// เป็น:
heading: section.heading,
```

### Fix 2: ซ่อน outcome ID จากนักเรียน
```tsx
// ลบ:
<p className="mt-1 text-xs font-medium text-slate-500">{outcome.id}</p>
// เก็บแค่ outcome.text
```

### Fix 3: ย้าย "ผลการเรียนรู้" ไปอยู่ใน section วัตถุประสงค์
ไม่ต้องแสดงเป็น section แยก — นักเรียนไม่ต้องรู้ว่าตรงกับ outcome ไหน แค่รู้ว่าจะได้เรียนอะไร

---

## Sticky Bottom Bar

```tsx
<div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
    <div className="mx-auto flex max-w-2xl items-center gap-3">
        <Button variant="outline" onClick={persistProgress} className="flex-1 rounded-2xl">
            บันทึกความคืบหน้า
        </Button>
        <Button onClick={handleMarkComplete} className="flex-1 rounded-2xl bg-emerald-600">
            {completed ? "✓ เรียนจบแล้ว" : "ทำบทเรียนนี้เสร็จ"}
        </Button>
    </div>
</div>
```

---

## Sticky Top Bar (Progress)

แทน header section progress ปัจจุบัน:

```tsx
<div className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
    <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2">
        <Link href={backHref}>← กลับ</Link>
        <div className="flex-1">
            <div className="h-1.5 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500 transition-all"
                     style={{ width: `${lessonProgressPercent}%` }} />
            </div>
        </div>
        <span className="text-xs font-black text-slate-500">{lessonProgressPercent}%</span>
    </div>
</div>
```

---

## Component Plan

| Component ใหม่ | ไฟล์ | หน้าที่ |
|---------------|------|---------|
| `LessonTabBar` | inline | Tab navigation เนื้อหา/วิดีโอ/เอกสาร/เช็ก |
| `LessonContentTab` | inline | Sections + topic headers |
| `LessonMediaTab` | inline | รวมสื่อทุกชิ้น |
| `LessonDocumentsTab` | inline | เอกสาร |
| `LessonCheckTab` | inline | Comprehension prompts |
| `StickyProgressBar` | inline | Top sticky progress |
| `StickyActionBar` | inline | Bottom sticky buttons |

ทั้งหมด inline ใน `page.tsx` ไม่สร้างไฟล์แยก (เพื่อ simplicity)

---

## Checklist

- [ ] Fix bug section heading ซ้ำ (`normalizeLessonContentForRender`)
- [ ] ซ่อน outcome ID จากนักเรียน
- [ ] ย้าย "ผลการเรียนรู้" เข้าไปใน accordion วัตถุประสงค์
- [ ] Sticky top progress bar
- [ ] Hero card ใหม่ (compact กว่าเดิม)
- [ ] สื่อหลักขึ้นก่อนทันทีหลัง hero
- [ ] Tab bar: เนื้อหา / วิดีโอ / เอกสาร / เช็ก
- [ ] Tab เนื้อหา: sections แบบ scroll ไม่ accordion
- [ ] "อ่านแล้ว ✓" button ต่อ section
- [ ] Tab วิดีโอ: รวมสื่อจาก topic + section
- [ ] Tab เอกสาร: documents
- [ ] Tab เช็ก: comprehension prompts
- [ ] Sticky bottom action bar
- [ ] เพิ่ม `pb-24` ให้ scroll พ้น sticky bar
- [ ] ทดสอบบน mobile viewport

---

## ลำดับงาน

1. **Bug fixes** (section heading, outcome ID) — เร็ว ไม่แตก layout เดิม
2. **Sticky top + bottom bars** — ปรับ layout หลัก
3. **Hero ใหม่ + สื่อขึ้นก่อน** — restructure hero section
4. **Tab system** — แทน single-scroll ด้วย tab
5. **Tab content** — ย้ายเนื้อหาเข้า tab ทีละ tab
6. **QA บน mobile** — ตรวจ scroll, tap target ขนาด, sticky bar ไม่บัง content
