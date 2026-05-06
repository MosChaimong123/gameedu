# MongoDB / Atlas — สร้าง unique index ให้ `User.email` (กันเมลซ้ำ)

คู่มือนี้ไล่ทีละข้อสำหรับ **MongoDB Atlas** + **Prisma** ในโปรเจกต์นี้  
ใน Prisma มี `email String? @unique` แล้ว ([`prisma/schema.prisma`](../prisma/schema.prisma)) แต่ **MongoDB จะบังคับซ้ำไม่ได้ก็ต่อเมื่อมี unique index จริงใน collection `User`**

---

## ก่อนเริ่ม

1. **สำรองข้อมูล** — ถ้าเป็น production ควรมี snapshot / backup ตาม tier (Atlas → Backup) ก่อนลบหรือแก้ข้อมูล
2. **ใช้ connection string ที่ถูกต้อง** — `DATABASE_URL` ชี้ cluster / database เดียวกับที่จะแก้ (เช่น `.../gameedu?...`)
3. **อย่า commit** connection string หรือรหัสผ่านลง git

---

## ขั้นที่ 1 — ตั้งค่า `DATABASE_URL` ชั่วคราว (เครื่องคุณ)

**PowerShell**

```powershell
cd C:\Users\IHCK\GAMEEDU\gamedu
# ถ้ามี DATABASE_URL ค้างใน session ให้ล้างก่อน (กันชี้ผิด DB)
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
# ใช้ค่าจาก .env / .env.local ตามที่โปรเจกต์โหลด — หรือตั้งชัด:
# $env:DATABASE_URL = "mongodb+srv://..."
```

ตรวจว่าชี้ cluster/db ถูก:

```powershell
npm run db:print-target
```

---

## ขั้นที่ 2 — หาเมลที่ซ้ำ (ใน repo)

รันสคริปต์รายงาน (อ่าน `User` ทั้งหมด แล้วจัดกลุ่มแบบไม่สนตัวพิมพ์ใหญ่/เล็ก):

```powershell
npm run db:report-duplicate-emails
```

- ถ้าขึ้นว่า **ไม่มีซ้ำ** → ไป **ขั้นที่ 4** ได้เลย  
- ถ้ามีรายการซ้ำ → ต้องทำ **ขั้นที่ 3** ก่อน (ไม่เช่นนั้น `db push` สร้าง unique index ไม่ได้)

---

## ขั้นที่ 3 — จัดการแถวที่ซ้ำใน Atlas (มือ)

ทำบน **cluster จริง**ที่ใช้กับแอป

