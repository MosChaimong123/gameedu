# แผนระบบ: สร้างเนื้อหาการเรียนรู้จากหลักสูตร PDF (Curriculum → Lesson Content)

> วันที่วางแผน: 2026-06-01  
> สถานะ: Draft

---

## 1. ภาพรวมระบบ

ครูอัพโหลดไฟล์ PDF หลักสูตรการศึกษา → AI (Gemini) วิเคราะห์และสร้างเนื้อหาบทเรียนที่มีโครงสร้าง → ครู review และ publish → นักเรียนเข้าเรียนผ่านหน้า Student Portal

```
[ครู] อัพโหลด PDF
      ↓
[API] /api/ai/parse-file        ← มีอยู่แล้ว: แปลง PDF → text + base64
      ↓
[API] /api/ai/generate-lesson   ← สร้างใหม่: Gemini สร้าง Lesson JSON
      ↓
[DB]  Lesson + LessonSection     ← schema ใหม่ใน prisma
      ↓
[ครู] Preview → แก้ไข → Publish → Assign to Classroom
      ↓
[นักเรียน] เข้าเรียน → อ่านเนื้อหา → ทำ Quiz ท้ายบท
```

---

## 2. Database Schema (Prisma / MongoDB)

```prisma
model Lesson {
  id            String    @id @default(auto()) @map("_id") @db.ObjectId
  title         String
  subject       String?                        // วิชา เช่น "คณิตศาสตร์"
  gradeLevel    String?                        // ระดับชั้น เช่น "ม.1"
  description   String?
  status        String    @default("DRAFT")    // "DRAFT" | "PUBLISHED"
  sourceFileName String?                       // ชื่อไฟล์ PDF ต้นฉบับ

  // เนื้อหาทั้งหมดเก็บเป็น JSON (sections, keyTerms, objectives)
  content       Json

  // เจ้าของ
  ownerUserId   String    @db.ObjectId
  ownerUser     User      @relation(fields: [ownerUserId], references: [id])

  // Assign ให้ Classroom
  classroomAssignments LessonAssignment[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([ownerUserId, status])
}

model LessonAssignment {
  id          String    @id @default(auto()) @map("_id") @db.ObjectId
  lessonId    String    @db.ObjectId
  lesson      Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  classId     String    @db.ObjectId
  classroom   Classroom @relation(fields: [classId], references: [id], onDelete: Cascade)
  assignedAt  DateTime  @default(now())

  // ความคืบหน้าของนักเรียน
  completions LessonCompletion[]

  @@unique([lessonId, classId])
}

model LessonCompletion {
  id                 String    @id @default(auto()) @map("_id") @db.ObjectId
  lessonAssignmentId String    @db.ObjectId
  lessonAssignment   LessonAssignment @relation(fields: [lessonAssignmentId], references: [id], onDelete: Cascade)
  studentId          String    @db.ObjectId
  student            Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  completedAt        DateTime  @default(now())
  quizScore          Int?      // คะแนน quiz ท้ายบท (0-100)

  @@unique([lessonAssignmentId, studentId])
}
```

---

## 3. Lesson Content JSON Structure

เนื้อหาที่ Gemini จะสร้างและเก็บในฟิลด์ `content`:

```json
{
  "objectives": [
    "นักเรียนสามารถอธิบาย... ได้",
    "นักเรียนสามารถคำนวณ... ได้"
  ],
  "sections": [
    {
      "id": "s1",
      "heading": "หัวข้อที่ 1",
      "content": "เนื้อหาอธิบาย...",
      "examples": [
        { "title": "ตัวอย่างที่ 1", "body": "..." }
      ],
      "imagePrompt": null
    }
  ],
  "keyTerms": [
    { "term": "คำศัพท์", "definition": "นิยาม" }
  ],
  "summary": "สรุปเนื้อหาของบทเรียน...",
  "estimatedMinutes": 30
}
```

---

## 4. API Endpoints ที่ต้องสร้าง

### 4.1 `POST /api/ai/generate-lesson`
รับ PDF และตัวเลือกจากครู → ส่งให้ Gemini → คืน Lesson JSON

**Request body:**
```json
{
  "pdfData": "<base64>",
  "text": "<extracted text>",
  "subject": "คณิตศาสตร์",
  "gradeLevel": "ม.1",
  "language": "th",
  "sectionCount": 4
}
```

**Response:**
```json
{
  "title": "...",
  "content": { ...LessonContent }
}
```

---

### 4.2 `POST /api/lessons` — บันทึก Lesson (DRAFT)
### 4.3 `GET /api/lessons` — ดึงรายการ Lessons ของครู
### 4.4 `GET /api/lessons/[id]` — ดึง Lesson เดียว
### 4.5 `PATCH /api/lessons/[id]` — แก้ไข / Publish
### 4.6 `DELETE /api/lessons/[id]` — ลบ

### 4.7 `POST /api/classrooms/[id]/lessons` — Assign Lesson ให้ Classroom
### 4.8 `GET /api/classrooms/[id]/lessons` — ดึง Lessons ของ Classroom (สำหรับนักเรียน)

### 4.9 `POST /api/classrooms/[id]/lessons/[lessonId]/complete` — นักเรียนกด complete + ส่งคะแนน quiz

---

## 5. หน้า UI ที่ต้องสร้าง

### 5.1 Teacher — หน้าสร้าง Lesson
**Path:** `/dashboard/lessons/create`

