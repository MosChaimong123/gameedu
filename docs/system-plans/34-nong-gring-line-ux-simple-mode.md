# Nong Gring LINE Simple UX Mode

Status: Phase A/B initial implementation shipped in repo
Created: 2026-06-02
Related plans:
- `docs/system-plans/33-nong-gring-line-assignment-roadmap.md`
- `docs/system-plans/32-gameedu-reminder-assistant.md`

## Goal

ออกแบบประสบการณ์ใช้งาน "น้องกริ่งทวง" ให้ครูใช้งานได้ง่ายที่สุด โดยยึดหลักว่า:

1. หน้า `ห้องเรียน` เป็นจุดทำงานหลักของครู
2. LINE เป็นจุดสื่อสารกับนักเรียนและกลุ่มห้อง
3. ครูไม่ควรต้องจำคำสั่งเยอะ
4. ครูไม่ควรต้องสลับหลายหน้าเพื่อทำงานพื้นฐาน

## Main UX Decision

### Current issue

เวอร์ชันปัจจุบันวาง `Assignment Command Center` ไว้ที่หน้า `ดูรายงานผล`

ข้อดี:
- เห็นภาพรวมหลายห้องในจุดเดียว
- เหมาะกับครูที่ต้องการไล่ดูทุก assignment พร้อมกัน

ข้อเสีย:
- ไม่ตรงกับ mental model ของครูเวลาใช้งานจริง
- ครูมักคิดเป็น "ห้องนี้ต้องทำอะไรต่อ" มากกว่า "ทุกงานในทุกห้อง"
- เมื่อมีหลายห้อง การหา assignment ที่ต้องส่ง LINE หรือ export ทำได้ช้า

### New UX direction

แบ่ง UX ออกเป็น 2 ชั้น:

1. หน้า `ห้องเรียน` = action surface
2. หน้า `ดูรายงานผล` = overview surface

ความหมายคือ:
- งานที่ครู "ต้องกดใช้งานจริง" ควรอยู่ในหน้าห้องเรียน
- งานที่ครู "ต้องการดูภาพรวม" ควรอยู่ในหน้ารายงานผล

## Teacher Web Actions

### Classroom page actions

ในหน้า `ห้องเรียน` ของแต่ละห้อง ควรมี section ใหม่ชื่อประมาณ:

`LINE / งานมอบหมาย`

ปุ่มหลักที่ควรมี:

1. `ผูก LINE ห้องนี้`
- ใช้ผูกกลุ่ม LINE กับห้องเรียน
- แสดงสถานะ `ผูกแล้ว` / `ยังไม่ผูก`

2. `ส่ง LINE`
- ส่งข้อความเข้า LINE กลุ่มของห้องนี้
- ใช้กับ assignment ที่เลือก

3. `ทวงงานค้าง`
- ส่งข้อความสรุปงานค้างของห้องนี้แบบรวม
- ไม่ต้องไล่กดทีละ assignment

4. `สรุปงาน`
- เปิดสรุปงานของห้องนี้
- เน้นใครยังไม่ส่ง งานไหนค้างเยอะ และครบกำหนดเมื่อไร

5. `Export`
- export CSV หรือรายงานของห้องนี้

6. `คัดลอกข้อความเตือน`
- ใช้กรณีครูอยาก copy ไปโพสต์เอง

### Reports page actions

หน้ารายงานผลควรเก็บไว้ แต่ลดบทบาทเป็น:

- ดูภาพรวมหลายห้อง
- หา assignment ที่เสี่ยงค้างส่ง
- เปิดลิงก์กลับไปทำงานต่อในหน้าห้องเรียน

ไม่ควรเป็นจุดหลักที่ครูต้องเข้าทุกครั้งเพื่อส่ง LINE

## Recommended Teacher Flow

### First-time setup

1. ครูเข้าหน้า `ห้องเรียน`
2. กด `ผูก LINE ห้องนี้`
3. ระบบแสดงคำสั่งหรือ QR/help สำหรับเชื่อมกลุ่ม
4. เมื่อผูกสำเร็จ แสดง badge `LINE connected`

### Daily use

1. ครูเข้าหน้า `ห้องเรียน`
2. เห็น list งานของห้องนี้
3. กด `ส่ง LINE` สำหรับงานเดียว หรือ `ทวงงานค้าง` สำหรับทั้งห้อง
4. นักเรียนตอบหรือส่งงานผ่าน LINE
5. ครูกลับมาดู `สรุปงาน` หรือ `Export` จากหน้าเดิม

## LINE Commands

### Teacher commands

คำสั่งฝั่งครูควรเหลือเฉพาะชุดที่จำง่าย:

1. `คำสั่ง`
- แสดงรายการคำสั่งทั้งหมด

2. `ผูกห้อง <classroomId> <secret>`
- ใช้ครั้งแรกเพื่อผูกกลุ่ม LINE กับห้องเรียน

3. `สรุปงาน`
- สรุปงานค้างของห้องนี้

4. `ทวงงาน`
- ส่งข้อความทวงงานรวมของห้องนี้

5. `สร้างงาน <ชื่องาน>`
- สร้าง assignment แบบเร็วจาก LINE

### Student commands

คำสั่งฝั่งนักเรียนควรสั้นและชัด:

1. `ผูกนักเรียน <studentCode>`
- ผูกตัวตนกับระบบ GameEdu

2. `งานของฉัน`
- ดูงานค้างของตัวเองแบบ private

3. `ส่งงาน <assignmentId> <ข้อความ>`
- ส่งคำตอบผ่าน LINE

## Simplest MVP Command Set

