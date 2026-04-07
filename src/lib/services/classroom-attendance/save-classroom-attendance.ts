import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

type ClassroomAttendanceDeps = {
    db: PrismaClient;
};

export type AttendanceUpdateInput = {
    studentId: string;
    status: string;
};

export type SaveClassroomAttendanceArgs = {
    classroomId: string;
    teacherId: string;
    updates: AttendanceUpdateInput[];
};

export type SaveClassroomAttendanceResult =
    | { ok: false; status: 400 | 401 | 404; message: string }
    | {
        ok: true;
        classroomId: string;
        savedCount: number;
      };

export async function saveClassroomAttendance(
    args: SaveClassroomAttendanceArgs,
    deps: ClassroomAttendanceDeps = { db }
): Promise<SaveClassroomAttendanceResult> {
    if (!Array.isArray(args.updates)) {
        return { ok: false, status: 400, message: "Invalid data" };
    }

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
        where: {
            id: {
                in: args.updates.map((update) => update.studentId),
            },
        },
        select: {
            id: true,
            classId: true,
        },
    });

    if (
        students.length !== args.updates.length ||
        students.some((student) => student.classId !== args.classroomId)
    ) {
        return { ok: false, status: 404, message: "Student not found" };
    }

    const now = new Date();

    await deps.db.$transaction(
        args.updates.flatMap((update) => [
            deps.db.student.update({
                where: { id: update.studentId },
                data: { attendance: update.status },
            }),
            deps.db.attendanceRecord.create({
                data: {
                    studentId: update.studentId,
                    classId: args.classroomId,
                    status: update.status,
                    date: now,
                },
            }),
        ])
    );

    return {
        ok: true,
        classroomId: args.classroomId,
        savedCount: args.updates.length,
    };
}
