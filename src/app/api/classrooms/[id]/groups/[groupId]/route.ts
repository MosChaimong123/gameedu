import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { isTeacherOrAdmin } from "@/lib/role-guards";

type StudentGroupPatchData = {
    name?: string
    studentIds?: string[]
};

function extractReferencedStudentIds(rawStudentIds: string[]): string[] | null {
    const referencedIds: string[] = [];

    for (const rawEntry of rawStudentIds) {
        if (typeof rawEntry !== "string" || rawEntry.trim().length === 0) {
            return null;
        }

        const trimmedEntry = rawEntry.trim();
        if (!trimmedEntry.startsWith("{") && !trimmedEntry.startsWith("[")) {
            referencedIds.push(trimmedEntry);
            continue;
        }

        try {
            const parsed = JSON.parse(trimmedEntry) as { studentIds?: unknown } | unknown[];

            if (Array.isArray(parsed)) {
                if (!parsed.every((studentId) => typeof studentId === "string" && studentId.trim().length > 0)) {
                    return null;
                }
                referencedIds.push(...parsed.map((studentId) => studentId.trim()));
                continue;
            }

            if (
                !parsed ||
                !Array.isArray(parsed.studentIds) ||
                !parsed.studentIds.every((studentId) => typeof studentId === "string" && studentId.trim().length > 0)
            ) {
                return null;
            }

            referencedIds.push(...parsed.studentIds.map((studentId) => studentId.trim()));
        } catch {
            return null;
        }
    }

    return referencedIds;
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string, groupId: string }> }
) {
    const { id, groupId } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            },
            select: { id: true },
        });

        if (!classroom) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        const group = await db.studentGroup.findUnique({
            where: {
                id: groupId,
                classId: id
            }
        });

        if (!group) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        await db.studentGroup.delete({
            where: { id: groupId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[GROUP_DELETE]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string, groupId: string }> }
) {
    const { id, groupId } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const body = await req.json() as StudentGroupPatchData;
        const { name, studentIds } = body;

        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            },
            select: { id: true },
        });

        if (!classroom) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        const group = await db.studentGroup.findUnique({
            where: {
                id: groupId,
                classId: id
            }
        });

        if (!group) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        const updatedData: StudentGroupPatchData = {};
        if (name !== undefined) updatedData.name = name;
        if (studentIds !== undefined) {
            const referencedStudentIds = extractReferencedStudentIds(studentIds);
            if (!referencedStudentIds) {
                return createAppErrorResponse("INVALID_PAYLOAD", "Missing data", 400);
            }

            const uniqueReferencedStudentIds = [...new Set(referencedStudentIds)];
            const students = await db.student.findMany({
                where: {
                    id: {
                        in: uniqueReferencedStudentIds,
                    },
                },
                select: {
                    id: true,
                    classId: true,
                },
            });

            if (
                students.length !== uniqueReferencedStudentIds.length ||
                students.some((student) => student.classId !== id)
            ) {
                return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
            }

            updatedData.studentIds = studentIds;
        }

        const updatedGroup = await db.studentGroup.update({
            where: { id: groupId },
            data: updatedData
        });

        return NextResponse.json(updatedGroup);
    } catch (error) {
        console.error("[GROUP_PATCH]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
