import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

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
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const groups = await db.studentGroup.findMany({
            where: {
                classId: id,
                classroom: {
                    teacherId: session.user.id
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(groups);
    } catch (error) {
        console.error("[GROUPS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json() as { name?: string; groups?: GroupEntry[] };
        const { name, groups } = body;

        if (!name || !groups || !Array.isArray(groups)) {
             return new NextResponse("Missing data", { status: 400 });
        }

        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });

        if (!classroom) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Store the entire set of groups as a single record
        // By stringifying the objects, we avoid a Prisma schema change. 
        const groupRecord = await db.studentGroup.create({
            data: {
                name: name,
                classId: id,
                studentIds: groups.map((group) => JSON.stringify({ name: group.name, studentIds: group.studentIds }))
            }
        });

        return NextResponse.json([groupRecord]);

    } catch (error) {
        console.error("[GROUPS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
