import { afterEach, describe, expect, it, vi } from "vitest";

const originalGroupMutationFlag = process.env.LINE_GROUP_MUTATIONS_ENABLED;

afterEach(() => {
    if (originalGroupMutationFlag === undefined) {
        delete process.env.LINE_GROUP_MUTATIONS_ENABLED;
    } else {
        process.env.LINE_GROUP_MUTATIONS_ENABLED = originalGroupMutationFlag;
    }
    vi.resetModules();
});

describe("LINE group mutation containment flag", () => {
    it("defaults to disabled when the environment variable is absent", async () => {
        delete process.env.LINE_GROUP_MUTATIONS_ENABLED;
        const { isLineGroupMutationsEnabled } = await import("@/lib/line-bot/config");

        expect(isLineGroupMutationsEnabled()).toBe(false);
    });

    it("only enables group mutations for the explicit true value", async () => {
        process.env.LINE_GROUP_MUTATIONS_ENABLED = "true";
        const { isLineGroupMutationsEnabled } = await import("@/lib/line-bot/config");

        expect(isLineGroupMutationsEnabled()).toBe(true);
    });

    it("never falls back to ADMIN_SECRET for the reminder worker", async () => {
        delete process.env.LINE_REMINDER_CRON_SECRET;
        process.env.ADMIN_SECRET = "admin-only-secret";
        const { getLineReminderCronSecret } = await import("@/lib/line-bot/config");
        expect(getLineReminderCronSecret()).toBeUndefined();
    });

    it("rejects malformed LINE chat URLs", async () => {
        process.env.LINE_BOT_CHAT_URL = "javascript:alert(1)";
        const { getLineBotChatUrl } = await import("@/lib/line-bot/config");
        expect(getLineBotChatUrl()).toBeUndefined();
    });
});
