export type LineStudentWorkScope = "missing" | "today" | "soon";

export type LineDebtCommand =
    | { type: "classroom_help" }
    | { type: "classroom_summary" }
    | { type: "classroom_remind" }
    | { type: "classroom_student_work"; scope: LineStudentWorkScope }
    | { type: "student_link_account"; code: string }
    | { type: "classroom_bind_student"; studentCode: string }
    | { type: "classroom_my_work" }
    | { type: "classroom_submit_text"; studentCode: string; assignmentRef: string; content: string }
    | { type: "classroom_create_assignment"; name: string; deadlineText: string | null }
    | { type: "bind_classroom"; classroomId: string; secret: string }
    | { type: "bind_classroom_token"; token: string }
    | { type: "add"; debtorLabel: string; amountBaht: number; note?: string }
    | { type: "summary" }
    | { type: "remind" }
    | { type: "mark_paid"; shortCode: number }
    | { type: "help" }
    | { type: "ping" };

const ADD_PREFIXES = ["ค้าง", "เพิ่ม", "add"] as const;
const SUMMARY_KEYWORDS = new Set(["สรุป", "list", "รายการ"]);
const REMIND_KEYWORDS = new Set(["ทวง", "remind"]);
const HELP_KEYWORDS = new Set(["help", "ช่วย", "คำสั่ง"]);
const PING_KEYWORDS = new Set(["ping", "ทดสอบ"]);

const CLASSROOM_HELP_KEYWORDS = new Set(["กริ่งช่วย", "น้องกริ่ง", "gring help"]);
const CLASSROOM_SUMMARY_KEYWORDS = new Set(["สรุปงาน", "งานค้างห้อง", "gring summary"]);
const CLASSROOM_REMIND_KEYWORDS = new Set(["ทวงงาน", "กริ่งทวง", "gring remind"]);
const MY_WORK_KEYWORDS = new Set(["งานของฉัน", "my assignments", "my work"]);
const STUDENT_WORK_KEYWORDS: Record<LineStudentWorkScope, Set<string>> = {
    missing: new Set(["งานค้าง", "my work", "missing work"]),
    today: new Set(["งานวันนี้", "today work", "due today"]),
    soon: new Set(["งานใกล้ส่ง", "soon work", "due soon"]),
};

