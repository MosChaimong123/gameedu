import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockIsTeacherOrAdmin = vi.fn();
const mockAssignmentFindUnique = vi.fn();
const mockSendNotification = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/role-guards", () => ({
    isTeacherOrAdmin: mockIsTeacherOrAdmin,
}));

vi.mock("@/lib/db", () => ({
    db: {
        assignment: {
            findUnique: mockAssignmentFindUnique,
        },
    },
}));

vi.mock("@/lib/notifications", () => ({
    sendNotification: mockSendNotification,
}));

describe("POST /api/classrooms/[id]/assignments/[assignmentId]/reminders", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        mockIsTeacherOrAdmin.mockReturnValue(true);
        mockSendNotification.mockResolvedValue({});
        mockAssignmentFindUnique.mockResolvedValue({
            id: "assignment-1",
            name: "Quiz 1",
            type: "quiz",
            deadline: new Date("2026-06-01T12:00:00.000Z"),
            classroom: {
                id: "class-1",
                teacherId: "teacher-1",
                students: [
                    { id: "student-1", loginCode: "AAA111" },
                    { id: "student-2", loginCode: "BBB222" },
                    { id: "student-3", loginCode: "CCC333" },
                ],
            },
            submissions: [{ studentId: "student-2" }],
        });
    });

    it("sends reminders only to students missing the assignment", async () => {
        const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/reminders/route");
        const res = await POST(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }),
        });

        expect(res.status).toBe(200);
        expect(mockSendNotification).toHaveBeenCalledTimes(2);
        expect(mockSendNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                studentId: "student-1",
                type: "ASSIGNMENT",
                link: "/student/AAA111/quiz/assignment-1",
                i18n: expect.objectContaining({
                    titleKey: "notifAssignmentReminderTitle",
                    messageKey: "notifAssignmentReminderBodyDue",
                }),
            })
        );
        expect(mockSendNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                studentId: "student-3",
                link: "/student/CCC333/quiz/assignment-1",
            })
        );
        expect(await res.json()).toEqual({ success: true, targetCount: 2 });
    });

    it("returns 403 when the assignment classroom belongs to another teacher", async () => {
        mockAssignmentFindUnique.mockResolvedValueOnce({
            id: "assignment-1",
            name: "Quiz 1",
            type: "quiz",
            deadline: null,
            classroom: {
                id: "class-1",
                teacherId: "teacher-2",
                students: [],
            },
            submissions: [],
        });

        const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/reminders/route");
        const res = await POST(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }),
        });

        expect(res.status).toBe(403);
        expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it("returns 401 when unauthenticated", async () => {
        mockAuth.mockResolvedValueOnce(null);
        const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/reminders/route");
        const res = await POST(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }),
        });

        expect(res.status).toBe(401);
        expect(mockAssignmentFindUnique).not.toHaveBeenCalled();
    });
});
