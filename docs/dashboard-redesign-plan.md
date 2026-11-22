# แผนปรับหน้า UI แผงควบคุมครู (Teacher Dashboard)

## Context

หน้าแผงควบคุมครูปัจจุบันทำหน้าที่เป็น "หน้า landing" มากกว่า "แดชบอร์ด" และไม่สอดคล้องกับเมนูซ้ายที่มี 12 รายการ:

- **เมนูลัดครอบคลุมแค่ 3 จาก 9 เมนูงานจริง** — `teacherActions` มี 4 ใบ (รายงานผล / ชั้นเรียน / OMR ที่ล็อกอยู่ / ชุดคำถาม) ส่วน คลังสื่อการสอน, บทเรียน, คอร์ส, ประวัติการเล่น, ตั้งค่า ไม่มีทางเข้าบนแดชบอร์ดเลย
- **Hero + tile กินพื้นที่มหาศาลแต่ไม่มีข้อมูล** — ครูเปิดหน้านี้แล้วไม่รู้สถานะห้องเรียนตัวเอง
- **สีการ์ดสุ่ม** (`bg-amber-600` / `bg-emerald-600` / `bg-sky-600` / `bg-lime-600`) ไม่ผูกกับหมวดใดในเมนู จำไม่ได้ว่าสีไหนหมายถึงอะไร
- **การ์ด OMR แสดง "เร็วๆนี้ / เร็วๆนี้"** — หัวข้อกับคำบรรยายเป็นข้อความเดียวกัน ไม่บอกว่าฟีเจอร์คืออะไร
- **ภาษาอังกฤษโผล่กลางหน้าไทย** — "No announcements for your plan yet.", "No missions for your plan yet.", "Ready to host"

**ผลลัพธ์ที่ต้องการ:** แดชบอร์ดที่ครูเปิดมาแล้วเห็นสถานะงานตัวเอง และไปยังทุกเมนูได้ภายในคลิกเดียว โดยระบบสีสอดคล้องกับเมนูซ้ายแบบ 1:1

---

## Phase 0 — ผลการสำรวจโค้ด (เสร็จแล้ว)

**Repo:** `C:\Users\IHCK\GAMEEDU\gamedu` — Next.js App Router + Tailwind v4 + shadcn/ui + Prisma + framer-motion

### ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | บทบาท |
|---|---|
| `src/app/dashboard/page.tsx` | Server component ดึง news/missions จาก Prisma ตรงผ่าน `getOptionalDbModel` |
| `src/components/dashboard/dashboard-content.tsx` | ประกอบ `TopInsights` + `QuickActions` |
| `src/components/dashboard/quick-actions.tsx` | **hero + เมนูลัด 4 ใบ** — มี `teacherActions` เป็นลิสต์ของตัวเอง |
| `src/components/dashboard/top-insights.tsx` | แบนเนอร์ข่าวสาร (indigo) + ภารกิจ (purple) |
| `src/components/dashboard/dashboard-menu-tile.tsx` | การ์ดเมนูลัด — ตัวการ์ตูนโผล่ครึ่งบนนอกกรอบ (`-mt-[5.25rem]`) โดยตั้งใจ |
| `src/components/dashboard/dashboard-menu-hero-card.tsx` | การ์ด hero สีชมพู |
| `src/components/layout/sidebar.tsx` | **`navItems` อยู่ที่บรรทัด 27–40** |
| `src/components/layout/mobile-dashboard-nav.tsx` | เมนูล่างบนมือถือ |
| `src/lib/dashboard-menu-assets.ts` | แม็ป assetKey → รูปตัวการ์ตูน |
| `src/lib/translations.ts` | i18n ทั้งระบบ (4,640 บรรทัด) |
| `src/lib/omr-dashboard-enabled.ts` · `src/lib/courses-ui-enabled.ts` | feature flag |

### 6 ข้อค้นพบที่เปลี่ยนแผนเดิม

**1. `navItems` มีอยู่แล้วแต่ไม่ได้ export — และมี 12 รายการ ไม่ใช่ 11**

`sidebar.tsx:27` เป็น `const navItems = [...] as const` แบบ local มี `courses` (`/dashboard/courses`) เพิ่มมาจากที่เห็นในภาพหน้าจอ เพราะซ่อนด้วย `isCoursesUiEnabled()` — **ห้ามลืมรายการนี้** ตอนย้ายไป config กลาง

**2. เมนูลัดใช้ "รูปตัวการ์ตูน" ส่วนเมนูซ้ายใช้ "ไอคอน lucide" — ใช้ร่วมกันตรงๆ ไม่ได้**

