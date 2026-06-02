export type LineDebtCommand =
    | { type: "classroom_help" }
    | { type: "classroom_summary" }
    | { type: "classroom_remind" }
    | { type: "bind_classroom"; classroomId: string; secret: string }
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

export function parseLineDebtCommand(rawText: string): LineDebtCommand | null {
    const text = rawText.trim();
    if (!text) return null;

    const lower = text.toLowerCase();

    if (CLASSROOM_HELP_KEYWORDS.has(lower)) return { type: "classroom_help" };
    if (CLASSROOM_SUMMARY_KEYWORDS.has(lower)) return { type: "classroom_summary" };
    if (CLASSROOM_REMIND_KEYWORDS.has(lower)) return { type: "classroom_remind" };

    const bindMatch = text.match(/^(?:ผูกห้อง|bind classroom)\s+([a-f0-9]{24})\s+(\S{4,128})$/i);
    if (bindMatch) {
        return { type: "bind_classroom", classroomId: bindMatch[1], secret: bindMatch[2] };
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
        "- สรุปงาน: ดูภาพรวมงานค้างของห้อง",
        "- ทวงงาน: ส่งข้อความทวงงานในกลุ่ม",
        "",
        "หมายเหตุ: ตอนนี้ยังเป็น MVP ต้องผูกห้องกับ GameEdu ก่อนจึงจะสรุป/ทวงงานจริงได้",
    ].join("\n");
}

export function formatClassroomBindingRequiredMessage(): string {
    return [
        "ยังไม่ได้ผูกกลุ่ม LINE นี้กับห้องเรียน GameEdu",
        "ให้ครูพิมพ์: ผูกห้อง <classroomId> <secret>",
        "",
        "หลังผูกแล้วจะใช้ สรุปงาน และ ทวงงาน ได้",
    ].join("\n");
}

export function formatClassroomBindingSuccessMessage(classroomName: string): string {
    return [
        "ผูกกลุ่ม LINE กับห้องเรียนแล้ว",
        `ห้อง: ${classroomName}`,
        "",
        "ใช้คำสั่ง สรุปงาน หรือ ทวงงาน ได้เลย",
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
