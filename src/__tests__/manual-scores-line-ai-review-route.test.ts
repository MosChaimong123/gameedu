import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockAssignmentFindUnique = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockAssignmentSubmissionFindUnique = vi.fn();
const mockAssignmentSubmissionUpsert = vi.fn();
const mockLogAuditEvent = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
    db: {
        assignment: {
            findUnique: mockAssignmentFindUnique,
        },
        student: {
            findUnique: mockStudentFindUnique,
        },
        assignmentSubmission: {
            findUnique: mockAssignmentSubmissionFindUnique,
            upsert: mockAssignmentSubmissionUpsert,
        },
    },
}));

vi.mock("@/lib/security/audit-log", () => ({
    logAuditEvent: mockLogAuditEvent,
}));

function jsonRequest(body: unknown) {
    return new Request("http://localhost/api/classrooms/class-1/assignments/assignment-1/manual-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("POST /api/classrooms/[id]/assignments/[assignmentId]/manual-scores LINE AI review", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        mockAssignmentFindUnique.mockResolvedValue({
            id: "assignment-1",
            type: "score",
            maxScore: 10,
            checklists: [],
        });
        mockStudentFindUnique.mockResolvedValue({ id: "student-1", classId: "class-1" });
        mockAssignmentSubmissionFindUnique.mockResolvedValue({
            id: "submission-1",
            content: JSON.stringify({
                mode: "line_text",
                text: "My answer",
                submittedVia: "line",
                aiPreliminaryGrading: {
                    status: "graded",
                    suggestedScore: 8,
                    maxScore: 10,
                    confidence: "medium",
                    feedback: "Good first pass",
                },
            }),
        });
        mockAssignmentSubmissionUpsert.mockImplementation(async (args) => ({
            id: "submission-1",
            score: args.update.score,
            content: args.update.content ?? null,
        }));
    });

    it("marks a LINE AI preliminary grade as accepted when the teacher applies it", async () => {
        const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/manual-scores/route");

        const res = await POST(jsonRequest({
            studentId: "student-1",
            score: 8,
            lineAiReviewAction: "accepted",
        }), {
            params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }),
        });
        const body = await res.json();
        const upsertArgs = mockAssignmentSubmissionUpsert.mock.calls[0][0];
        const content = JSON.parse(upsertArgs.update.content);

        expect(res.status).toBe(200);
        expect(body.content).toContain("\"accepted\"");
        expect(content.aiPreliminaryReview).toMatchObject({
            status: "accepted",
            score: 8,
            reviewedBy: "teacher-1",
        });
        expect(mockLogAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
            action: "line.assignment_ai_grade.accepted",
            category: "line",
            targetType: "assignmentSubmission",
            targetId: "submission-1",
        }));
    });

    it("rejects AI review actions when the submission has no LINE AI metadata", async () => {
        mockAssignmentSubmissionFindUnique.mockResolvedValue({
            id: "submission-1",
            content: "plain answer",
        });
        const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/manual-scores/route");

        const res = await POST(jsonRequest({
            studentId: "student-1",
            score: 8,
            lineAiReviewAction: "accepted",
        }), {
            params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }),
        });

        expect(res.status).toBe(400);
        expect(mockAssignmentSubmissionUpsert).not.toHaveBeenCalled();
        expect(mockLogAuditEvent).not.toHaveBeenCalled();
    });
});
