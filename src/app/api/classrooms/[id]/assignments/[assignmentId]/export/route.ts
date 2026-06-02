import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { db } from "@/lib/db";
import { isTeacherOrAdmin } from "@/lib/role-guards";
import { canUseLineFeature } from "@/lib/line-bot/plan-access";

function sanitizeFormulaString(value: string) {
    return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function escapeCsvValue(value: unknown) {
    const text =
        typeof value === "string"
            ? sanitizeFormulaString(value)
            : value == null
              ? ""
              : JSON.stringify(value);
    const sanitized = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${sanitized.replace(/"/g, "\"\"")}"`;
}

function safeFilenameSegment(value: string) {
    return value
        .trim()
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, " ")
        .slice(0, 80) || "untitled";
}

function parseSubmissionContent(content: string | null): {
    mode: string;
    text: string;
    submittedVia: string;
    aiStatus: string;
    aiSuggestedScore: number | "";
    aiMaxScore: number | "";
    aiConfidence: string;
    aiFeedback: string;
} {
    if (!content) {
        return {
            mode: "",
            text: "",
            submittedVia: "",
            aiStatus: "",
            aiSuggestedScore: "",
            aiMaxScore: "",
            aiConfidence: "",
            aiFeedback: "",
        };
    }

    try {
        const parsed = JSON.parse(content) as {
            mode?: unknown;
            text?: unknown;
            submittedVia?: unknown;
            aiPreliminaryGrading?: {
                status?: unknown;
                suggestedScore?: unknown;
                maxScore?: unknown;
                confidence?: unknown;
                feedback?: unknown;
            };
        };
        const ai = parsed.aiPreliminaryGrading;
        return {
            mode: typeof parsed.mode === "string" ? parsed.mode : "",
            text: typeof parsed.text === "string" ? parsed.text : content,
            submittedVia: typeof parsed.submittedVia === "string" ? parsed.submittedVia : "",
            aiStatus: typeof ai?.status === "string" ? ai.status : "",
            aiSuggestedScore: typeof ai?.suggestedScore === "number" ? ai.suggestedScore : "",
            aiMaxScore: typeof ai?.maxScore === "number" ? ai.maxScore : "",
            aiConfidence: typeof ai?.confidence === "string" ? ai.confidence : "",
            aiFeedback: typeof ai?.feedback === "string" ? ai.feedback : "",
        };
    } catch {
        return {
            mode: "raw",
            text: content,
            submittedVia: "",
            aiStatus: "",
            aiSuggestedScore: "",
            aiMaxScore: "",
            aiConfidence: "",
            aiFeedback: "",
        };
    }
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
    const session = await auth();
    const { id, assignmentId } = await params;

    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const assignment = await db.assignment.findUnique({
        where: { id: assignmentId },
        select: {
            id: true,
            classId: true,
            name: true,
            type: true,
            maxScore: true,
            deadline: true,
            classroom: {
                select: {
                    id: true,
                    name: true,
                    teacherId: true,
                    teacher: {
                        select: {
                            role: true,
                            plan: true,
                            planStatus: true,
                            planExpiry: true,
                        },
                    },
                    students: {
                        orderBy: { order: "asc" },
                        select: {
                            id: true,
                            name: true,
                            nickname: true,
                            loginCode: true,
                            order: true,
                        },
                    },
                },
            },
            submissions: {
                orderBy: { submittedAt: "desc" },
                select: {
                    id: true,
                    studentId: true,
                    score: true,
                    content: true,
                    submittedAt: true,
                    updatedAt: true,
                },
            },
        },
    });

    if (!assignment || assignment.classId !== id) {
        return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    if (assignment.classroom.teacherId !== session.user.id) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    if (!canUseLineFeature(assignment.classroom.teacher, "lineExport")) {
        return createAppErrorResponse(
            "PLAN_LIMIT_AI_FEATURE",
            "Assignment export for LINE workflows requires PLUS or School plan",
            403
        );
    }

    const submissionByStudent = new Map(assignment.submissions.map((submission) => [submission.studentId, submission]));
    const classroomSegment = safeFilenameSegment(assignment.classroom.name);
    const assignmentSegment = safeFilenameSegment(assignment.name);

    const header = [
        "classroomId",
        "classroomName",
        "assignmentId",
        "assignmentName",
        "assignmentType",
        "deadline",
        "studentId",
        "studentOrder",
        "studentName",
        "studentNickname",
        "loginCode",
        "submitted",
        "submissionId",
        "submittedAt",
        "updatedAt",
        "score",
        "maxScore",
        "submissionMode",
        "submittedVia",
        "answerText",
        "aiStatus",
        "aiSuggestedScore",
        "aiMaxScore",
        "aiConfidence",
        "aiFeedback",
        "archivePath",
    ];

    const rows = assignment.classroom.students.map((student) => {
        const submission = submissionByStudent.get(student.id) ?? null;
        const parsed = parseSubmissionContent(submission?.content ?? null);
        const archivePath = `${classroomSegment}/${assignmentSegment}/${safeFilenameSegment(
            `${student.name}-${student.loginCode}`
        )}/${submission ? "submission.txt" : "missing.txt"}`;

        return [
            assignment.classroom.id,
            assignment.classroom.name,
            assignment.id,
            assignment.name,
            assignment.type,
            assignment.deadline?.toISOString() ?? "",
            student.id,
            student.order,
            student.name,
            student.nickname ?? "",
            student.loginCode,
            Boolean(submission),
            submission?.id ?? "",
            submission?.submittedAt.toISOString() ?? "",
            submission?.updatedAt.toISOString() ?? "",
            submission?.score ?? "",
            assignment.maxScore,
            parsed.mode,
            parsed.submittedVia,
            parsed.text,
            parsed.aiStatus,
            parsed.aiSuggestedScore,
            parsed.aiMaxScore,
            parsed.aiConfidence,
            parsed.aiFeedback,
            archivePath,
        ].map(escapeCsvValue).join(",");
    });

    const csv = [`\uFEFF${header.map(escapeCsvValue).join(",")}`, ...rows].join("\n");
    const filename = `${safeFilenameSegment(assignment.name)}-submissions.csv`;

    return new NextResponse(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}
