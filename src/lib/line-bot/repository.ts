import type { LineGroupDebt, LineBotGroup } from "@prisma/client";
import { db, getOptionalDbModel } from "@/lib/db";
import type {
    ClassroomReminderSummary,
    LineCreatedAssignment,
    LineMyWorkSummary,
    LineStudentBindingSuccess,
    LineTextSubmission,
    OpenDebtRow,
} from "@/lib/line-bot/commands";
import { gradeLineTextSubmissionWithAi, type LineAiPreliminaryGradeResult } from "@/lib/line-bot/ai-grading";
import { sendNotification } from "@/lib/notifications";
import { awardLineAssignmentSubmissionReward } from "@/lib/services/student-economy/line-assignment-reward";
import { canUseLineFeature, getLineCreatedAssignmentMonthlyLimit } from "@/lib/line-bot/plan-access";

export const LINE_DEBT_STATUS_OPEN = "OPEN";
export const LINE_DEBT_STATUS_PAID = "PAID";

export async function upsertLineBotGroup(lineGroupId: string, name?: string | null): Promise<LineBotGroup> {
    return db.lineBotGroup.upsert({
        where: { lineGroupId },
        create: { lineGroupId, name: name ?? undefined },
        update: {
            isActive: true,
            ...(name ? { name } : {}),
        },
    });
}

export async function deactivateLineBotGroup(lineGroupId: string): Promise<void> {
    await db.lineBotGroup.updateMany({
        where: { lineGroupId },
        data: { isActive: false },
    });
}

export async function bindLineGroupToClassroom(input: {
    lineGroupId: string;
    classroomId: string;
}): Promise<{ ok: true; classroomName: string } | { ok: false }> {
    const classroom = await db.classroom.findUnique({
        where: { id: input.classroomId },
        select: { id: true, name: true },
    });
    if (!classroom) {
        return { ok: false };
    }

    await db.lineBotGroup.upsert({
        where: { lineGroupId: input.lineGroupId },
        create: {
            lineGroupId: input.lineGroupId,
            classroomId: classroom.id,
        },
        update: {
            isActive: true,
            classroomId: classroom.id,
        },
    });

    return { ok: true, classroomName: classroom.name };
}

export async function getClassroomReminderSummaryForLineGroup(
    lineGroupId: string
): Promise<ClassroomReminderSummary | null> {
    const group = await db.lineBotGroup.findUnique({
        where: { lineGroupId },
        select: { classroomId: true },
    });
    if (!group?.classroomId) return null;

    const classroom = await db.classroom.findUnique({
        where: { id: group.classroomId },
        select: {
            id: true,
            name: true,
            students: { select: { id: true } },
            assignments: {
                where: { visible: true },
                select: {
                    id: true,
                    name: true,
                    type: true,
                    deadline: true,
                    submissions: { select: { studentId: true } },
                },
            },
        },
    });
    if (!classroom) return null;

    const now = new Date();
    const soonHorizon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const studentCount = classroom.students.length;

    const assignments = classroom.assignments
        .map((assignment) => {
            const submitted = new Set(assignment.submissions.map((submission) => submission.studentId));
            const missingSubmissions = classroom.students.filter((student) => !submitted.has(student.id)).length;
            const deadline = assignment.deadline ?? null;
            const overdue = Boolean(deadline && deadline < now);
            const dueSoon = Boolean(deadline && deadline >= now && deadline <= soonHorizon);
            return {
                assignmentId: assignment.id,
                name: assignment.name,
                type: assignment.type,
                deadline,
                missingSubmissions,
                overdue,
                dueSoon,
            };
        })
        .filter((assignment) => assignment.missingSubmissions > 0 || assignment.overdue || assignment.dueSoon)
        .sort((a, b) => {
            const ao = a.overdue ? 0 : 1;
            const bo = b.overdue ? 0 : 1;
            if (ao !== bo) return ao - bo;
            if (a.missingSubmissions !== b.missingSubmissions) {
                return b.missingSubmissions - a.missingSubmissions;
            }
            return (a.deadline?.getTime() ?? Number.POSITIVE_INFINITY) - (b.deadline?.getTime() ?? Number.POSITIVE_INFINITY);
        });

    return {
        classroomName: classroom.name,
        studentCount,
        assignments,
        totals: {
            visibleAssignments: classroom.assignments.length,
            overdueAssignments: assignments.filter((assignment) => assignment.overdue).length,
            dueSoonAssignments: assignments.filter((assignment) => assignment.dueSoon).length,
            missingSubmissionSlots: assignments.reduce((sum, assignment) => sum + assignment.missingSubmissions, 0),
        },
    };
}

