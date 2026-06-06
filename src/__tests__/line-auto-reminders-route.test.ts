import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetLineReminderCronSecret = vi.fn();
const mockIsLineBotEnabled = vi.fn();
const mockRunLineAutoReminders = vi.fn();
const mockLogAuditEvent = vi.fn();

vi.mock("@/lib/line-bot/config", () => ({
    getLineReminderCronSecret: mockGetLineReminderCronSecret,
    isLineBotEnabled: mockIsLineBotEnabled,
}));

vi.mock("@/lib/line-bot/auto-reminders", () => ({
    runLineAutoReminders: mockRunLineAutoReminders,
}));

vi.mock("@/lib/security/audit-log", () => ({
    logAuditEvent: mockLogAuditEvent,
}));

describe("POST /api/jobs/line-reminders", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsLineBotEnabled.mockReturnValue(true);
        mockGetLineReminderCronSecret.mockReturnValue("cron-secret");
        mockRunLineAutoReminders.mockResolvedValue({
            scannedGroups: 1,
            candidateCount: 1,
            sentCount: 1,
            skippedDuplicateCount: 0,
            failedCount: 0,
        });
    });

    it("rejects requests without the cron secret", async () => {
        const { POST } = await import("@/app/api/jobs/line-reminders/route");
        const response = await POST(new Request("https://test.local/api/jobs/line-reminders", { method: "POST" }));

        expect(response.status).toBe(403);
        expect(mockRunLineAutoReminders).not.toHaveBeenCalled();
    });

    it("runs the reminder job with a valid bearer secret", async () => {
        const { POST } = await import("@/app/api/jobs/line-reminders/route");
        const response = await POST(
            new Request("https://test.local/api/jobs/line-reminders", {
                method: "POST",
                headers: { authorization: "Bearer cron-secret" },
            })
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            success: true,
            sentCount: 1,
        });
        expect(mockRunLineAutoReminders).toHaveBeenCalledOnce();
        expect(mockLogAuditEvent).toHaveBeenCalledWith({
            action: "line.reminder_job.run",
            category: "line",
            status: "success",
            targetType: "LineReminderJob",
            metadata: {
                scannedGroups: 1,
                candidateCount: 1,
                sentCount: 1,
                skippedDuplicateCount: 0,
                failedCount: 0,
            },
        });
    });
});
