import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockLineStudentAccountLinkFindMany = vi.fn();
const mockReminderDeliveryFindMany = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
    db: {
        classroom: {
            findUnique: mockClassroomFindUnique,
        },
        lineStudentAccountLink: {
            findMany: mockLineStudentAccountLinkFindMany,
        },
        lineAssignmentReminderDelivery: {
            findMany: mockReminderDeliveryFindMany,
        },
    },
    getOptionalDbModel: (name: string) =>
        name === "lineAssignmentReminderDelivery"
            ? { findMany: mockReminderDeliveryFindMany }
            : null,
}));

const PLUS_TEACHER = { role: "TEACHER", plan: "PLUS", planStatus: "ACTIVE", planExpiry: null };
const FREE_TEACHER = { role: "TEACHER", plan: "FREE", planStatus: null, planExpiry: null };

describe("GET /api/classrooms/[id]/line-readiness/export", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        mockLineStudentAccountLinkFindMany.mockResolvedValue([
            { studentId: "student-1", lineUserId: "line-user-1" },
        ]);
        mockReminderDeliveryFindMany.mockResolvedValue([
            {
                classroomId: "class-1",
                reminderType: "OVERDUE",
                targetCount: 3,
                sentAt: new Date("2026-06-05T09:00:00.000Z"),
            },
        ]);
    });

    it("rejects unauthenticated requests", async () => {
        mockAuth.mockResolvedValue(null);

        const { GET } = await import("@/app/api/classrooms/[id]/line-readiness/export/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1" }),
        });

        expect(res.status).toBe(401);
        expect(mockClassroomFindUnique).not.toHaveBeenCalled();
    });

    it("rejects free plan teachers", async () => {
        mockClassroomFindUnique.mockResolvedValue({
            id: "class-1",
            name: "M1/1",
            teacherId: "teacher-1",
            teacher: FREE_TEACHER,
            lineBotGroups: [],
            students: [],
        });

        const { GET } = await import("@/app/api/classrooms/[id]/line-readiness/export/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1" }),
        });

        expect(res.status).toBe(403);
    });

    it("exports classroom readiness and linked students as csv", async () => {
        mockClassroomFindUnique.mockResolvedValue({
            id: "class-1",
            name: "M1/1",
            teacherId: "teacher-1",
            teacher: PLUS_TEACHER,
            lineBotGroups: [
                { id: "group-1", lineGroupId: "g1", name: "M1 Room" },
                { id: "group-2", lineGroupId: "g2", name: "" },
            ],
            students: [
                { id: "student-1", order: 1, name: "Alice", nickname: "A", loginCode: "S123" },
                { id: "student-2", order: 2, name: "Bob", nickname: null, loginCode: "S456" },
            ],
        });

        const { GET } = await import("@/app/api/classrooms/[id]/line-readiness/export/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1" }),
        });
        const text = await res.text();
        const lines = text.split("\n");

        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Disposition")).toContain("M1-1-line-readiness.csv");
        expect(lines).toHaveLength(3);
        expect(lines[0]).toContain("groupNames");
        expect(lines[0]).toContain("lineLinked");
        expect(lines[1]).toContain("Alice");
        expect(lines[1]).toContain("true");
        expect(lines[1]).toContain("50");
        expect(lines[1]).toContain("OVERDUE");
        expect(lines[1]).toContain("M1 Room | g2");
        expect(lines[2]).toContain("Bob");
        expect(lines[2]).toContain("false");
    });

    it("works without reminder delivery model data", async () => {
        mockClassroomFindUnique.mockResolvedValue({
            id: "class-1",
            name: "M1/1",
            teacherId: "teacher-1",
            teacher: PLUS_TEACHER,
            lineBotGroups: [],
            students: [{ id: "student-1", order: 1, name: "Alice", nickname: null, loginCode: "S123" }],
        });
        mockReminderDeliveryFindMany.mockRejectedValue(new Error("missing model"));

        const { GET } = await import("@/app/api/classrooms/[id]/line-readiness/export/route");
        const res = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1" }),
        });
        const text = await res.text();

        expect(res.status).toBe(200);
        expect(text).toContain("Alice");
    });
});