export function parseLineDebtCommand(rawText: string): LineDebtCommand | null {
    const text = rawText.trim();
    if (!text) return null;

    const lower = text.toLowerCase();

    if (CLASSROOM_HELP_KEYWORDS.has(lower)) return { type: "classroom_help" };
    if (CLASSROOM_SUMMARY_KEYWORDS.has(lower)) return { type: "classroom_summary" };
    if (CLASSROOM_REMIND_KEYWORDS.has(lower)) return { type: "classroom_remind" };

    if (MY_WORK_KEYWORDS.has(lower)) return { type: "classroom_my_work" };

    for (const [scope, keywords] of Object.entries(STUDENT_WORK_KEYWORDS) as Array<[LineStudentWorkScope, Set<string>]>) {
        if (keywords.has(lower)) return { type: "classroom_student_work", scope };
    }

    const studentLinkMatch = text.match(/^(?:เชื่อม|link)\s+(\d{6})$/i);
    if (studentLinkMatch) {
        return { type: "student_link_account", code: studentLinkMatch[1] };
    }

    const studentBindMatch = text.match(/^(?:ผูกนักเรียน|bind student)\s+(\S{3,64})$/i);
    if (studentBindMatch) {
        return { type: "classroom_bind_student", studentCode: studentBindMatch[1].trim() };
    }

    const submitTextCommand = parseSubmitTextCommand(text);
    if (submitTextCommand) return submitTextCommand;

    const createAssignmentCommand = parseCreateAssignmentCommand(text);
    if (createAssignmentCommand) return createAssignmentCommand;

    const bindMatch = text.match(/^(?:ผูกห้อง|bind classroom)\s+([a-f0-9]{24})\s+(\S{4,128})$/i);
    if (bindMatch) {
        return { type: "bind_classroom", classroomId: bindMatch[1], secret: bindMatch[2] };
    }

    const bindTokenMatch = text.match(/^(?:ผูกห้อง|bind classroom)\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i);
    if (bindTokenMatch) {
        return { type: "bind_classroom_token", token: bindTokenMatch[1] };
    }

    if (PING_KEYWORDS.has(lower)) return { type: "ping" };
    if (HELP_KEYWORDS.has(lower)) return { type: "help" };
    if (SUMMARY_KEYWORDS.has(lower)) return { type: "summary" };
    if (REMIND_KEYWORDS.has(lower)) return { type: "remind" };

    const paidMatch = text.match(/^จ่ายแล้ว\s+#?(\d+)\s*$/i);
    if (paidMatch) {
        return { type: "mark_paid", shortCode: Number(paidMatch[1]) };
    }

    for (const prefix of ADD_PREFIXES) {
        if (!lower.startsWith(prefix.toLowerCase())) continue;
        const rest = text.slice(prefix.length).trim();
        const parsed = parseAddRest(rest);
        if (parsed) return parsed;
    }

    return null;
}

function parseSubmitTextCommand(text: string): LineDebtCommand | null {
    const thaiMatch = text.match(/^ส่งงาน\s+(\S+)\s+(.+?)\s*[:：]\s*(.+)$/i);
    if (thaiMatch) {
        return buildSubmitTextCommand(thaiMatch[1], thaiMatch[2], thaiMatch[3]);
    }

    const englishMatch = text.match(/^submit work\s+(\S+)\s+(.+?)\s*[:：]\s*(.+)$/i);
    if (englishMatch) {
        return buildSubmitTextCommand(englishMatch[1], englishMatch[2], englishMatch[3]);
    }

    return null;
}

function buildSubmitTextCommand(
    studentCode: string,
    assignmentRef: string,
    content: string
): LineDebtCommand | null {
    const trimmedStudentCode = studentCode.trim();
    const trimmedAssignmentRef = assignmentRef.trim();
    const trimmedContent = content.trim();
    if (!trimmedStudentCode || !trimmedAssignmentRef || !trimmedContent) return null;
    return {
        type: "classroom_submit_text",
        studentCode: trimmedStudentCode,
        assignmentRef: trimmedAssignmentRef,
        content: trimmedContent,
    };
}

function parseCreateAssignmentCommand(text: string): LineDebtCommand | null {
    const englishNoDueMatch = text.match(/^create assignment\s+(.+?)\s+no due$/i);
    if (englishNoDueMatch) {
        return {
            type: "classroom_create_assignment",
            name: englishNoDueMatch[1].trim(),
            deadlineText: null,
        };
    }

    const englishMatch = text.match(/^create assignment\s+(.+?)\s+due\s+(.+)$/i);
    if (englishMatch) {
        return {
            type: "classroom_create_assignment",
            name: englishMatch[1].trim(),
            deadlineText: englishMatch[2].trim(),
        };
    }

    const thaiNoDueMatch = text.match(/^สร้างงาน\s+(.+?)\s+ไม่มีกำหนดส่ง\s*$/i);
    if (thaiNoDueMatch) {
        return {
            type: "classroom_create_assignment",
            name: thaiNoDueMatch[1].trim(),
            deadlineText: null,
        };
    }

    const thaiMatch = text.match(/^สร้างงาน\s+(.+?)\s+(?:ส่ง|กำหนดส่ง)\s+(.+)$/i);
    if (thaiMatch) {
        return {
            type: "classroom_create_assignment",
            name: thaiMatch[1].trim(),
            deadlineText: thaiMatch[2].trim(),
        };
    }

    return null;
}

function parseAddRest(rest: string): LineDebtCommand | null {
    if (!rest) return null;

    const match = rest.match(/^(.+?)\s+(\d[\d,]*)(?:\s+(.+))?$/);
    if (!match) return null;

    const debtorLabel = match[1].trim();
    const amountBaht = Number(match[2].replace(/,/g, ""));
    const note = match[3]?.trim();

    if (!debtorLabel) return null;
    if (!Number.isFinite(amountBaht) || amountBaht <= 0 || !Number.isInteger(amountBaht)) {
        return null;
    }

    return {
        type: "add",
        debtorLabel,
        amountBaht,
        note: note || undefined,
    };
}

export function formatClassroomReminderHelpMessage(): string {
    return [
        "LINE น้องกริ่งทวง",
        "คำสั่งที่ใช้ได้:",
        "- กริ่งช่วย: ดูคำสั่ง",
        "- ผูกห้อง <classroomId> <secret>: ผูกกลุ่ม LINE กับห้องเรียน",
        "- สร้างงาน <ชื่องาน> ส่ง <วันส่ง>: สร้างงานในห้องเรียน",
        "- สร้างงาน <ชื่องาน> ไม่มีกำหนดส่ง: สร้างงานแบบไม่กำหนดส่ง",
        "- ผูกนักเรียน <studentCode>: ผูกบัญชี LINE ของนักเรียนกับ GameEdu",
        "- งานของฉัน: ดูงานค้างเฉพาะของนักเรียนที่ผูกไว้",
        "- ส่งงาน <studentCode> <ชื่องาน>: <คำตอบ>: ส่งคำตอบข้อความเข้า GameEdu",
        "- งานค้าง: ดูงานที่ยังมีคนไม่ได้ส่ง",
        "- งานวันนี้: ดูงานที่กำหนดส่งวันนี้",
        "- งานใกล้ส่ง: ดูงานที่กำหนดส่งใน 3 วัน",
        "- สรุปงาน: ดูภาพรวมงานค้างของห้อง",
        "- ทวงงาน: ส่งข้อความทวงงานในกลุ่ม",
        "",
        "ตัวอย่างวันส่ง: วันนี้, พรุ่งนี้, 5/6/2026, 2026-06-05",
    ].join("\n");
}

export function formatClassroomBindingRequiredMessage(): string {
    return [
        "ยังไม่ได้ผูกกลุ่ม LINE นี้กับห้องเรียน GameEdu",
        "ให้ครูพิมพ์: ผูกห้อง <classroomId> <secret>",
        "",
        "หลังผูกแล้วจะใช้ สร้างงาน, งานค้าง, สรุปงาน และ ทวงงาน ได้",
    ].join("\n");
}

export function formatClassroomBindingSuccessMessage(classroomName: string): string {
    return [
        "ผูกกลุ่ม LINE กับห้องเรียนแล้ว",
        `ห้อง: ${classroomName}`,
        "",
        "ใช้คำสั่ง สร้างงาน, งานค้าง, สรุปงาน หรือ ทวงงาน ได้เลย",
    ].join("\n");
}

export function formatClassroomBindingFailedMessage(): string {
    return [
        "ผูกห้องไม่สำเร็จ",
        "ตรวจสอบ classroomId และ secret แล้วลองอีกครั้ง",
    ].join("\n");
}

export function formatDebtHelpMessage(): string {
    return [
        "คำสั่งทวงงาน/รายการค้าง (legacy MVP)",
        "- ค้าง <ชื่อ> <จำนวนบาท>: บันทึกยอดค้าง",
        "- สรุป: ดูรายการค้าง",
        "- ทวง: ส่งข้อความทวงในกลุ่ม",
        "- จ่ายแล้ว <เลข>: ปิดรายการ",
        "- ping: ทดสอบว่าบอทออนไลน์",
        "",
        "สำหรับงานนักเรียนให้ใช้: กริ่งช่วย",
    ].join("\n");
}

export type OpenDebtRow = {
    shortCode: number;
    debtorLabel: string;
    amountBaht: number;
    note: string | null;
};

export type ClassroomReminderAssignmentRow = {
    assignmentId: string;
    name: string;
    type: string;
    deadline: Date | null;
    missingSubmissions: number;
    overdue: boolean;
    dueSoon: boolean;
};

export type ClassroomReminderSummary = {
    classroomName: string;
    studentCount: number;
    assignments: ClassroomReminderAssignmentRow[];
    totals: {
        visibleAssignments: number;
        overdueAssignments: number;
        dueSoonAssignments: number;
        missingSubmissionSlots: number;
    };
};

export type LineCreatedAssignment = {
    id: string;
    name: string;
    classroomName: string;
    deadline: Date | null;
};

export type LineTextSubmission = {
    assignmentName: string;
    classroomName: string;
    replacedPreviousSubmission: boolean;
    aiPreliminaryScore?: {
        suggestedScore: number;
        maxScore: number;
        confidence: "low" | "medium" | "high";
    } | null;
    reward?: {
        gold: number;
        awarded: boolean;
    } | null;
};

export type LineStudentBindingSuccess = {
    classroomName: string;
    studentName: string;
};

export type LineMyWorkSummary = {
    classroomName: string;
    studentName: string;
    items: Array<{
        assignmentName: string;
        deadline: Date | null;
    }>;
};

function formatDeadline(deadline: Date | null) {
    if (!deadline) return "ไม่มีกำหนดส่ง";
    return deadline.toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
    });
}

