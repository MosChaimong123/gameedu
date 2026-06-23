# แผน: บังคับวิดีโอต่อหัวข้อ + ระบบตรวจสอบการดูครบเวลา

## ที่มา

ปัจจุบัน:
- ครูสามารถ publish บทเรียนโดยไม่มีวิดีโอในหัวข้อ
- ไม่มีการตรวจสอบว่านักเรียนดูวิดีโอจริงหรือเปล่า
- นักเรียนสามารถกด "เรียนจบ" ได้โดยไม่ดูอะไรเลย

ต้องการ:
1. **บังคับครูใส่วิดีโอทุกหัวข้อ** ก่อน publish ได้
2. **ติดตามการดูวิดีโอ** — ต้องดูไม่น้อยกว่า 90% ถึงนับว่า "ผ่าน"
3. **ล็อกเนื้อหา** — section ใต้หัวข้อจะอ่านไม่ได้จนกว่าจะดูวิดีโอครบ

---

## ขอบเขต

| สิ่งที่เพิ่ม | ฝั่ง |
|-------------|------|
| Validation: topic ต้องมีวิดีโอก่อน publish | ครู (lesson-content.ts + publish API) |
| Warning UI ใน lesson editor | ครู (create/edit page) |
| `TopicVideoWatch` model ใน DB | Database (prisma schema) |
| API: บันทึก/ดึงสถานะการดูวิดีโอต่อ topic | API |
| Video player ที่ track เวลา (YouTube + HTML5) | นักเรียน (page.tsx) |
| Lock state: section ล็อกอยู่ถ้ายังไม่ดูวิดีโอ | นักเรียน (page.tsx) |

---

## Phase 1 — Validation ฝั่งครู

### 1.1 เพิ่ม validation ใน `lesson-content.ts`

```ts
// เพิ่มใน validateLessonContentForPublish (บรรทัดประมาณ 418)
const topicsMissingVideo = value.topics
    .filter(t => t.contentStatus !== "empty")
    .filter(t => {
        const hasTopicVideo = t.media?.some(m => m.type === "video")
        const hasSectionVideo = t.sections.some(s => s.media?.some(m => m.type === "video"))
        return !hasTopicVideo && !hasSectionVideo
    })

if (topicsMissingVideo.length > 0) {
    return {
        valid: false,
        message: `หัวข้อต่อไปนี้ยังไม่มีวิดีโอ: ${topicsMissingVideo.map(t => t.title).join(", ")}`,
        missingVideoTopicIds: topicsMissingVideo.map(t => t.id),
    }
}
```

### 1.2 Warning UI ใน lesson editor

ใน `src/app/dashboard/lessons/[id]/edit/page.tsx` และ `create/page.tsx`:

```
┌─────────────────────────────────────────────────┐
│ ⚠ หัวข้อที่ยังไม่มีวิดีโอ (publish ไม่ได้)      │
│ • การตั้งคำถามและสมมติฐาน  [เพิ่มวิดีโอ →]       │
│ • ตัวอย่างการสังเกตในชีวิต  [เพิ่มวิดีโอ →]      │
└─────────────────────────────────────────────────┘
```

- แสดงเป็น banner สีเหลืองใต้หัวข้อ topic ที่ขาดวิดีโอ
- ปุ่ม publish จะ disabled พร้อม tooltip อธิบาย

---

## Phase 2 — Database Schema

### 2.1 เพิ่ม model `TopicVideoWatch`

```prisma
model TopicVideoWatch {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  studentId       String   @db.ObjectId
  student         Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  lessonId        String   @db.ObjectId
  topicId         String   // topic.id ใน LessonContentV2 (ไม่ใช่ ObjectId)
  mediaId         String   // LessonMediaBlock.id หรือ mediaId
  
  watchedSeconds  Float    @default(0)  // เวลาที่ดูจริง (deduplicated)
  totalSeconds    Float    // ความยาววิดีโอ
  completedAt     DateTime?             // null = ยังไม่ครบ
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([studentId, lessonId, topicId])
  @@index([studentId, lessonId])
}
```

> หมายเหตุ: `watchedSeconds` ใช้วิธี interval tracking (บันทึก range ที่ดูจริง ไม่ใช่แค่ currentTime) เพื่อกัน seek ข้าม

### 2.2 เพิ่ม relation ใน Student model

```prisma
model Student {
  // ...existing...
  topicVideoWatches TopicVideoWatch[]
}
```

---

## Phase 3 — API Endpoints

### 3.1 `PATCH /api/student/[code]/lessons/[lessonId]/topics/[topicId]/video-watch`

Request body:
```json
{
  "mediaId": "abc123",
  "watchedRanges": [[0, 45], [50, 120]],   // seconds [start, end]
  "totalSeconds": 180
}
```

Logic:
```
1. หา student จาก code
2. merge watchedRanges (ไม่นับซ้ำ)
3. คำนวณ watchedSeconds = sum of merged ranges
4. ถ้า watchedSeconds / totalSeconds >= 0.90 → set completedAt = now()
5. upsert TopicVideoWatch
6. return { watchedSeconds, totalSeconds, completed: boolean, percent: number }
```

### 3.2 `GET /api/student/[code]/lessons/[lessonId]/video-watch`

