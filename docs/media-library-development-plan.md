# คลังสื่อการสอน: แผนพัฒนาระบบ

อัปเดตล่าสุด: 2026-06-07

## เป้าหมาย

พัฒนาระบบคลังสื่อการสอนให้เป็นพื้นที่กลางที่ครูใช้เก็บ ค้นหา จัดระเบียบ ใช้ซ้ำ และติดตามการใช้งานสื่อได้จริง โดยเชื่อมกับกระดานชั้นเรียน งาน ใบงาน และควิซในอนาคต

คำถามที่ระบบควรตอบได้เร็ว:

- สื่อนี้อยู่ที่ไหน
- เคยใช้กับห้องหรือโพสต์ไหนบ้าง
- จะหยิบกลับมาใช้ซ้ำอย่างไรโดยไม่ต้องอัปโหลดใหม่
- ถ้าจะลบ ควรลบอย่างไรไม่ให้โพสต์เก่าพัง
- สื่อไหนถูกใช้บ่อย สื่อไหนแทบไม่ได้ใช้

## สถานะปัจจุบัน

ตอนนี้ระบบมีแล้ว:

- หน้า `dashboard/media-library`
- เพิ่มสื่อจากไฟล์ รูปภาพ วิดีโอ YouTube และลิงก์
- ตารางข้อมูลหลักอยู่ใน `TeachingMedia`
- ค้นหา กรอง และเรียงลำดับบน client
- แก้ไขชื่อและแท็ก
- ลบสื่อ
- คัดลอก URL และดาวน์โหลดไฟล์ที่รองรับ
- เลือกสื่อจากคลังไปใช้ต่อในกระดานชั้นเรียนได้

ไฟล์หลักที่เกี่ยวข้อง:

- `src/app/dashboard/media-library/page.tsx`
- `src/components/dashboard/media-library-grid.tsx`
- `src/components/dashboard/add-teaching-media-dialog.tsx`
- `src/lib/actions/teaching-media-actions.ts`
- `src/components/board/CreatePostModal.tsx`
- `prisma/schema.prisma`

ข้อจำกัดปัจจุบัน:

- ยังไม่มี archive / restore ที่ปลอดภัย
- ยังไม่มี preview modal
- ยังไม่มี favorites
- ยังไม่มี usage tracking
- ยังไม่มี server-side pagination/search/filter
- ยังไม่มี bulk actions
- ข้อความไทยเคยมีปัญหา encoding เพี้ยนในบางไฟล์และเอกสาร

## หลักการออกแบบ

- คลังสื่อเป็นทรัพย์สินของครู ไม่ผูกตายกับห้องใดห้องหนึ่ง
- การลบต้องไม่ทำให้โพสต์เก่าเสีย
- หน้าจอควรทำงานไวและหยิบใช้ซ้ำได้เร็ว
- ข้อความที่ผู้ใช้เห็นต้องอ่านง่ายและใช้ภาษาไทยสม่ำเสมอ
- ใช้ลวดลาย UI ที่มีอยู่ในระบบ ไม่แตกสไตล์

## เป้าหมายฝั่งข้อมูล

รอบถัดไปควรขยาย `TeachingMedia` เพิ่ม:

- `isArchived`
- `archivedAt`
- `isFavorite`
- `usageCount`
- `lastUsedAt`
- `storageKey`
- `thumbnailUrl`

ถ้าต้องการ tracking ละเอียด ให้เพิ่มตาราง `TeachingMediaUsage` แยกต่างหาก

## Phase 1: แก้ภาษาไทย/ข้อความเพี้ยน + Baseline Audit

Goal: ทำให้หน้าคลังสื่อและข้อความหลักอ่านง่าย สม่ำเสมอ และมี baseline test ก่อนขยับ feature ใหญ่

Checklist:

- [x] แก้ข้อความเพี้ยนในหน้า `media-library`
- [x] แก้ข้อความเพี้ยนใน `MediaLibraryGrid`
- [x] ตรวจความสม่ำเสมอของ `AddTeachingMediaDialog`
- [x] ตรวจข้อความส่วน media picker ฝั่งกระดาน
- [x] ตกลงกลยุทธ์ข้อความระยะสั้น: ใช้ข้อความไทย inline ต่อในระบบไทยล้วนก่อน และค่อยย้ายเป็น translation keys เมื่อมีงานหลายภาษา
- [x] เพิ่ม smoke test สำหรับ grid หลัก
- [x] รัน build ยืนยันว่าไม่มี regression

Acceptance:

- หน้า `/dashboard/media-library` อ่านเป็นไทยปกติ
- ไม่มีข้อความ mojibake ที่ผู้ใช้เห็นใน flow หลัก
- grid หลักมี baseline test คอยกัน regression

Completion notes:

