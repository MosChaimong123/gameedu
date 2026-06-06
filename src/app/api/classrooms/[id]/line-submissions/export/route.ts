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
              : String(value);
    const sanitized = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${sanitized.replace(/"/g, '""')}"`;
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
    aiReviewStatus: string;
    aiReviewScore: number | "";
    aiReviewedAt: string;
    aiReviewedBy: string;
} {
    const empty = {
        mode: "",
        text: "",
        submittedVia: "",
        aiStatus: "",
        aiSuggestedScore: "" as const,
        aiMaxScore: "" as const,
        aiConfidence: "",
        aiFeedback: "",
        aiReviewStatus: "",
        aiReviewScore: "" as const,
        aiReviewedAt: "",
        aiReviewedBy: "",
    };

    if (!content) return empty;

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
            aiPreliminaryReview?: {
                status?: unknown;
                score?: unknown;
                reviewedAt?: unknown;
                reviewedBy?: unknown;
            };
        };
        const ai = parsed.aiPreliminaryGrading;
        const rev = parsed.aiPreliminaryReview;
        return {
            mode: typeof parsed.mode === "string" ? parsed.mode : "",
            text: typeof parsed.text === "string" ? parsed.text : content,
            submittedVia: typeof parsed.submittedVia === "string" ? parsed.submittedVia : "",
            aiStatus: typeof ai?.status === "string" ? ai.status : "",
            aiSuggestedScore: typeof ai?.suggestedScore === "number" ? ai.suggestedScore : "",
            aiMaxScore: typeof ai?.maxScore === "number" ? ai.maxScore : "",
            aiConfidence: typeof ai?.confidence === "string" ? ai.confidence : "",
            aiFeedback: typeof ai?.feedback === "string" ? ai.feedback : "",
            aiReviewStatus: typeof rev?.status === "string" ? rev.status : "",
            aiReviewScore: typeof rev?.score === "number" ? rev.score : "",
            aiReviewedAt: typeof rev?.reviewedAt === "string" ? rev.reviewedAt : "",
            aiReviewedBy: typeof rev?.reviewedBy === "string" ? rev.reviewedBy : "",
        };
    } catch {
        return { ...empty, mode: "raw", text: content };
    }
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const classroom = await db.classroom.findUnique({
        where: { id },
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
            assignments: {
                orderBy: { order: "asc" },
                select: {
                    id: true,
                    name: true,
                    type: true,
                    maxScore: true,
                    deadline: true,
                    order: true,
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
            },
        },
    });

    if (!classroom) {
        return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    if (classroom.teacherId !== session.user.id) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    if (!canUseLineFeature(classroom.teacher, "lineExport")) {
        return createAppErrorResponse(
            "PLAN_LIMIT_AI_FEATURE",
            "LINE submissions export requires PLUS or School plan",
            403
        );
    }

    const studentMap = new Map(classroom.students.map((s) => [s.id, s]));
    const classroomSegment = safeFilenameSegment(classroom.name);

    const header = [
        "classroomId",
        "classroomName",
        "assignmentId",
        "assignmentName",
        "assignmentType",
        "assignmentOrder",
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
        "aiReviewStatus",
        "aiReviewScore",
        "aiReviewedAt",
        "aiReviewedBy",
    ];

    const rows: string[] = [];

    for (const assignment of classroom.assignments) {
        const assignmentSegment = safeFilenameSegment(assignment.name);
        const submissionByStudent = new Map(
            assignment.submissions.map((sub) => [sub.studentId, sub])
        );

        for (const student of classroom.students) {
            const submission = submissionByStudent.get(student.id) ?? null;
            const parsed = parseSubmissionContent(submission?.content ?? null);

            // Include all students; include all submissions regardless of channel
            rows.push(
                [
                    classroom.id,
                    classroom.name,
                    assignment.id,
                    assignment.name,
                    assignment.type,
                    assignment.order ?? "",
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
                    parsed.aiReviewStatus,
                    parsed.aiReviewScore,
                    parsed.aiReviewedAt,
                    parsed.aiReviewedBy,
                ]
                    .map(escapeCsvValue)
                    .join(",")
            );
        }

        void assignmentSegment; // used for future archive path support
    }

    const csv = [`﻿${header.map(escapeCsvValue).join(",")}`, ...rows].join("\n");
    const filename = `${classroomSegment}-line-submissions.csv`;

    return new NextResponse(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}