export type CreateLineAssignmentResult =
    | { ok: true; assignment: LineCreatedAssignment }
    | { ok: false; reason: "UNBOUND" | "INVALID_DEADLINE" | "PLAN_LIMIT" };

export type SubmitLineTextAssignmentResult =
    | { ok: true; submission: LineTextSubmission }
    | { ok: false; reason: "UNBOUND" | "NOT_FOUND" | "UNSUPPORTED_ASSIGNMENT" | "PLAN_LIMIT" };

export type BindLineStudentResult =
    | { ok: true; binding: LineStudentBindingSuccess }
    | { ok: false; reason: "UNBOUND" | "NOT_FOUND" | "MODEL_UNAVAILABLE" };

export type GetLineMyWorkResult =
    | { ok: true; summary: LineMyWorkSummary }
    | { ok: false; reason: "UNBOUND" | "NOT_BOUND" | "MODEL_UNAVAILABLE" };

type LineStudentBindingModel = {
    upsert(input: {
        where: { lineUserId_classroomId: { lineUserId: string; classroomId: string } };
        create: {
            lineUserId: string;
            lineGroupId: string;
            classroomId: string;
            studentId: string;
            studentLoginCode: string;
        };
        update: {
            lineGroupId: string;
            studentId: string;
            studentLoginCode: string;
        };
    }): Promise<unknown>;
    findUnique(input: {
        where: { lineUserId_classroomId: { lineUserId: string; classroomId: string } };
        select: { studentId: true };
    }): Promise<{ studentId: string } | null>;
};

export async function createAssignmentForLineGroup(input: {
    lineGroupId: string;
    name: string;
    deadlineText: string | null;
    now?: Date;
}): Promise<CreateLineAssignmentResult> {
    const now = input.now ?? new Date();
    const group = await db.lineBotGroup.findUnique({
        where: { lineGroupId: input.lineGroupId },
        select: { classroomId: true },
    });
    if (!group?.classroomId) {
        return { ok: false, reason: "UNBOUND" };
    }

    const deadline = parseLineAssignmentDeadline(input.deadlineText, now);
    if (!deadline.ok) {
        return { ok: false, reason: "INVALID_DEADLINE" };
    }

    const classroom = await db.classroom.findUnique({
        where: { id: group.classroomId },
        select: {
            id: true,
            name: true,
            teacher: {
                select: {
                    role: true,
                    plan: true,
                    planStatus: true,
                    planExpiry: true,
                },
            },
            assignments: { select: { id: true } },
            students: { select: { id: true, loginCode: true } },
        },
    });
    if (!classroom) {
        return { ok: false, reason: "UNBOUND" };
    }

    const monthlyLimit = getLineCreatedAssignmentMonthlyLimit(classroom.teacher);
    if (Number.isFinite(monthlyLimit)) {
        const monthStart = new Date(now);
        monthStart.setUTCDate(1);
        monthStart.setUTCHours(0, 0, 0, 0);
        const createdThisMonth = await db.assignment.count({
            where: {
                classId: classroom.id,
                createdAt: { gte: monthStart },
                description: "Created from LINE by Nong Gring",
            },
        });
        if (createdThisMonth >= monthlyLimit) {
            return { ok: false, reason: "PLAN_LIMIT" };
        }
    }

    const assignment = await db.assignment.create({
        data: {
            classId: classroom.id,
            name: input.name,
            description: "Created from LINE by Nong Gring",
            maxScore: 10,
            type: "score",
            checklists: [],
            passScore: null,
            deadline: deadline.value,
            order: classroom.assignments.length,
            visible: true,
        },
    });

    const dueStr = assignment.deadline
        ? assignment.deadline.toLocaleString("th-TH", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Bangkok",
          })
        : null;

    await Promise.all(
        classroom.students.map((student) =>
            sendNotification({
                studentId: student.id,
                type: "ASSIGNMENT",
                link: `/student/${student.loginCode}`,
                i18n: dueStr
                    ? {
                          titleKey: "notifNewAssignmentTitle",
                          messageKey: "notifNewAssignmentBodyDue",
                          params: { name: assignment.name, due: dueStr },
                      }
                    : {
                          titleKey: "notifNewAssignmentTitle",
                          messageKey: "notifNewAssignmentBody",
                          params: { name: assignment.name },
                      },
            })
        )
    );

    return {
        ok: true,
        assignment: {
            id: assignment.id,
            name: assignment.name,
            classroomName: classroom.name,
            deadline: assignment.deadline,
        },
    };
}

