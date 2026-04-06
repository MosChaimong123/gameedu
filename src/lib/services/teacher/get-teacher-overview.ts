import { db } from "@/lib/db";

function utcDayBounds(d = new Date()) {
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
}

export type TeacherOverviewRecentAssignment = {
    id: string;
    classId: string;
    classroomName: string;
    name: string;
    type: string;
    deadline: string | null;
    createdAt: string;
    missingSubmissions: number;
};

export type TeacherOverviewClassroom = {
    id: string;
    name: string;
    emoji: string | null;
    grade: string | null;
    studentCount: number;
    missingAttendanceToday: boolean;
    missingSubmissionSlots: number;
};

export type TeacherOverviewPayload = {
    generatedAt: string;
    totals: {
        classroomCount: number;
        studentCount: number;
        classroomsMissingAttendanceToday: number;
        missingSubmissionSlots: number;
    };
    classrooms: TeacherOverviewClassroom[];
    recentAssignments: TeacherOverviewRecentAssignment[];
};

export async function getTeacherOverview(teacherId: string): Promise<TeacherOverviewPayload> {
    const { start, end } = utcDayBounds();
    const generatedAt = new Date().toISOString();

    const classrooms = await db.classroom.findMany({
        where: { teacherId },
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
            totals: {
                classroomCount: 0,
                studentCount: 0,
                classroomsMissingAttendanceToday: 0,
                missingSubmissionSlots: 0,
            },
            classrooms: [],
            recentAssignments: [],
        };
    }

    const attendanceRows = await db.attendanceRecord.findMany({
        where: {
            classId: { in: classIds },
            date: { gte: start, lt: end },
        },
        select: { classId: true },
    });
    const classesWithAttendanceToday = new Set(attendanceRows.map((r) => r.classId));

    const assignmentsForCounts = await db.assignment.findMany({
        where: { classId: { in: classIds }, visible: true },
        select: { id: true, classId: true },
    });

    const recentAssignmentRows = await db.assignment.findMany({
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
        orderBy: { createdAt: "desc" },
        take: 12,
    });

    const assignmentIds = assignmentsForCounts.map((a) => a.id);
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

    let missingSubmissionSlots = 0;
    const missingByClass = new Map<string, number>();
    for (const c of classIds) {
        missingByClass.set(c, 0);
    }

    for (const a of assignmentsForCounts) {
        const n = studentCountByClass.get(a.classId) ?? 0;
        if (n === 0) continue;
        const submitted = submissionCountByAssignment.get(a.id) ?? 0;
        const missing = Math.max(0, n - submitted);
        missingSubmissionSlots += missing;
        missingByClass.set(a.classId, (missingByClass.get(a.classId) ?? 0) + missing);
    }

    let classroomsMissingAttendanceToday = 0;
    const classroomPayloads: TeacherOverviewClassroom[] = classrooms.map((c) => {
        const studentCount = c._count.students;
        const missingAttendanceToday = studentCount > 0 && !classesWithAttendanceToday.has(c.id);
        if (missingAttendanceToday) classroomsMissingAttendanceToday += 1;
        return {
            id: c.id,
            name: c.name,
            emoji: c.emoji,
            grade: c.grade,
            studentCount,
            missingAttendanceToday,
            missingSubmissionSlots: missingByClass.get(c.id) ?? 0,
        };
    });

    const recentAssignments: TeacherOverviewRecentAssignment[] = recentAssignmentRows.map((a) => {
        const n = studentCountByClass.get(a.classId) ?? 0;
        const submitted = submissionCountByAssignment.get(a.id) ?? 0;
        const missingSubmissions = n === 0 ? 0 : Math.max(0, n - submitted);
        return {
            id: a.id,
            classId: a.classId,
            classroomName: a.classroom.name,
            name: a.name,
            type: a.type,
            deadline: a.deadline ? a.deadline.toISOString() : null,
            createdAt: a.createdAt.toISOString(),
            missingSubmissions,
        };
    });

    const totalStudents = classrooms.reduce((sum, c) => sum + c._count.students, 0);

    return {
        generatedAt,
        totals: {
            classroomCount: classrooms.length,
            studentCount: totalStudents,
            classroomsMissingAttendanceToday,
            missingSubmissionSlots,
        },
        classrooms: classroomPayloads,
        recentAssignments,
    };
}
