import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { createAppErrorResponse, INTERNAL_ERROR_MESSAGE } from "@/lib/api-error";
import { db } from "@/lib/db";
import { sanitizeIntegrityEvents } from "@/lib/quiz-integrity";
import { loadQuizTakeContext } from "@/lib/quiz-take-context";
import { calcAssignmentEXP, getNegamonSettings } from "@/lib/classroom-utils";
import { notifyNegamonRankUpIfNeeded } from "@/lib/negamon/negamon-rank-notify";
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
                { alreadySubmitted: true, score: ctx.score },
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

        const classroom = await db.classroom.findUnique({
            where: { id },
            select: { levelConfig: true, gamifiedSettings: true },
        });
        const negamon = getNegamonSettings(classroom?.gamifiedSettings);
        const maxScoreForExp = Math.max(1, ctx.maxScore);

        type RankNotifyPayload = {
            studentId: string;
            loginCode: string | null;
            oldPoints: number;
            newPoints: number;
        };

        const { submission, rankNotifyPayload } = await db.$transaction(async (tx) => {
            const sub = await tx.assignmentSubmission.create({
                data: {
                    studentId: ctx.studentId,
                    assignmentId,
                    score,
                    cheatingLogs: cheatingLogs as Prisma.InputJsonValue,
                },
            });

            let payload: RankNotifyPayload | null = null;

            if (negamon?.enabled) {
                const expBonus = calcAssignmentEXP(score, maxScoreForExp, negamon.expPerPoint);
                if (expBonus > 0) {
                    const before = await tx.student.findUnique({
                        where: { id: ctx.studentId },
                        select: { behaviorPoints: true, loginCode: true },
                    });
                    if (before) {
                        const pct = Math.round((score / maxScoreForExp) * 100);
                        const after = await tx.student.update({
                            where: { id: ctx.studentId },
                            data: {
                                behaviorPoints: { increment: expBonus },
                                history: {
                                    create: {
                                        value: expBonus,
                                        reason: `Negamon Quest: ${ctx.assignmentName} (${pct}%)`,
                                    },
                                },
                            },
                            select: { behaviorPoints: true, loginCode: true },
                        });
                        payload = {
                            studentId: ctx.studentId,
                            loginCode: after.loginCode,
                            oldPoints: before.behaviorPoints,
                            newPoints: after.behaviorPoints,
                        };
                    }
                }
            }

            return { submission: sub, rankNotifyPayload: payload };
        });

        if (rankNotifyPayload && classroom) {
            await notifyNegamonRankUpIfNeeded({
                studentId: rankNotifyPayload.studentId,
                loginCode: rankNotifyPayload.loginCode,
                oldPoints: rankNotifyPayload.oldPoints,
                newPoints: rankNotifyPayload.newPoints,
                levelConfig: classroom.levelConfig,
                gamifiedSettings: classroom.gamifiedSettings,
            });
        }

        const reviewMode = ctx.reviewMode;
        if (reviewMode === "never") {
            return NextResponse.json({
                score,
                submissionId: submission.id,
            });
        }

        return NextResponse.json({
            score,
            correct,
            total: questions.length,
            submissionId: submission.id,
        });

    } catch (error) {
        console.error("[QUIZ_SUBMIT]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}
