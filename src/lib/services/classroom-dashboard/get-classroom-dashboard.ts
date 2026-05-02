import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import {
    classroomDashboardSelect,
    type ClassroomDashboardViewModel,
} from "./classroom-dashboard.types";

type ClassroomDashboardDeps = {
    db: PrismaClient;
};

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
