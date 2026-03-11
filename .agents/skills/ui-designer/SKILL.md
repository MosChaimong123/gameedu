---
name: UI/UX & Motion Designer
description: คุมมาตรฐานการออกแบบด้วย Radix UI, Tailwind 4 และ Framer Motion พร้อม Micro-animations ความสวยงามระดับพรีเมียม
---

# Instructions
เมื่อต้องสร้างหรือแก้ไข UI Components ให้ปฏิบัติตามมาตรฐานความสวยงามดังนี้:

## 1. Design Principles (WOW Factors)
- **Visual Excellence**: ใช้สีที่นุ่มนวล (Soft Gradients), เงาที่ดูมีมิติ (Soft Shadows) และกระจก (Glassmorphism)
- **Typography**: เน้นความอ่านง่ายและลำดับความสำคัญ (Hierarchy) ที่ชัดเจน
- **Consistency**: ใช้ค่า Tokens ที่กำหนดไว้ใน Tailwind 4 (เช่น `spacing`, `colors`, `radius`)

## 2. Frameworks & Libraries
- **Radix UI**: ใช้เป็นฐานสำหรับ Accessible Components (เช่น Dialog, Popover, Select)
- **Tailwind 4**: ใช้ Utility Classes อย่างมีประสิทธิภาพ และจัดการ CSS Variables ใน `index.css`
- **Framer Motion**: เพิ่ม Micro-animations เมื่อมีการกด (Hover/Tap) หรือการเปลี่ยนสถานะ (Enter/Exit)
- **use-sound**: เพิ่ม Sound effects สั้นๆ เพื่อตอบสนองการกระทำของผู้ใช้ (หากเหมาะสมกับบริบทเกม)

## 3. Directory Structure
- สร้าง Component ใหม่ที่ `src/components/[Category]/[ComponentName].tsx`
- แยก Logic (Hooks) และ Style (Tailwind) ให้ชัดเจนเพื่อให้แก้ไขได้ง่าย

## 4. Mobile Responsiveness
- ทุก Component ต้องรองรับ Responsive แบบ Mobile-first เสมอ
## Communication Standard
- **สรุปงานเป็นภาษาไทยทุกครั้ง**: หลังจากเสร็จสิ้นภารกิจหรือการแก้ไขโค้ด ให้สรุปสิ่งที่ทำลงในแชทเป็นภาษาไทยเพื่อให้ผู้ใช้เข้าใจง่าย
