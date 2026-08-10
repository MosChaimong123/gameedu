import { describe, expect, it } from "vitest";

import {
    appendCallbackUrl,
    getSafeAuthCallbackPath,
    getSafeSameOriginPath,
} from "@/lib/auth/callback-url";

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

    it.each([
        "/dashboard",
        "/dashboard/my-sets",
        "/admin",
        "/admin/users?tab=active",
        "/student/home",
        "/student/home/profile#avatar",
    ])("accepts the protected post-auth route families: %s", (callbackUrl) => {
        expect(getSafeAuthCallbackPath(callbackUrl, "http://localhost:3000")).toBe(callbackUrl);
    });

    it.each(["/", "/login", "/api/health", "/dashboard-evil", "/student/homework"])(
        "rejects destinations outside the post-auth route allowlist: %s",
        (callbackUrl) => {
            expect(getSafeAuthCallbackPath(callbackUrl, "http://localhost:3000")).toBeNull();
        }
    );

    it("rejects cross-origin and malformed callback urls", () => {
        expect(getSafeAuthCallbackPath("https://evil.example/phish", "http://localhost:3000")).toBeNull();
        expect(getSafeAuthCallbackPath("javascript:alert(1)", "http://localhost:3000")).toBeNull();
        expect(getSafeAuthCallbackPath("//evil.example/phish", "http://localhost:3000")).toBeNull();
    });

    it.each([
        "/\\evil.example/dashboard",
        "/%5cevil.example/dashboard",
        "/%2fevil.example/dashboard",
        "/dashboard%0d%0aLocation:%20https://evil.example",
        "/dashboard%00",
        "/dashboard%",
        "//localhost:3000/dashboard",
        "http://user:password@localhost:3000/dashboard",
        "ftp://localhost:3000/dashboard",
        "http://[invalid/dashboard",
    ])("rejects URL parser confusion and encoded control payloads: %s", (callbackUrl) => {
        expect(getSafeAuthCallbackPath(callbackUrl, "http://localhost:3000")).toBeNull();
    });

    it("requires a trustworthy HTTP(S) base origin", () => {
        expect(getSafeAuthCallbackPath("/dashboard", null)).toBeNull();
        expect(getSafeAuthCallbackPath("/dashboard", "ftp://localhost:3000")).toBeNull();
        expect(getSafeAuthCallbackPath("/dashboard", "http://user:password@localhost:3000")).toBeNull();
    });

    it("can separately validate same-origin framework redirects", () => {
        expect(getSafeSameOriginPath("/login?error=role_required", "http://localhost:3000")).toBe(
            "/login?error=role_required"
        );
        expect(getSafeSameOriginPath("/\\evil.example", "http://localhost:3000")).toBeNull();
        expect(getSafeSameOriginPath("https://evil.example/login", "http://localhost:3000")).toBeNull();
    });

    it("appends callbackUrl query parameters without breaking existing params", () => {
        expect(appendCallbackUrl("/login?audience=teacher", "/dashboard")).toBe(
            "/login?audience=teacher&callbackUrl=%2Fdashboard"
        );
        expect(appendCallbackUrl("/login", "/dashboard")).toBe("/login?callbackUrl=%2Fdashboard");
        expect(appendCallbackUrl("/login", null)).toBe("/login");
    });
});