```
┌─────────────────────────────────────────────┐
│  สร้างบทเรียนจากหลักสูตร                     │
│                                             │
│  [อัพโหลด PDF หลักสูตร]                     │
│                                             │
│  วิชา: [____________]  ระดับชั้น: [______]  │
│  ภาษา: [ไทย ▼]  จำนวนหัวข้อ: [4 ▼]         │
│                                             │
│  [✨ สร้างเนื้อหาด้วย AI]                   │
└─────────────────────────────────────────────┘
```

### 5.2 Teacher — Preview & Edit Lesson
**Path:** `/dashboard/lessons/[id]/edit`

- แสดง title, objectives, sections แบบ editable
- ปุ่ม "Publish" เพื่อเปลี่ยน status → PUBLISHED
- ปุ่ม "Assign to Classroom" เพือ assign ให้ห้อง

### 5.3 Teacher — รายการ Lessons
**Path:** `/dashboard/lessons`

- ตาราง: ชื่อบทเรียน | วิชา | ระดับชั้น | สถานะ | ห้องที่ assign | วันที่สร้าง
- ปุ่ม Create, Edit, Delete

### 5.4 Student — หน้าเรียน Lesson
**Path:** `/student/[code]/lessons/[lessonId]`

```
┌──────────────────────────────────────────┐
│  📚 [ชื่อบทเรียน]                        │
│  วัตถุประสงค์: ...                       │
│  ─────────────────────────────────────   │
│  หัวข้อที่ 1: ...                        │
│  เนื้อหา...                              │
│  💡 ตัวอย่าง...                          │
│  ─────────────────────────────────────   │
│  📖 คำศัพท์สำคัญ                        │
│  ─────────────────────────────────────   │
│  📝 สรุป                                 │
│  ─────────────────────────────────────   │
│  [ทำ Quiz ท้ายบท →]                     │
└──────────────────────────────────────────┘
```

### 5.5 Student — รายการ Lessons ของ Classroom
**Path:** `/student/[code]` (tab ใหม่ "บทเรียน")

---

## 6. ลำดับการพัฒนา (Milestones)

### Phase 1 — Backend Foundation
- [ ] เพิ่ม `Lesson`, `LessonAssignment`, `LessonCompletion` ใน `prisma/schema.prisma`
- [ ] รัน `prisma generate`
- [ ] สร้าง `POST /api/ai/generate-lesson` (Gemini prompt + response parsing)
- [ ] สร้าง CRUD `/api/lessons` (GET, POST, PATCH, DELETE)

### Phase 2 — Teacher UI
- [ ] หน้า `/dashboard/lessons` รายการ lessons
- [ ] หน้า `/dashboard/lessons/create` — upload PDF → generate → preview
- [ ] หน้า `/dashboard/lessons/[id]/edit` — แก้ไขเนื้อหา + publish
- [ ] Dialog "Assign to Classroom" เลือกห้องแล้ว assign

### Phase 3 — Student UI
- [ ] API `GET /api/classrooms/[id]/lessons` สำหรับนักเรียน
- [ ] Tab "บทเรียน" ในหน้า student dashboard
- [ ] หน้า `/student/[code]/lessons/[lessonId]` แสดงเนื้อหา
- [ ] Quiz ท้ายบท (ใช้ `generate-questions` ที่มีอยู่) + บันทึกคะแนน

### Phase 4 — Polish
- [ ] Progress tracker สำหรับครู (กี่คนอ่านแล้ว / คะแนน quiz เฉลี่ย)
- [ ] นักเรียนได้รับ XP / Gold เมื่อ complete lesson (เชื่อมกับ economy ที่มีอยู่)
- [ ] Export lesson เป็น PDF สำหรับพิมพ์

---

## 7. Gemini Prompt สำหรับ generate-lesson

```
You are an expert Thai educational content designer.
Analyze the provided curriculum document and create a structured lesson.

Target: ${subject}, Grade: ${gradeLevel}
Language: Thai
Number of sections: ${sectionCount}

Return ONLY valid JSON matching this structure:
{
  "title": "string",
  "objectives": ["string"],
  "sections": [
    {
      "id": "s1",
      "heading": "string",
      "content": "string (2-4 paragraphs)",
      "examples": [{ "title": "string", "body": "string" }]
    }
  ],
  "keyTerms": [{ "term": "string", "definition": "string" }],
  "summary": "string",
  "estimatedMinutes": number
}
```

---

## 8. Dependencies & ไฟล์ที่ต้องแก้

| ไฟล์ | การเปลี่ยนแปลง |
|------|---------------|
| `prisma/schema.prisma` | เพิ่ม 3 models ใหม่ + relations ใน Classroom, Student |
| `src/lib/plan/plan-access.ts` | เพิ่ม feature flag `lessonGeneration` ตาม plan |
| `src/app/dashboard/layout.tsx` | เพิ่ม menu "บทเรียน" ใน sidebar |
| `src/app/student/[code]/page.tsx` | เพิ่ม tab "บทเรียน" |

---

## 9. ข้อควรระวัง

- **PDF ขนาดใหญ่**: Gemini inline data มี limit ~20MB — ควร validate ขนาดก่อนส่ง
- **Rate limit**: ใช้ `consumeRateLimitWithStore` เหมือน generate-questions (limit: 5/min สำหรับ lesson เพราะ heavy กว่า)
- **Plan gate**: lesson generation ควรเป็น PLUS/PRO feature เท่านั้น
- **Content quality**: AI อาจสร้างเนื้อหาไม่ถูกต้อง ครูต้อง review ก่อน publish เสมอ
