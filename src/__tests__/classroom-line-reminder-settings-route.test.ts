import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockSettingFindUnique = vi.fn();
const mockSettingUpsert = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
    db: {
        classroom: {
            findUnique: mockClassroomFindUnique,
        },
    },
    getOptionalDbModel: (name: string) =>
        name === "classroomLineReminderSetting"
            ? { findUnique: mockSettingFindUnique, upsert: mockSettingUpsert }
            : null,
}));

describe("classroom LINE reminder settings route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        mockClassroomFindUnique.mockResolvedValue({ id: "class-1", teacherId: "teacher-1" });
        mockSettingFindUnique.mockResolvedValue(null);
        mockSettingUpsert.mockImplementation((input) => Promise.resolve(input.create));
    });

    it("returns default weekly summary setting", async () => {
        const { GET } = await import("@/app/api/classrooms/[id]/line-reminder-settings/route");
        const response = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1" }),
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.setting).toMatchObject({
            classroomId: "class-1",
            enabled: false,
            weeklySummary: false,
        });
    });

    it("saves weekly summary toggle", async () => {
        const { PATCH } = await import("@/app/api/classrooms/[id]/line-reminder-settings/route");
        const response = await PATCH(
            new Request("http://localhost", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    enabled: true,
                    beforeDeadline1d: true,
                    dueToday: true,
                    overdue1d: true,
                    weeklySummary: true,
                }),
            }),
            {
                params: Promise.resolve({ id: "class-1" }),
            }
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.setting.weeklySummary).toBe(true);
        expect(mockSettingUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                update: expect.objectContaining({ weeklySummary: true }),
                select: expect.objectContaining({ weeklySummary: true }),
            })
        );
    });
});
