import { describe, expect, it, vi } from "vitest";
import { awardLineAssignmentSubmissionReward } from "@/lib/services/student-economy/line-assignment-reward";

function createMockDb(input?: { existingLedger?: unknown; startingGold?: number }) {
    const tx = {
        economyTransaction: {
            findFirst: vi.fn().mockResolvedValue(input?.existingLedger ?? null),
            create: vi.fn().mockResolvedValue({ id: "ledger-1" }),
        },
        student: {
            findUnique: vi.fn().mockResolvedValue({ gold: input?.startingGold ?? 100 }),
            update: vi.fn().mockResolvedValue({ gold: (input?.startingGold ?? 100) + 10 }),
        },
    };
    return {
        tx,
        db: {
            $transaction: vi.fn(async (callback) => callback(tx)),
        },
    };
}

describe("line assignment reward", () => {
    it("awards first LINE assignment submission gold and records an idempotent ledger row", async () => {
        const { db, tx } = createMockDb({ startingGold: 100 });

        const result = await awardLineAssignmentSubmissionReward(db as never, {
            studentId: "student-1",
            classId: "classroom-1",
            assignmentId: "507f1f77bcf86cd799439011",
            assignmentName: "Homework 1",
            aiPreliminaryScore: null,
        });

        expect(result).toEqual({
            awarded: true,
            gold: 10,
            newGold: 110,
            idempotencyKey: "line_assignment:student-1:507f1f77bcf86cd799439011",
            reason: "first_submission",
        });
        expect(tx.student.update).toHaveBeenCalledWith({
            where: { id: "student-1" },
            data: { gold: { increment: 10 } },
            select: { gold: true },
        });
        expect(tx.economyTransaction.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                studentId: "student-1",
                classId: "classroom-1",
                type: "earn",
                source: "line_assignment",
                amount: 10,
                balanceBefore: 100,
                balanceAfter: 110,
                idempotencyKey: "line_assignment:student-1:507f1f77bcf86cd799439011",
            }),
        });
    });

    it("adds a small bonus for high-confidence strong AI preliminary results", async () => {
        const { db, tx } = createMockDb({ startingGold: 100 });
        tx.student.update.mockResolvedValue({ gold: 115 });

        const result = await awardLineAssignmentSubmissionReward(db as never, {
            studentId: "student-1",
            classId: "classroom-1",
            assignmentId: "507f1f77bcf86cd799439011",
            assignmentName: "Homework 1",
            aiPreliminaryScore: {
                suggestedScore: 8,
                maxScore: 10,
                confidence: "medium",
            },
        });

        expect(result).toMatchObject({ awarded: true, gold: 15, newGold: 115 });
        expect(tx.student.update).toHaveBeenCalledWith(expect.objectContaining({
            data: { gold: { increment: 15 } },
        }));
    });

    it("does not award gold twice for the same student and assignment", async () => {
        const existingLedger = { id: "ledger-existing" };
        const { db, tx } = createMockDb({ existingLedger });

        const result = await awardLineAssignmentSubmissionReward(db as never, {
            studentId: "student-1",
            classId: "classroom-1",
            assignmentId: "507f1f77bcf86cd799439011",
            assignmentName: "Homework 1",
            aiPreliminaryScore: null,
        });

        expect(result).toEqual({
            awarded: false,
            gold: 0,
            idempotencyKey: "line_assignment:student-1:507f1f77bcf86cd799439011",
            reason: "already_awarded",
        });
        expect(tx.student.update).not.toHaveBeenCalled();
        expect(tx.economyTransaction.create).not.toHaveBeenCalled();
    });
});
