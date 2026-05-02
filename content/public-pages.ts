export type PublicPageLanguage = "en" | "th";

export const siteMetadata = {
  title: "GameEdu",
  description: "Educational game platform for interactive classrooms.",
} as const;

export const homeContent = {
  en: {
    navLogin: "Login",
    navSignup: "Sign Up",
    heroLine1: "Level Up Your",
    heroLine2: "Classroom Engagement",
    heroBody:
      "Join the fun! Create interactive quizzes, compete in real-time, and make learning an adventure.",
    joinGame: "Join a Game",
    hostGame: "Host a Game",
    footerBuiltWith: "Built with Next.js & Socket.io",
  },
  th: {
    navLogin: "เข้าสู่ระบบ",
    navSignup: "สมัครสมาชิก",
    heroLine1: "ยกระดับ",
    heroLine2: "การมีส่วนร่วมในห้องเรียน",
    heroBody:
      "สร้างควิซแบบโต้ตอบ แข่งขันแบบเรียลไทม์ และเปลี่ยนการเรียนรู้ให้สนุกเหมือนการผจญภัย",
    joinGame: "เข้าร่วมเกม",
    hostGame: "เริ่มโฮสต์เกม",
    footerBuiltWith: "พัฒนาด้วย Next.js และ Socket.io",
  },
} as const;

