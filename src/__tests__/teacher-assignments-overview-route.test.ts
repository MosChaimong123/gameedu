import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockGetTeacherAssignmentOverview = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/services/teacher/get-teacher-assignment-overview", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/services/teacher/get-teacher-assignment-overview")>();
    return {
        ...actual,
        getTeacherAssignmentOverview: mockGetTeacherAssignmentOverview,
    };
});

describe("GET /api/teacher/assignments/overview", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetTeacherAssignmentOverview.mockResolvedValue({
            generatedAt: "2026-01-01T00:00:00.000Z",
            rangeDays: 14,
            classId: null,
            totals: {
                visibleAssignmentCount: 0,
                overdueAssignmentCount: 0,
                dueWithinRangeCount: 0,
                missingSubmissionSlots: 0,
            },
            classrooms: [],
            items: [],
        });
    });

    it("returns 401 when unauthenticated", async () => {
        mockAuth.mockResolvedValue(null);
        const { GET } = await import("@/app/api/teacher/assignments/overview/route");
        const res = await GET(new Request("http://localhost/api/teacher/assignments/overview"));
        expect(res.status).toBe(401);
        expect(mockGetTeacherAssignmentOverview).not.toHaveBeenCalled();
    });

    it("returns 403 for non-teacher roles", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        const { GET } = await import("@/app/api/teacher/assignments/overview/route");
        const res = await GET(new Request("http://localhost/api/teacher/assignments/overview"));
        expect(res.status).toBe(403);
        expect(mockGetTeacherAssignmentOverview).not.toHaveBeenCalled();
    });

    it("returns overview for teachers", async () => {
        mockAuth.mockResolvedValue({ user: { id: "t1", role: "TEACHER" } });
        const { GET } = await import("@/app/api/teacher/assignments/overview/route");
        const res = await GET(new Request("http://localhost/api/teacher/assignments/overview?range=7d"));
        expect(res.status).toBe(200);
        expect(mockGetTeacherAssignmentOverview).toHaveBeenCalledWith("t1", {
            classId: undefined,
            rangeDays: 7,
        });
    });

    it("returns 404 when classId is not owned", async () => {
        mockAuth.mockResolvedValue({ user: { id: "t1", role: "TEACHER" } });
        mockGetTeacherAssignmentOverview.mockResolvedValueOnce(null);
        const { GET } = await import("@/app/api/teacher/assignments/overview/route");
        const res = await GET(
            new Request(
                "http://localhost/api/teacher/assignments/overview?classId=507f1f77bcf86cd799439011"
            )
        );
        expect(res.status).toBe(404);
    });

    it("ignores invalid classId query", async () => {
        mockAuth.mockResolvedValue({ user: { id: "t1", role: "TEACHER" } });
        const { GET } = await import("@/app/api/teacher/assignments/overview/route");
        await GET(new Request("http://localhost/api/teacher/assignments/overview?classId=not-an-id"));
        expect(mockGetTeacherAssignmentOverview).toHaveBeenCalledWith("t1", {
            classId: undefined,
            rangeDays: 14,
        });
    });
});
