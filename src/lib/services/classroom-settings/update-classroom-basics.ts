import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { parseQuizReviewModeFromRequest } from "@/lib/quiz-review-policy";

export type ClassroomBasicUpdateInput = {
    name?: string;
    grade?: string | null;
    image?: string | null;
    emoji?: string | null;
    theme?: string | null;
    levelConfig?: Prisma.InputJsonValue | null;
    quizReviewMode?: string | null;
};

type UpdateClassroomBasicsArgs = {
    classroomId: string;
    teacherId: string;
    body: ClassroomBasicUpdateInput;
};

type UpdateClassroomBasicsDeps = {
    db: PrismaClient;
};

export class InvalidClassroomBasicUpdateError extends Error {
    constructor(message = "Invalid classroom update") {
        super(message);
        this.name = "InvalidClassroomBasicUpdateError";
    }
}

export function buildClassroomBasicUpdateData(
    body: ClassroomBasicUpdateInput
): ClassroomBasicUpdateInput {
    const updateData: ClassroomBasicUpdateInput = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.grade !== undefined) updateData.grade = body.grade;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.emoji !== undefined) updateData.emoji = body.emoji;
    if (body.theme !== undefined) updateData.theme = body.theme;
    if (body.levelConfig !== undefined) updateData.levelConfig = body.levelConfig;

    if (body.quizReviewMode !== undefined) {
        const parsed = parseQuizReviewModeFromRequest(body.quizReviewMode);
        if (!parsed.ok) {
            throw new InvalidClassroomBasicUpdateError("Invalid quizReviewMode");
        }
        if (parsed.value !== undefined) {
            updateData.quizReviewMode = parsed.value;
        }
    }

    return updateData;
}

export async function updateClassroomBasics(
    args: UpdateClassroomBasicsArgs,
    deps: UpdateClassroomBasicsDeps = { db }
) {
    const updateData = buildClassroomBasicUpdateData(args.body);

    return deps.db.classroom.update({
        where: {
            id: args.classroomId,
            teacherId: args.teacherId,
        },
        data: updateData,
    });
}
