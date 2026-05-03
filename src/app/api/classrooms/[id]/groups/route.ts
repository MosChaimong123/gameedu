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

type GroupEntry = {
    name: string
    studentIds: string[]
};

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
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

        const groups = await db.studentGroup.findMany({
            where: {
                classId: id,
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json(groups);
    } catch (error) {
        console.error("[GROUPS_GET]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const body = await req.json() as { name?: string; groups?: GroupEntry[] };
        const { name, groups } = body;

        if (!name || !groups || !Array.isArray(groups)) {
             return createAppErrorResponse("INVALID_PAYLOAD", "Missing data", 400);
        }

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

        const requestedStudentIds = groups.flatMap((group) => group.studentIds);
        if (requestedStudentIds.length > 0) {
            const students = await db.student.findMany({
                where: {
                    id: {
                        in: requestedStudentIds,
                    },
                },
                select: {
                    id: true,
                    classId: true,
                },
            });

            if (students.length !== requestedStudentIds.length || students.some((student) => student.classId !== id)) {
                return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
            }
        }

        const groupRecord = await db.studentGroup.create({
            data: {
                name,
                classId: id,
                studentIds: groups.map((group) => JSON.stringify({ name: group.name, studentIds: group.studentIds }))
            }
        });

        return NextResponse.json([groupRecord]);
    } catch (error) {
        console.error("[GROUPS_POST]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
