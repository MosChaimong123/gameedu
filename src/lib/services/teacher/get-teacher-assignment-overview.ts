import { db } from "@/lib/db";

export const ASSIGNMENT_OVERVIEW_RANGE_DAYS = [7, 14, 30] as const;
export type AssignmentOverviewRangeDays = (typeof ASSIGNMENT_OVERVIEW_RANGE_DAYS)[number];

export function parseAssignmentOverviewRangeDays(raw: string | null): AssignmentOverviewRangeDays {
    if (!raw) return 14;
    const trimmed = raw.trim().toLowerCase();
    const m = /^(\d+)(d)?$/.exec(trimmed);
    if (!m) return 14;
    const n = parseInt(m[1], 10);
    return ASSIGNMENT_OVERVIEW_RANGE_DAYS.includes(n as AssignmentOverviewRangeDays)
        ? (n as AssignmentOverviewRangeDays)
        : 14;
}

export type TeacherAssignmentOverviewClassroom = {
    id: string;
    name: string;
    emoji: string | null;
    grade: string | null;
    overdueCount: number;
    dueWithinRangeCount: number;
    missingSubmissionSlots: number;
};

export type TeacherAssignmentOverviewItem = {
    assignmentId: string;
    classId: string;
    classroomName: string;
    name: string;
    type: string;
    deadline: string | null;
    missingSubmissions: number;
    overdue: boolean;
    dueWithinRange: boolean;
};

export type TeacherAssignmentOverviewPayload = {
    generatedAt: string;
    rangeDays: AssignmentOverviewRangeDays;
    classId: string | null;
    totals: {
        visibleAssignmentCount: number;
        overdueAssignmentCount: number;
        dueWithinRangeCount: number;
        missingSubmissionSlots: number;
    };
    classrooms: TeacherAssignmentOverviewClassroom[];
    items: TeacherAssignmentOverviewItem[];
};

export async function getTeacherAssignmentOverview(
    teacherId: string,
    opts: { classId?: string; rangeDays: AssignmentOverviewRangeDays }
): Promise<TeacherAssignmentOverviewPayload | null> {
    if (opts.classId) {
        const owns = await db.classroom.findFirst({
            where: { id: opts.classId, teacherId },
            select: { id: true },
        });
        if (!owns) return null;
    }

    const now = new Date();
    const horizon = new Date(now.getTime() + opts.rangeDays * 24 * 60 * 60 * 1000);
    const generatedAt = now.toISOString();

    const classrooms = await db.classroom.findMany({
        where: { teacherId, ...(opts.classId ? { id: opts.classId } : {}) },
        select: {
            id: true,
            name: true,
            emoji: true,
            grade: true,
            updatedAt: true,
            _count: { select: { students: true } },
        },
        orderBy: { updatedAt: "desc" },
    });

    const classIds = classrooms.map((c) => c.id);

    if (classIds.length === 0) {
        return {
            generatedAt,
            rangeDays: opts.rangeDays,
            classId: opts.classId ?? null,
            totals: {
                visibleAssignmentCount: 0,
                overdueAssignmentCount: 0,
                dueWithinRangeCount: 0,
                missingSubmissionSlots: 0,
            },
            classrooms: [],
            items: [],
        };
    }

    const assignments = await db.assignment.findMany({
        where: { classId: { in: classIds }, visible: true },
        select: {
            id: true,
            classId: true,
            name: true,
            type: true,
            deadline: true,
            createdAt: true,
            classroom: { select: { name: true } },
        },
    });

    const assignmentIds = assignments.map((a) => a.id);
    const submissionGroups =
        assignmentIds.length > 0
            ? await db.assignmentSubmission.groupBy({
                  by: ["assignmentId"],
                  where: { assignmentId: { in: assignmentIds } },
                  _count: { _all: true },
              })
            : [];

    const submissionCountByAssignment = new Map<string, number>();
    for (const row of submissionGroups) {
        submissionCountByAssignment.set(row.assignmentId, row._count._all);
    }

    const studentCountByClass = new Map(classrooms.map((c) => [c.id, c._count.students]));

    type Enriched = {
        id: string;
        classId: string;
        name: string;
        type: string;
        deadline: Date | null;
        classroom: { name: string };
        missing: number;
        overdue: boolean;
        dueWithinRange: boolean;
    };

    const enriched: Enriched[] = assignments.map((a) => {
        const n = studentCountByClass.get(a.classId) ?? 0;
        const submitted = submissionCountByAssignment.get(a.id) ?? 0;
        const missing = n === 0 ? 0 : Math.max(0, n - submitted);
        const dl = a.deadline;
        const overdue = dl != null && dl < now;
        const dueWithinRange = dl != null && dl >= now && dl <= horizon;
        return {
            id: a.id,
            classId: a.classId,
            name: a.name,
            type: a.type,
            deadline: dl,
            classroom: a.classroom,
            missing,
            overdue,
            dueWithinRange,
        };
    });

    let overdueAssignmentCount = 0;
    let dueWithinRangeCount = 0;
    let missingSubmissionSlots = 0;

    for (const e of enriched) {
        if (e.overdue) overdueAssignmentCount += 1;
        if (e.dueWithinRange) dueWithinRangeCount += 1;
        missingSubmissionSlots += e.missing;
    }

    const byClass = new Map<string, TeacherAssignmentOverviewClassroom>();
    for (const c of classrooms) {
        byClass.set(c.id, {
            id: c.id,
            name: c.name,
            emoji: c.emoji,
            grade: c.grade,
            overdueCount: 0,
            dueWithinRangeCount: 0,
            missingSubmissionSlots: 0,
        });
    }
    for (const e of enriched) {
        const row = byClass.get(e.classId);
        if (!row) continue;
        if (e.overdue) row.overdueCount += 1;
        if (e.dueWithinRange) row.dueWithinRangeCount += 1;
        row.missingSubmissionSlots += e.missing;
    }

    const interesting = enriched.filter((e) => e.overdue || e.dueWithinRange || e.missing > 0);
    interesting.sort((a, b) => {
        const ao = a.overdue ? 0 : 1;
        const bo = b.overdue ? 0 : 1;
        if (ao !== bo) return ao - bo;
        if (a.missing !== b.missing) return b.missing - a.missing;
        const ad = a.deadline?.getTime() ?? Number.POSITIVE_INFINITY;
        const bd = b.deadline?.getTime() ?? Number.POSITIVE_INFINITY;
        return ad - bd;
    });

    const items: TeacherAssignmentOverviewItem[] = interesting.slice(0, 25).map((e) => ({
        assignmentId: e.id,
        classId: e.classId,
        classroomName: e.classroom.name,
        name: e.name,
        type: e.type,
        deadline: e.deadline ? e.deadline.toISOString() : null,
        missingSubmissions: e.missing,
        overdue: e.overdue,
        dueWithinRange: e.dueWithinRange,
    }));

    return {
        generatedAt,
        rangeDays: opts.rangeDays,
        classId: opts.classId ?? null,
        totals: {
            visibleAssignmentCount: assignments.length,
            overdueAssignmentCount,
            dueWithinRangeCount,
            missingSubmissionSlots,
        },
        classrooms: Array.from(byClass.values()),
        items,
    };
}
