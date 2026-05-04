import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import {
    classroomDashboardSelect,
    type ClassroomDashboardViewModel,
} from "./classroom-dashboard.types";

type ClassroomDashboardDeps = {
    db: PrismaClient;
};

export type ClassroomDashboardAccessResult =
    | { status: "not_found" }
    | { status: "forbidden" }
    | { status: "ok"; classroom: ClassroomDashboardViewModel };

export async function getClassroomDashboard(
    classroomId: string,
    deps: ClassroomDashboardDeps = { db }
): Promise<ClassroomDashboardViewModel | null> {
    const classroom = await deps.db.classroom.findUnique({
        where: {
            id: classroomId,
        },
        select: classroomDashboardSelect,
    });

    if (!classroom) {
        return null;
    }

    return {
        ...classroom,
        students: classroom.students.map((student) => ({
            ...student,
            battleLoadout: [],
        })),
    };
}

export async function getClassroomDashboardForTeacher(
    classroomId: string,
    teacherId: string,
    deps: ClassroomDashboardDeps = { db }
): Promise<ClassroomDashboardAccessResult> {
    const classroomOwner = await deps.db.classroom.findUnique({
        where: {
            id: classroomId,
        },
        select: {
            teacherId: true,
        },
    });

    if (!classroomOwner) {
        return { status: "not_found" };
    }

    if (classroomOwner.teacherId !== teacherId) {
        return { status: "forbidden" };
    }

    const classroom = await getClassroomDashboard(classroomId, deps);
    if (!classroom) {
        return { status: "not_found" };
    }

    return {
        status: "ok",
        classroom,
    };
}