ถ้าต้องการเวอร์ชันที่ใช้ง่ายที่สุดจริง ๆ ให้เหลือแค่นี้

### Web

- `ผูก LINE`
- `ส่ง LINE`
- `ทวงงานค้าง`
- `สรุปงาน`
- `Export`

### LINE

- `คำสั่ง`
- `ผูกห้อง`
- `สรุปงาน`
- `ทวงงาน`
- `ผูกนักเรียน`
- `งานของฉัน`
- `ส่งงาน`

## UI Proposal

### Classroom page

เพิ่ม card ใหม่ในหน้าห้องเรียน:

```text
LINE / งานมอบหมาย
[LINE connected]
[ทวงงานค้าง] [ส่ง LINE] [Export] [สรุปงาน]

งานล่าสุดของห้องนี้
- งาน A   ค้าง 5 คน   [ส่ง LINE] [Export]
- งาน B   ค้าง 2 คน   [ส่ง LINE] [Export]
```

### Reports page

เก็บไว้เป็นหน้าภาพรวม:

```text
งานมอบหมายทุกห้อง
- ห้อง A / งาน 1 / ค้าง 5
- ห้อง B / งาน 2 / ค้าง 9
- ห้อง C / งาน 3 / ค้าง 1
```

และควรมีปุ่ม `เปิดห้องนี้` มากกว่าปุ่ม action หลัก

## Product Principles

1. ครูควรทำงานหลักได้จากหน้าห้องเรียนโดยไม่ต้องอ้อม
2. หน้า report ใช้ดูภาพรวม ไม่ใช่จุดทำงานหลัก
3. ทุก action ใน LINE ควรมีปุ่มคู่กันบนเว็บ
4. ทุก action บนเว็บที่เกี่ยวกับการทวงงานควรมี LINE outcome ชัดเจน
5. คำสั่งใน LINE ต้องน้อย จำง่าย และแบ่งครู/นักเรียนชัด

## Implementation Plan

### Phase A: Move teacher actions closer to classroom

1. เพิ่ม section `LINE / งานมอบหมาย` ในหน้าห้องเรียน
2. ดึงรายการ assignment ของห้องนั้นมาแสดงแบบย่อ
3. เพิ่มปุ่ม `Send LINE` และ `Export` ต่อ assignment
4. เพิ่มปุ่ม `ทวงงานค้าง` ระดับห้อง

Implementation note (2026-06-02):
- Added the classroom-level LINE / assignment panel to the classroom page
- Added per-assignment `Send LINE`, `Export`, `Copy reminder`, and `Open grade table`
- Added classroom-level `ทวงงานค้างทั้งห้อง` action

### Phase B: Show LINE connection status

1. แสดง badge `LINE connected` / `LINE not connected`
2. เพิ่ม entry point สำหรับ `ผูก LINE ห้องนี้`
3. แสดงข้อความช่วย setup ถ้ายังไม่ผูก

Implementation note (2026-06-02):
- Added connected/not-connected badge on the classroom page
- Added setup hint when the classroom has not been linked yet
- Added a classroom-page binding entry point with a signed expiring bind command instead of exposing the raw secret
- Added in-place LINE status refresh so the classroom page can reflect a successful bind without a full reload
- Added automatic polling while the bind dialog stays open, then stops automatically once LINE is connected or the dialog closes

### Phase C: Keep reports as overview

1. คง `Assignment Command Center` ที่หน้า reports
2. ปรับ copy ให้ชัดว่าเป็นมุมมองรวมหลายห้อง
3. เพิ่ม deep link กลับไปหน้าห้องเรียนให้เด่น

Implementation note (2026-06-03):
- Added an overview banner on the reports assignment tab
- Updated copy to position reports as overview-only
- Made the classroom deep link more prominent with "open classroom" wording

### Phase D: Student self-link in private LINE chat

1. Add a `เชื่อม LINE` button on the student dashboard when the signed-in account owns that student profile
2. Generate a temporary 6-digit code from the student page
3. Let the student send `เชื่อม <code>` in a private LINE chat with the bot
4. Poll the student dialog until the link switches to connected

Implementation note (2026-06-03):
- Added a student dashboard LINE link dialog with a generated 6-digit code
- Added automatic polling while the dialog stays open
- Added a private LINE command `เชื่อม <code>` / `link <code>`
- Added account-level persistence for the student-to-LINE classroom link
- Added the same `เชื่อม LINE` entry point to the student home page so students do not need to open a classroom page first

### Phase E: Teacher visibility for student LINE linking

1. Show a simple linked / not linked summary on the classroom page
2. Let the teacher scan who is ready for private LINE commands without opening student profiles one by one
3. Keep this status near the classroom LINE tools so onboarding and reminders live in one place

Implementation note (2026-06-03):
- Added per-student LINE link status to the classroom dashboard payload
- Updated the classroom refresh API to return the same dashboard shape used by the classroom page
- Added a student LINE connection roster to the classroom LINE panel with linked/unlinked counts and per-student status badges

## Success Criteria

ถือว่า UX แบบง่ายสำเร็จเมื่อ:

1. ครูเข้า `ห้องเรียน` แล้วทำ action หลักได้ครบ
2. ครูไม่ต้องเข้า `ดูรายงานผล` เพื่อส่ง LINE ทุกครั้ง
3. ครูใหม่เข้าใจ flow ได้โดยไม่ต้องจำคำสั่งเกิน 3-4 คำสั่ง
4. นักเรียนใช้คำสั่ง `งานของฉัน` และ `ส่งงาน` ได้โดยไม่สับสน
5. ห้องที่มีหลาย section ยังจัดการได้เร็วโดยคิดเป็น "ห้อง" ก่อน "งาน"