export async function submitTextAssignmentForLineGroup(input: {
    lineGroupId: string;
    studentCode: string;
    assignmentRef: string;
    content: string;
}): Promise<SubmitLineTextAssignmentResult> {
    const group = await db.lineBotGroup.findUnique({
        where: { lineGroupId: input.lineGroupId },
        select: {
            classroomId: true,
            classroom: {
                select: {
                    id: true,
                    name: true,
                    teacher: {
                        select: {
                            role: true,
                            plan: true,
                            planStatus: true,
                            planExpiry: true,
                        },
                    },
                    students: {
                        select: {
                            id: true,
                            loginCode: true,
                        },
                    },
                    assignments: {
                        where: { visible: true },
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            type: true,
                            maxScore: true,
                        },
                    },
                },
            },
        },
    });

    if (!group?.classroomId || !group.classroom) {
        return { ok: false, reason: "UNBOUND" };
    }

    if (!canUseLineFeature(group.classroom.teacher, "lineSubmission")) {
        return { ok: false, reason: "PLAN_LIMIT" };
    }

    const student = group.classroom.students.find(
        (item) => item.loginCode.toLowerCase() === input.studentCode.trim().toLowerCase()
    );
    if (!student) {
        return { ok: false, reason: "NOT_FOUND" };
    }

    const assignmentRef = input.assignmentRef.trim();
    const assignment = group.classroom.assignments.find((item) => item.id === assignmentRef)
        ?? group.classroom.assignments.find(
            (item) => item.name.trim().toLowerCase() === assignmentRef.toLowerCase()
        );
    if (!assignment) {
        return { ok: false, reason: "NOT_FOUND" };
    }

    const assignmentType = assignment.type.toLowerCase();
    if (assignmentType === "quiz" || assignmentType === "worksheet") {
        return { ok: false, reason: "UNSUPPORTED_ASSIGNMENT" };
    }

    const existing = await db.assignmentSubmission.findUnique({
        where: {
            studentId_assignmentId: {
                studentId: student.id,
                assignmentId: assignment.id,
            },
        },
        select: { id: true },
    });

    const aiPreliminaryGrade = canUseLineFeature(group.classroom.teacher, "lineAiPreliminaryGrading")
        ? await gradeLineTextSubmissionWithAi({
            assignmentName: assignment.name,
            assignmentDescription: assignment.description,
            maxScore: assignment.maxScore,
            studentAnswer: input.content,
        })
        : ({ status: "unavailable", reason: "plan_limit" } as LineAiPreliminaryGradeResult);
    const score = aiPreliminaryGrade.status === "graded" ? aiPreliminaryGrade.suggestedScore : 0;

    await db.assignmentSubmission.upsert({
        where: {
            studentId_assignmentId: {
                studentId: student.id,
                assignmentId: assignment.id,
            },
        },
        create: {
            studentId: student.id,
            assignmentId: assignment.id,
            score,
            content: buildLineSubmissionContent(input.content, aiPreliminaryGrade),
            cheatingLogs: [],
        },
        update: {
            score,
            content: buildLineSubmissionContent(input.content, aiPreliminaryGrade),
            submittedAt: new Date(),
        },
    });

    const aiPreliminaryScore =
        aiPreliminaryGrade.status === "graded"
            ? {
                suggestedScore: aiPreliminaryGrade.suggestedScore,
                maxScore: aiPreliminaryGrade.maxScore,
                confidence: aiPreliminaryGrade.confidence,
            }
            : null;
    const reward = await awardLineAssignmentSubmissionReward(db, {
        studentId: student.id,
        classId: group.classroom.id,
        assignmentId: assignment.id,
        assignmentName: assignment.name,
        aiPreliminaryScore,
    });

    return {
        ok: true,
        submission: {
            assignmentName: assignment.name,
            classroomName: group.classroom.name,
            replacedPreviousSubmission: Boolean(existing),
            aiPreliminaryScore,
            reward: {
                awarded: reward.awarded,
                gold: reward.gold,
            },
        },
    };
}

