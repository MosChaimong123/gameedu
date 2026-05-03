import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { sendNotification } from "@/lib/notifications";
import { parseQuizReviewModeFromRequest } from "@/lib/quiz-review-policy";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { isTeacherOrAdmin } from "@/lib/role-guards";

type AssignmentChecklist = {
    text?: string;
    points?: number;
};

type AssignmentRequestBody = {
    name?: string;
    description?: string | null;
    maxScore?: number;
    type?: string;
    checklists?: AssignmentChecklist[];
    passScore?: number | null;
    deadline?: string | null;
    quizSetId?: string | null;
    quizData?: unknown;
    quizReviewMode?: string | null;
};

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const resolvedParams = await params;

    if (!session || !session.user || !session.user.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const body = await req.json() as AssignmentRequestBody;
        const { name, description, maxScore, type, checklists, passScore, deadline, quizSetId } = body;

        if (!name) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Name is required", 400);
        }

        if (type === "quiz" && !quizSetId) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Quiz requires a question set", 400);
        }

        const classroom = await db.classroom.findUnique({
            where: { id: resolvedParams.id },
            include: {
                assignments: { select: { id: true } },
                students: { select: { id: true, loginCode: true } }
            }
        });

        if (!classroom || classroom.teacherId !== session.user.id) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        let quizData = body.quizData || null;

        if (quizSetId && type === "quiz") {
            const questionSet = await db.questionSet.findUnique({
                where: { id: quizSetId },
                select: { questions: true, creatorId: true }
            });
            if (!questionSet || questionSet.creatorId !== session.user.id) {
                return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
            }
            quizData = { questions: questionSet.questions };
        }

        const effectiveType = String(type || "score").toLowerCase();
        let quizReviewMode: string | null | undefined;
        if (effectiveType === "quiz" && body.quizReviewMode !== undefined) {
            const parsed = parseQuizReviewModeFromRequest(body.quizReviewMode);
            if (!parsed.ok) {
                return createAppErrorResponse("INVALID_PAYLOAD", "Invalid quizReviewMode", 400);
            }
            quizReviewMode = parsed.value === undefined ? null : parsed.value;
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
                order: classroom.assignments.length,
                ...(effectiveType === "quiz" && quizReviewMode !== undefined
                    ? { quizReviewMode }
                    : {}),
            }
        });

        const assignmentType = String(assignment.type || type || "score").toLowerCase();
        const notifyLink =
            assignmentType === "quiz"
                ? (student: { loginCode: string }) =>
                      `/student/${student.loginCode}/quiz/${assignment.id}`
                : (student: { loginCode: string }) => `/student/${student.loginCode}`;

        const dueStr = assignment.deadline
            ? assignment.deadline.toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
              })
            : null;

        await Promise.all(
            classroom.students.map((student) =>
                sendNotification({
                    studentId: student.id,
                    type: "ASSIGNMENT",
                    link: notifyLink(student),
                    i18n: dueStr
                        ? {
                              titleKey: "notifNewAssignmentTitle",
                              messageKey: "notifNewAssignmentBodyDue",
                              params: { name, due: dueStr },
                          }
                        : {
                              titleKey: "notifNewAssignmentTitle",
                              messageKey: "notifNewAssignmentBody",
                              params: { name },
                          },
                })
            )
        );

        return NextResponse.json(assignment);
    } catch (error) {
        console.error("[ASSIGNMENTS_POST]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const resolvedParams = await params;

    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const classroom = await db.classroom.findUnique({
            where: { id: resolvedParams.id, teacherId: session.user.id }
        });

        if (!classroom) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        const items = await req.json() as Array<{ id: string; order: number }>;
        const assignments = await db.assignment.findMany({
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

        if (assignments.length !== items.length || assignments.some((assignment) => assignment.classId !== resolvedParams.id)) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        await Promise.all(
            items.map((item) =>
                db.assignment.update({
                    where: { id: item.id },
                    data: { order: item.order }
                })
            )
        );

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[ASSIGNMENTS_REORDER]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