`DashboardMenuTile` รับ `image: DashboardMenuImage` แล้ววางตัวการ์ตูนล้นขอบบนการ์ด (มีคอมเมนต์ไทยกำกับว่าตั้งใจทำตามรูปอ้างอิง) ไม่ใช่บั๊ก → **แก้แผน:** config กลางถือ *ทั้ง* `icon` (lucide) และ `assetKey` (รูป) ต่อหนึ่งรายการ; tile คงตัวการ์ตูนไว้ แต่ถ้าเมนูใหม่ยังไม่มีรูป ให้ fallback เป็นไอคอน lucide บนพื้นสีหมวด

**3. ข้อความอังกฤษไม่ได้ hardcode — เป็น "คีย์ที่ขาดคำแปลไทย"**

`translations.ts:4633` ประกอบ dictionary แบบนี้:

```ts
th: { ...englishPack, ...legacyThaiTranslations, ...thaiPack }
```

คีย์ไหนไม่มีในไฟล์ไทยทั้งสองจะ **fallback เป็นอังกฤษเงียบๆ** — ตรวจแล้ว 3 คีย์นี้ขาดคำแปลไทย: `topInsightsEmptyNews`, `topInsightsEmptyMissions`, `quickActionsTeacherReady` → **แก้ที่ `thaiPack` ที่เดียว ไม่ต้องแตะคอมโพเนนต์**

**4. ไม่ต้องสร้าง API endpoint สำหรับ KPI**

`dashboard/page.tsx` เป็น server component ที่คุยกับ Prisma อยู่แล้ว → ดึงตัวเลขฝั่ง server ได้เลย ตัดปัญหา loading/error state ทิ้งทั้งหมด รูปแบบที่มีอยู่ให้ทำตาม: `src/lib/services/teacher/get-teacher-overview.ts`

**5. Tailwind v4 — ไม่มี `tailwind.config.js`**

theme อยู่ใน `@theme` ของ `src/app/globals.css` และมี brand token อยู่แล้ว: `--color-brand-pink: #f43f8a` (บรรทัด 12), `--color-brand-cyan` (18), `--sidebar-*` เป็น oklch (89–96) → token หมวดสีของ Phase 3 ไปอยู่ที่นี่

**6. มี guard script ที่ต้องผ่าน**

`npm run check:i18n` (จับข้อความ hardcode) และ `npm run check:architecture` (บังคับ route บางตัวต้อง delegate ไป service, ห้ามแตะ Prisma ตรง) — ปัจจุบัน **ยังไม่มี guard คลุมไฟล์แดชบอร์ดครู** แต่ให้เขียนตามคอนเวนชันเดิม

---

## Phase 1 — เมนูลัดให้ครบและตรงกับเมนูซ้าย ✅ เสร็จแล้ว

**ปัญหาที่แก้:** ทางเข้าหายไป 6 เมนู, มีลิสต์เมนูซ้ำกัน 2 ที่ที่หลุดจากกันได้

**ผลลัพธ์:** config กลางอยู่ที่ `src/lib/navigation/dashboard-nav.ts` — `sidebar.tsx` และ `quick-actions.tsx` อ่านจากที่เดียวกัน `mobile-dashboard-nav.tsx` ไม่ต้องแก้เพราะ render `<Sidebar>` ต่ออยู่แล้ว เมนูลัดครูจาก 4 ใบ → 8 ใบ (9 เมื่อเปิด flag courses) เรียงตรงกับ sidebar เทสต์ `src/__tests__/dashboard-nav-config.test.ts` 8 เคส

### สิ่งที่ทำ

ย้าย `navItems` จาก `sidebar.tsx:27` ไปเป็น config กลาง `src/lib/navigation/dashboard-nav.ts`:

```ts
export type DashboardNavItem = {
  key: string
  labelKey: string
  href: string
  icon: LucideIcon
  assetKey?: DashboardMenuAssetKey   // มีรูปตัวการ์ตูนหรือไม่
  group: NavGroup                     // ใช้กับระบบสี Phase 3
  descKey?: string                    // คำบรรยายบน tile
  showOnDashboard: boolean
}
```

