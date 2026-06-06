import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockLogAuditEvent = vi.fn();

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

vi.mock("@/lib/security/audit-log", () => ({
    logAuditEvent: mockLogAuditEvent,
}));

describe("POST /api/classrooms/[id]/line-upgrade-click", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        mockClassroomFindUnique.mockResolvedValue({
            id: "class-1",
            name: "M1/1",
            teacherId: "teacher-1",
        });
    });

    it("rejects unauthenticated requests", async () => {
        mockAuth.mockResolvedValue(null);

        const { POST } = await import("@/app/api/classrooms/[id]/line-upgrade-click/route");
        const response = await POST(new Request("http://localhost", { method: "POST" }), {
            params: Promise.resolve({ id: "class-1" }),
        });

        expect(response.status).toBe(401);
        expect(mockLogAuditEvent).not.toHaveBeenCalled();
    });

    it("rejects invalid source payload", async () => {
        const { POST } = await import("@/app/api/classrooms/[id]/line-upgrade-click/route");
        const response = await POST(
            new Request("http://localhost", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ source: "nope" }),
            }),
            {
                params: Promise.resolve({ id: "class-1" }),
            }
        );

        expect(response.status).toBe(400);
        expect(mockLogAuditEvent).not.toHaveBeenCalled();
    });

    it("writes billing audit event for valid upgrade prompt clicks", async () => {
        const { POST } = await import("@/app/api/classrooms/[id]/line-upgrade-click/route");
        const response = await POST(
            new Request("http://localhost", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ source: "line_panel_blocked_card" }),
            }),
            {
                params: Promise.resolve({ id: "class-1" }),
            }
        );

        expect(response.status).toBe(200);
        expect(mockLogAuditEvent).toHaveBeenCalledWith({
            actorUserId: "teacher-1",
            action: "billing.line_upgrade_prompt.clicked",
            category: "billing",
            targetType: "classroom",
            targetId: "class-1",
            metadata: {
                source: "line_panel_blocked_card",
                classroomName: "M1/1",
            },
        });
    });
});
