import { afterEach, describe, expect, it } from "vitest";
import { resolveBrowserRedirectOrigin } from "@/lib/resolve-browser-redirect-origin";

describe("resolveBrowserRedirectOrigin", () => {
    const prev = { ...process.env };

    afterEach(() => {
        process.env.NEXT_PUBLIC_APP_URL = prev.NEXT_PUBLIC_APP_URL;
        process.env.NEXTAUTH_URL = prev.NEXTAUTH_URL;
        process.env.AUTH_URL = prev.AUTH_URL;
    });

    it("prefers NEXT_PUBLIC_APP_URL over internal request URL", () => {
        process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
        delete process.env.NEXTAUTH_URL;
        delete process.env.AUTH_URL;
        const o = resolveBrowserRedirectOrigin("https://0.0.0.0:10000/auth/complete-oauth");
        expect(o).toBe("https://app.example.com");
    });

    it("falls back to localhost when request is 0.0.0.0 and env unset", () => {
        delete process.env.NEXT_PUBLIC_APP_URL;
        delete process.env.NEXTAUTH_URL;
        delete process.env.AUTH_URL;
        const o = resolveBrowserRedirectOrigin("http://0.0.0.0:3000/foo");
        expect(o).toBe("http://localhost:3000");
    });
});
