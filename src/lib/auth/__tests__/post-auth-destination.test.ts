import { describe, expect, it } from "vitest";

import {
    getDefaultPostAuthPath,
    normalizePostAuthRole,
    resolvePostAuthDestination,
} from "@/lib/auth/post-auth-destination";

describe("post auth destination helpers", () => {
    it("normalizes string roles from prisma/session", () => {
        expect(normalizePostAuthRole("TEACHER")).toBe("TEACHER");
        expect(normalizePostAuthRole("unexpected")).toBeUndefined();
        expect(getDefaultPostAuthPath(normalizePostAuthRole("unexpected"))).toBe("/dashboard");
    });

    it("returns role-based defaults", () => {
        expect(getDefaultPostAuthPath("STUDENT")).toBe("/student/home");
        expect(getDefaultPostAuthPath("ADMIN")).toBe("/admin");
        expect(getDefaultPostAuthPath("TEACHER")).toBe("/dashboard");
        expect(getDefaultPostAuthPath("USER")).toBe("/dashboard");
        expect(getDefaultPostAuthPath(undefined)).toBe("/dashboard");
    });

    it("prefers a safe same-origin callbackUrl over role defaults", () => {
        expect(
            resolvePostAuthDestination(
                "TEACHER",
                "http://localhost:3000/dashboard/my-sets?tab=recent",
                "http://localhost:3000"
            )
        ).toBe("/dashboard/my-sets?tab=recent");
    });

    it("falls back to role defaults when callbackUrl is missing or unsafe", () => {
        expect(resolvePostAuthDestination("STUDENT", null, "http://localhost:3000")).toBe("/student/home");
        expect(
            resolvePostAuthDestination("ADMIN", "https://evil.example/phish", "http://localhost:3000")
        ).toBe("/admin");
    });
});
