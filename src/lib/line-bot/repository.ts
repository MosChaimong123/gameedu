import type { LineGroupDebt, LineBotGroup } from "@prisma/client";
import { db } from "@/lib/db";
import type { ClassroomReminderSummary, OpenDebtRow } from "@/lib/line-bot/commands";

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
