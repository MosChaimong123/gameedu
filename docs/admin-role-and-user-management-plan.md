# Admin Role And User Management Plan

## เป้าหมาย

ปรับหน้า `admin` และกติกาผู้ใช้ทั้งระบบให้สอดคล้องกับธุรกิจจริง:

- บัญชีใช้งานจริงต้องเป็น `TEACHER` หรือ `STUDENT`
- `ADMIN` เป็นบทบาทดูแลระบบ
- `USER` ไม่ควรเป็น role ใช้งานจริงอีกต่อไป
- หน้าแอดมินต้องแยกข้อมูลครู นักเรียน และแอดมินชัดเจน
- หน้าแอดมินต้องแสดงสถานะยืนยันอีเมล
- นักเรียนต้องไม่มีสิทธิ์หรือ UI สำหรับการจัดการ plan

## สถานะความคืบหน้า

### Phase 1 Checklist

- [x] ปรับ auth flow ให้บัญชีสมัครใหม่จากหน้า register เป็น `TEACHER` หรือ `STUDENT` เท่านั้น
- [x] ปรับ role guards ไม่ให้ `USER` ผ่าน teacher flow
- [x] ปรับ route authorization ให้ `dashboard` ใช้ได้เฉพาะ `TEACHER` และ `ADMIN`
- [x] ปรับ route authorization ให้ `student/home` ใช้ได้เฉพาะ `STUDENT`
- [x] ปรับ post-auth destination ของ `USER` ให้ถูกบล็อกและพากลับไปแจ้งปัญหา role
- [x] กัน backend plan update ตาม role โดยอนุญาตเฉพาะ `TEACHER`
- [ ] Cleanup บัญชี legacy `USER`
- [x] ปรับ admin UI แยก role และแสดงสถานะยืนยันอีเมล

### Phase 2 Checklist

- [x] ดึง `emailVerified` เข้า query ของ `/admin`
- [x] ดึง `emailVerified` เข้า query ของ `/admin/users`
- [x] เพิ่ม count แยก `ADMIN`, `TEACHER`, `STUDENT`
- [x] เพิ่ม count แยก `verified` และ `unverified`
- [x] ปรับ dashboard summary ให้สะท้อน role และสถานะยืนยันอีเมล
- [x] ปรับ `/admin/users` ให้กรองตาม role
- [x] ปรับ `/admin/users` ให้กรองตามสถานะยืนยันอีเมล
- [x] แยกการแสดงรายละเอียดครู นักเรียน และแอดมินคนละแบบ
- [x] ซ่อน plan controls จากนักเรียนใน dashboard และ users table

### Phase 3 Checklist

- [x] เพิ่มวิธีตรวจนับบัญชี `USER` ที่ค้างอยู่จริง
- [x] เพิ่ม temporary admin tools สำหรับกรองและจัดการบัญชี `USER`
- [x] คง login gate สำหรับบัญชี `USER` ไม่ให้หลุดเข้า teacher/student flow
- [x] เพิ่ม CLI workflow สำหรับรายงาน legacy `USER`
- [ ] เปลี่ยน role ของบัญชี `USER` ที่ค้างอยู่ให้ครบทุกบัญชี

### Phase 3 Findings

- ตรวจด้วยสคริปต์ `npm run db:report-legacy-users -- --json`
- พบ legacy `USER` ค้างอยู่ `1` บัญชี
- บัญชีดังกล่าวยังไม่มี `classrooms` และไม่มี `studentProfiles` จึงยังไม่ควรเดา role อัตโนมัติ

### Phase 4 Checklist

- [x] รัน regression ชุด auth/admin ที่เกี่ยวข้อง
- [x] รัน typecheck ฝั่ง server/project config ที่เกี่ยวข้องกับงานรอบนี้
- [x] ยืนยันว่า login gate, post-auth destination, และ admin filters ยังทำงานผ่าน automated tests
- [x] บันทึกผลตรวจฐานข้อมูลของ legacy `USER`
- [ ] Manual QA บนหน้า `/admin` และ `/admin/users` ใน browser จริง
- [ ] ตัดสินใจ role ให้บัญชี legacy `USER` ที่ยังค้างอยู่