export function formatClassroomWorkSummary(summary: ClassroomReminderSummary): string {
    if (summary.totals.visibleAssignments === 0) {
        return `ห้อง ${summary.classroomName} ยังไม่มีงานที่เปิดให้นักเรียนเห็น`;
    }

    const hot = summary.assignments.slice(0, 5);
    const lines = [
        `สรุปงานห้อง ${summary.classroomName}`,
        `นักเรียน ${summary.studentCount} คน`,
        `งานเปิดอยู่ ${summary.totals.visibleAssignments} งาน`,
        `เลยกำหนด ${summary.totals.overdueAssignments} งาน | ใกล้ส่ง ${summary.totals.dueSoonAssignments} งาน`,
        `ช่องส่งงานที่ยังขาด ${summary.totals.missingSubmissionSlots}`,
    ];

    if (hot.length > 0) {
        lines.push("");
        lines.push("งานที่ควรดูต่อ:");
        for (const item of hot) {
            lines.push(`- ${item.name}: ขาด ${item.missingSubmissions} | ${formatDeadline(item.deadline)}`);
        }
    }

    return lines.join("\n");
}

export function formatClassroomWorkReminder(summary: ClassroomReminderSummary): string {
    const hot = summary.assignments.filter((item) => item.missingSubmissions > 0).slice(0, 3);
    if (hot.length === 0) {
        return `ห้อง ${summary.classroomName} ไม่มีงานค้างที่ต้องทวงตอนนี้`;
    }

    return [
        "กริ่งเตือนงานค้าง",
        `ห้อง ${summary.classroomName}`,
        ...hot.map((item) => `- ${item.name}: ยังขาด ${item.missingSubmissions} คน (${formatDeadline(item.deadline)})`),
        "",
        "นักเรียนเปิด GameEdu เพื่อตรวจงานของตัวเองได้เลย",
    ].join("\n");
}

