import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { db } from "@/lib/db";
import { matchesLessonAssessmentAttempt } from "@/lib/lessons/lesson-assessment";
import { matchesLessonCertificate } from "@/lib/lessons/lesson-certificate";
import { isLessonContentV2 } from "@/lib/lessons/lesson-content";
import { isTeacherOrAdmin } from "@/lib/role-guards";

type Params = { params: Promise<{ id: string }> };

function sanitizeFormulaString(value: string) {
    return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function escapeCsvValue(value: unknown) {
    const text = typeof value === "string" ? sanitizeFormulaString(value) : value == null ? "" : String(value);
    return `"${text.replace(/"/g, "\"\"")}"`;
}

function safeFilenameSegment(value: string) {
    return value
        .trim()
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, " ")
        .slice(0, 80) || "lesson";
}

export async function GET(_req: Request, { params }: Params) {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const lesson = await db.lesson.findUnique({
        where: { id },
        select: {
            id: true,
            title: true,
            ownerUserId: true,
            content: true,
            assessmentAttempts: {
                select: {
                    id: true,
                    classId: true,
                    studentId: true,
                    questionSetId: true,
                    assessmentSourceType: true,
                    topicId: true,
                    topicAssessmentId: true,
                    score: true,
                    maxScore: true,
                    passed: true,
                    attemptNumber: true,
                    rewardGrantedAt: true,
                    certificateIssuedAt: true,
                    completedAt: true,
                },
                orderBy: { completedAt: "desc" },
            },
            certificates: {
                select: {
                    id: true,
                    classId: true,
                    studentId: true,
                    certificateScope: true,
                    topicId: true,
                    topicAssessmentId: true,
                    title: true,
                    certificateCode: true,
                    issuedAt: true,
                    criteriaSnapshot: true,
                },
                orderBy: { issuedAt: "desc" },
            },
            classroomAssignments: {
                select: {
                    id: true,
                    assignedAt: true,
                    classroom: {
                        select: {
                            id: true,
                            name: true,
                            students: {
                                orderBy: { order: "asc" },
                                select: { id: true, name: true, nickname: true, order: true },
                            },
                        },
                    },
                    completions: {
                        select: {
                            studentId: true,
                            completedAt: true,
                            quizScore: true,
                        },
                    },
                },
            },
        },
    });

    if (!lesson) {
        return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    if (lesson.ownerUserId !== session.user.id && session.user.role !== "ADMIN") {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const header = [
        "lessonId",
        "lessonTitle",
        "classroomId",
        "classroomName",
        "lessonAssignmentId",
        "assignedAt",
        "studentId",
        "studentOrder",
        "studentName",
        "studentNickname",
        "completed",
        "completedAt",
        "quizScore",
        "topicId",
        "topicTitle",
        "assessmentId",
        "assessmentStatus",
        "attemptCount",
        "latestScore",
        "latestMaxScore",
        "rewardGranted",
        "certificateIssued",
        "certificateCode",
    ];

    const topicAssessments = isLessonContentV2(lesson.content)
        ? lesson.content.topics
              .filter((topic) => topic.assessment?.questionSetId)
              .map((topic) => ({
                  topicId: topic.id,
                  topicTitle: topic.title,
                  assessment: topic.assessment!,
              }))
        : [];

    const rows = lesson.classroomAssignments.flatMap((assignment) => {
        const completionByStudent = new Map(assignment.completions.map((completion) => [completion.studentId, completion]));
        const attemptsForClass = lesson.assessmentAttempts.filter((attempt) => attempt.classId === assignment.classroom.id);
        const certificatesForClass = lesson.certificates.filter((certificate) => certificate.classId === assignment.classroom.id);
        return assignment.classroom.students.flatMap((student) => {
            const completion = completionByStudent.get(student.id) ?? null;
            if (topicAssessments.length === 0) {
                return [[
                    lesson.id,
                    lesson.title,
                    assignment.classroom.id,
                    assignment.classroom.name,
                    assignment.id,
                    assignment.assignedAt.toISOString(),
                    student.id,
                    student.order,
                    student.name,
                    student.nickname ?? "",
                    Boolean(completion),
                    completion?.completedAt.toISOString() ?? "",
                    completion?.quizScore ?? "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                ].map(escapeCsvValue).join(",")];
            }

            return topicAssessments.map(({ topicId, topicTitle, assessment }) => {
                const attempts = attemptsForClass.filter((attempt) =>
                    attempt.studentId === student.id &&
                    matchesLessonAssessmentAttempt({
                        attempt,
                        assessment,
                        topicId,
                    })
                );
                const latestAttempt = attempts[0] ?? null;
                const certificate =
                    certificatesForClass.find((issuedCertificate) =>
                        issuedCertificate.studentId === student.id &&
                        matchesLessonCertificate({
                            certificate: issuedCertificate,
                            assessment,
                            topicId,
                        })
                    ) ?? null;
                const assessmentStatus = latestAttempt
                    ? latestAttempt.passed
                        ? "passed"
                        : "failed"
                    : "not_started";

                return [
                    lesson.id,
                    lesson.title,
                    assignment.classroom.id,
                    assignment.classroom.name,
                    assignment.id,
                    assignment.assignedAt.toISOString(),
                    student.id,
                    student.order,
                    student.name,
                    student.nickname ?? "",
                    Boolean(completion),
                    completion?.completedAt.toISOString() ?? "",
                    completion?.quizScore ?? "",
                    topicId,
                    topicTitle,
                    assessment.id,
                    assessmentStatus,
                    attempts.length,
                    latestAttempt?.score ?? "",
                    latestAttempt?.maxScore ?? "",
                    Boolean(latestAttempt?.rewardGrantedAt),
                    Boolean(certificate),
                    certificate?.certificateCode ?? "",
                ].map(escapeCsvValue).join(",");
            });
        });
    });

    const csv = [`\uFEFF${header.map(escapeCsvValue).join(",")}`, ...rows].join("\n");
    const filename = `${safeFilenameSegment(lesson.title)}-lesson-progress.csv`;

    return new NextResponse(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}