### Phase 4 Verification

- `npm run test:auth` ผ่าน
- `npm run predev` ผ่าน
- regression ที่ครอบคลุมแล้ว:
  - auth credentials / callbacks
  - role authorization
  - OAuth intent + complete OAuth
  - register / verify / resend verify
  - teacher/student protected routes ที่พึ่ง `isTeacherOrAdmin`
  - post-auth destination
- สิ่งที่ยังไม่ได้ยืนยันในรอบนี้:
  - visual/manual QA ใน browser ของหน้า admin หลังปรับ layout

## ปัญหาปัจจุบัน

### 1. ความหมายของ role ยังไม่ชัด

- `User.role` ใน Prisma ยัง default เป็น `USER`
- บางส่วนของระบบยังตีความ `USER` ว่าเข้าเส้นทางฝั่งครูได้
- ทำให้เกิดบัญชีที่ล็อกอินได้ แต่ยังไม่รู้ว่าเป็นครูหรือนักเรียน

### 2. หน้า admin ยังแสดงข้อมูลผู้ใช้รวมกัน

- หน้า `/admin` และ `/admin/users` ยังดึงผู้ใช้แบบรวมก้อน
- ยังไม่แยกมุมมอง `ADMIN`, `TEACHER`, `STUDENT`
- แอดมินจึงอ่านสถานะผู้ใช้จริงได้ยาก

### 3. ข้อมูล plan ปะปนกับนักเรียน

- `plan`, `planStatus`, `planExpiry` อยู่บน `User`
- UI แอดมินเปิดทางให้แก้ subscription ได้แม้เป็นนักเรียน
- ฝั่ง server action ยังต้องเพิ่ม guard เพื่อกันการแก้ plan ผิด role

### 4. สถานะยืนยันอีเมลยังไม่ถูกยกมาใช้ใน admin UI อย่างชัดเจน

- ระบบมี `emailVerified`
- แต่หน้า admin ยังไม่สื่อสารสถานะ `ยืนยันแล้ว / ยังไม่ยืนยัน` อย่างเด่นพอ

## หลักการตัดสินใจ

### Role semantics ใหม่

- `ADMIN`: ผู้ดูแลระบบ
- `TEACHER`: ผู้ใช้ฝั่งครู
- `STUDENT`: ผู้ใช้ฝั่งนักเรียน
- `USER`: ถือเป็นข้อมูล legacy หรือข้อมูลผิดกติกา ต้องถูกจัดการออกจาก flow หลัก

### Plan semantics ใหม่

- plan ใช้กับ `TEACHER` เท่านั้น
- `STUDENT` ไม่มีสิทธิ์ใช้งานหรือจัดการ plan
- `ADMIN` ไม่ควรใช้หน้าจอเดียวกับครูในการแก้ plan แบบบัญชีปกติ

## ขอบเขตงาน

## 1. ปรับ auth และการสร้างบัญชี

เป้าหมาย:

- ทุกบัญชีใหม่ต้องถูกสร้างเป็น `TEACHER` หรือ `STUDENT`
- OAuth/Google login ต้องรู้ role ก่อนให้เข้าใช้งาน
- ลดการเกิด `USER` ใหม่ให้เป็นศูนย์

งานย่อย:

- ตรวจ flow สมัครด้วยอีเมลว่าบังคับเลือก `TEACHER` หรือ `STUDENT`
- ตรวจ flow Google sign-in ว่าถ้ายังไม่มี role ต้องให้ผู้ใช้เลือกก่อน
- ปิดการสร้างผู้ใช้แบบ default `USER` ใน flow หลัก
- วางทาง fallback สำหรับบัญชีเก่าที่ยังเป็น `USER`

