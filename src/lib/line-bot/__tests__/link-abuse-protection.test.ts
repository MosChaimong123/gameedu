import { afterEach, describe, expect, it } from "vitest";
import {
    beginLineLinkAttempt,
    recordFailedLineLinkAttempt,
    resetLineLinkAbuseProtectionForTests,
} from "@/lib/line-bot/link-abuse-protection";

describe("LINE link abuse protection", () => {
    afterEach(() => resetLineLinkAbuseProtectionForTests());

    it("locks a LINE user for 15 minutes after five failed attempts", async () => {
        const now = new Date("2026-07-27T12:00:00.000Z");
        for (let attempt = 0; attempt < 5; attempt += 1) {
            await expect(beginLineLinkAttempt({ kind: "student", lineUserId: "line-user-1", code: `00000${attempt}`, now })).resolves.toEqual({ allowed: true });
            await recordFailedLineLinkAttempt({ kind: "student", lineUserId: "line-user-1", now });
        }

        await expect(beginLineLinkAttempt({ kind: "student", lineUserId: "line-user-1", code: "999999", now })).resolves.toEqual({ allowed: false, reason: "LOCKED" });
        await expect(beginLineLinkAttempt({ kind: "student", lineUserId: "line-user-1", code: "999999", now: new Date(now.getTime() + 15 * 60 * 1000) })).resolves.toEqual({ allowed: true });
    });

    it("throttles guessing the same code across multiple LINE users without storing the raw code", async () => {
        const now = new Date("2026-07-27T12:00:00.000Z");
        for (let attempt = 0; attempt < 5; attempt += 1) {
            await expect(beginLineLinkAttempt({ kind: "teacher", lineUserId: `line-user-${attempt}`, code: "shared-opaque-code", now })).resolves.toEqual({ allowed: true });
        }

        await expect(beginLineLinkAttempt({ kind: "teacher", lineUserId: "line-user-6", code: "shared-opaque-code", now })).resolves.toEqual({ allowed: false, reason: "RATE_LIMITED" });
    });
});
