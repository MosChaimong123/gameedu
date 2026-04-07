import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    try {
        const skills = await db.skill.findMany({
            where: {
                classId: id,
                classroom: {
                    teacherId: session.user.id
                }
            }
        });

        return NextResponse.json(skills);
    } catch (error) {
        console.error("[SKILLS_GET]", error);
        return createAppErrorResponse("INTERNAL_ERROR", "Internal Error", 500);
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

    try {
        const body = await req.json();
        const { name, weight, type, icon } = body;

        if (!name || weight === undefined || !type || !icon) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Missing required fields", 400);
        }

        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });

        if (!classroom) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        const skill = await db.skill.create({
            data: {
                name,
                weight: Number(weight),
                type,
                icon,
                classId: id
            }
        });

        return NextResponse.json(skill);

    } catch (error) {
        console.error("[SKILL_POST]", error);
        return createAppErrorResponse("INTERNAL_ERROR", "Internal Error", 500);
    }
}
