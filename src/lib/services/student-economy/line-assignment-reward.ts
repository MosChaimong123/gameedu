import type { Prisma, PrismaClient } from "@prisma/client";
import { recordEconomyTransaction } from "@/lib/services/student-economy/economy-ledger";

const LINE_ASSIGNMENT_BASE_GOLD = 10;
const LINE_ASSIGNMENT_AI_BONUS_GOLD = 5;

type LineAssignmentRewardDb = Pick<PrismaClient, "$transaction">;

export type LineAssignmentRewardInput = {
    studentId: string;
    classId: string;
    assignmentId: string;
    assignmentName: string;
    aiPreliminaryScore?: {
        suggestedScore: number;
        maxScore: number;
        confidence: "low" | "medium" | "high";
    } | null;
};

export type LineAssignmentRewardResult =
    | {
        awarded: true;
        gold: number;
        newGold: number;
        idempotencyKey: string;
        reason: "first_submission";
    }
    | {
        awarded: false;
        gold: 0;
        idempotencyKey: string;
        reason: "already_awarded" | "model_unavailable";
    };

function buildLineAssignmentRewardIdempotencyKey(input: Pick<LineAssignmentRewardInput, "studentId" | "assignmentId">) {
    return `line_assignment:${input.studentId}:${input.assignmentId}`;
}

function calculateLineAssignmentRewardGold(input: Pick<LineAssignmentRewardInput, "aiPreliminaryScore">): number {
    const score = input.aiPreliminaryScore;
    if (!score || score.maxScore <= 0) return LINE_ASSIGNMENT_BASE_GOLD;
    const ratio = score.suggestedScore / score.maxScore;
    const aiBonus = ratio >= 0.8 && score.confidence !== "low" ? LINE_ASSIGNMENT_AI_BONUS_GOLD : 0;
    return LINE_ASSIGNMENT_BASE_GOLD + aiBonus;
}

export async function awardLineAssignmentSubmissionReward(
    db: LineAssignmentRewardDb,
    input: LineAssignmentRewardInput
): Promise<LineAssignmentRewardResult> {
    const idempotencyKey = buildLineAssignmentRewardIdempotencyKey(input);
    const gold = calculateLineAssignmentRewardGold(input);

    return db.$transaction(async (tx) => {
        const economyTransaction = (tx as {
            economyTransaction?: {
                findFirst?: (args: { where: { idempotencyKey: string } }) => Promise<unknown | null>;
            };
            student?: {
                findUnique?: (args: {
                    where: { id: string };
                    select: { gold: true };
                }) => Promise<{ gold: number } | null>;
                update?: (args: {
                    where: { id: string };
                    data: { gold: { increment: number } };
                    select: { gold: true };
                }) => Promise<{ gold: number }>;
            };
        }).economyTransaction;
        const studentDelegate = (tx as {
            student?: {
                findUnique?: (args: {
                    where: { id: string };
                    select: { gold: true };
                }) => Promise<{ gold: number } | null>;
                update?: (args: {
                    where: { id: string };
                    data: { gold: { increment: number } };
                    select: { gold: true };
                }) => Promise<{ gold: number }>;
            };
        }).student;

        if (!economyTransaction?.findFirst || !studentDelegate?.findUnique || !studentDelegate.update) {
            return { awarded: false, gold: 0, idempotencyKey, reason: "model_unavailable" };
        }

        const existing = await economyTransaction.findFirst({ where: { idempotencyKey } });
        if (existing) {
            return { awarded: false, gold: 0, idempotencyKey, reason: "already_awarded" };
        }

        const before = await studentDelegate.findUnique({
            where: { id: input.studentId },
            select: { gold: true },
        });
        if (!before) {
            return { awarded: false, gold: 0, idempotencyKey, reason: "model_unavailable" };
        }

        const updated = await studentDelegate.update({
            where: { id: input.studentId },
            data: { gold: { increment: gold } },
            select: { gold: true },
        });

        await recordEconomyTransaction(tx as Prisma.TransactionClient, {
            studentId: input.studentId,
            classId: input.classId,
            type: "earn",
            source: "line_assignment",
            amount: gold,
            balanceBefore: before.gold,
            balanceAfter: updated.gold,
            sourceRefId: input.assignmentId,
            idempotencyKey,
            metadata: {
                assignmentId: input.assignmentId,
                assignmentName: input.assignmentName,
                source: "line_submission",
                aiPreliminaryScore: input.aiPreliminaryScore ?? null,
            },
        });

        return {
            awarded: true,
            gold,
            newGold: updated.gold,
            idempotencyKey,
            reason: "first_submission",
        };
    });
}
