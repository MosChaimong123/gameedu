import { randomInt } from "node:crypto";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { db, getOptionalDbModel } from "@/lib/db";

export const LINE_STUDENT_LINK_CODE_LENGTH = 6;
export const LINE_STUDENT_LINK_CODE_TTL_MINUTES = 10;

const DIRECT_LINE_GROUP_PREFIX = "direct:";

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
    deleteMany(input: {
        where: {
            classroomId?: string;
            studentId?: string;
            OR?: Array<{
                classroomId: string;
                studentId?: string;
                lineUserId?: string;
            }>;
        };
    }): Promise<unknown>;
};

type StudentLineLinkTarget = {
    studentId: string;
    studentName: string;
    studentLoginCode: string;
    classroomId: string;
    classroomName: string;
};

export type StudentLineLinkSnapshot =
    | {
          linked: true;
          studentName: string;
          classroomName: string;
          linkedAt: string;
      }
    | {
          linked: false;
          studentName: string;
          classroomName: string;
          code: string;
          commandText: string;
          expiresAt: string;
      };

export type StudentLineLinkSnapshotResult =
    | { ok: true; snapshot: StudentLineLinkSnapshot }
    | { ok: false; reason: "NOT_FOUND" | "FORBIDDEN" };

export type ConsumeStudentLineLinkCodeResult =
    | {
          ok: true;
          link: {
              studentName: string;
              classroomName: string;
              linkedAt: string;
          };
      }
    | { ok: false; reason: "NOT_FOUND" | "EXPIRED" };

export async function getStudentLineLinkSnapshot(input: {
    userId: string;
    loginCode: string;
    now?: Date;
}): Promise<StudentLineLinkSnapshotResult> {
    const now = input.now ?? new Date();
    const target = await resolveStudentLineLinkTarget(input.loginCode);
    if (!target) {
        return { ok: false, reason: "NOT_FOUND" };
    }
    if (!target.userId || target.userId !== input.userId) {
        return { ok: false, reason: "FORBIDDEN" };
    }

    const existingLink = await db.lineStudentAccountLink.findUnique({
        where: {
            userId_classroomId: {
                userId: input.userId,
                classroomId: target.classroomId,
            },
        },
        select: {
            createdAt: true,
        },
    });

    if (existingLink) {
        return {
            ok: true,
            snapshot: {
                linked: true,
                studentName: target.studentName,
                classroomName: target.classroomName,
                linkedAt: existingLink.createdAt.toISOString(),
            },
        };
    }

    const codeRow = await getOrCreateActiveStudentLineLinkCode({
        userId: input.userId,
        studentId: target.studentId,
        classroomId: target.classroomId,
        studentLoginCode: target.studentLoginCode,
        now,
    });

    return {
        ok: true,
        snapshot: {
            linked: false,
            studentName: target.studentName,
            classroomName: target.classroomName,
            code: codeRow.code,
            commandText: buildStudentLineLinkCommand(codeRow.code),
            expiresAt: codeRow.expiresAt.toISOString(),
        },
    };
}

