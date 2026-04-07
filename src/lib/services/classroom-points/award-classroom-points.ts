import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { sendNotification } from "@/lib/notifications";
import { notifyNegamonRankUpIfNeeded } from "@/lib/negamon/negamon-rank-notify";
import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";

type ClassroomPointsDeps = {
    db: PrismaClient;
};

type ClassroomPointsContext = {
    classroomId: string;
    teacherId: string;
    skillId: string;
};

type StudentMembership = {
    id: string;
    classId: string;
    behaviorPoints: number;
    loginCode: string | null;
};

export type AwardSingleClassroomPointArgs = ClassroomPointsContext & {
    studentId: string;
};

export type AwardBatchClassroomPointsArgs = ClassroomPointsContext & {
    studentIds: string[];
};

export type ClassroomPointsResult =
    | { ok: false; status: 400 | 401 | 404; message: string }
    | {
        ok: true;
        skillWeight: number;
        classroomId: string;
        updatedStudents: Array<{
            id: string;
            behaviorPoints: number;
            loginCode: string | null;
        }>;
      };

async function getAuthorizedClassroom(
    classroomId: string,
    teacherId: string,
    deps: ClassroomPointsDeps
) {
    return deps.db.classroom.findUnique({
        where: {
            id: classroomId,
            teacherId,
        },
        select: {
            id: true,
            levelConfig: true,
            gamifiedSettings: true,
        },
    });
}

async function getSkill(skillId: string, deps: ClassroomPointsDeps) {
    return deps.db.skill.findUnique({
        where: { id: skillId },
    });
}

export async function awardSingleClassroomPoint(
    args: AwardSingleClassroomPointArgs,
    deps: ClassroomPointsDeps = { db }
): Promise<ClassroomPointsResult> {
    const classroom = await getAuthorizedClassroom(args.classroomId, args.teacherId, deps);
    if (!classroom) {
        return { ok: false, status: 401, message: AUTH_REQUIRED_MESSAGE };
    }

    const student = await deps.db.student.findUnique({
        where: { id: args.studentId },
        select: { id: true, classId: true, loginCode: true, behaviorPoints: true },
    });
    if (!student || student.classId !== classroom.id) {
        return { ok: false, status: 404, message: "Student not found" };
    }

    const skill = await getSkill(args.skillId, deps);
    if (!skill) {
        return { ok: false, status: 404, message: "Skill not found" };
    }

    const oldPoints = student.behaviorPoints;
    const updatedStudent = await deps.db.student.update({
        where: { id: student.id },
        data: {
            behaviorPoints: { increment: skill.weight },
            history: {
                create: {
                    skillId: skill.id,
                    reason: skill.name,
                    value: skill.weight,
                },
            },
        },
        select: {
            id: true,
            behaviorPoints: true,
            loginCode: true,
        },
    });

    await sendNotification({
        studentId: student.id,
        type: "POINT",
        link: `/student/${student.loginCode ?? updatedStudent.loginCode}`,
        i18n: {
            titleKey: skill.weight > 0 ? "notifPointsAwardedTitle" : "notifPointsDeductedTitle",
            messageKey: skill.weight > 0 ? "notifPointsAwardedBody" : "notifPointsDeductedBody",
            params: { weight: Math.abs(skill.weight), skill: skill.name },
        },
    });

    await notifyNegamonRankUpIfNeeded({
        studentId: student.id,
        loginCode: student.loginCode ?? updatedStudent.loginCode,
        oldPoints,
        newPoints: updatedStudent.behaviorPoints,
        levelConfig: classroom.levelConfig,
        gamifiedSettings: classroom.gamifiedSettings,
    });

    return {
        ok: true,
        classroomId: classroom.id,
        skillWeight: skill.weight,
        updatedStudents: [updatedStudent],
    };
}

export async function awardBatchClassroomPoints(
    args: AwardBatchClassroomPointsArgs,
    deps: ClassroomPointsDeps = { db }
): Promise<ClassroomPointsResult> {
    if (args.studentIds.length === 0) {
        return { ok: false, status: 400, message: "Missing data" };
    }

    const classroom = await getAuthorizedClassroom(args.classroomId, args.teacherId, deps);
    if (!classroom) {
        return { ok: false, status: 401, message: AUTH_REQUIRED_MESSAGE };
    }

    const students = await deps.db.student.findMany({
        where: {
            id: { in: args.studentIds },
        },
        select: {
            id: true,
            classId: true,
            behaviorPoints: true,
            loginCode: true,
        },
    });

    const validStudents = students.filter((student: StudentMembership) => student.classId === classroom.id);
    if (validStudents.length !== args.studentIds.length) {
        return { ok: false, status: 404, message: "One or more students were not found in this classroom" };
    }

    const skill = await getSkill(args.skillId, deps);
    if (!skill) {
        return { ok: false, status: 404, message: "Skill not found" };
    }

    const oldPointsById = new Map(validStudents.map((student) => [student.id, student.behaviorPoints] as const));

    await deps.db.$transaction(
        validStudents.map((student) =>
            deps.db.student.update({
                where: { id: student.id },
                data: {
                    behaviorPoints: { increment: skill.weight },
                    history: {
                        create: {
                            skillId: skill.id,
                            reason: skill.name,
                            value: skill.weight,
                        },
                    },
                },
            })
        )
    );

    const updatedStudents = await deps.db.student.findMany({
        where: { id: { in: validStudents.map((student) => student.id) } },
        select: { id: true, behaviorPoints: true, loginCode: true },
    });

    await Promise.all(
        validStudents.map((student) =>
            sendNotification({
                studentId: student.id,
                type: "POINT",
                i18n: {
                    titleKey:
                        skill.weight > 0
                            ? "notifPointsClassAwardedTitle"
                            : "notifPointsClassDeductedTitle",
                    messageKey:
                        skill.weight > 0
                            ? "notifPointsClassAwardedBody"
                            : "notifPointsClassDeductedBody",
                    params: {
                        weight: Math.abs(skill.weight),
                        skill: skill.name,
                    },
                },
            })
        )
    );

    const updatedById = new Map(updatedStudents.map((student) => [student.id, student] as const));
    await Promise.all(
        validStudents.map((student) => {
            const updated = updatedById.get(student.id);
            if (!updated) return Promise.resolve();
            return notifyNegamonRankUpIfNeeded({
                studentId: student.id,
                loginCode: updated.loginCode,
                oldPoints: oldPointsById.get(student.id) ?? 0,
                newPoints: updated.behaviorPoints,
                levelConfig: classroom.levelConfig,
                gamifiedSettings: classroom.gamifiedSettings,
            });
        })
    );

    return {
        ok: true,
        classroomId: classroom.id,
        skillWeight: skill.weight,
        updatedStudents,
    };
}
