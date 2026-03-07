import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        return new NextResponse("Unauthorized", { status: 401 });
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
        return new NextResponse("Unauthorized", { status: 401 });
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