export const privacyContent = {
  en: {
    updatedAt: "April 30, 2026",
    back: "Back to GameEdu",
    updated: "Last updated",
    title: "Privacy Policy",
    intro:
      "This starter privacy notice documents the core data practices needed before a production beta. It should be reviewed before a full commercial or school-wide launch.",
    sections: [
      [
        "1. Data We Collect",
        "GameEdu may collect account information, teacher profile information, classroom names, student names or nicknames, login codes, scores, attendance records, activity history, game participation, rewards, classroom economy transactions, and billing metadata.",
      ],
      [
        "2. How We Use Data",
        "Data is used to provide classroom management, student access, assignments, live games, Negamon progression, economy features, analytics, billing, security, and support.",
      ],
      [
        "3. Student Information",
        "Student information should be entered by authorized teachers or schools. Student records should be limited to what is necessary for classroom learning and progress tracking.",
      ],
      [
        "4. Service Providers",
        "GameEdu may rely on infrastructure, database, payment, email, monitoring, analytics, and AI providers. Production configuration should keep secrets server-side and avoid sending unnecessary student data to third-party tools.",
      ],
      [
        "5. Security and Audit Logs",
        "The service uses authentication, role checks, rate limiting, audit logs, health checks, and database controls to protect accounts and classroom data.",
      ],
      [
        "6. Data Requests",
        "Teachers, schools, or account owners may request access, correction, export, or deletion of relevant data through the support channel published in the production app.",
      ],
      [
        "7. Retention",
        "Data is kept while needed to provide the service, satisfy operational requirements, resolve billing or support issues, or comply with applicable obligations. Production deployments should define a retention schedule before school-wide rollout.",
      ],
    ],
    note:
      "Launch note: replace this starter notice with reviewed privacy language and a real support contact before collecting payment or signing school contracts.",
  },
  th: {
    updatedAt: "30 เมษายน 2026",
    back: "กลับไป GameEdu",
    updated: "อัปเดตล่าสุด",
    title: "นโยบายความเป็นส่วนตัว",
    intro:
      "เอกสารฉบับเริ่มต้นนี้สรุปแนวทางการใช้ข้อมูลหลักก่อนเปิดใช้งานจริง ควรได้รับการทบทวนอีกครั้งก่อนเปิดใช้เชิงพาณิชย์หรือขยายใช้งานทั้งโรงเรียน",
    sections: [
      [
        "1. ข้อมูลที่เราเก็บ",
        "GameEdu อาจเก็บข้อมูลบัญชี ข้อมูลโปรไฟล์ครู ชื่อห้องเรียน ชื่อนักเรียนหรือชื่อเล่น รหัสเข้าใช้งาน คะแนน การเช็กชื่อ ประวัติกิจกรรม การเข้าร่วมเกม รางวัล ธุรกรรมเศรษฐกิจในห้องเรียน และข้อมูลการชำระเงินที่จำเป็น",
      ],
      [
        "2. วิธีใช้ข้อมูล",
        "เราใช้ข้อมูลเพื่อให้บริการจัดการห้องเรียน การเข้าใช้งานของนักเรียน งานที่มอบหมาย เกมสด ความก้าวหน้า Negamon ระบบเศรษฐกิจ รายงาน การชำระเงิน ความปลอดภัย และการช่วยเหลือผู้ใช้",
      ],
      [
        "3. ข้อมูลนักเรียน",
        "ข้อมูลนักเรียนควรถูกกรอกโดยครูหรือโรงเรียนที่ได้รับอนุญาต และควรจำกัดเท่าที่จำเป็นต่อการเรียนรู้และการติดตามความก้าวหน้าในห้องเรียน",
      ],
      [
        "4. ผู้ให้บริการภายนอก",
        "GameEdu อาจใช้ผู้ให้บริการโครงสร้างพื้นฐาน ฐานข้อมูล การชำระเงิน อีเมล การมอนิเตอร์ การวิเคราะห์ข้อมูล และ AI โดยระบบจริงควรเก็บความลับไว้ฝั่งเซิร์ฟเวอร์และหลีกเลี่ยงการส่งข้อมูลนักเรียนที่ไม่จำเป็นออกไป",
      ],
      [
        "5. ความปลอดภัยและบันทึกตรวจสอบ",
        "ระบบใช้การยืนยันตัวตน การตรวจสิทธิ์ตามบทบาท การจำกัดอัตราการใช้งาน audit log health check และการควบคุมฐานข้อมูลเพื่อปกป้องบัญชีและข้อมูลห้องเรียน",
      ],
      [
        "6. คำขอเกี่ยวกับข้อมูล",
        "ครู โรงเรียน หรือเจ้าของบัญชีสามารถขอเข้าถึง แก้ไข ส่งออก หรือลบข้อมูลที่เกี่ยวข้องผ่านช่องทางสนับสนุนที่ประกาศในแอปเวอร์ชันใช้งานจริง",
      ],
      [
        "7. ระยะเวลาเก็บข้อมูล",
        "ข้อมูลจะถูกเก็บเท่าที่จำเป็นต่อการให้บริการ การดำเนินงาน การแก้ปัญหาการชำระเงินหรือการสนับสนุน และการปฏิบัติตามข้อกำหนดที่เกี่ยวข้อง โดยระบบจริงควรกำหนดตารางการเก็บรักษาข้อมูลก่อนใช้งานทั้งโรงเรียน",
      ],
    ],
    note:
      "หมายเหตุก่อนเปิดใช้งาน: ควรแทนที่ข้อความเริ่มต้นนี้ด้วยนโยบายที่ผ่านการทบทวนและช่องทางติดต่อจริงก่อนรับชำระเงินหรือทำสัญญากับโรงเรียน",
  },
} as const;

