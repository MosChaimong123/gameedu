import { afterEach, describe, expect, it } from "vitest";

describe("GET /api/auth/providers-status", () => {
    const original = { ...process.env };

    afterEach(() => {
        process.env = { ...original };
    });

    it("returns google and credentials flags from runtime env", async () => {
        process.env = {
            ...original,
            AUTH_SECRET: "test-auth-secret",
            GOOGLE_CLIENT_ID: "google-id",
            GOOGLE_CLIENT_SECRET: "google-secret",
        };

        const { GET } = await import("@/app/api/auth/providers-status/route");
        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.google).toBe(true);
        expect(body.credentials).toBe(true);
        expect(body.diagnostics.googleOAuthConfigured).toBe(true);
    });

    it("returns google false when OAuth env is incomplete", async () => {
        process.env = {
            ...original,
            AUTH_SECRET: "test-auth-secret",
            GOOGLE_CLIENT_ID: "only-id",
            GOOGLE_CLIENT_SECRET: "",
        };

        const { GET } = await import("@/app/api/auth/providers-status/route");
        const body = await (await GET()).json();

        expect(body.google).toBe(false);
        expect(body.diagnostics.googleOAuthConfigured).toBe(false);
    });
});