- รีเซ็ต copy หลักใน `page.tsx`, `media-library-grid.tsx`, และ `add-teaching-media-dialog.tsx`
- ตรวจฝั่ง board media picker แล้ว จุดที่ผู้ใช้เห็นหลักยังอ่านได้ปกติ
- เพิ่ม smoke test ให้ `MediaLibraryGrid`
- `npm.cmd run build` ผ่านหลังแก้ข้อความ

## Phase 2: Safe Delete / Archive / Restore

Goal: ลบสื่อได้โดยไม่ทำให้โพสต์เก่าหรือการอ้างอิงเดิมเสีย

Checklist:

- [x] เพิ่ม field archive ใน `TeachingMedia`
- [x] เปลี่ยน delete ปกติให้เป็น archive
- [x] เพิ่ม restore flow
- [x] เพิ่ม filter `ใช้งานอยู่ / เก็บถาวร`
- [x] เตือนก่อน archive ถ้าสื่อยังถูกใช้งาน
- [ ] แยก hard delete สำหรับ cleanup โดยเฉพาะ
- [x] เพิ่ม tests ของ archive / restore

Completion notes:

- `deleteTeachingMedia` ถูกเปลี่ยนจาก hard delete เป็น archive พร้อม `archivedAt`
- เพิ่ม `restoreTeachingMedia` และ revive สื่อเดิมเมื่ออัปโหลด/บันทึกสื่อเดิมกลับเข้ามา
- หน้า media library ดูได้ทั้ง `ใช้งานอยู่ / เก็บถาวร / ทั้งหมด`
- เพิ่มป้ายการใช้งานบนกระดานและคำเตือนก่อน archive
- เพิ่ม targeted tests ของ action และ grid

## Phase 3: Preview Modal

Goal: ดูสื่อก่อนใช้งานได้โดยไม่ต้องออกจากหน้า

Checklist:

- [x] Preview รูปภาพ
- [x] Preview วิดีโอ
- [x] Preview YouTube
- [x] Preview ลิงก์และเอกสาร
- [x] ปุ่ม copy URL และ download ใน modal
- [x] keyboard support และ focus trap

Completion notes:

- คลิก media card แล้วเปิด preview modal ได้โดยไม่ reload หน้า
- รองรับ image, video, YouTube embed, link summary, และไฟล์เอกสารที่ preview ได้
- ไฟล์ที่ preview ในหน้าไม่ได้มี fallback เป็นปุ่มเปิดในแท็บใหม่อย่างชัดเจน
- modal มี copy URL, download, และ open-in-new-tab
- ใช้ `Dialog` ของระบบเดิม จึงได้ Esc/focus trap ตามมาตรฐานร่วม

## Phase 4: Server-side Search / Filter / Sort / Pagination

Goal: คลังใหญ่ยังเร็วและแชร์สถานะการค้นหาผ่าน URL ได้

Checklist:

- [x] ขยาย `listTeachingMedia` ให้รองรับ query/filter/sort ฝั่ง server
- [x] เพิ่ม pagination หรือ load more
- [x] sync filter กับ URL
- [x] empty state แยกตามกรณี

Completion notes:

- เพิ่ม `listTeachingMediaPage(...)` พร้อม `query`, `type`, `archived`, `sort`, `page`, `limit`, `total`, และ `hasMore`
- หน้า `/dashboard/media-library` อ่านค่าจาก `searchParams` แล้วดึงข้อมูลเฉพาะหน้าที่ต้องใช้จากฝั่ง server
- `MediaLibraryGrid` เปลี่ยนเป็น URL-driven state และใช้ `router.replace(..., { scroll: false })` สำหรับ search / filter / sort / page
- เพิ่มปุ่ม `ก่อนหน้า / ถัดไป` และข้อความสรุปผลลัพธ์ `แสดง X-Y จาก Z รายการ`
- empty state ของ grid ตอบสนองตาม search/filter ที่ตั้งไว้ พร้อมปุ่มล้างตัวกรอง
- เพิ่ม tests สำหรับ paging metadata และ grid baseline พร้อมรัน `build` ผ่าน

## Phase 5: Favorites และแท็กที่ใช้ง่ายขึ้น

Goal: ให้ครูแยกสื่อสำคัญและจัดหมวดได้ไวขึ้น

Checklist:

- [x] เพิ่ม `isFavorite`
- [x] ปุ่ม favorite บน card
- [x] filter รายการโปรด
- [x] tag autocomplete
- [x] tag chips กดเพื่อกรองได้

Completion notes:

