import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { generateStudentLoginCode } from "@/lib/student-login-code";
import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";

type StudentCreateInput = {
    name: string
    nickname?: string | null
    avatar?: string | null
};

type StudentOrderInput = {
    id: string
    order: number
};

async function generateUniqueStudentLoginCodes(count: number) {
    const codes = new Set<string>();

    while (codes.size < count) {
        codes.add(generateStudentLoginCode());
    }

    while (true) {
        const existing = await db.student.findMany({
            where: {
                loginCode: {
                    in: [...codes],
                },
            },
            select: {
                loginCode: true,
            },
        });

        if (existing.length === 0) {
            return [...codes];
        }

        existing.forEach(({ loginCode }) => {
            codes.delete(loginCode);
        });

        while (codes.size < count) {
            codes.add(generateStudentLoginCode());
        }
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
    }

    try {
        const body = await req.json() as { students?: StudentCreateInput[] };
        const { students } = body;

        if (!students || !Array.isArray(students)) {
            return new NextResponse("Invalid data", { status: 400 });
        }

        const classroom = await db.classroom.findUnique({
            where: { id, teacherId: session.user.id },
            include: { students: true }
        });

        if (!classroom) {
            return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
        }

        const startOrder = classroom.students.length;
        const loginCodes = await generateUniqueStudentLoginCodes(students.length);

        await db.student.createMany({
            data: students.map((s, i: number) => ({
                name: s.name,
                nickname: s.nickname || null,
                classId: id,
                avatar: s.avatar || Math.floor(Math.random() * 1000).toString(),
                loginCode: loginCodes[i],
                order: startOrder + i,
            }))
        });

        const createdStudents = await db.student.findMany({
            where: {
                classId: id,
                loginCode: {
                    in: loginCodes,
                },
            },
            orderBy: {
                order: "asc",
            },
        });

        return NextResponse.json(createdStudents);
    } catch (error) {
        console.error("[STUDENTS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });

    try {
        const classroom = await db.classroom.findUnique({ where: { id, teacherId: session.user.id } });
        if (!classroom) return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });

        const items = await req.json() as StudentOrderInput[];
        const students = await db.student.findMany({
            where: {
                id: {
                    in: items.map((item) => item.id),
                },
            },
            select: {
                id: true,
                classId: true,
            },
        });

        if (students.length !== items.length || students.some((student) => student.classId !== id)) {
            return new NextResponse("Student not found", { status: 404 });
        }

        await Promise.all(
            items.map((item) =>
                db.student.update({ where: { id: item.id }, data: { order: item.order } })
            )
        );

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[STUDENTS_REORDER]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

