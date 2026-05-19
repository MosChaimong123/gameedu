# Email Verification Code Plan

## Goal

เปลี่ยนระบบยืนยันอีเมลจาก `verification link` ไปเป็น `กรอกรหัสตัวเลขจากอีเมล` โดยใช้แนวทาง `Option B`:

- สร้าง model ใหม่สำหรับรหัสยืนยันอีเมล
- แยกจาก `VerificationToken` เดิม
- รองรับ security controls ที่เหมาะกับ OTP/code flow
- rollout แบบไม่ทำให้ผู้ใช้ที่มีลิงก์เก่าค้างอยู่ใช้งานไม่ได้ทันที

## Current System

ระบบปัจจุบันเป็นแบบ `magic link`:

1. สมัครที่ `src/app/api/register/route.ts`
2. สร้าง `User` พร้อม `emailVerified = null`
3. สร้าง `VerificationToken`
4. ส่งอีเมลพร้อมลิงก์ `GET /api/auth/verify-email?token=...`
5. route `src/app/api/auth/verify-email/route.ts` ตรวจ token แล้วตั้ง `emailVerified`
6. login ที่ `src/auth.ts` จะ reject ถ้า `emailVerified` ยังเป็น null

ข้อดี:

- flow ตรงไปตรงมา
- implementation ปัจจุบันสั้นและมี test รองรับแล้ว

ข้อจำกัด:

- ผู้ใช้บางกลุ่มคุ้นกับการ “กรอกรหัส” มากกว่า “กดลิงก์”
- ข้ามอุปกรณ์ไม่สะดวก
- token link ใช้ได้ทันทีถ้าใครได้ลิงก์ไป
- หน้า login ยังไม่มี UX สำหรับกรอกรหัสยืนยันโดยตรง

## Why Option B

ไม่ใช้ `VerificationToken` เดิมเป็น storage หลักของ code flow เพราะข้อจำกัดเหล่านี้:

- ชื่อ model ไม่สื่อว่าเป็น OTP/code
- ไม่มี field สำหรับ `attempts`, `consumedAt`, `lastSentAt`
- ทำให้ policy เรื่อง brute force / cooldown / audit ขยายยาก

แนวทางที่เลือก:

- เพิ่ม model ใหม่ เช่น `EmailVerificationCode`
- เก็บข้อมูลเฉพาะ flow นี้อย่างชัดเจน
- เก็บ code แบบ hash
- ออกแบบ lifecycle ให้เหมาะกับ numeric verification code

## Target UX

flow ใหม่ที่ต้องการ:

1. ผู้ใช้สมัครสำเร็จ
2. ระบบส่งรหัส 6 หลักไปทางอีเมล
3. พาไปหน้า `ยืนยันอีเมล`
4. ผู้ใช้กรอก `email + code`
5. ถ้าถูกต้อง ระบบตั้ง `emailVerified`
6. ผู้ใช้ login ได้

UX เสริม:

- resend code
- countdown / cooldown ก่อน resend
- แจ้ง code หมดอายุ
- แจ้งกรอกรหัสผิด
- แจ้งเกินจำนวนครั้งที่อนุญาต

## Proposed Data Model

เพิ่ม model ใหม่ใน `prisma/schema.prisma`

```prisma
model EmailVerificationCode {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  userId      String   @db.ObjectId
  email       String
  codeHash    String
  purpose     String   @default("SIGNUP_VERIFY")
  attempts    Int      @default(0)
  maxAttempts Int      @default(5)
  expiresAt   DateTime
  lastSentAt  DateTime @default(now())
  consumedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, createdAt])
  @@index([email, createdAt])
  @@index([email, consumedAt, expiresAt])
}
```

หลักการ:

- `codeHash`: เก็บ hash ของรหัส ไม่เก็บเลขดิบ
- `attempts`: นับจำนวนกรอกผิด
- `maxAttempts`: กัน brute force
- `expiresAt`: อายุรหัสสั้น เช่น 10-15 นาที
- `consumedAt`: mark ว่าใช้ไปแล้ว
- `lastSentAt`: ใช้คุม cooldown สำหรับ resend

## Verification Rules

ค่าที่แนะนำ:

- code length: `6 digits`
- code expiry: `10 minutes`
- max attempts: `5`
- resend cooldown: `60 seconds`
- resend hourly limit: `5 per hour per email/IP`

กติกา:

- มี active code ได้ 1 ชุดต่อ user/purpose
- resend ต้อง invalidate code เดิม
- verify สำเร็จต้อง mark `consumedAt`
- ถ้า user verified แล้ว ต้องไม่สร้าง code ใหม่

## API Changes

### 1. Register

ไฟล์: `src/app/api/register/route.ts`

เปลี่ยนจาก:

- สร้าง `VerificationToken`
- ส่งลิงก์ verify

เป็น:

