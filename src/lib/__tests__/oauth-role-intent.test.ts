import { describe, expect, it } from "vitest";
import { decodeOAuthRoleIntent, encodeOAuthRoleIntent } from "@/lib/auth/oauth-role-intent-cookie";

describe("oauth role intent cookie", () => {
    const secret = "test-secret-at-least-32-chars-long!!";

    it("round-trips role and expires", () => {
        const raw = encodeOAuthRoleIntent("TEACHER", secret);
        const decoded = decodeOAuthRoleIntent(raw, secret);
        expect(decoded?.role).toBe("TEACHER");
    });

    it("rejects tampered payload", () => {
        const raw = encodeOAuthRoleIntent("STUDENT", secret);
        const tampered = raw.replace(/^[^.]+/, "eJzz");
        expect(decodeOAuthRoleIntent(tampered, secret)).toBeNull();
    });

    it("rejects wrong secret", () => {
        const raw = encodeOAuthRoleIntent("STUDENT", secret);
        expect(decodeOAuthRoleIntent(raw, "other-secret-other-secret-other")).toBeNull();
    });
});
