import type { Prisma } from "@prisma/client";

export const classroomDashboardSelect = {
    id: true,
    teacherId: true,
    name: true,
    emoji: true,
    image: true,
    theme: true,
    grade: true,
    gamifiedSettings: true,
    levelConfig: true,
    quizReviewMode: true,
    createdAt: true,
    updatedAt: true,
    students: {
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            nickname: true,
            avatar: true,
            attendance: true,
            behaviorPoints: true,
            gold: true,
            lastGoldAt: true,
            lastCheckIn: true,
            streak: true,
            inventory: true,
            equippedFrame: true,
            negamonSkills: true,
            order: true,
            classId: true,
            userId: true,
            loginCode: true,
            createdAt: true,
            updatedAt: true,
            submissions: {
                select: {
                    id: true,
                    assignmentId: true,
                    studentId: true,
                    score: true,
                    content: true,
                    cheatingLogs: true,
                    submittedAt: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
        },
    },
    skills: {
        select: {
            id: true,
            name: true,
            description: true,
            type: true,
            weight: true,
            icon: true,
            classId: true,
        },
    },
    assignments: {
        orderBy: { order: "asc" },
        select: {
            id: true,
            name: true,
            description: true,
            visible: true,
            type: true,
            checklists: true,
            quizData: true,
            maxScore: true,
            passScore: true,
            deadline: true,
            order: true,
            classId: true,
            quizSetId: true,
            quizReviewMode: true,
            createdAt: true,
            updatedAt: true,
        },
    },
} satisfies Prisma.ClassroomSelect;

type ClassroomDashboardBaseViewModel = Prisma.ClassroomGetPayload<{
    select: typeof classroomDashboardSelect;
}>;

export type ClassroomDashboardViewModel = Omit<ClassroomDashboardBaseViewModel, "students"> & {
    students: Array<ClassroomDashboardBaseViewModel["students"][number] & { battleLoadout: string[] }>;
};
