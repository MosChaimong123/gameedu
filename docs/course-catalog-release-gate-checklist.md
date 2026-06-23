# Course Catalog Release Gate Checklist

ใช้ checklist นี้ก่อน commit / push / deploy งานหลักสูตรและคอร์สรายวิชา

## Build And Tests

- [ ] `npm.cmd run build`
- [ ] รัน targeted tests ของ course / lesson / assessment ที่แตะในรอบนี้
- [ ] route classroom course progress ผ่าน
- [ ] route classroom course assessment results ผ่าน
- [ ] ไม่มี schema drift ที่ไม่ได้ตั้งใจใน `prisma/schema.prisma`

## Teacher QA

- [ ] ครูเปิด `/dashboard/lessons` แล้วกรองตามวิชาและหน่วยได้
- [ ] ครูเปิด `/dashboard/courses/create` แล้วเห็นเฉพาะบทเรียนตามบริบทหลักสูตรที่เลือก
- [ ] ครูจัดลำดับบทเรียนในคอร์สได้
- [ ] ครูสลับบทบังคับ / บทเสริมได้
- [ ] ครู assign คอร์สให้ห้องเรียน พร้อมกำหนด `startAt` / `dueAt` ได้
- [ ] หน้า classroom tab `courses` แสดง progress และ assessment summary ได้
- [ ] ส่วน curriculum analytics แสดง unit coverage และ lesson completion ได้

## Student QA

- [ ] นักเรียนเห็นคอร์สในชั้นเรียนได้
- [ ] resume เข้า lesson ถัดไปได้
- [ ] complete บทเรียนแล้ว progress ในคอร์สอัปเดต
- [ ] ถ้ามี assessment ผลผ่าน/ไม่ผ่านสะท้อนกลับไปที่ classroom analytics

## Release Decision

- [ ] วิชาที่จะปล่อยมี curriculum map พร้อม
- [ ] unit learning outcomes ของวิชานั้นพร้อม
- [ ] template pack หรือ lesson pack ที่ใช้จริงพร้อม
- [ ] analytics ของครูอ่านได้พอสำหรับติดตามผู้เรียน
- [ ] ไม่มี blocker ใน manual QA

## Notes

- สำหรับวิชาใหม่ ให้ถือว่า checklist นี้ต้องผ่านร่วมกับ subject-specific plan ของวิชานั้น
- ถ้า curriculum metadata ของ lesson ยังไม่ครบ ห้ามสรุปว่า unit coverage พร้อมใช้งานจริง