- คงลำดับและ `labelKey` เดิมทั้ง 12 รายการ (รวม `courses`)
- `sidebar.tsx` และ `mobile-dashboard-nav.tsx` render จาก config นี้
- `quick-actions.tsx` เปลี่ยนจาก `teacherActions` ที่เขียนมือ → `DASHBOARD_NAV.filter(i => i.showOnDashboard)`
- **flag เดิมต้องยังทำงาน:** กรอง `courses` ด้วย `isCoursesUiEnabled()` และล็อก `omr` ด้วย `isOmrDashboardEnabled()` ใน helper ตัวเดียว ไม่ใช่กระจายตามคอมโพเนนต์อย่างทุกวันนี้
- `showOnDashboard: false` เฉพาะ `dashboard` (หน้าปัจจุบัน), `profile` (เข้าทาง avatar), `upgrade` (เข้าทางปุ่ม PLUS)
- ต้องเพิ่ม `descKey` สำหรับเมนูที่ยังไม่มี: `mediaLibrary`, `lessons`, `courses`, `history`, `settings`
- ต้องเพิ่ม asset หรือกำหนด fallback ไอคอนสำหรับเมนูใหม่ทั้ง 5 ตัวใน `dashboard-menu-assets.ts`

ผลลัพธ์: 9 ใบ (หรือ 8 เมื่อปิด flag courses) → grid `lg:grid-cols-3` ลงตัวกว่า 4 คอลัมน์เดิม

### เกณฑ์ยอมรับ
- ทุกเมนูใน sidebar ที่ไม่ใช่ dashboard/profile/upgrade มีช่องบนแดชบอร์ด
- แก้ `labelKey` หรือ `href` ที่ config ที่เดียว แล้วเปลี่ยนทั้ง sidebar / mobile nav / เมนูลัด พร้อมกัน
- ปิด `isCoursesUiEnabled()` แล้ว `courses` หายทั้งสองที่

---

## Phase 2 — ยุบ hero + เพิ่มแถบ KPI ✅ เสร็จแล้ว

**ผลลัพธ์:** hero เป็นแถบเดียว มีปุ่ม `โฮสต์เกม` + `สร้างชุดคำถาม` (ชี้ไป `/dashboard/create-set` ที่มีอยู่จริง) mascot เหลือ 96–112px แสดงเฉพาะ `lg` ขึ้นไป · พื้น hero เปลี่ยนจาก `brand-pink` เป็น `nav-teach` เพราะ `#f43f8a` ให้ contrast กับตัวอักษรขาวแค่ 3.5:1 · KPI ดึงจาก `get-teacher-dashboard-summary.ts` ฝั่ง server ทุก count มี `orFallback` เป็น 0 แยกกัน ไม่ล้มทั้งหน้า · ไม่ได้สร้าง API endpoint ตามที่คาดไว้ตอนแรก

**ปัญหาที่แก้:** พื้นที่เหนือ fold ถูกใช้กับภาพตกแต่งล้วน

### สิ่งที่ทำ

**2.1 ยุบ `DashboardMenuHeroCard`**
- คงสีชมพูแบรนด์ (`brand-pink`) และปุ่ม play ไว้ — ยังเป็น element ที่เด่นที่สุด
- จัดเป็นแถบเดียว: ซ้าย = `t("gamePlay")` + `t("teacherHeroDesc")`, ขวา = ปุ่มโฮสต์เกม + สร้างชุดคำถาม
- mascot ย่อลงและอยู่ในกรอบ ซ่อนที่ `< sm`
- ปุ่มใช้ `@/components/ui/button` ที่มีอยู่ ไม่สร้างใหม่

**2.2 แถบ KPI 4 ตัว**

สร้าง `src/lib/services/teacher/get-teacher-dashboard-summary.ts` ตามรูปแบบ `get-teacher-overview.ts` คืน 4 ตัวเลข แล้วให้ `dashboard/page.tsx` เรียกรวมใน `Promise.all` ที่มีอยู่แล้ว (บรรทัด 39):

| การ์ด | ที่มา | คลิกไป |
|---|---|---|
| ชุดคำถามทั้งหมด | count จาก model ชุดคำถาม (ดูรูปแบบ query ที่ `src/app/api/sets/route.ts`) | `/dashboard/my-sets` |
| ชั้นเรียนที่ใช้งานอยู่ | count จาก classroom (`src/app/api/classrooms/route.ts`) | `/dashboard/classrooms` |
| นักเรียนทั้งหมด | count unique student ในทุกชั้นเรียนของครู | `/dashboard/classrooms` |
| เกมที่เล่นสัปดาห์นี้ | count history 7 วันย้อนหลัง | `/dashboard/history` |

