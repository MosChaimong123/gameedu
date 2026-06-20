import type { messagingApi } from "@line/bot-sdk";
import type { MissingStudentName } from "@/lib/line-bot/missing-student-names";

export type ReminderFlexTone = "before" | "today" | "overdue";

export type ChecklistItemSummary = {
    text: string;
    submittedCount: number;
    totalStudents: number;
    missingStudents: MissingStudentName[];
};

const TONE: Record<ReminderFlexTone, { color: string; label: string }> = {
    before: { color: "#F59E0B", label: "ใกล้ถึงกำหนดส่ง" },
    today: { color: "#EF4444", label: "ถึงกำหนดส่งวันนี้" },
    overdue: { color: "#DC2626", label: "เลยกำหนดส่งแล้ว" },
};

// Show the full missing-student list. A LINE Flex bubble caps at ~50KB JSON, so
// keep a high safety ceiling to avoid hitting that limit on very large classes.
const MAX_NAMES = 100;

function formatBangkokDateTime(date: Date): string {
    return date.toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
    });
}

function buildChecklistItemsContents(
    items: ChecklistItemSummary[]
): messagingApi.FlexComponent[] {
    const rows: messagingApi.FlexComponent[] = [];
    items.forEach((item, i) => {
        const allDone = item.submittedCount === item.totalStudents;
        const emoji = allDone ? "✅" : "⬜";
        const countLabel = allDone
            ? "ครบทุกคน"
            : item.submittedCount === 0
              ? `ยังไม่มีใครส่ง (0/${item.totalStudents})`
              : `ส่งแล้ว ${item.submittedCount}/${item.totalStudents} คน`;

        rows.push({
            type: "box",
            layout: "vertical",
            spacing: "xs",
            margin: i === 0 ? "none" : "md",
            contents: [
                {
                    type: "text",
                    text: `${emoji} ข้อ ${i + 1}: ${item.text} — ${countLabel}`,
                    size: "sm",
                    weight: "bold",
                    color: allDone ? "#10B981" : "#374151",
                    wrap: true,
                },
                ...item.missingStudents.slice(0, MAX_NAMES).map(
                    (student): messagingApi.FlexComponent => ({
                        type: "text",
                        text: `  • ${student.name}${student.linked ? "" : " (ยังไม่เชื่อม LINE)"}`,
                        size: "sm",
                        color: student.linked ? "#6B7280" : "#9CA3AF",
                        wrap: true,
                    })
                ),
            ],
        });
    });
    return rows;
}

function buildMissingNameContents(
    students: MissingStudentName[]
): messagingApi.FlexComponent[] {
    if (students.length === 0) return [];
    const shown = students.slice(0, MAX_NAMES);
    const rows: messagingApi.FlexComponent[] = shown.map((student) => ({
        type: "text",
        text: `• ${student.name}${student.linked ? "" : " (ยังไม่เชื่อม LINE)"}`,
        size: "sm",
        color: student.linked ? "#374151" : "#9CA3AF",
        wrap: true,
    }));
    if (students.length > MAX_NAMES) {
        rows.push({
            type: "text",
            text: `และอีก ${students.length - MAX_NAMES} คน`,
            size: "sm",
            color: "#9CA3AF",
            wrap: true,
        });
    }
    return rows;
}

export function buildReminderFlexBubble(input: {
    tone: ReminderFlexTone;
    classroomName: string;
    assignmentName: string;
    deadline: Date | null;
    missingSubmissions: number;
    totalStudents?: number;
    missingStudents: MissingStudentName[];
    footerUrl?: string;
    checklistItems?: ChecklistItemSummary[];
}): messagingApi.FlexBubble {
    const tone = TONE[input.tone];
    const missingText =
        typeof input.totalStudents === "number"
            ? `${input.missingSubmissions} จาก ${input.totalStudents} คน`
            : `${input.missingSubmissions} คน`;

    const bodyContents: messagingApi.FlexComponent[] = [
        {
            type: "text",
            text: input.assignmentName,
            weight: "bold",
            size: "xl",
            wrap: true,
            color: "#111827",
        },
        {
            type: "text",
            text: `ห้อง ${input.classroomName}`,
            size: "sm",
            color: "#6B7280",
            wrap: true,
        },
        { type: "separator", margin: "lg" },
        {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
                {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                        { type: "text", text: "กำหนดส่ง", size: "sm", color: "#9CA3AF", flex: 2 },
                        {
                            type: "text",
                            text: input.deadline ? formatBangkokDateTime(input.deadline) : "ไม่มีกำหนดส่ง",
                            size: "sm",
                            color: "#374151",
                            wrap: true,
                            flex: 5,
                        },
                    ],
                },
                {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                        { type: "text", text: "ยังไม่ส่ง", size: "sm", color: "#9CA3AF", flex: 2 },
                        {
                            type: "text",
                            text: missingText,
                            size: "sm",
                            weight: "bold",
                            color: tone.color,
                            wrap: true,
                            flex: 5,
                        },
                    ],
                },
            ],
        },
    ];

    if (input.checklistItems && input.checklistItems.length > 0) {
        const checklistContents = buildChecklistItemsContents(input.checklistItems);
        bodyContents.push({ type: "separator", margin: "lg" });
        bodyContents.push({
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "none",
            contents: [
                { type: "text", text: "รายการย่อย", size: "xs", color: "#9CA3AF", margin: "none" },
                ...checklistContents,
            ],
        });
    } else {
        const nameContents = buildMissingNameContents(input.missingStudents);
        if (nameContents.length > 0) {
            bodyContents.push({ type: "separator", margin: "lg" });
            bodyContents.push({
                type: "box",
                layout: "vertical",
                margin: "lg",
                spacing: "sm",
                contents: [
                    { type: "text", text: "รายชื่อที่ยังไม่ส่ง", size: "xs", color: "#9CA3AF" },
                    ...nameContents,
                ],
            });
        }
    }

    const bubble: messagingApi.FlexBubble = {
        type: "bubble",
        header: {
            type: "box",
            layout: "vertical",
            backgroundColor: tone.color,
            paddingAll: "lg",
            contents: [
                { type: "text", text: "ขออนุญาตทวงงาน", color: "#FFFFFF", weight: "bold", size: "lg" },
                { type: "text", text: tone.label, color: "#FFFFFF", size: "sm" },
            ],
        },
        body: {
            type: "box",
            layout: "vertical",
            spacing: "md",
            contents: bodyContents,
        },
    };

    if (input.footerUrl) {
        bubble.footer = {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
                {
                    type: "button",
                    style: "primary",
                    color: tone.color,
                    action: { type: "uri", label: "เปิด GameEdu", uri: input.footerUrl },
                },
            ],
        };
    }

    return bubble;
}

