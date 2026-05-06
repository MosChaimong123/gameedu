import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DEFAULT_LEVEL_CONFIG } from "@/lib/classroom-utils";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { getLimitsForUser } from "@/lib/plan/plan-access";
import { isTeacherOrAdmin } from "@/lib/role-guards";

export async function GET() {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const classrooms = await db.classroom.findMany({
            where: {
                teacherId: session.user.id as string
            },
            include: {
                _count: {
                    select: { students: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(classrooms);
    } catch (error) {
        console.error("[CLASSROOMS_GET]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

export async function POST(req: Request) {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const body = await req.json();
        const { name, grade, image } = body;

        if (!name) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Name is required", 400);
        }

        const limits = getLimitsForUser(
            session.user.role,
            session.user.plan,
            session.user.planStatus,
            session.user.planExpiry
        );
        if (Number.isFinite(limits.maxClassrooms)) {
            const n = await db.classroom.count({
                where: { teacherId: session.user.id as string },
            });
            if (n >= limits.maxClassrooms) {
                return createAppErrorResponse(
                    "PLAN_LIMIT_CLASSROOMS",
                    "Classroom limit reached for your plan",
                    403
                );
            }
        }

        // Create Classroom
        const classroom = await db.classroom.create({
            data: {
                name,
                grade,
                image,
                teacherId: session.user.id as string,
                levelConfig: DEFAULT_LEVEL_CONFIG,
                // Add default skills
                skills: {
                    create: [
                        { name: "Helping others", weight: 1, type: "POSITIVE", icon: "help" },
                        { name: "On task", weight: 1, type: "POSITIVE", icon: "task" },
                        { name: "Participating", weight: 1, type: "POSITIVE", icon: "hand" },
                        { name: "Persistence", weight: 1, type: "POSITIVE", icon: "muscle" },
                        { name: "Teamwork", weight: 1, type: "POSITIVE", icon: "team" },
                        { name: "Working hard", weight: 1, type: "POSITIVE", icon: "brain" },
                    ]
                }
            }
        });

        return NextResponse.json(classroom);
    } catch (error) {
        console.error("[CLASSROOMS_POST]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