export async function consumeStudentLineLinkCode(input: {
    lineUserId: string;
    code: string;
    now?: Date;
}): Promise<ConsumeStudentLineLinkCodeResult> {
    const now = input.now ?? new Date();
    const codeRow = await db.lineStudentLinkCode.findUnique({
        where: { code: input.code.trim() },
        select: {
            id: true,
            userId: true,
            studentId: true,
            classroomId: true,
            studentLoginCode: true,
            expiresAt: true,
            consumedAt: true,
        },
    });

    if (!codeRow) {
        return { ok: false, reason: "NOT_FOUND" };
    }
    if (codeRow.consumedAt || codeRow.expiresAt.getTime() <= now.getTime()) {
        return { ok: false, reason: "EXPIRED" };
    }

    const student = await db.student.findUnique({
        where: { id: codeRow.studentId },
        select: {
            id: true,
            name: true,
            classroom: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    if (!student?.classroom || student.classroom.id !== codeRow.classroomId) {
        return { ok: false, reason: "NOT_FOUND" };
    }

    const directLineGroupId = `${DIRECT_LINE_GROUP_PREFIX}${input.lineUserId}`;
    const bindingModel = getOptionalDbModel<LineStudentBindingModel>("lineStudentBinding");

    await db.$transaction(async (tx) => {
        await tx.lineStudentAccountLink.deleteMany({
            where: {
                OR: [
                    {
                        userId: codeRow.userId,
                        classroomId: codeRow.classroomId,
                    },
                    {
                        lineUserId: input.lineUserId,
                        classroomId: codeRow.classroomId,
                    },
                ],
            },
        });

        await tx.lineStudentAccountLink.create({
            data: {
                userId: codeRow.userId,
                studentId: codeRow.studentId,
                classroomId: codeRow.classroomId,
                lineUserId: input.lineUserId,
                studentLoginCode: codeRow.studentLoginCode,
            },
        });

        await tx.lineStudentLinkCode.update({
            where: { id: codeRow.id },
            data: {
                consumedAt: now,
                lineUserId: input.lineUserId,
            },
        });
    });

    if (bindingModel) {
        await bindingModel.deleteMany({
            where: {
                OR: [
                    {
                        classroomId: codeRow.classroomId,
                        studentId: codeRow.studentId,
                    },
                    {
                        classroomId: codeRow.classroomId,
                        lineUserId: input.lineUserId,
                    },
                ],
            },
        });

        await bindingModel.upsert({
            where: {
                lineUserId_classroomId: {
                    lineUserId: input.lineUserId,
                    classroomId: codeRow.classroomId,
                },
            },
            create: {
                lineUserId: input.lineUserId,
                lineGroupId: directLineGroupId,
                classroomId: codeRow.classroomId,
                studentId: codeRow.studentId,
                studentLoginCode: codeRow.studentLoginCode,
            },
            update: {
                lineGroupId: directLineGroupId,
                studentId: codeRow.studentId,
                studentLoginCode: codeRow.studentLoginCode,
            },
        });
    }

    return {
        ok: true,
        link: {
            studentName: student.name,
            classroomName: student.classroom.name,
            linkedAt: now.toISOString(),
        },
    };
}

export function buildStudentLineLinkCommand(code: string): string {
    return `เชื่อม ${code}`;
}

async function getOrCreateActiveStudentLineLinkCode(input: {
    userId: string;
    studentId: string;
    classroomId: string;
    studentLoginCode: string;
    now: Date;
}) {
    const active = await db.lineStudentLinkCode.findFirst({
        where: {
            userId: input.userId,
            classroomId: input.classroomId,
            consumedAt: null,
            expiresAt: { gt: input.now },
        },
        orderBy: { createdAt: "desc" },
        select: {
            code: true,
            expiresAt: true,
        },
    });

    if (active) {
        return active;
    }

    return createUniqueStudentLineLinkCode(input);
}

async function createUniqueStudentLineLinkCode(input: {
    userId: string;
    studentId: string;
    classroomId: string;
    studentLoginCode: string;
    now: Date;
}) {
    const expiresAt = new Date(input.now.getTime() + LINE_STUDENT_LINK_CODE_TTL_MINUTES * 60 * 1000);

    for (let attempt = 0; attempt < 8; attempt += 1) {
        const code = generateStudentLineLinkCode();
        try {
            return await db.lineStudentLinkCode.create({
                data: {
                    userId: input.userId,
                    studentId: input.studentId,
                    classroomId: input.classroomId,
                    studentLoginCode: input.studentLoginCode,
                    code,
                    expiresAt,
                },
                select: {
                    code: true,
                    expiresAt: true,
                },
            });
        } catch (error) {
            if (!isUniqueCodeError(error)) {
                throw error;
            }
        }
    }

    throw new Error("Could not allocate a unique LINE link code");
}

function generateStudentLineLinkCode(): string {
    return String(randomInt(0, 10 ** LINE_STUDENT_LINK_CODE_LENGTH)).padStart(
        LINE_STUDENT_LINK_CODE_LENGTH,
        "0"
    );
}

function isUniqueCodeError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
    );
}

async function resolveStudentLineLinkTarget(
    loginCode: string
): Promise<(StudentLineLinkTarget & { userId: string | null }) | null> {
    const student = await db.student.findFirst({
        where: {
            OR: getStudentLoginCodeVariants(loginCode).map((candidate) => ({
                loginCode: candidate,
            })),
        },
        select: {
            id: true,
            name: true,
            loginCode: true,
            userId: true,
            classroom: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    if (!student?.classroom) {
        return null;
    }

    return {
        userId: student.userId ?? null,
        studentId: student.id,
        studentName: student.name,
        studentLoginCode: student.loginCode,
        classroomId: student.classroom.id,
        classroomName: student.classroom.name,
    };
}
