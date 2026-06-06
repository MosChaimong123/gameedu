import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const handleLineWebhookEvents = vi.fn();
const logAuditEvent = vi.fn();

vi.mock("@/lib/line-bot/handlers", () => ({
    handleLineWebhookEvents,
}));

vi.mock("@/lib/security/audit-log", () => ({
    logAuditEvent,
}));

vi.mock("@/lib/line-bot/config", () => ({
    isLineBotEnabled: () => true,
    getLineChannelSecret: () => "test-channel-secret",
}));

function signBody(body: string, secret: string): string {
    return createHmac("sha256", secret).update(body).digest("base64");
}

describe("POST /api/webhooks/line", () => {
    beforeEach(() => {
        handleLineWebhookEvents.mockReset();
        logAuditEvent.mockReset();
        process.env.LINE_CHANNEL_SECRET = "test-channel-secret";
        process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-access-token";
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("rejects missing signature", async () => {
        const { POST } = await import("@/app/api/webhooks/line/route");
        const res = await POST(
            new Request("http://localhost/api/webhooks/line", {
                method: "POST",
                body: "{}",
            })
        );
        expect(res.status).toBe(400);
    });

    it("accepts valid signature and forwards events", async () => {
        handleLineWebhookEvents.mockResolvedValue(undefined);

        const payload = JSON.stringify({
            events: [{ type: "message", message: { type: "text", text: "ping" } }],
        });
        const signature = signBody(payload, "test-channel-secret");

        const { POST } = await import("@/app/api/webhooks/line/route");
        const res = await POST(
            new Request("http://localhost/api/webhooks/line", {
                method: "POST",
                headers: { "x-line-signature": signature },
                body: payload,
            })
        );

        expect(res.status).toBe(200);
        expect(handleLineWebhookEvents).toHaveBeenCalledTimes(1);
        expect(logAuditEvent).toHaveBeenCalledWith({
            action: "line.webhook.received",
            category: "line",
            status: "success",
            targetType: "LineWebhook",
            metadata: {
                eventCount: 1,
            },
        });
    });
});
