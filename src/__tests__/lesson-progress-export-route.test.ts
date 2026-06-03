import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockLessonFindUnique = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
    db: {
        lesson: {
            findUnique: mockLessonFindUnique,
        },
    },
}));

describe("GET /api/lessons/[id]/progress/export", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        mockLessonFindUnique.mockResolvedValue({
            id: "lesson-1",
            title: "Physics Lesson",
            ownerUserId: "teacher-1",
            classroomAssignments: [
                {
                    id: "lesson-assignment-1",
                    assignedAt: new Date("2026-06-03T01:00:00.000Z"),
                    classroom: {
                        id: "class-1",
                        name: "M5",
                        students: [
                            { id: "student-1", order: 0, name: "Alice", nickname: "A" },
                            { id: "student-2", order: 1, name: "=Bob", nickname: null },
                        ],
                    },
                    completions: [
                        {
                            studentId: "student-1",
                            completedAt: new Date("2026-06-03T02:00:00.000Z"),
                            quizScore: 85,
                        },
                    ],
                },
            ],
        });
    });

    it("exports lesson completion rows and sanitizes spreadsheet-like values", async () => {
        const { GET } = await import("@/app/api/lessons/[id]/progress/export/route");
        const response = await GET(new Request("http://localhost/api/lessons/lesson-1/progress/export"), {
            params: Promise.resolve({ id: "lesson-1" }),
        });
        const csv = await response.text();

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Disposition")).toContain("Physics Lesson-lesson-progress.csv");
        expect(csv).toContain('"student-1","0","Alice","A","true"');
        expect(csv).toContain('"student-2","1","\'=Bob","","false"');
    });

    it("blocks teachers who do not own the lesson", async () => {
        mockLessonFindUnique.mockResolvedValue({
            id: "lesson-1",
            title: "Physics Lesson",
            ownerUserId: "teacher-2",
            classroomAssignments: [],
        });

        const { GET } = await import("@/app/api/lessons/[id]/progress/export/route");
        const response = await GET(new Request("http://localhost/api/lessons/lesson-1/progress/export"), {
            params: Promise.resolve({ id: "lesson-1" }),
        });

        expect(response.status).toBe(403);
    });
});