## 2. ปรับ authorization และ role guards

เป้าหมาย:

- `USER` ต้องไม่ถูกปฏิบัติราวกับเป็นครูอีก
- เส้นทาง teacher/student/admin ต้องชัด

งานย่อย:

- ตรวจ `role-guards`
- เอาเงื่อนไขที่อนุญาต `USER` ใน teacher/admin flow ออก
- ทบทวน post-auth destination ว่าพาไปหน้าที่ถูกต้องตาม role
- เพิ่ม guard กรณีเจอ `USER` ให้ redirect ไป flow จัดประเภท role หรือบล็อกแบบปลอดภัย

## 3. Cleanup ข้อมูล legacy role = USER

เป้าหมาย:

- ไม่มีบัญชีค้างเป็น `USER` ในระยะยาว

งานย่อย:

- ตรวจจำนวนบัญชี `USER` ที่มีอยู่จริง
- แยกกลยุทธ์ตามจำนวนข้อมูล:
  - ถ้ามีน้อย: ให้แอดมินจัด role ให้ทีละบัญชี
  - ถ้ามีมาก: บังคับเลือก role เมื่อ login รอบถัดไป
- เตรียม script หรือ admin workflow สำหรับการแก้ข้อมูล

## 4. ออกแบบหน้า admin ใหม่

เป้าหมาย:

- อ่านภาพรวมผู้ใช้ได้ชัดในมุมของธุรกิจ
- แยกข้อมูลตามบทบาท
- เห็นสถานะยืนยันอีเมลได้ทันที

งานย่อย:

- ปรับ dashboard summary ให้มีอย่างน้อย:
  - จำนวน `ADMIN`
  - จำนวน `TEACHER`
  - จำนวน `STUDENT`
  - จำนวนอีเมลที่ยืนยันแล้ว
  - จำนวนอีเมลที่ยังไม่ยืนยัน
- ปรับส่วนรายการผู้ใช้ให้แยกเป็นกลุ่มหรือแท็บ:
  - ทั้งหมด
  - ครู
  - นักเรียน
  - แอดมิน
  - ยังไม่ยืนยันอีเมล
- ถ้ายังมี `USER` ระหว่างช่วง migration:
  - เพิ่มกลุ่มชั่วคราว `ต้องจัดประเภท`

## 5. แยกโครงข้อมูลครูกับนักเรียน

เป้าหมาย:

- ข้อมูลที่แสดงต้องเหมาะกับ role
- นักเรียนไม่ควรมีข้อมูลการจัดการ plan ปะปน

### ข้อมูลที่ควรแสดงสำหรับครู

- ชื่อ
- อีเมล
- สถานะยืนยันอีเมล
- role
- plan
- plan status
- วันหมดอายุ
- วันที่สมัคร

### ข้อมูลที่ควรแสดงสำหรับนักเรียน

- ชื่อ
- อีเมล
- สถานะยืนยันอีเมล
- role
- วันที่สมัคร
- ข้อมูล student profile ที่เกี่ยวข้อง เช่นจำนวน profile หรือความเชื่อมโยงกับห้องเรียน

### ข้อมูลที่ควรแสดงสำหรับแอดมิน

- ชื่อ
- อีเมล
- สถานะยืนยันอีเมล
- role
- วันที่สมัคร

## 6. ปิดการแก้ plan สำหรับนักเรียนและ role ที่ไม่เกี่ยวข้อง

เป้าหมาย:

- นักเรียนต้องแก้ plan ไม่ได้ทั้งใน UI และ backend

งานย่อย:

- ซ่อนปุ่ม `Edit subscription` สำหรับ `STUDENT`
- ซ่อนหรือแยก action ที่ไม่เกี่ยวกับ plan สำหรับ `ADMIN`
- เพิ่ม validation ฝั่ง server action:
  - อนุญาตให้แก้ plan ได้เฉพาะ `TEACHER`
  - ถ้าเป็น `STUDENT` หรือ `ADMIN` ให้ reject