1. เข้า [MongoDB Atlas](https://cloud.mongodb.com) → **Browse Collections** → database **`gameedu`** → collection **`User`**
2. จากรายงานในขั้นที่ 2 จะได้ `_id` (Prisma `id`) หลายตัวต่อเมลเดียวกัน
3. **เลือกแถวที่จะเก็บ** — โดยทั่วไปเก็บบัญชีที่:
   - `emailVerified` มีค่าแล้ว หรือ
   - เป็นบัญชีที่ผู้ใช้ล็อกอินอยู่จริง / มีข้อมูลสำคัญ (ครู ห้อง ชุดคำถาม ฯลฯ)
4. **แถวที่ซ้ำ** — ลบหรือเปลี่ยน `email` เป็น `null` / ค่าอื่นที่ไม่ชน (ระวัง FK ไปยัง `Account`, `Session` — ถ้าลบ `User` อาจต้องลบ/ย้ายความสัมพันธ์ใน Prisma ก่อน ไม่ควรลบมั่วถ้าไม่แน่ใจ)

ถ้าซับซ้อน (OAuth + credentials คนละแถว) ควรแก้เป็นคดีๆ หรือขอความช่วยเหลือจากคนที่คุ้น schema

เมื่อ **ไม่เหลือเมลซ้ำ** (เมื่อเทียบแบบ trim + lowercase ตามที่สคริปต์ใช้) แล้วไปขั้นถัดไป

**ทางเลือกใน Atlas (ผู้ใช้ขั้นสูง):** แท็บ **Aggregations** บน collection `User` ใช้ pipeline จัดกลุ่ม `email` — ใช้ตรวจซ้ำเหมือนสคริปต์ (ไม่บังคับถ้าใช้ `npm run db:report-duplicate-emails` แล้ว)

---

## ขั้นที่ 4 — ให้ Prisma สร้าง index ตาม schema (`db push`)

จากโฟลเดอร์โปรเจกต์ (ใช้ **`DATABASE_URL` เดียวกับที่แก้ข้อมูล**):

```powershell
npm run db:push:merged -- --skip-generate
```

ใช้ **`db:push:merged`** (โหลด **`.env`** แล้ว **`.env.local`** แบบเดียวกับสคริปต์อื่นใน repo) — อย่าใช้แค่ `npx prisma db push` อย่างเดียวถ้าค่าอยู่ใน `.env.local` เพราะ Prisma CLI โหลดแค่ `.env` เป็นค่าเริ่มต้น

คำสั่งจะ sync **indexes** จาก `schema.prisma` ไป MongoDB รวมถึง **unique** บน `email` และ `username`

### ถ้า error `E11000 duplicate key ... User_username_key ... dup key: { username: null }`

MongoDB unique index บน `username` ไม่อนุญาตหลายเอกสารที่ไม่มี `username` (null / ไม่มีฟิลด์) — รันก่อน `db push` อีกครั้ง:

```powershell
npm run db:fix-null-usernames
```

สคริปต์จะเติม username ชั่วคราวให้แถวที่ยังไม่มี

### รวมบัญชีที่ซ้ำเมล (มือ + ย้าย FK)

หลังสำรองข้อมูล สามารถรวม duplicate ต่อเมล (เก็บบัญชี **เก่าสุด** ตาม `createdAt`):

```powershell
npm run db:merge-duplicate-users
```

หลังสำเร็จ:

1. ใน Atlas → collection **`User`** → แท็บ **Indexes**
2. ควรเห็น index เพิ่มจากเดิมที่มีแค่ `_id` — ชื่อมักเป็นแบบ **`User_email_key`** (unique) ตามที่ Prisma สร้าง

---

## ขั้นที่ 5 — ตรวจใน Atlas UI

1. **Database** → cluster → **Collections** → `gameedu` → **`User`**
2. แท็บ **Indexes** — นับจำนวนและยืนยันว่ามี **unique** บน `email`
3. (ทางเลือก) ลองสมัครซ้ำด้วยเมลเดียวกันในฟอร์ม — API ควรตอบ **email already exists** และถ้ามีการแหกคุมที่ DB ระดับ insert จะถูก MongoDB ปฏิเสธด้วย

---

## สรุปคำสั่งที่เกี่ยวข้อง

| คำสั่ง | ความหมาย |
| --- | --- |
| `npm run db:print-target` | เช็คว่า `DATABASE_URL` ชี้ host/db ไหน |
| `npm run db:report-duplicate-emails` | รายงานเมลซ้ำก่อนสร้าง index |
| `npm run db:merge-duplicate-users` | รวมแถวผู้ใช้ซ้ำเมล (เก็บบัญชีเก่าสุด) |
| `npm run db:fix-null-usernames` | เติม username ให้แถวที่ว่าง (ก่อนสร้าง unique `username`) |
| `npm run db:push:merged -- --skip-generate` | Prisma sync indexes — ใช้ merged `.env` + `.env.local` |

---

## หมายเหตุ

- **`email` เป็น optional (`String?`)** — หลายแถวที่ `email` เป็น `null` อาจอยู่ร่วมกันได้ขึ้นกับว่า MongoDB สร้าง unique index แบบ **partial/sparse** หรือไม่ ถ้า `db push` error เรื่อง duplicate null ให้แยกแก้ข้อมูลหรือดูข้อความ error จาก Prisma
- การแก้ซ้ำควรทำบน **staging ก่อน** ถ้ามี cluster แยก
- โค้ดสมัครมีเช็ค `findUnique` อยู่แล้ว — **unique index ที่ DB** เป็นเกราะกัน race condition และเส้นทางอื่นที่สร้าง `User` โดยตรง