- **ไม่ต้องมี loading/error state** เพราะ render ฝั่ง server — แต่ต้องกัน model หาย: ใช้ `getOptionalDbModel` แล้ว fallback `0` เหมือนที่ page ทำกับ news/missions อยู่แล้ว
- ตัวเลขทุกตัวผ่าน `toLocaleString()`
- คอมโพเนนต์ใหม่: `src/components/dashboard/dashboard-kpi-row.tsx` (presentational ล้วน รับ props ไม่ fetch เอง — ตามคอนเวนชันที่ guard บังคับกับโมดูลอื่น)

### เกณฑ์ยอมรับ
- บนจอ 1920×1080 เห็นครบถึงเมนูลัดโดยไม่ต้องเลื่อน
- ปิด DB แล้วหน้ายังขึ้น KPI เป็น 0 ไม่ throw

---

## Phase 3 — ระบบสีตามหมวด ✅ เสร็จแล้ว

**ผลลัพธ์:** โทเคน `--color-nav-{group}` / `-soft` / `-icon` ใน `globals.css` · แม็ปคลาสอยู่ที่ `src/lib/navigation/dashboard-nav-styles.ts` ใช้ร่วมกันทั้ง tile และไอคอน sidebar · เทสต์ `dashboard-nav-colors.test.ts` คำนวณ contrast จากค่า hex จริงในไฟล์ CSS ทุกคู่ผ่าน AA · ระหว่างทางต้องเข้ม `create` เป็น `#166534` และ `measure` เป็น `#9a3412` เพราะค่าเดิมอยู่ที่ 4.5:1 พอดีเป๊ะ ไม่มีระยะเผื่อ · ไอคอน sidebar ใช้สีหมวดตลอด ไม่เปลี่ยนเป็นชมพูตอน active แล้ว (สถานะ active ยังชัดจาก bg + ring + ตัวอักษรขาว)

**ปัญหาที่แก้:** สี tile สุ่ม ไม่ผูกกับเมนู

### สิ่งที่ทำ

เพิ่ม token ใน `@theme` ของ `src/app/globals.css` ต่อจาก brand token เดิม แล้วผูกกับ field `group` จาก Phase 1:

| group | เมนูในหมวด | สี |
|---|---|---|
| `create` | ชุดคำถาม, คลังสื่อ, บทเรียน, คอร์ส | เขียว |
| `teach` | ชั้นเรียน, โฮสต์เกม | ชมพู (`brand-pink` เดิม) |
| `measure` | รายงานผล, ประวัติเล่น, OMR | ส้ม |
| `system` | ตั้งค่า, โปรไฟล์ | เทา |
| `premium` | อัปเกรดเป็นพลัส | ม่วง |

- แต่ละหมวดมี `--color-nav-{group}` (พื้น tile) และ `--color-nav-{group}-soft` (ข้อความรอง แทน `textClass` เดิม)
- แทนที่ `panelClass` / `textClass` ที่ hardcode ใน `quick-actions.tsx:58-92` ด้วยแม็ปจาก `group`
- ใช้สีเดียวกันกับไอคอนใน sidebar ด้วย (ตอนนี้เป็น `text-slate-400` ทั้งแถบ)
- ตรวจ contrast ข้อความขาวบนพื้นสีให้ผ่าน AA (tile ใช้ตัวอักษรขาวทั้งหมด)

### เกณฑ์ยอมรับ
- ไม่เหลือ `bg-amber-600` / `bg-emerald-600` / `bg-sky-600` / `bg-lime-600` ใน `quick-actions.tsx`
- ไอคอน "ดูรายงานผล" ใน sidebar สีเดียวกับการ์ด "ดูรายงานผล"

---

## Phase 4 — คำแปลไทยที่ขาด ✅ เสร็จแล้ว

**ปัญหาที่แก้:** ข้อความอังกฤษโผล่กลางหน้าไทย เพราะคีย์ขาดคำแปล ไม่ใช่เพราะ hardcode

**ผลลัพธ์:** เพิ่มคำแปล 5 คีย์ที่กระทบแดชบอร์ด/sidebar และเพิ่ม guard `npm run check:i18n:thai` (`scripts/check-i18n-thai-coverage.mjs`) ที่ตั้ง `BACKLOG_BASELINE = 177` — พบว่าทั้งระบบมี 182 คีย์ที่ fallback เป็นอังกฤษ ไม่ใช่ 3 ที่คาดไว้ ที่เหลือ 177 คีย์ (admin 41, accessibility 16, student 12, upgrade 10, battle ~40) เป็น backlog นอกขอบเขตงานนี้

