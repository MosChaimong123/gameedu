import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

type ResetClassroomPointsDeps = {
    db: PrismaClient;
};

export type ResetClassroomPointsArgs = {
    classroomId: string;
    teacherId: string;
};

export type ResetClassroomPointsResult =
    | { ok: false; status: 401; message: string }
    | {
        ok: true;
        classroomId: string;
        studentsResetCount: number;
        activitiesDeletedCount: number;
      };

type StudentIdOnly = {
    id: string;
};

export async function resetClassroomPoints(
    args: ResetClassroomPointsArgs,
    deps: ResetClassroomPointsDeps = { db }
): Promise<ResetClassroomPointsResult> {
    const classroom = await deps.db.classroom.findUnique({
        where: {
            id: args.classroomId,
            teacherId: args.teacherId,
        },
        select: {
            id: true,
        },
    });

    if (!classroom) {
        return { ok: false, status: 401, message: "Unauthorized" };
    }

    const students = await deps.db.student.findMany({
        where: { classId: args.classroomId },
        select: { id: true },
    });

    const studentIds = students.map((student: StudentIdOnly) => student.id);

    if (studentIds.length === 0) {
        return {
            ok: true,
            classroomId: args.classroomId,
            studentsResetCount: 0,
            activitiesDeletedCount: 0,
        };
    }

    const [deletedActivities, , resetStudents] = await deps.db.$transaction([
        deps.db.pointHistory.deleteMany({
            where: {
                studentId: { in: studentIds },
            },
        }),
        deps.db.assignmentSubmission.deleteMany({
            where: {
                studentId: { in: studentIds },
            },
        }),
        deps.db.student.updateMany({
            where: { classId: args.classroomId },
            data: { behaviorPoints: 0 },
        }),
    ]);

    return {
        ok: true,
        classroomId: args.classroomId,
        studentsResetCount: resetStudents.count,
        activitiesDeletedCount: deletedActivities.count,
    };
}
