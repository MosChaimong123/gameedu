import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockGetTeacherOverview = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/services/teacher/get-teacher-overview", () => ({
    getTeacherOverview: mockGetTeacherOverview,
}));

describe("GET /api/teacher/overview", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetTeacherOverview.mockResolvedValue({
            generatedAt: "2026-01-01T00:00:00.000Z",
            totals: {
                classroomCount: 0,
                studentCount: 0,
                classroomsMissingAttendanceToday: 0,
                missingSubmissionSlots: 0,
            },
            classrooms: [],
            recentAssignments: [],
        });
    });

    it("returns 401 when unauthenticated", async () => {
        mockAuth.mockResolvedValue(null);
        const { GET } = await import("@/app/api/teacher/overview/route");
        const res = await GET();
        expect(res.status).toBe(401);
        expect(mockGetTeacherOverview).not.toHaveBeenCalled();
    });

    it("returns 403 for non-teacher roles", async () => {
        mockAuth.mockResolvedValue({ user: { id: "s1", role: "STUDENT" } });
        const { GET } = await import("@/app/api/teacher/overview/route");
        const res = await GET();
        expect(res.status).toBe(403);
        expect(mockGetTeacherOverview).not.toHaveBeenCalled();
    });

    it("returns overview for teachers", async () => {
        mockAuth.mockResolvedValue({ user: { id: "t1", role: "TEACHER" } });
        const { GET } = await import("@/app/api/teacher/overview/route");
        const res = await GET();
        expect(res.status).toBe(200);
        expect(mockGetTeacherOverview).toHaveBeenCalledWith("t1");
        const body = await res.json();
        expect(body.totals).toBeDefined();
    });

    it("returns overview for admins", async () => {
        mockAuth.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
        const { GET } = await import("@/app/api/teacher/overview/route");
        const res = await GET();
        expect(res.status).toBe(200);
        expect(mockGetTeacherOverview).toHaveBeenCalledWith("a1");
    });
});