export const termsContent = {
  en: {
    updatedAt: "April 30, 2026",
    back: "Back to GameEdu",
    updated: "Last updated",
    title: "Terms of Service",
    intro:
      "These starter terms are provided for production readiness and should be reviewed before a full commercial launch, especially before selling to schools or processing payments at scale.",
    sections: [
      [
        "1. Service",
        "GameEdu helps teachers manage classrooms, student activities, gamified learning, live games, Negamon progression, classroom economy features, and related reports.",
      ],
      [
        "2. Accounts and Roles",
        "Users are responsible for keeping account credentials safe. Teachers are responsible for inviting or adding students only when they have the appropriate classroom authority.",
      ],
      [
        "3. Student Data",
        "Teachers and schools should only enter student information that is needed for classroom use. Do not upload sensitive information that is not required for the learning activity.",
      ],
      [
        "4. Payments and Plans",
        "Paid plans, billing cycles, limits, renewals, refunds, and local payment terms must match the pricing page and payment provider checkout shown at purchase time.",
      ],
      [
        "5. Acceptable Use",
        "Users must not misuse the service, bypass access controls, attack the system, upload harmful content, or use GameEdu in a way that violates applicable school policy or law.",
      ],
      [
        "6. Availability",
        "GameEdu may change, pause, or limit features for maintenance, security, reliability, or product improvement. Production deployments should use the published health and readiness checks.",
      ],
      [
        "7. Contact",
        "For account, billing, or data requests, contact the GameEdu operator using the support channel published in the production app.",
      ],
    ],
    note:
      "Launch note: replace this starter text with reviewed legal terms before opening paid school contracts.",
  },
  th: {
    updatedAt: "30 เมษายน 2026",
    back: "กลับไป GameEdu",
    updated: "อัปเดตล่าสุด",
    title: "ข้อกำหนดการให้บริการ",
    intro:
      "ข้อกำหนดฉบับเริ่มต้นนี้จัดทำขึ้นเพื่อความพร้อมก่อนใช้งานจริง และควรได้รับการทบทวนก่อนเปิดใช้เชิงพาณิชย์ โดยเฉพาะก่อนขายให้โรงเรียนหรือรับชำระเงินในวงกว้าง",
    sections: [
      [
        "1. บริการ",
        "GameEdu ช่วยครูจัดการห้องเรียน กิจกรรมนักเรียน การเรียนรู้แบบเกม เกมสด ความก้าวหน้า Negamon ระบบเศรษฐกิจในห้องเรียน และรายงานที่เกี่ยวข้อง",
      ],
      [
        "2. บัญชีและบทบาท",
        "ผู้ใช้ต้องดูแลข้อมูลเข้าสู่ระบบของตนเองให้ปลอดภัย ส่วนครูมีหน้าที่เชิญหรือเพิ่มนักเรียนเมื่อมีอำนาจดูแลห้องเรียนที่เหมาะสมเท่านั้น",
      ],
      [
        "3. ข้อมูลนักเรียน",
        "ครูและโรงเรียนควรกรอกเฉพาะข้อมูลนักเรียนที่จำเป็นต่อการใช้งานในห้องเรียน และไม่ควรอัปโหลดข้อมูลอ่อนไหวที่ไม่จำเป็นต่อกิจกรรมการเรียนรู้",
      ],
      [
        "4. แพ็กเกจและการชำระเงิน",
        "แพ็กเกจแบบชำระเงิน รอบบิล ข้อจำกัด การต่ออายุ การคืนเงิน และเงื่อนไขการชำระเงินท้องถิ่นต้องสอดคล้องกับหน้าราคาและหน้าชำระเงินที่แสดงตอนสั่งซื้อ",
      ],
      [
        "5. การใช้งานที่ยอมรับได้",
        "ผู้ใช้ต้องไม่ใช้งานระบบในทางที่ผิด หลีกเลี่ยงการควบคุมสิทธิ์ โจมตีระบบ อัปโหลดเนื้อหาอันตราย หรือใช้ GameEdu ในลักษณะที่ขัดต่อนโยบายโรงเรียนหรือกฎหมาย",
      ],
      [
        "6. ความพร้อมให้บริการ",
        "GameEdu อาจเปลี่ยน หยุดชั่วคราว หรือจำกัดบางฟีเจอร์เพื่อการบำรุงรักษา ความปลอดภัย ความเสถียร หรือการปรับปรุงผลิตภัณฑ์ โดยระบบจริงควรใช้ health check และ readiness check ที่ประกาศไว้",
      ],
      [
        "7. การติดต่อ",
        "หากมีคำขอเกี่ยวกับบัญชี การชำระเงิน หรือข้อมูล โปรดติดต่อผู้ดูแล GameEdu ผ่านช่องทางสนับสนุนที่ประกาศในแอปเวอร์ชันใช้งานจริง",
      ],
    ],
    note:
      "หมายเหตุก่อนเปิดใช้งาน: ควรแทนที่ข้อความเริ่มต้นนี้ด้วยข้อกำหนดทางกฎหมายที่ผ่านการทบทวนก่อนเปิดสัญญาแบบชำระเงินกับโรงเรียน",
  },
} as const;
