import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DEFAULT_LEVEL_CONFIG } from "@/lib/classroom-utils";
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error";

function canManageClassrooms(role?: string | null) {
    return role === "TEACHER" || role === "ADMIN";
}

export async function GET() {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
    }

    if (!canManageClassrooms(session.user.role)) {
        return new NextResponse(FORBIDDEN_MESSAGE, { status: 403 });
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
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
    }

    if (!canManageClassrooms(session.user.role)) {
        return new NextResponse(FORBIDDEN_MESSAGE, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, grade, image } = body;

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
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
        return new NextResponse("Internal Error", { status: 500 });
    }
}