### สิ่งที่ทำ

เพิ่ม 3 คีย์ใน `thaiPack` (`src/lib/translations.ts`):

| คีย์ | ค่าอังกฤษปัจจุบัน | คำแปลไทย |
|---|---|---|
| `topInsightsEmptyNews` | No announcements for your plan yet. | ยังไม่มีข่าวสารสำหรับแพ็กเกจของคุณ |
| `topInsightsEmptyMissions` | No missions for your plan yet. | ยังไม่มีภารกิจสำหรับแพ็กเกจของคุณ |
| `quickActionsTeacherReady` | Ready to host | พร้อมโฮสต์ |

พร้อมคีย์ `descKey` ใหม่ที่ Phase 1 ต้องใช้ — ใส่ทั้ง `englishPack` และ `thaiPack`

**หาคีย์ที่ขาดตัวอื่นด้วย:** เขียนสคริปต์เทียบ key ของ `englishPack` กับ `{...legacyThaiTranslations, ...thaiPack}` แล้วรายงานส่วนต่าง — ปัญหานี้ fallback เงียบ ถ้าไม่ตรวจจะโผล่ที่อื่นอีก พิจารณาผูกเข้า `npm run check:i18n`

### เกณฑ์ยอมรับ
- ตั้งภาษา TH แล้วไม่เหลือคำอังกฤษบนแดชบอร์ด ยกเว้นชื่อแบรนด์
- `npm run check:i18n` ผ่าน

---

## Phase 5 — การ์ด OMR ที่ยังล็อก ✅ เสร็จแล้ว

**ผลลัพธ์:** การ์ดที่ล็อกกดได้แล้ว เปิด `ComingSoonDialog` อธิบายฟีเจอร์ (`omrComingSoonBody`) แทน `cursor-not-allowed` เฉยๆ · `DashboardMenuTile` รับ `onLockedActivate` และตั้ง `aria-disabled` · ไม่ได้ทำปุ่ม "แจ้งเตือนเมื่อพร้อมใช้" ตามแผนเดิม เพราะไม่มี endpoint รองรับ — ปุ่มที่กดแล้วไม่เกิดอะไรแย่กว่าไม่มีปุ่ม

**ปัญหาที่แก้:** `quick-actions.tsx:161-162` ใส่ `t("hostComingSoon")` ทั้ง title และ description → แสดง "เร็วๆนี้ / เร็วๆนี้"

### สิ่งที่ทำ
- คงชื่อจริง `t("omrScanner")` ไว้เสมอ ไม่ว่าล็อกหรือไม่
- description ใช้ `t("scanAnswers")` (มีอยู่แล้ว) เพื่อบอกว่าฟีเจอร์ทำอะไร
- สถานะล็อกสื่อด้วย overlay + badge `t("hostComingSoon")` ที่ `DashboardMenuTile` มีอยู่แล้ว (บรรทัด 91–98) — ไม่ต้องแก้คอมโพเนนต์ แค่เลิกส่งข้อความซ้ำเข้าไป
- **ปรับ tile ที่ล็อกให้กดได้** แล้วเปิด dialog อธิบายฟีเจอร์ (ใช้ `@/components/ui/dialog`) แทน `cursor-not-allowed` เฉยๆ — ผู้ใช้มือถือไม่เห็น `title` tooltip
- ให้ sidebar (`sidebar.tsx:91-106`) ใช้ข้อความชุดเดียวกัน

---

## Phase 6 — ส่วนข้อมูล: งานค้าง + กิจกรรมล่าสุด ⚠️ เสร็จบางส่วน

**ทำแล้ว:** `DashboardContinueWorking` (ชุดคำถามที่แก้ล่าสุด + บทเรียน `status: "DRAFT"`) · `DashboardRecentActivity` (5 เกมล่าสุดจาก `GameHistory`) · `TopInsights` ย่อเป็นคอลัมน์ขวาแคบ

**ยังไม่ได้ทำ:** แถว "ชั้นเรียนที่มีนักเรียนยังไม่ส่งงาน" — ต้อง aggregate assignment × submission แบบที่ `get-teacher-overview.ts` ทำ (4 query + วนนับในหน่วยความจำ) การใส่ลงทุกครั้งที่โหลดแดชบอร์ดเป็นต้นทุนจริง ควรตัดสินใจแยกว่าจะยอมจ่ายไหม

**ปัญหาที่แก้:** แดชบอร์ดไม่บอกว่าครูค้างอะไรไว้