export function formatStudentSelfServiceWork(
    summary: ClassroomReminderSummary,
    scope: LineStudentWorkScope,
    now: Date = new Date()
): string {
    const items = summary.assignments
        .filter((item) => item.missingSubmissions > 0)
        .filter((item) => {
            if (scope === "missing") return true;
            if (!item.deadline) return false;
            const diff = diffBangkokCalendarDays(item.deadline, now);
            if (scope === "today") return diff === 0;
            return diff >= 0 && diff <= 3;
        })
        .slice(0, 8);

    const title: Record<LineStudentWorkScope, string> = {
        missing: "งานค้างของห้อง",
        today: "งานที่กำหนดส่งวันนี้",
        soon: "งานใกล้ส่งใน 3 วัน",
    };

    if (items.length === 0) {
        return [
            `${title[scope]} ${summary.classroomName}`,
            "ยังไม่มีงานในหมวดนี้",
            "",
            "นักเรียนเปิด GameEdu เพื่อตรวจงานของตัวเองได้เลย",
        ].join("\n");
    }

    return [
        `${title[scope]} ${summary.classroomName}`,
        ...items.map((item) => `- ${item.name}: ยังขาด ${item.missingSubmissions} คน (${formatDeadline(item.deadline)})`),
        "",
        "ข้อความนี้เป็นภาพรวมของห้อง ไม่แสดงรายชื่อรายคน",
        "นักเรียนเปิด GameEdu เพื่อตรวจงานของตัวเองได้เลย",
    ].join("\n");
}