export async function bindLineStudentToStudentCode(input: {
    lineGroupId: string;
    lineUserId: string;
    studentCode: string;
}): Promise<BindLineStudentResult> {
    const bindingModel = getOptionalDbModel<LineStudentBindingModel>("lineStudentBinding");
    if (!bindingModel) return { ok: false, reason: "MODEL_UNAVAILABLE" };

    const group = await db.lineBotGroup.findUnique({
        where: { lineGroupId: input.lineGroupId },
        select: {
            classroomId: true,
            classroom: {
                select: {
                    id: true,
                    name: true,
                    students: {
                        select: {
                            id: true,
                            name: true,
                            loginCode: true,
                        },
                    },
                },
            },
        },
    });

    if (!group?.classroomId || !group.classroom) {
        return { ok: false, reason: "UNBOUND" };
    }

    const student = group.classroom.students.find(
        (item) => item.loginCode.toLowerCase() === input.studentCode.trim().toLowerCase()
    );
    if (!student) {
        return { ok: false, reason: "NOT_FOUND" };
    }

    await bindingModel.upsert({
        where: {
            lineUserId_classroomId: {
                lineUserId: input.lineUserId,
                classroomId: group.classroom.id,
            },
        },
        create: {
            lineUserId: input.lineUserId,
            lineGroupId: input.lineGroupId,
            classroomId: group.classroom.id,
            studentId: student.id,
            studentLoginCode: student.loginCode,
        },
        update: {
            lineGroupId: input.lineGroupId,
            studentId: student.id,
            studentLoginCode: student.loginCode,
        },
    });

    return {
        ok: true,
        binding: {
            classroomName: group.classroom.name,
            studentName: student.name,
        },
    };
}

export async function getLineMyWorkSummary(input: {
    lineGroupId: string;
    lineUserId: string;
}): Promise<GetLineMyWorkResult> {
    const bindingModel = getOptionalDbModel<LineStudentBindingModel>("lineStudentBinding");
    if (!bindingModel) return { ok: false, reason: "MODEL_UNAVAILABLE" };

    const group = await db.lineBotGroup.findUnique({
        where: { lineGroupId: input.lineGroupId },
        select: {
            classroomId: true,
            classroom: {
                select: {
                    id: true,
                    name: true,
                    assignments: {
                        where: { visible: true },
                        select: {
                            id: true,
                            name: true,
                            deadline: true,
                        },
                    },
                },
            },
        },
    });
    if (!group?.classroomId || !group.classroom) {
        return { ok: false, reason: "UNBOUND" };
    }

    const binding = await bindingModel.findUnique({
        where: {
            lineUserId_classroomId: {
                lineUserId: input.lineUserId,
                classroomId: group.classroom.id,
            },
        },
        select: { studentId: true },
    });
    if (!binding) {
        return { ok: false, reason: "NOT_BOUND" };
    }

    const student = await db.student.findUnique({
        where: { id: binding.studentId },
        select: {
            id: true,
            name: true,
            submissions: {
                select: {
                    assignmentId: true,
                },
            },
        },
    });
    if (!student) {
        return { ok: false, reason: "NOT_BOUND" };
    }

    const submitted = new Set(student.submissions.map((submission) => submission.assignmentId));
    const items = group.classroom.assignments
        .filter((assignment) => !submitted.has(assignment.id))
        .sort((a, b) => (a.deadline?.getTime() ?? Number.POSITIVE_INFINITY) - (b.deadline?.getTime() ?? Number.POSITIVE_INFINITY))
        .slice(0, 8)
        .map((assignment) => ({
            assignmentName: assignment.name,
            deadline: assignment.deadline,
        }));

    return {
        ok: true,
        summary: {
            classroomName: group.classroom.name,
            studentName: student.name,
            items,
        },
    };
}

function buildLineSubmissionContent(content: string, aiPreliminaryGrade?: LineAiPreliminaryGradeResult): string {
    return JSON.stringify({
        mode: "line_text",
        text: content,
        submittedVia: "line",
        aiPreliminaryGrading: aiPreliminaryGrade ?? { status: "unavailable", reason: "not_requested" },
    });
}

