import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockListRecentAuditEvents = vi.fn();
const mockReminderDeliveryFindMany = vi.fn();
const mockGetLineChannelSecret = vi.fn();
const mockGetLineChannelAccessToken = vi.fn();
const mockGetLineClassroomBindingSecret = vi.fn();
const mockGetLineReminderCronSecret = vi.fn();
const mockGetLineBotChatUrl = vi.fn();
const mockIsLineBotEnabled = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/security/audit-log", () => ({
    listRecentAuditEvents: mockListRecentAuditEvents,
}));

vi.mock("@/lib/db", () => ({
    getOptionalDbModel: (name: string) =>
        name === "lineAssignmentReminderDelivery"
            ? { findMany: mockReminderDeliveryFindMany }
            : null,
}));

vi.mock("@/lib/line-bot/config", () => ({
    getLineBotChatUrl: mockGetLineBotChatUrl,
    getLineChannelAccessToken: mockGetLineChannelAccessToken,
    getLineChannelSecret: mockGetLineChannelSecret,
    getLineClassroomBindingSecret: mockGetLineClassroomBindingSecret,
    getLineReminderCronSecret: mockGetLineReminderCronSecret,
    isLineBotEnabled: mockIsLineBotEnabled,
}));

describe("GET /api/health/line", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_APP_URL = "https://www.teachplayedu.com";
        delete process.env.GEMINI_API_KEY;
        mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
        mockIsLineBotEnabled.mockReturnValue(true);
        mockGetLineChannelSecret.mockReturnValue("secret");
        mockGetLineChannelAccessToken.mockReturnValue("token");
        mockGetLineClassroomBindingSecret.mockReturnValue("binding");
        mockGetLineReminderCronSecret.mockReturnValue("cron");
        mockGetLineBotChatUrl.mockReturnValue("https://line.me/R/ti/p/@bot");
        mockListRecentAuditEvents
            .mockResolvedValueOnce([
                {
                    action: "line.submission.create",
                    status: "success",
                    reason: null,
                    targetType: "lineSubmission",
                    targetId: "submission-1",
                    timestamp: new Date("2026-06-06T07:00:00.000Z"),
                },
                {
                    action: "line.classroom.bind",
                    status: "rejected",
                    reason: "invalid_token",
                    targetType: "classroom",
                    targetId: "class-1",
                    timestamp: new Date("2026-06-06T06:00:00.000Z"),
                },
            ])
            .mockResolvedValueOnce([
                {
                    action: "line.webhook.received",
                    status: "success",
                    reason: null,
                    timestamp: new Date("2026-06-06T07:05:00.000Z"),
                    metadata: { eventCount: 2 },
                },
            ])
            .mockResolvedValueOnce([
                {
                    action: "line.reminder_job.run",
                    status: "success",
                    reason: null,
                    timestamp: new Date("2026-06-06T05:30:00.000Z"),
                },
            ]);
        mockReminderDeliveryFindMany.mockResolvedValue([
            {
                id: "delivery-1",
                classroomId: "class-1",
                reminderType: "due_today",
                targetCount: 4,
                sentAt: new Date("2026-06-06T05:00:00.000Z"),
            },
        ]);
    });

    it("rejects unauthenticated requests", async () => {
        mockAuth.mockResolvedValue(null);

        const { GET } = await import("@/app/api/health/line/route");
        const response = await GET();

        expect(response.status).toBe(401);
    });

    it("rejects non-admin requests", async () => {
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });

        const { GET } = await import("@/app/api/health/line/route");
        const response = await GET();

        expect(response.status).toBe(403);
    });

    it("returns healthy LINE diagnostics for admins", async () => {
        const { GET } = await import("@/app/api/health/line/route");
        const response = await GET();
        const body = (await response.json()) as Record<string, unknown>;

        expect(response.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.status).toBe("healthy");
        expect(body.checks).toMatchObject({
            enabled: true,
            channelSecret: "configured",
            channelAccessToken: "configured",
            bindingSecret: "configured",
            cronSecret: "configured",
            appUrl: "configured",
            botChatUrl: "configured",
            geminiApiKey: "missing",
            webhookPath: "/api/webhooks/line",
        });
        expect(body.webhook).toMatchObject({
            lastAuditAction: "line.webhook.received",
            lastAuditStatus: "success",
            lastEventCount: 2,
        });
        expect(body.reminders).toMatchObject({
            lastDeliveryType: "due_today",
            lastDeliveryTargetCount: 4,
            lastCronRunStatus: "success",
        });
        expect(body.errors).toMatchObject({
            lastLineErrorAction: "line.classroom.bind",
            lastLineErrorReason: "invalid_token",
        });
        const recentEvents = body.recentEvents as Array<Record<string, unknown>>;
        expect(recentEvents[0]).toMatchObject({
            action: "line.submission.create",
            status: "success",
            reason: null,
            targetType: "lineSubmission",
            targetId: "submission-1",
            timestamp: "2026-06-06T07:00:00.000Z",
        });
    });

    it("returns degraded status when critical LINE secrets are missing", async () => {
        mockGetLineReminderCronSecret.mockReturnValue(undefined);

        const { GET } = await import("@/app/api/health/line/route");
        const response = await GET();
        const body = (await response.json()) as Record<string, unknown>;

        expect(response.status).toBe(503);
        expect(body.ok).toBe(false);
        expect(body.status).toBe("degraded");
        expect(body.checks).toMatchObject({
            cronSecret: "missing",
        });
    });
});
