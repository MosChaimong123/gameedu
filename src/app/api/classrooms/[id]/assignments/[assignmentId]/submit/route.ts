import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { createAppErrorResponse, INTERNAL_ERROR_MESSAGE } from "@/lib/api-error";
import { db } from "@/lib/db";
import { sanitizeIntegrityEvents } from "@/lib/quiz-integrity";
import { loadQuizTakeContext } from "@/lib/quiz-take-context";
import {
    buildRateLimitKey,
    consumeRateLimit,
    createRateLimitResponse,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
    const { id, assignmentId } = await params;
    const rateLimit = consumeRateLimit({
        bucket: "quiz-submit:post",
        key: buildRateLimitKey(getRequestClientIdentifier(req), id, assignmentId),
        limit: 15,
        windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit.retryAfterSeconds);
    }

    try {
        const body = (await req.json()) as {
            studentCode?: string;
            answers?: number[];
            integrity?: unknown;
        };
        const { studentCode, answers, integrity } = body;

        if (!studentCode || !Array.isArray(answers)) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Bad Request", 400);
        }

        const ctx = await loadQuizTakeContext(id, assignmentId, studentCode);
        if (ctx.kind === "denied") {
            const code =
                ctx.status === 404
                    ? "NOT_FOUND"
                    : ctx.status === 403
                      ? "FORBIDDEN"
                      : "INVALID_PAYLOAD";
            return createAppErrorResponse(code, ctx.message, ctx.status);
        }
        if (ctx.kind === "already_submitted") {
            return NextResponse.json(
                { alreadySubmitted: true, score: ctx.score, expBonus: 0 },
                { status: 200 }
            );
        }

        const questions = ctx.questions;
        if (answers.length !== questions.length) {
            return createAppErrorResponse(
                "QUIZ_ALL_REQUIRED",
                "Answer every question before submitting.",
                400
            );
        }

        for (let i = 0; i < questions.length; i++) {
            const a = answers[i];
            const nOpts = questions[i].options?.length ?? 0;
            if (typeof a !== "number" || !Number.isFinite(a) || a < 0 || a >= nOpts) {
                return createAppErrorResponse("INVALID_PAYLOAD", "Invalid answer index", 400);
            }
        }

        let correct = 0;
        for (let i = 0; i < questions.length; i++) {
            if (answers[i] === questions[i].correctAnswer) correct++;
        }
        const score =
            questions.length > 0
                ? Math.round((correct / questions.length) * ctx.maxScore)
                : 0;

        const cheatingLogs = sanitizeIntegrityEvents(
            integrity === undefined ? { events: [] } : integrity
        );

        const completedAt = new Date();
        const submission = await db.assignmentSubmission.upsert({
            where: {
                studentId_assignmentId: {
                    studentId: ctx.studentId,
                    assignmentId,
                },
            },
            create: {
                studentId: ctx.studentId,
                assignmentId,
                score,
                cheatingLogs: cheatingLogs as Prisma.InputJsonValue,
                attemptStartedAt: completedAt,
                quizCompletedAt: completedAt,
                submittedAt: completedAt,
            },
            update: {
                score,
                cheatingLogs: cheatingLogs as Prisma.InputJsonValue,
                quizCompletedAt: completedAt,
                submittedAt: completedAt,
            },
        });
        const expBonus = 0;

        const reviewMode = ctx.reviewMode;
        if (reviewMode === "never") {
            return NextResponse.json({
                score,
                submissionId: submission.id,
                expBonus,
            });
        }

        return NextResponse.json({
            score,
            correct,
            total: questions.length,
            submissionId: submission.id,
            expBonus,
        });

    } catch (error) {
        console.error("[QUIZ_SUBMIT]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