function parseLineAssignmentDeadline(
    rawText: string | null,
    now: Date
): { ok: true; value: Date | null } | { ok: false } {
    if (rawText === null) return { ok: true, value: null };

    const text = rawText.trim().toLowerCase();
    if (!text || text === "none" || text === "no due" || text === "ไม่มีกำหนดส่ง") {
        return { ok: true, value: null };
    }

    const today = getBangkokDateParts(now);
    if (text === "today" || text === "วันนี้") {
        return { ok: true, value: bangkokEndOfDay(today.year, today.month, today.day) };
    }

    if (text === "tomorrow" || text === "พรุ่งนี้") {
        const next = new Date(Date.UTC(today.year, today.month - 1, today.day + 1, 12));
        const parts = getBangkokDateParts(next);
        return { ok: true, value: bangkokEndOfDay(parts.year, parts.month, parts.day) };
    }

    const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) {
        return buildBangkokDeadline(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    }

    const slash = text.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
    if (slash) {
        return buildBangkokDeadline(
            slash[3] ? Number(slash[3]) : today.year,
            Number(slash[2]),
            Number(slash[1])
        );
    }

    const thaiMonth = text.match(/^(\d{1,2})\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)(?:\s*(\d{4}))?$/);
    if (thaiMonth) {
        const month = THAI_MONTHS[thaiMonth[2]];
        const year = thaiMonth[3] ? normalizeThaiYear(Number(thaiMonth[3])) : today.year;
        return buildBangkokDeadline(year, month, Number(thaiMonth[1]));
    }

    return { ok: false };
}

const THAI_MONTHS: Record<string, number> = {
    "ม.ค.": 1,
    "ก.พ.": 2,
    "มี.ค.": 3,
    "เม.ย.": 4,
    "พ.ค.": 5,
    "มิ.ย.": 6,
    "ก.ค.": 7,
    "ส.ค.": 8,
    "ก.ย.": 9,
    "ต.ค.": 10,
    "พ.ย.": 11,
    "ธ.ค.": 12,
};

function normalizeThaiYear(year: number): number {
    return year > 2400 ? year - 543 : year;
}

function buildBangkokDeadline(
    year: number,
    month: number,
    day: number
): { ok: true; value: Date } | { ok: false } {
    const normalizedYear = normalizeThaiYear(year);
    if (month < 1 || month > 12 || day < 1 || day > 31) return { ok: false };
    const value = bangkokEndOfDay(normalizedYear, month, day);
    const check = getBangkokDateParts(value);
    if (check.year !== normalizedYear || check.month !== month || check.day !== day) return { ok: false };
    return { ok: true, value };
}

function bangkokEndOfDay(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month - 1, day, 16, 59, 59, 999));
}

function getBangkokDateParts(date: Date): { year: number; month: number; day: number } {
    const bangkok = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return {
        year: bangkok.getUTCFullYear(),
        month: bangkok.getUTCMonth() + 1,
        day: bangkok.getUTCDate(),
    };
}

export async function listOpenDebtsForLineGroup(lineGroupId: string): Promise<OpenDebtRow[]> {
    const group = await db.lineBotGroup.findUnique({
        where: { lineGroupId },
        include: {
            debts: {
                where: { status: LINE_DEBT_STATUS_OPEN },
                orderBy: { shortCode: "asc" },
            },
        },
    });

    if (!group) return [];

    return group.debts.map(debtToOpenRow);
}

export async function createLineGroupDebt(input: {
    lineGroupId: string;
    debtorLabel: string;
    amountBaht: number;
    note?: string;
    createdByLineUserId?: string;
    createdByLabel?: string;
}): Promise<{ group: LineBotGroup; debt: LineGroupDebt }> {
    const group = await upsertLineBotGroup(input.lineGroupId);

    const max = await db.lineGroupDebt.aggregate({
        where: { groupId: group.id },
        _max: { shortCode: true },
    });
    const shortCode = (max._max.shortCode ?? 0) + 1;

    const debt = await db.lineGroupDebt.create({
        data: {
            groupId: group.id,
            shortCode,
            debtorLabel: input.debtorLabel,
            amountBaht: input.amountBaht,
            note: input.note,
            status: LINE_DEBT_STATUS_OPEN,
            createdByLineUserId: input.createdByLineUserId,
            createdByLabel: input.createdByLabel,
        },
    });

    return { group, debt };
}

export async function markLineGroupDebtPaid(
    lineGroupId: string,
    shortCode: number
): Promise<LineGroupDebt | null> {
    const group = await db.lineBotGroup.findUnique({ where: { lineGroupId } });
    if (!group) return null;

    const existing = await db.lineGroupDebt.findFirst({
        where: {
            groupId: group.id,
            shortCode,
            status: LINE_DEBT_STATUS_OPEN,
        },
    });
    if (!existing) return null;

    return db.lineGroupDebt.update({
        where: { id: existing.id },
        data: {
            status: LINE_DEBT_STATUS_PAID,
            paidAt: new Date(),
        },
    });
}

function debtToOpenRow(debt: LineGroupDebt): OpenDebtRow {
    return {
        shortCode: debt.shortCode,
        debtorLabel: debt.debtorLabel,
        amountBaht: debt.amountBaht,
        note: debt.note,
    };
}