/**
 * Flex card announcing a NEW assignment to the classroom LINE group.
 * Shows the assignment name, deadline, and a "ส่งงาน" button linking students
 * to the student portal (where they enter their own access code).
 */
export function buildAssignmentAnnounceFlexBubble(input: {
    classroomName: string;
    assignmentName: string;
    deadline: Date | null;
    totalStudents?: number;
    actionUrl?: string;
}): messagingApi.FlexBubble {
    const headerColor = "#10B981";
    const bodyContents: messagingApi.FlexComponent[] = [
        {
            type: "text",
            text: input.assignmentName,
            weight: "bold",
            size: "xl",
            wrap: true,
            color: "#111827",
        },
        {
            type: "text",
            text: `ห้อง ${input.classroomName}`,
            size: "sm",
            color: "#6B7280",
            wrap: true,
        },
        { type: "separator", margin: "lg" },
        {
            type: "box",
            layout: "baseline",
            margin: "lg",
            spacing: "sm",
            contents: [
                { type: "text", text: "กำหนดส่ง", size: "sm", color: "#9CA3AF", flex: 2 },
                {
                    type: "text",
                    text: input.deadline ? formatBangkokDateTime(input.deadline) : "ไม่มีกำหนดส่ง",
                    size: "sm",
                    color: "#374151",
                    weight: "bold",
                    wrap: true,
                    flex: 5,
                },
            ],
        },
        {
            type: "text",
            text: "กดปุ่มด้านล่างเพื่อส่งงาน",
            size: "sm",
            color: "#6B7280",
            wrap: true,
            margin: "lg",
        },
    ];

    const bubble: messagingApi.FlexBubble = {
        type: "bubble",
        header: {
            type: "box",
            layout: "vertical",
            backgroundColor: headerColor,
            paddingAll: "lg",
            contents: [
                { type: "text", text: "📣 ประกาศงานใหม่", color: "#FFFFFF", weight: "bold", size: "lg" },
                {
                    type: "text",
                    text:
                        typeof input.totalStudents === "number"
                            ? `ถึงนักเรียนทั้ง ${input.totalStudents} คน`
                            : "ถึงนักเรียนทุกคน",
                    color: "#FFFFFF",
                    size: "sm",
                },
            ],
        },
        body: {
            type: "box",
            layout: "vertical",
            spacing: "md",
            contents: bodyContents,
        },
    };

    if (input.actionUrl) {
        bubble.footer = {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
                {
                    type: "button",
                    style: "primary",
                    color: headerColor,
                    action: { type: "uri", label: "ส่งงาน", uri: input.actionUrl },
                },
            ],
        };
    }

    return bubble;
}

/**
 * Flex card announcing that results/scores for an assignment have been published.
 * Mirrors the familiar "ประกาศผล" card — students tap "ดูผลลัพธ์ของฉัน" to log in
 * and view their own score.
 */
export function buildResultAnnounceFlexBubble(input: {
    classroomName: string;
    assignmentName: string;
    actionUrl?: string;
}): messagingApi.FlexBubble {
    const headerColor = "#3B82F6";
    const bubble: messagingApi.FlexBubble = {
        type: "bubble",
        header: {
            type: "box",
            layout: "vertical",
            backgroundColor: headerColor,
            paddingAll: "lg",
            contents: [
                { type: "text", text: "🎉 ประกาศผล", color: "#FFFFFF", weight: "bold", size: "lg" },
                { type: "text", text: `ห้อง ${input.classroomName}`, color: "#FFFFFF", size: "sm" },
            ],
        },
        body: {
            type: "box",
            layout: "vertical",
            spacing: "md",
            contents: [
                {
                    type: "text",
                    text: input.assignmentName,
                    weight: "bold",
                    size: "xl",
                    wrap: true,
                    color: "#111827",
                },
                {
                    type: "text",
                    text: "ครูประกาศผลคะแนนแล้ว\nกดปุ่มด้านล่างเพื่อดูคะแนนของคุณ",
                    size: "sm",
                    color: "#6B7280",
                    wrap: true,
                    margin: "md",
                },
            ],
        },
    };

    if (input.actionUrl) {
        bubble.footer = {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
                {
                    type: "button",
                    style: "primary",
                    color: headerColor,
                    action: { type: "uri", label: "ดูผลคะแนนของฉัน", uri: input.actionUrl },
                },
            ],
        };
    }

    return bubble;
}
