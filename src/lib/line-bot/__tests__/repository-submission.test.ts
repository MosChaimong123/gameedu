import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdateMany = vi.fn();
const mockLinksFindMany = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockGrade = vi.fn();

vi.mock("@/lib/db", () => ({
    db: {
        assignmentSubmission: { findUnique: mockFindUnique, create: mockCreate, updateMany: mockUpdateMany },
        lineStudentAccountLink: { findMany: mockLinksFindMany },
        classroom: { findUnique: mockClassroomFindUnique },
        student: { findUnique: mockStudentFindUnique },
    },
}));
vi.mock("@/lib/line-bot/ai-grading", () => ({ gradeLineTextSubmissionWithAi: mockGrade }));

describe("linked LINE text submissions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLinksFindMany.mockResolvedValue([{ classroomId: "class-1", studentId: "student-1" }]);
        mockClassroomFindUnique.mockResolvedValue({
            id: "class-1",
            name: "M1/1",
            teacher: { role: "TEACHER", plan: "PLUS", planStatus: "ACTIVE", planExpiry: null },
            assignments: [{ id: "assignment-1", name: "Homework 1", description: null, type: "score", maxScore: 10, order: 0, deadline: null }],
        });
        mockStudentFindUnique.mockResolvedValue({ id: "student-1", classId: "class-1" });
        mockFindUnique.mockResolvedValue(null);
        mockCreate.mockResolvedValue({ id: "submission-1" });
        mockUpdateMany.mockResolvedValue({ count: 1 });
        mockGrade.mockResolvedValue({ status: "unavailable", reason: "missing_api_key" });
    });

    it("creates work only for the student linked to the LINE account and records revision 1", async () => {
        const { submitTextAssignmentForLinkedLineAccount } = await import("@/lib/line-bot/repository");
        const result = await submitTextAssignmentForLinkedLineAccount({ lineUserId: "line-user-1", assignmentRef: "A1", content: "My answer" });

        expect(result).toMatchObject({ ok: true, submission: { studentId: "student-1", revision: 1, submissionState: "submitted" } });
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ studentId: "student-1", assignmentId: "assignment-1", score: 0, content: expect.stringContaining("line-user-1") }),
        }));
    });

    it("rejects a stale LINE link whose student is no longer in that classroom", async () => {
        mockStudentFindUnique.mockResolvedValue({ id: "student-1", classId: "other-class" });
        const { submitTextAssignmentForLinkedLineAccount } = await import("@/lib/line-bot/repository");
        await expect(submitTextAssignmentForLinkedLineAccount({ lineUserId: "line-user-1", assignmentRef: "A1", content: "My answer" })).resolves.toEqual({ ok: false, reason: "NOT_FOUND" });
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("preserves a teacher-reviewed score and uses optimistic concurrency on resubmission", async () => {
        const updatedAt = new Date("2026-07-27T10:00:00.000Z");
        mockFindUnique.mockResolvedValue({
            id: "submission-1",
            score: 8,
            updatedAt,
            content: JSON.stringify({
                mode: "line_text", text: "old", submittedVia: "line",
                aiPreliminaryGrading: { status: "unavailable", reason: "not_requested" },
                teacherReview: { score: 8, reviewedAt: "2026-07-27T09:00:00.000Z", reviewedBy: "teacher-1" },
                submissionState: "submitted",
                revisions: [{ revision: 1, state: "submitted", submittedAt: "2026-07-27T08:00:00.000Z", actorLineUserId: "line-user-1", linkedStudentId: "student-1" }],
            }),
        });
        const { submitTextAssignmentForLinkedLineAccount } = await import("@/lib/line-bot/repository");
        const result = await submitTextAssignmentForLinkedLineAccount({ lineUserId: "line-user-1", assignmentRef: "A1", content: "revised" });

        expect(result).toMatchObject({ ok: true, submission: { revision: 2, submissionState: "needs_review" } });
        expect(mockUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "submission-1", updatedAt },
            data: expect.objectContaining({ score: 8, content: expect.stringContaining('"revision":2') }),
        }));
    });

    it("does not award or overwrite when another writer changes the submission first", async () => {
        mockFindUnique.mockResolvedValue({ id: "submission-1", score: 0, content: null, updatedAt: new Date() });
        mockUpdateMany.mockResolvedValue({ count: 0 });
        const { submitTextAssignmentForLinkedLineAccount } = await import("@/lib/line-bot/repository");
        await expect(submitTextAssignmentForLinkedLineAccount({ lineUserId: "line-user-1", assignmentRef: "A1", content: "My answer" })).resolves.toEqual({ ok: false, reason: "CONFLICT" });
    });

    it("locks submissions after the deadline", async () => {
        mockClassroomFindUnique.mockResolvedValue({
            id: "class-1", name: "M1/1", teacher: { role: "TEACHER", plan: "PLUS", planStatus: "ACTIVE", planExpiry: null },
            assignments: [{ id: "assignment-1", name: "Homework 1", description: null, type: "score", maxScore: 10, order: 0, deadline: new Date("2020-01-01") }],
        });
        const { submitTextAssignmentForLinkedLineAccount } = await import("@/lib/line-bot/repository");
        await expect(submitTextAssignmentForLinkedLineAccount({ lineUserId: "line-user-1", assignmentRef: "A1", content: "late" })).resolves.toEqual({ ok: false, reason: "LOCKED" });
        expect(mockCreate).not.toHaveBeenCalled();
    });
});
