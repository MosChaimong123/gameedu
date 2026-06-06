import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
    db: {
        classroom: {
            findUnique: mockClassroomFindUnique,
        },
    },
}));

const PLUS_TEACHER = { role: "TEACHER", plan: "PLUS", planStatus: "ACTIVE", planExpiry: null };
const FREE_TEACHER = { role: "TEACHER", plan: "FREE", planStatus: null, planExpiry: null };

const BASE_CLASSROOM = {
    id: "class-1",
    name: "M1/1",
    teacherId: "teacher-1",
    teacher: PLUS_TEACHER,
    students: [
        { id: "student-1", name: "Alice", nickname: "A", loginCode: "S123", order: 1 },
        { id: "student-2", name: "Bob", nickname: null, loginCode: "S456", order: 2 },
    ],
    assignments: [
        {
            id: "assignment-1",
            name: "Homework 1",
            type: "score",
            maxScore: 10,
            deadline: new Date("2026-06-05T10:00:00.000Z"),
            order: 0,
            submissions: [
                {
                    id: "sub-1",
                    studentId: "student-1",
                    score: 8,
                    content: JSON.stringify({
                        mode: "line_text",
                        text: "คำตอบของฉัน",
                        submittedVia: "line",
                        aiPreliminaryGrading: {
                            status: "graded",
                            suggestedScore: 8,
                            maxScore: 10,
                            confidence: "medium",
                            feedback: "ดี",
                        },
                        aiPreliminaryReview: {
                            status: "accepted",
                            score: 8,
                            reviewedAt: "2026-06-03T08:00:00.000Z",
                            reviewedBy: "teacher-1",
                        },
                    }),
                    submittedAt: new Date("2026-06-02T09:00:00.000Z"),
                    updatedAt: new Date("2026-06-02T09:05:00.000Z"),
                },
            ],
        },
    ],
};

describe("GET /api/classrooms/[id]/line-submissions/export", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    });

    it("rejects unauthenticated requests", async () => {
        mockAuth.mockResolvedValue(null);

        const { GET } = await import(
            "@/app/api/classrooms/[id]/line-submissions/export/route"
        );
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1" }),
        });

        expect(res.status).toBe(401);
        expect(mockClassroomFindUnique).not.toHaveBeenCalled();
    });

    it("rejects non-teacher users", async () => {
        mockAuth.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });

        const { GET } = await import(
            "@/app/api/classrooms/[id]/line-submissions/export/route"
        );
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1" }),
        });

        expect(res.status).toBe(403);
    });

    it("returns 404 for unknown classroom", async () => {
        mockClassroomFindUnique.mockResolvedValue(null);

        const { GET } = await import(
            "@/app/api/classrooms/[id]/line-submissions/export/route"
        );
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "nonexistent" }),
        });

        expect(res.status).toBe(404);
    });

    it("returns 403 when teacher does not own classroom", async () => {
        mockClassroomFindUnique.mockResolvedValue({
            ...BASE_CLASSROOM,
            teacherId: "other-teacher",
        });

        const { GET } = await import(
            "@/app/api/classrooms/[id]/line-submissions/export/route"
        );
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1" }),
        });

        expect(res.status).toBe(403);
    });

    it("returns 403 for FREE plan teacher", async () => {
        mockClassroomFindUnique.mockResolvedValue({
            ...BASE_CLASSROOM,
            teacher: FREE_TEACHER,
        });

        const { GET } = await import(
            "@/app/api/classrooms/[id]/line-submissions/export/route"
        );
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1" }),
        });

        expect(res.status).toBe(403);
    });

    it("exports all students across all assignments as CSV", async () => {
        mockClassroomFindUnique.mockResolvedValue(BASE_CLASSROOM);

        const { GET } = await import(
            "@/app/api/classrooms/[id]/line-submissions/export/route"
        );
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1" }),
        });

        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toContain("text/csv");
        expect(res.headers.get("Content-Disposition")).toContain(
            "M1-1-line-submissions.csv"
        );

        const text = await res.text();
        const lines = text.split("\n");

        // Header + 2 students for 1 assignment = 3 lines
        expect(lines).toHaveLength(3);

        // Alice submitted
        expect(lines[1]).toContain("Alice");
        expect(lines[1]).toContain("true");
        expect(lines[1]).toContain("line_text");
        expect(lines[1]).toContain("line");
        expect(lines[1]).toContain("graded");
        expect(lines[1]).toContain("accepted");
        expect(lines[1]).toContain("ดี");

        // Bob did not submit
        expect(lines[2]).toContain("Bob");
        expect(lines[2]).toContain("false");
    });

    it("includes AI review fields in CSV header", async () => {
        mockClassroomFindUnique.mockResolvedValue(BASE_CLASSROOM);

        const { GET } = await import(
            "@/app/api/classrooms/[id]/line-submissions/export/route"
        );
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1" }),
        });

        const text = await res.text();
        const header = text.split("\n")[0];
        expect(header).toContain("aiReviewStatus");
        expect(header).toContain("aiReviewScore");
        expect(header).toContain("aiReviewedAt");
        expect(header).toContain("aiReviewedBy");
    });

    it("sanitizes formula-injection strings in student answers", async () => {
        mockClassroomFindUnique.mockResolvedValue({
            ...BASE_CLASSROOM,
            assignments: [
                {
                    ...BASE_CLASSROOM.assignments[0],
                    submissions: [
                        {
                            id: "sub-evil",
                            studentId: "student-1",
                            score: 5,
                            content: JSON.stringify({
                                mode: "line_text",
                                text: "=HYPERLINK(\"http://evil.com\",\"click\")",
                                submittedVia: "line",
                                aiPreliminaryGrading: { status: "unavailable", reason: "not_requested" },
                            }),
                            submittedAt: new Date("2026-06-02T09:00:00.000Z"),
                            updatedAt: new Date("2026-06-02T09:05:00.000Z"),
                        },
                    ],
                },
            ],
        });

        const { GET } = await import(
            "@/app/api/classrooms/[id]/line-submissions/export/route"
        );
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1" }),
        });

        const text = await res.text();
        // Should be prefixed with ' to neutralize formula
        expect(text).toContain("'=HYPERLINK");
    });

    it("handles multiple assignments correctly", async () => {
        mockClassroomFindUnique.mockResolvedValue({
            ...BASE_CLASSROOM,
            assignments: [
                { ...BASE_CLASSROOM.assignments[0], id: "a1", name: "HW1", order: 0 },
                {
                    id: "a2",
                    name: "HW2",
                    type: "score",
                    maxScore: 20,
                    deadline: null,
                    order: 1,
                    submissions: [],
                },
            ],
        });

        const { GET } = await import(
            "@/app/api/classrooms/[id]/line-submissions/export/route"
        );
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1" }),
        });

        const text = await res.text();
        const lines = text.split("\n");

        // Header + 2 students * 2 assignments = 5 lines
        expect(lines).toHaveLength(5);
        expect(lines[1]).toContain("HW1");
        expect(lines[3]).toContain("HW2");
    });
});