export function formatLineAssignmentCreatedMessage(assignment: LineCreatedAssignment): string {
    return [
        "สร้างงานใหม่แล้ว",
        `ห้อง: ${assignment.classroomName}`,
        `งาน: ${assignment.name}`,
        `กำหนดส่ง: ${formatDeadline(assignment.deadline)}`,
        "",
        "นักเรียนเปิด GameEdu เพื่อตรวจงานและส่งงานได้เลย",
    ].join("\n");
}

export function formatLineAssignmentCreateFailedMessage(): string {
    return [
        "สร้างงานไม่สำเร็จ",
        "ตรวจสอบรูปแบบคำสั่ง เช่น สร้างงาน แบบฝึกหัดบทที่ 3 ส่ง พรุ่งนี้",
    ].join("\n");
}

export function formatLinePlanLimitMessage(): string {
    return [
        "ฟีเจอร์นี้ต้องใช้แผน PLUS หรือ School",
        "ครูสามารถอัปเกรดแผนใน GameEdu เพื่อใช้ LINE submission, auto reminder, export และ AI grading ได้",
    ].join("\n");
}

export function formatLineTextSubmissionSuccessMessage(submission: LineTextSubmission): string {
    const lines = [
        submission.replacedPreviousSubmission ? "อัปเดตคำตอบแล้ว" : "ส่งงานแล้ว",
        `ห้อง: ${submission.classroomName}`,
        `งาน: ${submission.assignmentName}`,
    ];

    if (submission.aiPreliminaryScore) {
        lines.push(
            `AI ตรวจเบื้องต้น: ${submission.aiPreliminaryScore.suggestedScore}/${submission.aiPreliminaryScore.maxScore}`,
            `ความมั่นใจ: ${submission.aiPreliminaryScore.confidence}`
        );
    }

    if (submission.reward?.awarded && submission.reward.gold > 0) {
        lines.push(`รางวัล: +${submission.reward.gold} Gold`);
        lines.push("เปิด GameEdu เพื่อใช้ Gold ในร้านค้า/Negamon ได้เลย");
    }

    lines.push("", "ครูสามารถตรวจคำตอบนี้ใน GameEdu ได้เลย");
    return lines.join("\n");
}

export function formatLineTextSubmissionFailedMessage(): string {
    return [
        "ส่งงานไม่สำเร็จ",
        "ตรวจสอบ studentCode, ชื่องาน/assignmentId และรูปแบบคำสั่ง",
        "ตัวอย่าง: ส่งงาน S123 แบบฝึกหัดบทที่ 3: คำตอบของฉัน",
    ].join("\n");
}

export function formatLineStudentBindingSuccessMessage(binding: LineStudentBindingSuccess): string {
    return [
        "ผูกนักเรียนกับ LINE แล้ว",
        `ห้อง: ${binding.classroomName}`,
        `นักเรียน: ${binding.studentName}`,
        "",
        "ต่อไปพิมพ์ งานของฉัน เพื่อดูงานค้างเฉพาะตัวได้",
    ].join("\n");
}

export function formatLineStudentBindingFailedMessage(): string {
    return [
        "ผูกนักเรียนไม่สำเร็จ",
        "ตรวจสอบ studentCode หรือให้ครูเช็คว่ารหัสนี้อยู่ในห้องที่ผูกกับกลุ่ม LINE แล้ว",
    ].join("\n");
}

export function formatLineStudentBindingRequiredMessage(): string {
    return [
        "ยังไม่ได้ผูก LINE กับนักเรียน",
        "พิมพ์: ผูกนักเรียน <studentCode>",
        "",
        "หลังผูกแล้วใช้ งานของฉัน ได้",
    ].join("\n");
}

export function formatLineDirectHelpMessage(): string {
    return [
        "เชื่อม LINE กับบัญชีนักเรียน",
        "- ไปที่หน้า GameEdu ของนักเรียน",
        "- กดปุ่ม เชื่อม LINE",
        "- คัดลอกคำสั่ง เชื่อม <code> มาวางในแชตนี้",
        "",
        "ตัวอย่าง: เชื่อม 483921",
        "หลังเชื่อมแล้ว LINE จะผูกกับห้องเรียนนี้ให้อัตโนมัติ",
    ].join("\n");
}

