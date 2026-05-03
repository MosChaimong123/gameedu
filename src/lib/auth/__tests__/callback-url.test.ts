import { describe, expect, it } from "vitest";

import { appendCallbackUrl, getSafeAuthCallbackPath } from "@/lib/auth/callback-url";

describe("auth callback url helpers", () => {
    it("accepts relative callback paths", () => {
        expect(getSafeAuthCallbackPath("/dashboard/my-sets?tab=recent", "http://localhost:3000")).toBe(
            "/dashboard/my-sets?tab=recent"
        );
    });

    it("accepts same-origin absolute callback urls", () => {
        expect(
            getSafeAuthCallbackPath(
                "http://localhost:3000/dashboard/classrooms?id=room-1",
                "http://localhost:3000"
            )
        ).toBe("/dashboard/classrooms?id=room-1");
    });

    it("rejects cross-origin and malformed callback urls", () => {
        expect(getSafeAuthCallbackPath("https://evil.example/phish", "http://localhost:3000")).toBeNull();
        expect(getSafeAuthCallbackPath("javascript:alert(1)", "http://localhost:3000")).toBeNull();
        expect(getSafeAuthCallbackPath("//evil.example/phish", "http://localhost:3000")).toBeNull();
    });

    it("appends callbackUrl query parameters without breaking existing params", () => {
        expect(appendCallbackUrl("/login?audience=teacher", "/dashboard")).toBe(
            "/login?audience=teacher&callbackUrl=%2Fdashboard"
        );
        expect(appendCallbackUrl("/login", "/dashboard")).toBe("/login?callbackUrl=%2Fdashboard");
        expect(appendCallbackUrl("/login", null)).toBe("/login");
    });
});
