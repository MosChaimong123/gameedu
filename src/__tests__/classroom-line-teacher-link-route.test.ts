import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockGetTeacherLineLinkStatus = vi.fn();
const mockRevokeTeacherLineAccountLink = vi.fn();
const mockLogAuditEvent = vi.fn();

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({
    db: { classroom: { findUnique: mockClassroomFindUnique } },
}));
vi.mock("@/lib/line-bot/teacher-linking", () => ({
    getTeacherLineLinkStatus: mockGetTeacherLineLinkStatus,
    revokeTeacherLineAccountLink: mockRevokeTeacherLineAccountLink,
}));
vi.mock("@/lib/security/audit-log", () => ({ logAuditEvent: mockLogAuditEvent }));

describe("/api/classrooms/[id]/line-teacher-link", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        mockClassroomFindUnique.mockResolvedValue({ id: "class-1", teacherId: "teacher-1" });
        mockGetTeacherLineLinkStatus.mockResolvedValue({ linked: true });
        mockRevokeTeacherLineAccountLink.mockResolvedValue({ revoked: true });
    });

    it("does not disclose link status without authentication", async () => {
        mockAuth.mockResolvedValue(null);
        const { GET } = await import("@/app/api/classrooms/[id]/line-teacher-link/route");
        const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "class-1" }) });

        expect(response.status).toBe(401);
        expect(mockGetTeacherLineLinkStatus).not.toHaveBeenCalled();
    });

    it("returns the logged-in classroom owner's LINE link status", async () => {
        const { GET } = await import("@/app/api/classrooms/[id]/line-teacher-link/route");
        const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "class-1" }) });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ linked: true });
        expect(mockGetTeacherLineLinkStatus).toHaveBeenCalledWith("teacher-1");
    });

    it("rejects revocation for another teacher's classroom", async () => {
        mockClassroomFindUnique.mockResolvedValue({ id: "class-1", teacherId: "teacher-2" });
        const { DELETE } = await import("@/app/api/classrooms/[id]/line-teacher-link/route");
        const response = await DELETE(new Request("http://localhost", { method: "DELETE" }), { params: Promise.resolve({ id: "class-1" }) });

        expect(response.status).toBe(403);
        expect(mockRevokeTeacherLineAccountLink).not.toHaveBeenCalled();
    });

    it("revokes the logged-in teacher's LINE link and audits it", async () => {
        const { DELETE } = await import("@/app/api/classrooms/[id]/line-teacher-link/route");
        const response = await DELETE(new Request("http://localhost", { method: "DELETE" }), { params: Promise.resolve({ id: "class-1" }) });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ revoked: true });
        expect(mockRevokeTeacherLineAccountLink).toHaveBeenCalledWith("teacher-1");
        expect(mockLogAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "line.teacher.account_link.revoked", targetId: "class-1" }));
    });
});