> พึ่งข้อมูลมากที่สุด ทำท้ายสุด — Phase 1–5 ship ไปก่อนได้

- **6.1 "ทำต่อจากที่ค้างไว้"** — ชุดคำถามที่แก้ล่าสุด / บทเรียนที่ยังไม่เผยแพร่ / ชั้นเรียนที่มีงานค้างตรวจ ดึงผ่าน service เดียวกับ Phase 2 เพิ่ม query ต่อท้าย ตรวจว่า `get-teacher-assignment-overview.ts` มีของที่ใช้ซ้ำได้ก่อนเขียนใหม่
- **6.2 ย่อ `TopInsights`** — จาก 2 แบนเนอร์เต็มความกว้าง (`lg:col-span-2` + 1) เหลือคอลัมน์ขวาแคบ ซ้อนแนวตั้ง คืนพื้นที่กลางให้ 6.1
- **6.3 "กิจกรรมล่าสุด"** — เกมที่โฮสต์ล่าสุด 5 แถว + ลิงก์ไป `/dashboard/history` ใช้ `@/components/ui/table`

---

## Responsive

| Breakpoint | พฤติกรรม |
|---|---|
| ≥1280px | KPI 4 คอลัมน์, เมนูลัด 3 คอลัมน์ (grid เดิม `lg:grid-cols-3`) |
| 1024–1279px | KPI 4 คอลัมน์, เมนูลัด 3 คอลัมน์ |
| 640–1023px | KPI 2×2, เมนูลัด 2 คอลัมน์ (`sm:grid-cols-2` เดิม) |
| <640px | `mobile-dashboard-nav` ทำงาน, ทุกอย่างเรียงเดี่ยว, ซ่อน mascot ใน hero |

ระวัง: `DashboardMenuTile` มี `mt-16` / `gap-y-12` เพื่อเว้นที่ให้ตัวการ์ตูนล้นขอบ ถ้าเพิ่ม tile เป็น 9 ใบ ต้องตรวจว่าระยะห่างแนวตั้งยังพอ

---

## ลำดับลงมือ

| ลำดับ | เฟส | ความเสี่ยง |
|---|---|---|
| 1 | Phase 4 คำแปลไทย | ต่ำสุด แยกจากทุกอย่าง ทำก่อนได้เลย |
| 2 | Phase 1 config กลาง | ปานกลาง — แตะ sidebar + mobile nav + quick-actions พร้อมกัน ต้องรักษา flag เดิม |
| 3 | Phase 5 OMR | ต่ำ ต่อยอดจาก Phase 1 |
| 4 | Phase 3 ระบบสี | ปานกลาง — ต้องมี `group` จาก Phase 1 ก่อน |
| 5 | Phase 2 hero + KPI | ปานกลาง — ต้องเขียน service ใหม่ |
| 6 | Phase 6 งานค้าง/กิจกรรม | สูงสุด ตัดออกได้ |

---

## Verification

**ระหว่างพัฒนา**

```bash
npm run dev
```

เปิด `/dashboard` ด้วยบัญชีครู ตรวจตาม "เกณฑ์ยอมรับ" ของแต่ละเฟส

**ตรวจด้วยตา**
1. จอ 1920×1080 — เห็นครบถึงเมนูลัดโดยไม่เลื่อน
2. ทุก breakpoint — ไม่มี horizontal scroll, ตัวการ์ตูนไม่ทับหัวข้อ
3. สลับ TH ↔ EN — ไม่มีคำภาษาอื่นตกค้าง
4. สลับ `isCoursesUiEnabled()` และ `isOmrDashboardEnabled()` ทั้งเปิด/ปิด — sidebar กับเมนูลัดต้องสอดคล้องกันทุกกรณี
5. คลิกทุกช่องเมนูลัด — ไปหน้าถูกต้อง ยกเว้น OMR ที่เปิด dialog
6. เข้าด้วยบัญชี STUDENT — `studentActions` ต้องไม่พัง (ใช้ `QuickActions` ตัวเดียวกัน)

**อัตโนมัติ**

```bash
npm run lint
npm run check:i18n
npm run check:architecture
npm test
```

เพิ่มเทสต์ใหม่ใน `src/__tests__/`:
- เมนูลัด render ครบตามจำนวน `DASHBOARD_NAV.filter(i => i.showOnDashboard)` — กันเมนูใหม่หลุดจากแดชบอร์ดอีก
- ทุก `labelKey` / `descKey` ใน config มีคำแปลครบทั้ง `en` และ `th`