- สร้าง `EmailVerificationCode`
- ส่งรหัส 6 หลักทางอีเมล
- response ควรบอก client ว่าต้องไปหน้า verify code

ข้อเสนอ response:

```json
{
  "user": {
    "name": "Alice",
    "email": "alice@example.com",
    "role": "STUDENT"
  },
  "verifyRequired": true,
  "verifyMethod": "code"
}
```

### 2. Send Email

ไฟล์: `src/lib/email/send-verification-email.ts`

เปลี่ยนเนื้อหาอีเมลจาก:

- link based

เป็น:

- แสดงรหัสตัวเลขเด่นชัด
- บอกอายุรหัส
- บอกว่าอย่าแชร์รหัส

ข้อเสนอ:

- แยก function ใหม่ เช่น `sendVerificationCodeEmail(email, code, expiresInMinutes)`
- ช่วง transition อาจเก็บ function เดิมไว้ด้วย

### 3. Resend

ไฟล์: `src/app/api/auth/resend-verification/route.ts`

เปลี่ยน logic จาก:

- ลบ `VerificationToken`
- สร้าง token ใหม่

เป็น:

- เช็ก cooldown
- invalidate code เดิม
- สร้าง code ใหม่
- reset attempts
- ส่งเมลใหม่

### 4. Verify Code

เพิ่ม route ใหม่:

- `src/app/api/auth/verify-email-code/route.ts`

รับ payload:

```json
{
  "email": "alice@example.com",
  "code": "123456"
}
```

logic:

1. validate payload
2. หา user ตาม email
3. ถ้า verified แล้ว return success แบบ idempotent
4. หา active verification code
5. เช็ก `expiresAt`
6. เช็ก `attempts < maxAttempts`
7. compare hash
8. ถ้าผิด เพิ่ม attempts
9. ถ้าถูก ตั้ง `user.emailVerified = now`
10. mark `consumedAt`
11. ลบ/ปิด code อื่นที่ยัง active

### 5. Legacy Link Route

ไฟล์เดิม: `src/app/api/auth/verify-email/route.ts`

ช่วง transition:

- ควรเก็บไว้ใช้งานต่อชั่วคราว
- รองรับผู้ใช้ที่เคยได้รับอีเมลลิงก์ไปก่อนหน้า

หลัง rollout สมบูรณ์:

- ค่อยถอด flow นี้หรือเปลี่ยนให้ redirect ไปหน้า verify code พร้อมข้อความอธิบาย

## UI Changes

### 1. Login Form

ไฟล์: `src/app/login/login-form.tsx`

ของเดิม:

- banner บอกให้เช็กเมล
- ปุ่ม resend
- ไม่มีฟอร์มกรอกรหัส

ของใหม่:

- เพิ่ม section กรอกรหัสยืนยัน
- field:
  - email
  - 6-digit code
- ปุ่ม:
  - verify
  - resend code

state ที่ต้องรองรับ:

- pending verification
- resend sending
- resend cooldown
- code invalid
- code expired
- too many attempts
- verify success

### 2. Post-register Redirect

ไฟล์ที่เกี่ยวข้อง:

- `src/app/register/signup-wizard.tsx`

จากเดิม:

- redirect ไป `/login?pendingVerify=1`

ข้อเสนอ:

- redirect ไปหน้าเฉพาะ เช่น `/verify-email?email=...`
- หรือถ้ายังใช้ `/login` ให้มี mode ชัดเจน เช่น `/login?mode=verify&email=...`

แนะนำ:

- ใช้หน้าเฉพาะ `verify-email` จะดูแล UX ง่ายกว่า

### 3. Dedicated Verification Page

ข้อเสนอเพิ่ม:

- `src/app/verify-email/page.tsx`
- component เช่น `src/components/auth/verify-email-code-form.tsx`

เหตุผล:

- ไม่ทำให้หน้า login รับภาระมากเกินไป
- UX ชัดกว่า
- test แยกได้ง่ายกว่า

## Security Requirements

ต้องทำครบก่อนเปิดใช้จริง:

- hash code ก่อนเก็บ
- ไม่ log code ดิบ
- ไม่คืน error ที่ leak ว่า email มีจริงหรือไม่ใน resend flow
- จำกัด attempts ต่อ code
- จำกัด rate ต่อ IP/email ทั้ง resend และ verify
- invalidate code เก่าทันทีเมื่อ resend
- verify success ต้อง consume code ทันที
- audit log เฉพาะ metadata ที่ไม่เป็น sensitive value

ข้อเสนอการ hash:

- ใช้ `crypto.createHash("sha256")`
- hash จาก normalized payload เช่น `${email}:${code}:${secretPepper}`

หมายเหตุ:

- ถ้าต้องการ stronger password-style hashing ก็ใช้ `bcryptjs` ได้
- แต่สำหรับ code อายุสั้น การใช้ SHA-256 + secret pepper + rate limit ถือว่าเพียงพอในหลายระบบ

