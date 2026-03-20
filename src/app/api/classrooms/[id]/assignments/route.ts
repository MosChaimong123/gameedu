import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { sendNotification } from "@/lib/notifications";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const resolvedParams = await params;

    if (!session || !session.user || !session.user.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, description, maxScore, type, checklists, passScore, deadline, quizSetId } = body;

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        const classroom = await db.classroom.findUnique({
            where: { id: resolvedParams.id },
            include: { 
                assignments: { select: { id: true } },
                students: { select: { id: true, loginCode: true } }
            }
        });

        if (!classroom || classroom.teacherId !== session.user.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        let quizData = body.quizData || null;

        // If a Question Set is linked, we snapshot its questions for stability
        if (quizSetId && type === "quiz") {
            const questionSet = await db.questionSet.findUnique({
                where: { id: quizSetId },
                select: { questions: true }
            });
            if (questionSet) {
                quizData = { questions: questionSet.questions };
            }
        }

        const assignment = await db.assignment.create({
            data: {
                classId: classroom.id,
                name,
                description,
                maxScore: maxScore || 10,
                type: type || "score",
                checklists: checklists || [],
                passScore: passScore ?? null,
                deadline: deadline ? new Date(deadline) : null,
                quizSetId: quizSetId || null,
                quizData,
                order: classroom.assignments.length
            } as any
        });

        // Notify all students
        await Promise.all(
            classroom.students.map((student: any) => 
                sendNotification({
                    studentId: student.id,
                    title: "มีงานใหม่!",
                    message: `คุณได้รับงานใหม่: ${name}`,
                    type: "ASSIGNMENT",
                    link: `/student/${student.loginCode}`
                })
            )
        );

        return NextResponse.json(assignment);
    } catch (error) {
        console.error("[ASSIGNMENTS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const resolvedParams = await params;

    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const classroom = await db.classroom.findUnique({
            where: { id: resolvedParams.id, teacherId: session.user.id }
        });

        if (!classroom) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const items: { id: string; order: number }[] = await req.json();

        await Promise.all(
            items.map((item: any) =>
                db.assignment.update({
                    where: { id: item.id },
                    data: { order: item.order }
                })
            )
        );

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[ASSIGNMENTS_REORDER]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