- เพิ่ม audit log ให้ชัดเมื่อมีการแก้ plan สำเร็จหรือถูกปฏิเสธ

## 7. Query และ data shape สำหรับ admin

เป้าหมาย:

- หน้า admin ต้องใช้ข้อมูลที่เพียงพอสำหรับแยกกลุ่มและแสดงสถานะจริง

งานย่อย:

- ดึง `emailVerified` เข้า query ของ `/admin` และ `/admin/users`
- เพิ่ม role breakdown counts
- เพิ่ม verified/unverified counts
- พิจารณาเพิ่ม student-specific aggregates ถ้าต้องใช้ในตารางนักเรียน

## 8. Testing และ QA

เป้าหมาย:

- ปิด regression ด้านสิทธิ์และข้อมูลแสดงผล

งานย่อย:

- ทดสอบสมัครใหม่แล้วได้ `TEACHER` หรือ `STUDENT` เท่านั้น
- ทดสอบ Google login แล้วไม่สร้าง `USER` ใหม่
- ทดสอบ `USER` เก่าเข้าใช้งานแล้วถูกบังคับให้จัดประเภทหรือถูกบล็อกตามแผน
- ทดสอบนักเรียนไม่สามารถแก้ plan ได้ทั้ง UI และ API
- ทดสอบครูยังแก้ plan ได้
- ทดสอบหน้า admin แสดง verified/unverified ถูกต้อง
- ทดสอบ counts ของ `ADMIN`, `TEACHER`, `STUDENT` ตรงกับข้อมูลจริง

## ลำดับการทำงานที่แนะนำ

### Phase 1: ความถูกต้องของ role และสิทธิ์

1. ปรับ auth flow ให้บังคับ role เป็น `TEACHER` หรือ `STUDENT`
2. ปรับ role guards ไม่ให้ `USER` ผ่าน teacher flow
3. กัน backend plan update ตาม role

### Phase 2: ข้อมูลและ UI ของ admin

1. ปรับ query ให้ดึง `emailVerified` และ count ที่จำเป็น
2. ปรับ dashboard summary
3. ปรับ `/admin/users` ให้แยกกลุ่มครู นักเรียน แอดมิน
4. ซ่อน plan controls จากนักเรียน

### Phase 3: Migration และ cleanup

1. ตรวจบัญชี `USER` ที่มีอยู่
2. วางวิธีจัด role ให้ข้อมูลเก่า
3. เพิ่ม temporary admin tools หรือ login gate สำหรับบัญชีค้าง

### Phase 4: QA และ release readiness

1. เพิ่ม tests
2. ทำ manual QA
3. ตรวจ audit logs และ regression ฝั่ง auth/admin

## Acceptance Criteria

- ไม่มีบัญชีใหม่ที่ถูกสร้างเป็น `USER` จาก flow ปกติ
- `USER` ไม่ถูกใช้เป็น teacher-equivalent ใน authorization
- หน้า admin แยกข้อมูล `ADMIN`, `TEACHER`, `STUDENT` ชัดเจน
- หน้า admin แสดงสถานะ `ยืนยันอีเมลแล้ว / ยังไม่ยืนยัน`
- นักเรียนไม่มีปุ่มหรือ API สำหรับแก้ plan
- ครูยังสามารถถูกจัดการ plan ได้ตามสิทธิ์แอดมิน
- มีแนวทางชัดเจนสำหรับ cleanup บัญชี legacy `USER`

## หมายเหตุเชิงเทคนิค

- หากยังไม่สามารถลบ `USER` ออกจาก schema ได้ทันที ควรถือว่าเป็น transitional state เท่านั้น
- การแก้ schema หรือ default role ต้องประเมินผลกระทบต่อ OAuth, session callback, และข้อมูลเก่าในฐานข้อมูล
- การซ่อน UI อย่างเดียวไม่เพียงพอ ต้องมีกฎฝั่ง server ครบเสมอ
