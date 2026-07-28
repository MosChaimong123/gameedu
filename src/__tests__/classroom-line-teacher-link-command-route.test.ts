import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockGetOrCreateTeacherLineLinkCode = vi.fn();
const mockBuildTeacherLineLinkCommand = vi.fn();

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({
    db: { classroom: { findUnique: mockClassroomFindUnique } },
}));
vi.mock("@/lib/line-bot/teacher-linking", () => ({
    getOrCreateTeacherLineLinkCode: mockGetOrCreateTeacherLineLinkCode,
    buildTeacherLineLinkCommand: mockBuildTeacherLineLinkCommand,
}));

describe("GET /api/classrooms/[id]/line-teacher-link-command", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        mockClassroomFindUnique.mockResolvedValue({ id: "class-1", name: "M1/1", teacherId: "teacher-1" });
        mockGetOrCreateTeacherLineLinkCode.mockResolvedValue({
            code: "opaque-teacher-code",
            expiresAt: new Date("2026-07-27T12:00:00.000Z"),
        });
        mockBuildTeacherLineLinkCommand.mockReturnValue("verify teacher opaque-teacher-code");
    });

    it("rejects unauthenticated requests", async () => {
        mockAuth.mockResolvedValue(null);
        const { GET } = await import("@/app/api/classrooms/[id]/line-teacher-link-command/route");
        const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "class-1" }) });

        expect(response.status).toBe(401);
        expect(mockGetOrCreateTeacherLineLinkCode).not.toHaveBeenCalled();
    });

    it("rejects a teacher attempting to link another teacher's classroom", async () => {
        mockClassroomFindUnique.mockResolvedValue({ id: "class-1", name: "M1/1", teacherId: "teacher-2" });
        const { GET } = await import("@/app/api/classrooms/[id]/line-teacher-link-command/route");
        const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "class-1" }) });

        expect(response.status).toBe(403);
        expect(mockGetOrCreateTeacherLineLinkCode).not.toHaveBeenCalled();
    });

    it("returns a one-time teacher verification command to the classroom owner", async () => {
        const { GET } = await import("@/app/api/classrooms/[id]/line-teacher-link-command/route");
        const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "class-1" }) });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(mockGetOrCreateTeacherLineLinkCode).toHaveBeenCalledWith({ userId: "teacher-1", classroomId: "class-1" });
        expect(body).toMatchObject({ classroomId: "class-1", classroomName: "M1/1", command: "verify teacher opaque-teacher-code" });
    });
});
