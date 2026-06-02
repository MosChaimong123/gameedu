import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockAssignmentFindUnique = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
    db: {
        assignment: {
            findUnique: mockAssignmentFindUnique,
        },
    },
}));

describe("GET /api/classrooms/[id]/assignments/[assignmentId]/export", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    });

    it("rejects unauthenticated requests", async () => {
        mockAuth.mockResolvedValue(null);

        const { GET } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/export/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }),
        });

        expect(res.status).toBe(401);
        expect(mockAssignmentFindUnique).not.toHaveBeenCalled();
    });

    it("exports submitted and missing students with LINE AI metadata and archive paths", async () => {
        mockAssignmentFindUnique.mockResolvedValue({
            id: "assignment-1",
            classId: "class-1",
            name: "Homework 1",
            type: "score",
            maxScore: 10,
            deadline: new Date("2026-06-05T10:00:00.000Z"),
            classroom: {
                id: "class-1",
                name: "M1/1",
                teacherId: "teacher-1",
                teacher: { role: "TEACHER", plan: "PLUS", planStatus: "ACTIVE", planExpiry: null },
                students: [
                    { id: "student-1", name: "Alice", nickname: "A", loginCode: "S123", order: 1 },
                    { id: "student-2", name: "Bob", nickname: null, loginCode: "S456", order: 2 },
                ],
            },
            submissions: [
                {
                    id: "submission-1",
                    studentId: "student-1",
                    score: 8,
                    content: JSON.stringify({
                        mode: "line_text",
                        text: "=formula answer",
                        submittedVia: "line",
                        aiPreliminaryGrading: {
                            status: "graded",
                            suggestedScore: 8,
                            maxScore: 10,
                            confidence: "medium",
                            feedback: "ดี แต่ควรเพิ่มเหตุผล",
                        },
                    }),
                    submittedAt: new Date("2026-06-02T09:00:00.000Z"),
                    updatedAt: new Date("2026-06-02T09:05:00.000Z"),
                },
            ],
        });

        const { GET } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/export/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }),
        });
        const csv = await res.text();

        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toContain("text/csv");
        expect(csv).toContain("submission-1");
        expect(csv).toContain("line_text");
        expect(csv).toContain("graded");
        expect(csv).toContain("ดี แต่ควรเพิ่มเหตุผล");
        expect(csv).toContain("'=formula answer");
        expect(csv).toContain("M1-1/Homework 1/Alice-S123/submission.txt");
        expect(csv).toContain("M1-1/Homework 1/Bob-S456/missing.txt");
    });

    it("returns 403 when the classroom belongs to another teacher", async () => {
        mockAssignmentFindUnique.mockResolvedValue({
            id: "assignment-1",
            classId: "class-1",
            name: "Homework 1",
            type: "score",
            maxScore: 10,
            deadline: null,
            classroom: {
                id: "class-1",
                name: "M1/1",
                teacherId: "teacher-2",
                teacher: { role: "TEACHER", plan: "PLUS", planStatus: "ACTIVE", planExpiry: null },
                students: [],
            },
            submissions: [],
        });

        const { GET } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/export/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }),
        });

        expect(res.status).toBe(403);
    });

    it("blocks assignment export on the free plan", async () => {
        mockAssignmentFindUnique.mockResolvedValue({
            id: "assignment-1",
            classId: "class-1",
            name: "Homework 1",
            type: "score",
            maxScore: 10,
            deadline: null,
            classroom: {
                id: "class-1",
                name: "M1/1",
                teacherId: "teacher-1",
                teacher: { role: "TEACHER", plan: "FREE", planStatus: "INACTIVE", planExpiry: null },
                students: [],
            },
            submissions: [],
        });

        const { GET } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/export/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }),
        });
        const body = await res.json();

        expect(res.status).toBe(403);
        expect(body.error.code).toBe("PLAN_LIMIT_AI_FEATURE");
    });
});