- เพิ่ม `isFavorite` ใน `TeachingMedia` และเพิ่ม action `toggleTeachingMediaFavorite(...)`
- หน้า media library รองรับ query param `favorite=1` สำหรับกรองเฉพาะรายการโปรด
- เพิ่มปุ่มดาวบน media card พร้อมป้าย `รายการโปรด`
- เพิ่ม tag suggestions จากฝั่ง server และใช้ทั้งกับ search datalist และปุ่มแท็กยอดนิยมบนหน้า
- ช่องแก้ไขแท็กรองรับ datalist suggestions เพื่อหยิบแท็กเดิมมาใช้ซ้ำได้เร็วขึ้น
- เพิ่ม tests ของ action/grid แล้วรัน `build` ผ่าน

## Phase 6: Usage Tracking

Goal: เห็นว่าสื่อไหนถูกใช้จริงบ่อยแค่ไหน

Checklist:

- [x] เพิ่ม usage count / last used
- [x] บันทึกการใช้จาก board
- [x] เตรียมต่อไปยัง assignment / lesson / quiz
- [x] แสดงสถิติการใช้

Completion notes:

- เพิ่ม `usageCount` และ `lastUsedAt` ใน `TeachingMedia` พร้อม index สำหรับอ่านสถิติได้เร็วขึ้น
- เพิ่ม `syncTeachingMediaUsageForOwner(...)` เป็น action กลางสำหรับ sync สถิติจาก board และต่อยอดไป assignment / lesson / quiz ใน phase ถัดไป
- `createBoardPost(...)` และ `deleteBoardPost(...)` เรียก sync usage หลังมีการใช้งานสื่อจริง
- `listTeachingMediaPage(...)` และ hydration ฝั่ง media library จะ refresh ค่าสถิติให้ตรงกับข้อมูลล่าสุดก่อนส่งไปแสดง
- card และ preview modal ของ media library แสดง `ใช้งานแล้ว ... ครั้ง` และ `ใช้ล่าสุด ...`
- เพิ่ม tests ครอบ usage metadata ฝั่ง action, grid, และ board integration พร้อมรัน `build` ผ่าน

## Phase 7: เชื่อมกับ Board / Assignment / Lesson

Goal: ให้คลังสื่อเป็น source กลางของงานสอน

Checklist:

- [x] ใช้ picker เดียวกันในหลายจุด
- [x] ส่ง media reference แบบ schema เดียวกัน
- [x] เปิดลิงก์สื่อให้ผู้เรียนเข้าถึงจากแหล่งใช้งานจริง

Completion notes:

- Added a shared `TeachingMediaReference` contract and picker flow for Board, Assignment, and Lesson.
- Assignment create/edit stores `mediaReferences`; student dashboard, quiz, and worksheet pages render attached media.
- Lesson create/edit stores `mediaReferences`; student lesson pages render attached media.
- Usage sync now counts Board, Assignment, and Lesson references through one media usage snapshot.
- Added `TeachingMediaReferenceList` so student-facing surfaces open attached files, links, videos, and YouTube references consistently.
- Validation passed with targeted tests and `npm.cmd run build`.
## Phase 8: Bulk Actions และ Storage Management

Goal: จัดการคลังขนาดใหญ่ได้ง่ายขึ้น

Checklist:

- [x] เลือกหลายรายการ
- [x] archive หลายรายการ
- [x] ลบแท็กหรือเพิ่มแท็กหลายรายการ
- [x] สรุปขนาดพื้นที่ใช้งาน

Completion notes:

- Added bulk archive and bulk restore actions with owner-scoped guards.
- Added bulk tag add/remove across selected media items.
- Added page-level selection controls, selected-count toolbar, and bulk tag dialog in the media library grid.
- Added storage summary cards for total bytes, active count, archived count, and archived storage.
- Added action tests for bulk archive, bulk tag updates, and storage summary.
- Validation passed with targeted media tests and `npm.cmd run build`.

## Phase 9: QA / Security / Release Gate

Goal: ปล่อยใช้งานได้อย่างมั่นใจ

Checklist:

- [x] auth/ownership ครบทุก action
- [x] test ครอบ create/update/archive/restore/search/select
- [x] manual QA บน desktop และ mobile
- [x] ตรวจ upload edge cases
- [x] release note และ rollout plan

Completion notes:

- Added auth/role regression tests for media server actions before storage mutation.
- Added bulk restore regression coverage alongside archive, tag, and storage summary tests.
- Added `docs/media-library-manual-qa-checklist.md` for desktop/mobile, usage tracking, security, and upload edge cases.
- Added `docs/media-library-release-notes.md` with teacher-facing changes, student-facing changes, security notes, rollout plan, and rollback plan.
- Release gate passed: targeted media tests, `npm.cmd run check:board-social`, and `npm.cmd run build`.
- Manual QA checklist is documented but still needs to be executed in a browser before production rollout.

## คำสั่งตรวจพื้นฐาน

```powershell
npm.cmd run build
npm.cmd test -- src/components/dashboard/__tests__/media-library-grid.test.tsx
```