## Testing Plan

เพิ่ม/แก้ test ชุดนี้:

1. `register-route`
- creates email verification code
- does not create legacy verification token in new flow

2. `resend-verification-route`
- replaces previous active code
- respects resend cooldown
- respects resend rate limit

3. `verify-email-code-route`
- verifies correct code
- rejects wrong code
- rejects expired code
- locks after max attempts
- is idempotent for already-verified users

4. `auth-credentials-authorize`
- still blocks login when email is not verified
- allows login after verification

5. UI tests
- verify page renders states correctly
- resend button cooldown state
- success banner after verification

## Rollout Plan

### Phase 1: Build New Code Flow

- เพิ่ม model `EmailVerificationCode`
- เพิ่ม helpers generate/hash/verify
- เพิ่ม send verification code email
- เพิ่ม verify code route
- เพิ่ม tests ระดับ service/route

### Phase 2: Switch Registration + Resend

- เปลี่ยน register ให้สร้าง code flow ใหม่
- เปลี่ยน resend ให้ใช้ code flow ใหม่
- เพิ่ม verify page / verify form
- ปรับ login/register UX

### Phase 3: Transitional Compatibility

- คง `GET /api/auth/verify-email` เดิมไว้ชั่วคราว
- support ทั้ง link เก่าและ code ใหม่ในช่วง migration
- monitor audit / error rate

### Phase 4: Cleanup

- เมื่อแน่ใจว่าไม่มี reliance กับ link flow เดิมแล้ว
- ค่อยถอด `VerificationToken` usage ใน email verification
- ประเมินว่าจำเป็นต้องลบ model เดิมหรือยัง

## Risks

ความเสี่ยงหลัก:

- brute force code ถ้า rate limit ไม่แน่นพอ
- UX ซับซ้อนขึ้นถ้าพยายามยัดทุกอย่างไว้ในหน้า login เดียว
- ผู้ใช้เก่าที่มี verify link ค้างอยู่จะพัง ถ้าตัด route เดิมเร็วเกินไป
- ถ้าใช้ `email + code` อย่างเดียวโดยไม่มี policy ดีพอ อาจเสี่ยง enumeration/brute force

## Recommended Decisions

ตัดสินใจที่แนะนำ:

- ใช้ model ใหม่ `EmailVerificationCode`
- ใช้หน้า verify แยกจาก login
- อายุ code 10 นาที
- จำกัด attempts 5 ครั้ง
- resend cooldown 60 วินาที
- เก็บ verify link เดิมไว้ชั่วคราว 1 ช่วง rollout

## Acceptance Criteria

- ผู้ใช้ใหม่ได้รับรหัส 6 หลักทางอีเมลแทนลิงก์
- ผู้ใช้ verify ได้ด้วยการกรอกรหัส
- ผู้ใช้ที่ยังไม่ verified login ไม่ได้
- resend ทำงานและมี cooldown
- code หมดอายุและ code ผิดแสดงผลชัดเจน
- มี brute-force protection
- ลิงก์ verify เก่ายังใช้งานได้ในช่วง transition
- test สำคัญของ flow ใหม่ผ่านทั้งหมด

## Delivery Checklist

- [x] เพิ่ม model `EmailVerificationCode` ใน `prisma/schema.prisma`
- [x] เพิ่ม helper สำหรับ generate/hash/expiry/cooldown ของรหัสยืนยัน
- [x] เพิ่ม `sendVerificationCodeEmail()` และเปลี่ยนอีเมลใหม่เป็นแบบรหัส 6 หลัก
- [x] เปลี่ยน `register` ให้สร้าง verification code ใหม่แทน `VerificationToken`
- [x] เปลี่ยน `resend-verification` ให้ใช้ code flow ใหม่
- [x] เพิ่ม rate limit/cooldown สำหรับ resend
- [x] เพิ่ม route `POST /api/auth/verify-email-code`
- [x] เพิ่มการบังคับ `attempts`, `maxAttempts`, และ consume code เมื่อสำเร็จ/หมดอายุ
- [x] เพิ่มหน้า `verify-email` และฟอร์มกรอกรหัสแยกจาก login
- [x] ปรับ register redirect ไปหน้า verify ใหม่
- [x] ปรับ login UX ให้พาไปกรอกรหัสและ resend code ได้
- [x] เพิ่มคำแปลและ error messages สำหรับ code-based verification
- [x] คง `GET /api/auth/verify-email` เดิมไว้สำหรับ transition ของลิงก์เก่า
- [x] รัน `prisma generate`
- [x] รัน regression tests สำหรับ register/resend/verify/auth flows ผ่าน
- [x] รัน `npm run predev` ผ่าน
- [x] ถอด legacy verification link flow ออกจากระบบทั้งหมด (`GET /api/auth/verify-email`, `sendVerificationEmail`)