Response:
```json
{
  "watches": [
    { "topicId": "t1", "percent": 100, "completed": true },
    { "topicId": "t2", "percent": 42, "completed": false }
  ]
}
```

ใช้โหลดพร้อมกับ lesson เพื่อ restore สถานะ

---

## Phase 4 — Video Player (ฝั่งนักเรียน)

### 4.1 YouTube IFrame API Tracking

```tsx
// ใน HeroVideoPlayer component
useEffect(() => {
    if (!youtubeEmbedUrl) return
    
    const player = new YT.Player(iframeRef.current, {
        events: {
            onStateChange: (event) => {
                if (event.data === YT.PlayerState.PLAYING) startTracking()
                if (event.data === YT.PlayerState.PAUSED) stopTracking()
                if (event.data === YT.PlayerState.ENDED) stopTracking()
            }
        }
    })
}, [])

// ทุก 5 วินาที บันทึก range ที่กำลังดูอยู่
function startTracking() {
    intervalRef.current = setInterval(() => {
        const current = player.getCurrentTime()
        addWatchRange(current - 5, current)
    }, 5000)
}
```

### 4.2 HTML5 Video Tracking

```tsx
<video
    ref={videoRef}
    onTimeUpdate={() => {
        const current = videoRef.current.currentTime
        if (current - lastTrackedRef.current >= 5) {
            addWatchRange(lastTrackedRef.current, current)
            lastTrackedRef.current = current
        }
    }}
    onEnded={() => flushWatchData()}
/>
```

### 4.3 Flush ไป API

```ts
// debounce 10 วินาที หรือ onPause / onEnded
async function flushWatchData() {
    await fetch(`/api/student/${code}/lessons/${lessonId}/topics/${topicId}/video-watch`, {
        method: "PATCH",
        body: JSON.stringify({
            mediaId,
            watchedRanges: pendingRanges,
            totalSeconds: duration,
        })
    })
}
```

---

## Phase 5 — Lock/Unlock UI (ฝั่งนักเรียน)

### 5.1 Lock state ของ sections

```
[ดูวิดีโอก่อน]
┌──────────────────────────────────────────────┐
│ 🔒 ต้องดูวิดีโอให้ครบก่อนอ่านเนื้อหานี้      │
│ ████████░░ 80%  ยังขาดอีก 10%               │
└──────────────────────────────────────────────┘
```

### 5.2 Progress bar บนตัว video player

```
[กำลังดู: 1:23 / 9:06]  [████████░░░░  80% · ยังขาดอีก ~1:50]
```

### 5.3 เมื่อดูครบ 90%

```
✓ ดูวิดีโอครบแล้ว — เนื้อหาปลดล็อกแล้ว
```

sections ใต้ topic จะเปลี่ยนจาก locked → อ่านได้ปกติ

### 5.4 State flow ต่อ topic

```
video_not_started → video_watching → video_completed (≥90%)
                                          ↓
                                  sections unlocked
                                          ↓
                                  all sections read
                                          ↓
                                  topic_done ✓
```

---

## ลำดับการ implement

### Sprint 1 (Validation ครู)
- [ ] เพิ่ม `validateTopicHasVideo` ใน `lesson-content.ts`
- [ ] Warning banner ใน lesson editor (create + edit page)
- [ ] Disable publish button เมื่อ topic ขาดวิดีโอ

### Sprint 2 (Database + API)
- [ ] เพิ่ม `TopicVideoWatch` model ใน `prisma/schema.prisma`
- [ ] `prisma db push`
- [ ] `PATCH /api/student/[code]/lessons/[lessonId]/topics/[topicId]/video-watch`
- [ ] `GET /api/student/[code]/lessons/[lessonId]/video-watch`

### Sprint 3 (Video Player tracking)
- [ ] เพิ่ม YouTube IFrame API script loader
- [ ] Interval-based range tracker (YouTube)
- [ ] HTML5 video `onTimeUpdate` tracker
- [ ] Flush function + debounce

### Sprint 4 (Lock UI)
- [ ] Load video-watch status on page mount
- [ ] Lock overlay ใน ContentTab sections
- [ ] Watch progress bar ใน video player
- [ ] Unlock animation เมื่อ 90%

---

## Technical Notes

**ทำไมใช้ interval ranges ไม่ใช่ currentTime:**
- กัน seek: ถ้าใช้ currentTime อย่างเดียว นักเรียนกด seek ไปท้ายวิดีโอเลยได้
- ต้องดู "จริง" ทุก segment รวมแล้ว ≥ 90% ของความยาว

**เกณฑ์ 90% (ไม่ใช่ 100%):**
- buffer สำหรับ buffering / network hiccup
- YouTube outro / end card ช่วงสุดท้ายมักไม่สำคัญ

**YouTube IFrame API:**
- ต้องโหลด `https://www.youtube.com/iframe_api` ครั้งเดียวใน layout
- ใช้ `postMessage` ผ่าน `enablejsapi=1` query param ใน embed URL

**localStorage fallback:**
- บันทึก watch ranges ใน localStorage ระหว่าง session
- ส่งไป API เมื่อมี network เท่านั้น (optimistic local update ก่อน)
