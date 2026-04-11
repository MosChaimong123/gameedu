import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { parseQuizReviewModeFromRequest } from "@/lib/quiz-review-policy";
import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string, assignmentId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;

        if (!session?.user?.id) {
            return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
        }

        const classroom = await db.classroom.findUnique({
            where: { id: resolvedParams.id, teacherId: session.user.id }
        });

        if (!classroom) {
            return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
        }

        const body = (await req.json()) as Record<string, unknown>;
        const existingAssignment = await db.assignment.findUnique({
            where: { id: resolvedParams.assignmentId },
            select: { id: true, classId: true, type: true, quizSetId: true },
        });

        if (!existingAssignment || existingAssignment.classId !== resolvedParams.id) {
            return new NextResponse("Assignment Not Found", { status: 404 });
        }

        const explicitType = typeof body.type === "string" ? body.type : undefined;

        if (explicitType === "quiz") {
            const incomingSet =
                typeof body.quizSetId === "string" && body.quizSetId.length > 0
                    ? body.quizSetId
                    : null;
            if (!incomingSet && !existingAssignment.quizSetId) {
                return new NextResponse("Quiz requires a question set", { status: 400 });
            }
        }

        const effectiveType = explicitType ?? existingAssignment.type;

        type PatchData = Parameters<typeof db.assignment.update>[0]["data"];
        const data: PatchData = {};

        if (typeof body.name === "string") data.name = body.name;
        if (typeof body.maxScore === "number") data.maxScore = body.maxScore;
        if (body.passScore !== undefined) {
            data.passScore =
                body.passScore === null || body.passScore === ""
                    ? null
                    : Number(body.passScore);
        }
        if (typeof body.type === "string") data.type = body.type;
        if (body.checklists !== undefined) data.checklists = body.checklists as PatchData["checklists"];
        if (typeof body.visible === "boolean") data.visible = body.visible;
        if (typeof body.order === "number") data.order = body.order;
        if (body.description !== undefined) {
            data.description =
                body.description === null || body.description === ""
                    ? null
                    : String(body.description);
        }
        if (body.deadline !== undefined) {
            data.deadline =
                body.deadline === null || body.deadline === ""
                    ? null
                    : new Date(String(body.deadline));
        }

        if (
            explicitType === "score" ||
            explicitType === "checklist" ||
            explicitType === "standard"
        ) {
            data.quizSetId = null;
            data.quizData = null;
            data.quizReviewMode = null;
        }

        if (effectiveType === "quiz" && body.quizReviewMode !== undefined) {
            const parsed = parseQuizReviewModeFromRequest(body.quizReviewMode);
            if (!parsed.ok) {
                return new NextResponse("Invalid quizReviewMode", { status: 400 });
            }
            if (parsed.value !== undefined) {
                data.quizReviewMode = parsed.value;
            }
        }

        if (effectiveType === "quiz" && typeof body.quizSetId === "string" && body.quizSetId.length > 0) {
            const questionSet = await db.questionSet.findUnique({
                where: { id: body.quizSetId },
                select: { questions: true, creatorId: true },
            });
            if (!questionSet || questionSet.creatorId !== session.user.id) {
                return new NextResponse("Question set not found", { status: 404 });
            }
            data.quizSetId = body.quizSetId;
            data.quizData = { questions: questionSet.questions };
        }

        if (Object.keys(data).length === 0) {
            const unchanged = await db.assignment.findUnique({
                where: { id: resolvedParams.assignmentId },
            });
            return NextResponse.json(unchanged);
        }

        const assignment = await db.assignment.update({
            where: { id: resolvedParams.assignmentId },
            data,
        });

        return NextResponse.json(assignment);
    } catch (error) {
        console.error("[ASSIGNMENT_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string, assignmentId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;

        if (!session?.user?.id) {
            return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
        }

        const classroom = await db.classroom.findUnique({
            where: {
                id: resolvedParams.id,
                teacherId: session.user.id
            }
        });

        if (!classroom) {
            return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
        }

        const assignment = await db.assignment.findUnique({
             where: { id: resolvedParams.assignmentId },
             select: { id: true, classId: true },
        });

        if (!assignment || assignment.classId !== resolvedParams.id) {
             return new NextResponse("Assignment Not Found", { status: 404 });
        }

        await db.assignment.delete({
            where: {
                id: resolvedParams.assignmentId,
            }
        });

        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error("[ASSIGNMENT_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