export function formatLineStudentAccountLinkedMessage(input: {
    studentName: string;
    classroomName: string;
}): string {
    return [
        "เชื่อม LINE กับบัญชีนักเรียนสำเร็จแล้ว",
        `ห้อง: ${input.classroomName}`,
        `นักเรียน: ${input.studentName}`,
        "",
        "กลับไปที่ GameEdu ได้เลย ถ้าเปิดหน้าต่างเชื่อม LINE ค้างไว้ สถานะจะอัปเดตเอง",
    ].join("\n");
}

export function formatLineStudentAccountLinkFailedMessage(): string {
    return [
        "เชื่อม LINE ไม่สำเร็จ",
        "รหัสเชื่อมไม่ถูกต้องหรือหมดอายุแล้ว",
        "กลับไปกดปุ่ม เชื่อม LINE ใน GameEdu เพื่อรับรหัสใหม่อีกครั้ง",
    ].join("\n");
}

export function formatLinePrivateReplySentMessage(): string {
    return [
        "ส่งรายละเอียดให้ในแชทส่วนตัวแล้ว",
        "ถ้าไม่เห็นข้อความ ให้เพิ่มบอทเป็นเพื่อนก่อน แล้วลองสั่งอีกครั้ง",
    ].join("\n");
}

export function formatLinePrivateReplyUnavailableMessage(): string {
    return [
        "ยังส่งข้อความส่วนตัวไม่ได้",
        "ให้เพิ่มบอทเป็นเพื่อนก่อน แล้วลองสั่งอีกครั้ง",
    ].join("\n");
}

export function formatLineMyWorkMessage(summary: LineMyWorkSummary): string {
    if (summary.items.length === 0) {
        return [
            `งานของ ${summary.studentName}`,
            `ห้อง: ${summary.classroomName}`,
            "ยังไม่มีงานค้างตอนนี้",
        ].join("\n");
    }

    return [
        `งานของ ${summary.studentName}`,
        `ห้อง: ${summary.classroomName}`,
        ...summary.items.map((item) => `- ${item.assignmentName}: ${formatDeadline(item.deadline)}`),
        "",
        "เปิด GameEdu เพื่อตรวจรายละเอียดและส่งงานได้เลย",
    ].join("\n");
}

export function formatOpenDebtSummary(rows: OpenDebtRow[]): string {
    if (rows.length === 0) {
        return "ไม่มีรายการค้างในกลุ่มนี้";
    }

    const lines = rows.map((row) => {
        const note = row.note ? ` (${row.note})` : "";
        return `#${row.shortCode} ${row.debtorLabel} - ${row.amountBaht} บาท${note}`;
    });

    const total = rows.reduce((sum, row) => sum + row.amountBaht, 0);
    lines.push("");
    lines.push(`รวม ${total} บาท`);
    lines.push("ปิดรายการ: จ่ายแล้ว <เลข>");

    return ["สรุปรายการค้าง", ...lines].join("\n");
}

export function formatRemindMessage(rows: OpenDebtRow[]): string {
    if (rows.length === 0) {
        return "ไม่มีใครค้าง - ไม่ต้องทวง";
    }

    const lines = rows.map((row) => {
        const note = row.note ? ` - ${row.note}` : "";
        return `- ${row.debtorLabel} ${row.amountBaht} บาท${note} (#${row.shortCode})`;
    });

    const total = rows.reduce((sum, row) => sum + row.amountBaht, 0);
    return ["ทวงรายการค้าง", ...lines, "", `รวม ${total} บาท`].join("\n");
}

function diffBangkokCalendarDays(target: Date, base: Date): number {
    const targetParts = getBangkokDateParts(target);
    const baseParts = getBangkokDateParts(base);
    const targetDay = Date.UTC(targetParts.year, targetParts.month - 1, targetParts.day);
    const baseDay = Date.UTC(baseParts.year, baseParts.month - 1, baseParts.day);
    return Math.round((targetDay - baseDay) / (24 * 60 * 60 * 1000));
}

function getBangkokDateParts(date: Date): { year: number; month: number; day: number } {
    const bangkok = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return {
        year: bangkok.getUTCFullYear(),
        month: bangkok.getUTCMonth() + 1,
        day: bangkok.getUTCDate(),
    };
}
