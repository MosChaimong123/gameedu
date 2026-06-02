import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLineBotGroupFindUnique = vi.fn();
const mockAssignmentSubmissionFindUnique = vi.fn();
const mockAssignmentSubmissionUpsert = vi.fn();
const mockGradeLineTextSubmissionWithAi = vi.fn();
const mockAwardLineAssignmentSubmissionReward = vi.fn();

vi.mock("@/lib/db", () => ({
    db: {
        lineBotGroup: {
            findUnique: mockLineBotGroupFindUnique,
        },
        assignmentSubmission: {
            findUnique: mockAssignmentSubmissionFindUnique,
            upsert: mockAssignmentSubmissionUpsert,
        },
    },
}));

vi.mock("@/lib/notifications", () => ({
    sendNotification: vi.fn(),
}));

vi.mock("@/lib/line-bot/ai-grading", () => ({
    gradeLineTextSubmissionWithAi: mockGradeLineTextSubmissionWithAi,
}));

vi.mock("@/lib/services/student-economy/line-assignment-reward", () => ({
    awardLineAssignmentSubmissionReward: mockAwardLineAssignmentSubmissionReward,
}));

describe("line-bot repository text submissions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAssignmentSubmissionFindUnique.mockResolvedValue(null);
        mockAssignmentSubmissionUpsert.mockResolvedValue({ id: "submission-1" });
        mockGradeLineTextSubmissionWithAi.mockResolvedValue({
            status: "unavailable",
            reason: "missing_api_key",
        });
        mockAwardLineAssignmentSubmissionReward.mockResolvedValue({
            awarded: false,
            gold: 0,
            idempotencyKey: "line_assignment:student-1:assignment-1",
            reason: "already_awarded",
        });
    });

    it("creates a text submission for a bound classroom assignment", async () => {
        mockLineBotGroupFindUnique.mockResolvedValue({
            classroomId: "classroom-1",
            classroom: {
                id: "classroom-1",
                name: "M1/1",
                teacher: { role: "TEACHER", plan: "PLUS", planStatus: "ACTIVE", planExpiry: null },
                students: [{ id: "student-1", loginCode: "S123" }],
                assignments: [{
                    id: "assignment-1",
                    name: "Homework 1",
                    description: "Explain your answer",
                    type: "score",
                    maxScore: 10,
                }],
            },
        });

        const { submitTextAssignmentForLineGroup } = await import("@/lib/line-bot/repository");
        const result = await submitTextAssignmentForLineGroup({
            lineGroupId: "line-group-1",
            studentCode: "S123",
            assignmentRef: "Homework 1",
            content: "My answer",
        });

        expect(result).toMatchObject({
            ok: true,
            submission: {
                assignmentName: "Homework 1",
                classroomName: "M1/1",
                replacedPreviousSubmission: false,
                aiPreliminaryScore: null,
                reward: {
                    awarded: false,
                    gold: 0,
                },
            },
        });
        expect(mockGradeLineTextSubmissionWithAi).toHaveBeenCalledWith({
            assignmentName: "Homework 1",
            assignmentDescription: "Explain your answer",
            maxScore: 10,
            studentAnswer: "My answer",
        });
        expect(mockAssignmentSubmissionUpsert).toHaveBeenCalledWith({
            where: {
                studentId_assignmentId: {
                    studentId: "student-1",
                    assignmentId: "assignment-1",
                },
            },
            create: expect.objectContaining({
                studentId: "student-1",
                assignmentId: "assignment-1",
                score: 0,
                content: expect.stringContaining("missing_api_key"),
            }),
            update: expect.objectContaining({
                content: expect.stringContaining("missing_api_key"),
            }),
        });
        expect(mockAwardLineAssignmentSubmissionReward).toHaveBeenCalledWith(expect.anything(), {
            studentId: "student-1",
            classId: "classroom-1",
            assignmentId: "assignment-1",
            assignmentName: "Homework 1",
            aiPreliminaryScore: null,
        });
    });

    it("stores AI preliminary grading metadata and suggested score for text submissions", async () => {
        mockGradeLineTextSubmissionWithAi.mockResolvedValue({
            status: "graded",
            suggestedScore: 8,
            maxScore: 10,
            confidence: "medium",
            feedback: "คำตอบตรงประเด็น แต่ยังขาดเหตุผลประกอบ",
        });
        mockAwardLineAssignmentSubmissionReward.mockResolvedValue({
            awarded: true,
            gold: 15,
            newGold: 115,
            idempotencyKey: "line_assignment:student-1:assignment-1",
            reason: "first_submission",
        });
        mockLineBotGroupFindUnique.mockResolvedValue({
            classroomId: "classroom-1",
            classroom: {
                id: "classroom-1",
                name: "M1/1",
                teacher: { role: "TEACHER", plan: "PLUS", planStatus: "ACTIVE", planExpiry: null },
                students: [{ id: "student-1", loginCode: "S123" }],
                assignments: [{
                    id: "assignment-1",
                    name: "Homework 1",
                    description: null,
                    type: "score",
                    maxScore: 10,
                }],
            },
        });

        const { submitTextAssignmentForLineGroup } = await import("@/lib/line-bot/repository");
        const result = await submitTextAssignmentForLineGroup({
            lineGroupId: "line-group-1",
            studentCode: "S123",
            assignmentRef: "Homework 1",
            content: "My answer",
        });

        expect(result).toMatchObject({
            ok: true,
            submission: {
                aiPreliminaryScore: {
                    suggestedScore: 8,
                    maxScore: 10,
                    confidence: "medium",
                },
                reward: {
                    awarded: true,
                    gold: 15,
                },
            },
        });
        expect(mockAssignmentSubmissionUpsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({
                score: 8,
                content: expect.stringContaining("คำตอบตรงประเด็น"),
            }),
            update: expect.objectContaining({
                score: 8,
                content: expect.stringContaining("คำตอบตรงประเด็น"),
            }),
        }));
        expect(mockAwardLineAssignmentSubmissionReward).toHaveBeenCalledWith(expect.anything(), {
            studentId: "student-1",
            classId: "classroom-1",
            assignmentId: "assignment-1",
            assignmentName: "Homework 1",
            aiPreliminaryScore: {
                suggestedScore: 8,
                maxScore: 10,
                confidence: "medium",
            },
        });
    });

    it("rejects quiz and worksheet assignments for LINE text submission", async () => {
        mockLineBotGroupFindUnique.mockResolvedValue({
            classroomId: "classroom-1",
            classroom: {
                id: "classroom-1",
                name: "M1/1",
                teacher: { role: "TEACHER", plan: "PLUS", planStatus: "ACTIVE", planExpiry: null },
                students: [{ id: "student-1", loginCode: "S123" }],
                assignments: [{ id: "assignment-1", name: "Quiz 1", description: null, type: "quiz", maxScore: 10 }],
            },
        });

        const { submitTextAssignmentForLineGroup } = await import("@/lib/line-bot/repository");
        const result = await submitTextAssignmentForLineGroup({
            lineGroupId: "line-group-1",
            studentCode: "S123",
            assignmentRef: "Quiz 1",
            content: "A",
        });

        expect(result).toEqual({ ok: false, reason: "UNSUPPORTED_ASSIGNMENT" });
        expect(mockAssignmentSubmissionUpsert).not.toHaveBeenCalled();
        expect(mockGradeLineTextSubmissionWithAi).not.toHaveBeenCalled();
        expect(mockAwardLineAssignmentSubmissionReward).not.toHaveBeenCalled();
    });

    it("blocks LINE text submission for classrooms on the free plan", async () => {
        mockLineBotGroupFindUnique.mockResolvedValue({
            classroomId: "classroom-1",
            classroom: {
                id: "classroom-1",
                name: "M1/1",
                teacher: { role: "TEACHER", plan: "FREE", planStatus: "INACTIVE", planExpiry: null },
                students: [{ id: "student-1", loginCode: "S123" }],
                assignments: [{
                    id: "assignment-1",
                    name: "Homework 1",
                    description: null,
                    type: "score",
                    maxScore: 10,
                }],
            },
        });

        const { submitTextAssignmentForLineGroup } = await import("@/lib/line-bot/repository");
        const result = await submitTextAssignmentForLineGroup({
            lineGroupId: "line-group-1",
            studentCode: "S123",
            assignmentRef: "Homework 1",
            content: "A",
        });

        expect(result).toEqual({ ok: false, reason: "PLAN_LIMIT" });
        expect(mockAssignmentSubmissionUpsert).not.toHaveBeenCalled();
        expect(mockGradeLineTextSubmissionWithAi).not.toHaveBeenCalled();
        expect(mockAwardLineAssignmentSubmissionReward).not.toHaveBeenCalled();
    });
});
