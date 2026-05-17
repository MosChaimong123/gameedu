export type PublicPageLanguage = "en" | "th";

export const siteMetadata = {
  title: "TeachPlayEdu",
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
    homeBand1: "Live games",
    homeBand2: "Quizzes & reports",
    homeBand3: "Built for class",
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
    homeBand1: "เกมเรียลไทม์",
    homeBand2: "ควิซและรายงาน",
    homeBand3: "สำหรับห้องเรียน",
    footerBuiltWith: "พัฒนาด้วย Next.js และ Socket.io",
  },
} as const;

/** Shown in Terms & Privacy. Use an address your team monitors in production. */
export const LEGAL_CONTACT_EMAIL = "support@teachplayedu.com";

export const privacyContent = {
  en: {
    updatedAt: "May 7, 2026",
    back: "Back to TeachPlayEdu",
    updated: "Last updated",
    title: "Privacy Policy",
    intro:
      "This Privacy Policy describes how TeachPlayEdu (“we”, “us”) collects, uses, stores, and shares personal data when you use our websites and related services at teachplayedu.com and associated domains that link here (the “Service”). It is written for users based primarily in Thailand and references practices aligned with the Thai Personal Data Protection Act B.E. 2562 (PDPA) where applicable. This Policy does not replace independent legal advice for your school or organization.",
    sections: [
      [
        "1. Who we are",
        `TeachPlayEdu is operated as an online educational platform. For privacy requests relating to this Policy, contact us at ${LEGAL_CONTACT_EMAIL}.`,
      ],
      [
        "2. Scope",
        "This Policy applies to personal data processed through the Service, including teacher accounts, classroom activity data you submit, and billing-related metadata when you purchase paid plans. Third-party sites that we link to are governed by their own policies.",
      ],
      [
        "3. Categories of personal data",
        "Depending on how you use TeachPlayEdu, we may process: account and authentication data (such as name, email address, username, password hash, OAuth identifiers when you choose Google sign-in, role such as teacher or student); classroom and learning activity data (class names, student display names or nicknames, join codes, quiz scores, attendance-style markers, participation in live games, progression or rewards in gamified features such as Negamon, classroom economy transactions); technical data (IP address, device/browser type, timestamps, diagnostic identifiers sent to error monitoring when enabled); communications you send to support; and records needed for security (audit logs, rate-limit counters).\n\nWe aim to collect only what is reasonably necessary to operate the Service and support classrooms.",
      ],
      [
        "4. Sources of data",
        "We obtain information directly from you when you register, update your profile, create classrooms, invite students, host activities, or contact support. We may also receive limited technical data automatically when you use the Service and when integrated providers return confirmations (for example, payment success metadata from Stripe (including PromptPay where offered), or authentication tokens from Google when you use Google sign-in).",
      ],
      [
        "5. Purposes and legal bases",
        "We process personal data to provide and secure the Service (account creation, authentication, authorization by role, classroom management, live sessions, analytics needed for product operation); to bill paid subscriptions where offered (through payment providers); to communicate service-related notices and respond to requests; to detect abuse, fraud, and misuse; to comply with law and enforce our Terms; and to improve reliability (including aggregated or de-identified insights where appropriate).\n\nWhere the PDPA applies, we rely on bases such as performance of a contract with you, legitimate interests that are not overridden by your rights (for example protecting accounts and the Service), consent where required (such as certain cookies or optional communications if we ask for consent in the product), and legal obligations.",
      ],
      [
        "6. Cookies and similar technologies",
        "We use cookies or similar technologies needed for session authentication, language preference, security, and basic product functionality. Additional analytics or marketing cookies may be introduced only with appropriate notice and, where required, consent. You can control cookies through your browser settings, but some features may not work if essential cookies are blocked.",
      ],
      [
        "7. Payments",
        "When you subscribe to paid plans, payment details are collected and processed by our payment partners (for example, Stripe for card subscriptions and Stripe PromptPay for one-time PLUS passes in Thailand). TeachPlayEdu typically receives limited billing metadata (such as customer identifiers, subscription status, amounts, and timestamps) rather than full card numbers, which are handled by the payment processor according to its terms and security standards.",
      ],
      [
        "8. Sharing and subprocessors",
        "We share personal data with service providers that help us deliver the Service, such as cloud hosting, databases (for example MongoDB Atlas), email delivery, authentication providers (for example Google OAuth when enabled), payment processors (Stripe), and monitoring tools (for example Sentry) when configured. These providers may process data only as instructed and must implement appropriate safeguards. We may disclose information if required by law, court order, or to protect users and the Service.",
      ],
      [
        "9. International transfers",
        "Some providers may process data in countries outside Thailand. Where required, we rely on appropriate safeguards (such as contractual clauses offered by the provider) and limit transfers to what is needed to operate the Service.",
      ],
      [
        "10. Retention",
        "We retain personal data for as long as your account is active and as needed to provide the Service, resolve disputes, enforce agreements, and meet legal, tax, or accounting requirements. Certain logs may be retained for shorter or longer windows depending on security and debugging needs. When data is no longer needed, we delete or anonymize it in accordance with our operational capabilities.",
      ],
      [
        "11. Security",
        "We implement administrative, technical, and organizational measures designed to protect personal data, including authentication, role-based access controls, transport encryption for connections served over HTTPS in production environments configured correctly, rate limiting, and audit logging on sensitive actions. No online service is perfectly secure; please protect your password and device.",
      ],
      [
        "12. Your rights",
        "Subject to applicable law, you may have rights to access, rectify, delete, restrict processing, object, withdraw consent (where processing is consent-based), and request data portability in certain cases. Schools may have additional requirements for student records. To exercise rights, contact us at the email above. We may need to verify your identity before responding.",
      ],
      [
        "13. Children and schools",
        "TeachPlayEdu is designed for use in educational contexts. Schools and teachers should enter student information only as permitted by their institution and applicable law. If you believe a child’s information was provided without appropriate authority, contact us and we will take reasonable steps to investigate.",
      ],
      [
        "14. Changes and contact",
        `We may update this Policy from time to time. We will post the new date at the top of this page and, where appropriate, provide additional notice in the Service. Continued use after changes become effective constitutes acceptance of the updated Policy, unless applicable law requires otherwise.\n\nQuestions: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    ],
    note:
      "Institutional customers (for example schools or districts) may need separate data processing agreements, DPIAs, or local approvals. This Policy is general-purpose for the public Service and is not a substitute for regulated-sector counsel.",
  },
  th: {
    updatedAt: "7 พฤษภาคม 2026",
    back: "กลับไป TeachPlayEdu",
    updated: "อัปเดตล่าสุด",
    title: "นโยบายความเป็นส่วนตัว",
    intro:
      "นโยบายฉบับนี้อธิบายว่า TeachPlayEdu (“เรา”) เก็บ ใช้ จัดเก็บ และเปิดเผยข้อมูลส่วนบุคคลอย่างไรเมื่อคุณใช้เว็บไซต์และบริการที่เชื่อมโยงที่ teachplayedu.com และโดเมนที่เกี่ยวข้อง (“บริการ”) เอกสารนี้จัดทำโดยคำนึงถึงผู้ใช้ที่อยู่ในไทยเป็นหลัก และอ้างอิงหลักการตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) โดยสรุปเท่าที่เกี่ยวข้อง นโยบายนี้ไม่ใช่คำปรึกษาทางกฎหมายแทนการว่าจ้างทนายหรือที่ปรึกษาของสถาบัน",
    sections: [
      [
        "1. ผู้ควบคุมข้อมูล",
        `TeachPlayEdu ให้บริการแพลตฟอร์มการศึกษาออนไลน์ หากมีคำขอหรือข้อสงสัยเกี่ยวกับนโยบายนี้ ติดต่อ ${LEGAL_CONTACT_EMAIL}`,
      ],
      [
        "2. ขอบเขต",
        "นโยบายนี้ใช้กับข้อมูลส่วนบุคคลที่ประมวลผลผ่านบริการ รวมถึงบัญชีครู ข้อมูลกิจกรรมในห้องเรียนที่คุณป้อน และข้อมูลการเรียกเก็บเงินขั้นต่ำเมื่อคุณซื้อแพ็กเกจแบบชำระเงิน เว็บไซต์ของบุคคลที่สามที่เราเชื่อมโยงมีนโยบายของตนเอง",
      ],
      [
        "3. ประเภทข้อมูลส่วนบุคคล",
        "ขึ้นกับการใช้งาน เราอาจประมวลผลข้อมูลบัญชีและการยืนยันตัวตน (ชื่อ อีเมล ชื่อผู้ใช้ แฮชรหัสผ่าน ตัวระบุ OAuth เมื่อใช้ Google บทบาทเช่น ครู หรือ นักเรียน) ข้อมูลห้องเรียนและการเรียนรู้ (ชื่อห้อง ชื่อที่แสดงของนักเรียน รหัสเข้าร่วม คะแนน การเข้าร่วมเกมสด ความก้าวหน้าหรือรางวัลในเกม เช่น Negamon ธุรกรรมเศรษฐกิจในห้องเรียน) ข้อมูลทางเทคนิค (ที่อยู่ IP ประเภทอุปกรณ์/เบราว์เซอร์ เวลา ตัวระบุวินิจฉัยเมื่อเปิดระบบมอนิเตอร์ข้อผิดพลาด) การสื่อสารที่คุณส่งถึงทีมสนับสนุน และบันทึกเพื่อความปลอดภัย (audit log การจำกัดอัตราการใช้งาน)\n\nเรามุ่งเก็บเท่าที่จำเป็นอย่างสมเหตุสมผลต่อการให้บริการและการสนับสนุนห้องเรียน",
      ],
      [
        "4. แหล่งที่ได้ข้อมูล",
        "เราได้รับข้อมูลจากคุณโดยตรงเมื่อสมัคร แก้โปรไฟล์ สร้างห้องเรียน เชิญนักเรียน จัดกิจกรรม หรือติดต่อสนับสนุน และอาจได้รับข้อมูลทางเทคนิคโดยอัตโนมัติเมื่อคุณใช้บริการ รวมถึงข้อมูลยืนยันจำกัดจากผู้ให้บริการรวม (เช่น ข้อมูลการชำระเงินจาก Stripe (รวม PromptPay เมื่อมีให้ใช้) หรือการยืนยันตัวตนจาก Google เมื่อใช้ล็อกอิน Google)",
      ],
      [
        "5. วัตถุประสงค์และฐานทางกฎหมาย",
        "เราประมวลผลข้อมูลเพื่อให้และรักษาความปลอดภัยของบริการ (สร้างบัญชี ยืนยันตัวตน ตรวจสอบสิทธิ์ตามบทบาท จัดการห้องเรียน เซสชันสด การวิเคราะห์ที่จำเป็นต่อการดำเนินระบบ) เพื่อเรียกเก็บค่าสมัครสมาชิกเมื่อมีการขายแพ็กเกจ แจ้งข่าวสารที่เกี่ยวกับบริการและตอบคำขอ ตรวจจับการละเมิดหรือการใช้งานในทางที่ผิด ปฏิบัติตามกฎหมายและบังคับใช้ข้อกำหนด และพัฒนาความเสถียร (รวมข้อมูลสรุปหรือไม่ระบุตัวตนเมื่อเหมาะสม)\n\nภายใต้ PDPA เราอาจอาศัยฐานเช่น การปฏิบัติตามสัญญากับคุณ ประโยชน์โดยชอบด้วยกฎหมายที่ไม่เกินสิทธิของคุณ ความยินยอมเมื่อกฎหมายกำหนด และภาระผูกพันทางกฎหมาย",
      ],
      [
        "6. คุกกี้และเทคโนโลยีที่คล้ายกัน",
        "เราใช้คุกกี้หรือเทคโนโลยีที่จำเป็นต่อเซสชันการเข้าสู่ระบบ การตั้งค่าภาษา ความปลอดภัย และการทำงานพื้นฐานของผลิตภัณฑ์ หากมีการใช้คุกกี้วิเคราะห์หรือการตลาดเพิ่มเติม เราจะแจ้งและขอความยินยอมตามที่กฎหมายกำหนด คุณสามารถจัดการคุกกี้ผ่านเบราว์เซอร์ แต่ฟีเจอร์บางอย่างอาจใช้ไม่ได้หากปิดคุกกี้ที่จำเป็น",
      ],
      [
        "7. การชำระเงิน",
        "เมื่อคุณสมัครแพ็กเกจแบบมีค่าใช้จ่าย รายละเอียดการชำระเงินจะถูกเก็บและประมวลผลโดยพันธมิตรการชำระเงิน (เช่น Stripe สำหรับบัตรและ Stripe PromptPay สำหรับการชำระแบบครั้งเดียวในประเทศไทย) TeachPlayEdu โดยทั่วไปได้รับเฉพาะข้อมูลการเรียกเก็บเงินขั้นต่ำ (เช่น ตัวระบุลูกค้า สถานะการสมัคร จำนวนเงิน เวลา) ไม่ใช่เลขบัตรเต็ม ซึ่งผู้ให้บริการการชำระเงินจัดการตามข้อกำหนดและมาตรฐานความปลอดภัยของตน",
      ],
      [
        "8. การเปิดเผยและผู้ประมวลผลแทน",
        "เราเปิดเผยข้อมูลแก่ผู้ให้บริการที่ช่วยให้บริการ เช่น โฮสติงคลาวด์ ฐานข้อมูล (เช่น MongoDB Atlas) การส่งอีเมล ผู้ให้บริการยืนยันตัวตน (เช่น Google OAuth เมื่อเปิดใช้) ผู้ประมวลผลการชำระเงิน (Stripe) และเครื่องมือมอนิเตอร์ (เช่น Sentry) เมื่อมีการตั้งค่า ผู้ให้บริการเหล่านี้ประมวลผลตามคำสั่งและต้องมีมาตรการคุ้มครองที่เหมาะสม เราอาจเปิดเผยข้อมูลหากกฎหมายหรือคำสั่งศาลกำหนด หรือเพื่อปกป้องผู้ใช้และบริการ",
      ],
      [
        "9. การถ่ายโอนข้อมูลไปต่างประเทศ",
        "ผู้ให้บริการบางรายอาจประมวลผลข้อมูลนอกราชอาณาจักรไทย เมื่อกฎหมายกำหนด เราอาจอาศัยการคุ้มครองที่เหมาะสม (เช่น ข้อสัญญามาตรฐานของผู้ให้บริการ) และจำกัดการถ่ายโอนเท่าที่จำเป็นต่อการให้บริการ",
      ],
      [
        "10. ระยะเวลาเก็บรักษา",
        "เราเก็บข้อมูลตราบเท่าที่บัญชียังใช้งานและตามความจำเป็นในการให้บริการ แก้ข้อพิพาท บังคับข้อตกลง และปฏิบัติตามภาระทางกฎหมาย ภาษี หรือบัญชี บันทึกบางประเภทอาจเก็บระยะสั้นหรือยาวขึ้นตามความจำเป็นด้านความปลอดภัยและการแก้ปัญหา เมื่อข้อมูลไม่จำเป็น เราจะลบหรือทำให้ไม่สามารถระบุตัวตนได้ตามความสามารถในการดำเนินงาน",
      ],
      [
        "11. ความปลอดภัย",
        "เราดำเนินมาตรการทางองค์กรและเทคนิคที่เหมาะสมเพื่อปกป้องข้อมูลส่วนบุคคล รวมการยืนยันตัวตน การควบคุมการเข้าถึงตามบทบาท การเข้ารหัสการส่งผ่านเมื่อให้บริการผ่าน HTTPS ในการตั้งค่าที่ถูกต้อง การจำกัดอัตราการใช้งาน และบันทึกการตรวจสอบสำหรับการกระทำที่สำคัญ บริการออนไลน์ไม่มีความปลอดภัยสมบูรณ์ โปรดปกป้องรหัสผ่านและอุปกรณ์ของคุณ",
      ],
      [
        "12. สิทธิของคุณ",
        "ภายใต้กฎหมายที่ใช้บังคับ คุณอาจมีสิทธิขอเข้าถึง แก้ไข ลบ จำกัดการประมวลผล คัดค้าน ถอนความยินยอม (เมื่อการประมวลผลอาศัยความยินยอม) และขอให้ส่งหรือโอนข้อมูลในกรณีที่กฎหมายรองรับ สถาบันการศึกษาอาจมีข้อกำหนดเพิ่มเติมเกี่ยวกับข้อมูลนักเรียน หากต้องการใช้สิทธิ ติดต่อตามอีเมลด้านล่าง เราอาจขอยืนยันตัวตนก่อนดำเนินการ",
      ],
      [
        "13. เด็กและโรงเรียน",
        "TeachPlayEdu ออกแบบให้ใช้ในบริบทการศึกษา โรงเรียนและครูควรป้อนข้อมูลนักเรียนตามที่สถาบันและกฎหมายอนุญาต หากคุณเชื่อว่ามีการให้ข้อมูลของเด็กโดยไม่มีอำนาจเหมาะสม โปรดแจ้งเราเพื่อให้ดำเนินการตรวจสอบตามสมควร",
      ],
      [
        "14. การเปลี่ยนแปลงและการติดต่อ",
        `เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว โดยจะแสดงวันที่อัปเดตด้านบนของหน้านี้ และหากเหมาะสมจะแจ้งเพิ่มเติมในบริการ การใช้บริการต่อหลังมีผลถือว่ายอมรับนโยบายที่แก้ไข เว้นแต่กฎหมายจะกำหนดอย่างอื่น\n\nติดต่อ: ${LEGAL_CONTACT_EMAIL}`,
      ],
    ],
    note:
      "ลูกค้าสถาบัน (เช่น โรงเรียนหรือเขตการศึกษา) อาจต้องมีข้อตกลงประมวลผลข้อมูล (DPA) การประเมินผลกระทบต่อความเป็นส่วนตัว (DPIA) หรือการอนุมัติภายในเพิ่มเติม นโยบายนี้เป็นกรอบทั่วไปสำหรับบริการสาธารณะและไม่แทนที่คำปรึกษาสำหรับภาคที่มีการกำกับเฉพาะ",
  },
} as const;

export const termsContent = {
  en: {
    updatedAt: "May 7, 2026",
    back: "Back to TeachPlayEdu",
    updated: "Last updated",
    title: "Terms of Service",
    intro:
      "These Terms of Service (“Terms”) govern your access to and use of TeachPlayEdu’s websites and related services (the “Service”). By creating an account or using the Service, you agree to these Terms. If you use the Service on behalf of a school or organization, you represent that you are authorized to bind that entity to these Terms where applicable.",
    sections: [
      [
        "1. The Service",
        "TeachPlayEdu provides tools for teachers and students to manage classrooms, run interactive quizzes and live learning games, track participation and progress (including features such as Negamon and classroom economy experiences where enabled), and view related reports. Features may change over time; descriptions on the product at the time of use control unless we expressly agree otherwise in writing.",
      ],
      [
        "2. Eligibility and accounts",
        "You must provide accurate registration information and keep your credentials confidential. You are responsible for activity under your account except where caused solely by our breach of reasonable security practices. Teachers should invite or enroll students only where they have authority from their school or institution. Certain administrative roles may require additional verification.",
      ],
      [
        "3. User content and classroom data",
        "You retain rights to content you submit, subject to the license needed for us to host and display it within the Service for its intended educational purpose. You represent that you have the rights and consents needed for data you upload about students and classrooms. Do not upload unlawful content, malware, or unnecessary sensitive personal data.",
      ],
      [
        "4. Acceptable use",
        "You must not misuse the Service: no probing or circumventing security, no scraping or automated abuse that harms performance, no harassment, no unlawful discrimination, no infringement of intellectual property, and no interference with other users’ classes. We may suspend or terminate accounts that pose risk or violate these Terms or applicable law.",
      ],
      [
        "5. Paid plans and billing",
        "Paid subscriptions (such as TeachPlayEdu PLUS) are billed through checkout flows presented at purchase time. Pricing, currency, taxes, renewal intervals, quotas, and refund policies are shown by our payment partners (for example Stripe) and/or on in-product pricing screens and supersede conflicting informal communications. Subscriptions renew until canceled according to the controls offered by the payment provider and your selections at checkout. Chargebacks and disputes may result in suspension pending resolution.",
      ],
      [
        "6. Third-party services",
        "The Service integrates third-party infrastructure and APIs (hosting, database, email delivery, authentication providers such as Google when enabled, payment processors, monitoring when configured). Those services have their own terms and privacy notices. Your use of Google sign-in or card payments is also subject to those providers’ policies.",
      ],
      [
        "7. Intellectual property",
        "TeachPlayEdu names, logos, and the Service’s software and documentation are protected by intellectual property laws. Except for the limited rights expressly granted to use the Service, no rights are transferred to you. Feedback you provide may be used to improve the Service without obligation to you.",
      ],
      [
        "8. Disclaimers",
        "The Service is provided on an “as is” and “as available” basis to the maximum extent permitted by law. We disclaim implied warranties such as merchantability, fitness for a particular purpose, and non-infringement where allowed. Educational outcomes depend on many factors outside our control.",
      ],
      [
        "9. Limitation of liability",
        "To the maximum extent permitted by applicable law, neither TeachPlayEdu nor its suppliers will be liable for indirect, incidental, special, consequential, or punitive damages, or loss of profits, data, or goodwill. Our aggregate liability arising out of these Terms or the Service is limited to the greater of (a) the amounts you paid to TeachPlayEdu for the Service in the three months before the claim or (b) where no fees apply, one hundred Thai baht (THB 100). Some jurisdictions do not allow certain limitations; in those cases our liability is limited to the fullest extent permitted.",
      ],
      [
        "10. Indemnity",
        "You will defend and indemnify TeachPlayEdu against third-party claims arising from your misuse of the Service, your content, or your violation of these Terms or applicable law, subject to procedures consistent with applicable law.",
      ],
      [
        "11. Suspension, termination, and changes",
        "We may suspend or terminate access for breach, risk, legal requirement, or prolonged inactivity as permitted by law. You may stop using the Service at any time; termination does not excuse unpaid amounts accrued before termination. We may modify the Service or these Terms; material changes will be noted by updating the date above and, where appropriate, additional notice in the Service. Continued use after changes become effective constitutes acceptance unless applicable law requires otherwise.",
      ],
      [
        "12. Governing law and disputes",
        "These Terms are governed by the laws of Thailand, excluding conflict-of-law rules. Courts in Thailand shall have exclusive jurisdiction over disputes arising from these Terms or the Service, subject to mandatory consumer protections where applicable.",
      ],
      [
        "13. Contact",
        `Questions about these Terms: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    ],
    note:
      "School-wide agreements, purchase orders, or regulated-sector deployments may require bespoke contracts in addition to these online Terms. Seek qualified counsel for institutional procurement.",
  },
  th: {
    updatedAt: "7 พฤษภาคม 2026",
    back: "กลับไป TeachPlayEdu",
    updated: "อัปเดตล่าสุด",
    title: "ข้อกำหนดการให้บริการ",
    intro:
      "ข้อกำหนดการให้บริการฉบับนี้ (“ข้อกำหนด”) ควบคุมการเข้าถึงและการใช้งานเว็บไซต์และบริการของ TeachPlayEdu (“บริการ”) เมื่อคุณสร้างบัญชีหรือใช้บริการ ถือว่าคุณยอมรับข้อกำหนดนี้ หากคุณใช้บริการในนามโรงเรียนหรือองค์กร คุณแสดงว่ามีอำนาจผูกพันองค์กรนั้นตามข้อกำหนดที่เกี่ยวข้อง",
    sections: [
      [
        "1. บริการ",
        "TeachPlayEdu ให้เครื่องมือแก่ครูและนักเรียนในการจัดการห้องเรียน จัดควิซและเกมการเรียนรู้แบบโต้ตอบ ติดตามการมีส่วนร่วมและความก้าวหน้า (รวมฟีเจอร์เช่น Negamon และประสบการณ์เศรษฐกิจในห้องเรียนเมื่อเปิดใช้งาน) และดูรายงานที่เกี่ยวข้อง ฟีเจอร์อาจเปลี่ยนแปลงการอธิบายตามผลิตภัณฑ์ ณ เวลาใช้งานมีผลบังคับ เว้นแต่เราตกลงเป็นลายลักษณ์อักษรอย่างอื่น",
      ],
      [
        "2. คุณสมบัติและบัญชี",
        "คุณต้องให้ข้อมูลการสมัครที่เป็นความจริงและรักษาความลับของข้อมูลเข้าสู่ระบบ คุณรับผิดชอบต่อการกระทำภายใต้บัญชีของคุณ เว้นแต่เกิดจากความล้มเหลวของเราในการรักษามาตรการความปลอดภัยที่สมเหตุสมผลโดยลำพัง ครูควรเชิญหรือลงทะเบียนนักเรียนเมื่อได้รับอนุญาตจากสถาบัน บทบาทผู้ดูแลบางประเภทอาจต้องมีการยืนยันเพิ่มเติม",
      ],
      [
        "3. เนื้อหาของผู้ใช้และข้อมูลห้องเรียน",
        "คุณยังคงมีสิทธิในเนื้อหาที่ส่ง ภายใต้สิทธิ์การอนุญาตที่จำเป็นให้เราโฮสต์และแสดงภายในบริการตามวัตถุประสงค์ทางการศึกษา คุณแสดงว่ามีสิทธิและความยินยอมที่จำเป็นต่อข้อมูลเกี่ยวกับนักเรียนและห้องเรียนที่คุณอัปโหลด ห้ามอัปโหลดเนื้อหาที่ผิดกฎหมาย มัลแวร์ หรือข้อมูลส่วนบุคคลอ่อนไหวที่ไม่จำเป็น",
      ],
      [
        "4. การใช้งานที่ยอมรับได้",
        "ห้ามใช้บริการในทางที่ผิด รวมถึงห้ามสำรวจหรือหลีกเลี่ยงความปลอดภัย ห้ามดึงข้อมูลอัตโนมัติที่เป็นอันตรายต่อประสิทธิภาพ ห้ามคุกคาม แบ่งแยกโดยไม่ชอบด้วยกฎหมาย ละเมิดทรัพย์สินทางปัญญา หรือรบกวนการใช้งานของผู้อื่น เราอาจระงับหรือยกเลิกบัญชีที่มีความเสี่ยงหรือละเมิดข้อกำหนดหรือกฎหมาย",
      ],
      [
        "5. แพ็กเกจแบบชำระเงินและการเรียกเก็บเงิน",
        "การสมัครแบบมีค่าใช้จ่าย (เช่น TeachPlayEdu PLUS) เรียกเก็บผ่านขั้นตอนชำระเงินที่แสดงตอนสั่งซื้อ ราคา สกุลเงิน ภาษี รอบการต่ออายุ โควตา และนโยบายการคืนเงินตามที่แสดงโดยผู้ให้บริการการชำระเงิน (เช่น Stripe) และ/หรือบนหน้าจอราคาในแอป และมีผลเหนือการสื่อสารอื่นที่ไม่เป็นทางการ การสมัครจะต่ออายุจนกว่าจะยกเลิกตามเครื่องมือของผู้ให้บริการการชำระเงินและการเลือกของคุณตอนชำระเงิน การขอคืนเงินหรือข้อพิพาทอาจทำให้ระงับชั่วคราวจนกว่าจะได้ข้อยุติ",
      ],
      [
        "6. บริการของบุคคลที่สาม",
        "บริการเชื่อมต่อโครงสร้างพื้นฐานและ API ของบุคคลที่สาม (โฮสติง ฐานข้อมูล การส่งอีเมล ผู้ให้บริการยืนยันตัวตนเช่น Google เมื่อเปิดใช้ ผู้ประมวลผลการชำระเงิน ระบบมอนิเตอร์เมื่อตั้งค่า) บริการเหล่านั้นมีข้อกำหนดและนโยบายความเป็นส่วนตัวของตนเอง การใช้ล็อกอิน Google หรือการชำระเงินด้วยบัตรยังอยู่ภายใต้ข้อกำหนดของผู้ให้บริการเหล่านั้น",
      ],
      [
        "7. ทรัพย์สินทางปัญญา",
        "ชื่อ เครื่องหมาย ซอฟต์แวร์ และเอกสารของ TeachPlayEdu อยู่ภายใต้กฎหมายคุ้มครองทรัพย์สินทางปัญญา นอกจากสิทธิ์จำกัดที่ให้โดยชัดแจ้งในการใช้บริการ ไม่มีการโอนสิทธิ์เพิ่มเติมให้คุณ ความคิดเห็นหรือข้อเสนอแนะที่คุณให้อาจถูกนำไปปรับปรุงบริการโดยไม่มีภาระผูกพันต่อคุณ",
      ],
      [
        "8. การปฏิเสธความรับผิดชอบ",
        "บริการให้บริการตามสภาพ “ตามที่เป็น” และ “ตามที่มี” ภายในขอบเขตสูงสุดที่กฎหมายอนุญาต เราปฏิเสธการรับประกันโดยนัย เช่น ความเหมาะสมเพื่อการค้า ความเหมาะสมเพื่อวัตถุประสงค์เฉพาะ และการไม่ละเมิด เท่าที่อนุญาต ผลการเรียนรู้ขึ้นอยู่กับปัจจัยหลายอย่างนอกเหนือการควบคุมของเรา",
      ],
      [
        "9. ข้อจำกัดความรับผิด",
        "ภายในขอบเขตสูงสุดที่กฎหมายที่ใช้บังคับอนุญาต TeachPlayEdu และผู้ให้บริการของเราจะไม่รับผิดชอบต่อความเสียหายทางอ้อม โดยบังเอิญ พิเศษ เป็นผลตามมา หรือลงโทษ หรือการสูญเสียกำไร ข้อมูล หรือชื่อเสียง ความรับผิดรวมจากข้อกำหนดหรือบริการจำกัดไม่เกินค่าที่คุณชำระแก่ TeachPlayEdu สำหรับบริการในสามเดือนก่อนเกิดข้อเรียกร้อง หรือหากไม่มีค่าธรรมเนียม ไม่เกินหนึ่งร้อยบาท (100 บาท) บางเขตอำนาจไม่อนุญาตข้อจำกัดบางประเภท — ในกรณีนั้นความรับผิดของเราจำกัดเท่าที่กฎหมายอนุญาตสูงสุด",
      ],
      [
        "10. การชดใช้",
        "คุณจะปกป้องและชดใช้ให้ TeachPlayEdu จากข้อเรียกร้องของบุคคลที่สามที่เกิดจากการใช้บริการของคุณในทางที่ผิด เนื้อหาของคุณ หรือการละเมิดข้อกำหนดหรือกฎหมาย ภายใต้ขั้นตอนที่สอดคล้องกับกฎหมายที่ใช้บังคับ",
      ],
      [
        "11. การระงับ การสิ้นสุด และการเปลี่ยนแปลง",
        "เราอาจระงับหรือยุติการเข้าถึงเมื่อมีการละเมิด ความเสี่ยง ข้อกำหนดทางกฎหมาย หรือการไม่ใช้งานเป็นเวลานานตามที่กฎหมายอนุญาต คุณสามารถหยุดใช้บริการได้ทุกเมื่อ การสิ้นสุดไม่ยกเว้นหนี้ที่เกิดก่อนสิ้นสุด เราอาจแก้ไขบริการหรือข้อกำหนด การเปลี่ยนแปลงสำคัญจะแสดงโดยการอัปเดตวันที่ด้านบนและหากเหมาะสมจะแจ้งเพิ่มเติมในบริการ การใช้ต่อหลังมีผลถือว่ายอมรับการเปลี่ยนแปลง เว้นแต่กฎหมายจะกำหนดอย่างอื่น",
      ],
      [
        "12. กฎหมายที่ใช้บังคับและข้อพิพาท",
        "ข้อกำหนดนี้อยู่ภายใต้กฎหมายไทย โดยไม่รวมหลักความขัดแย้งของกฎหมาย ศาลในราชอาณาจักรไทยมีอำนาจพิจารณาพิเศษเกี่ยวกับข้อพิพาทจากข้อกำหนดหรือบริการ เว้นแต่การคุ้มครองผู้บริโภคบังคับเป็นอย่างอื่น",
      ],
      [
        "13. การติดต่อ",
        `คำถามเกี่ยวกับข้อกำหนดนี้: ${LEGAL_CONTACT_EMAIL}`,
      ],
    ],
    note:
      "ข้อตกลงระดับโรงเรียน ใบสั่งซื้อ หรือการใช้งานในภาคที่มีการกำกับอาจต้องมีสัญญาเพิ่มเติมนอกเหนือจากข้อกำหนดออนไลน์นี้ ควรปรึกษาที่ปรึกษาที่มีคุณสมบัติสำหรับการจัดซื้อภายในสถาบัน",
  },
} as const;
