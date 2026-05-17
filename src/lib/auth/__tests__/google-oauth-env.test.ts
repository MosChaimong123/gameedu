import { afterEach, describe, expect, it } from "vitest";
import { getAuthEnvDiagnostics, isGoogleOAuthConfigured } from "@/lib/auth/google-oauth-env";

describe("google-oauth-env", () => {
    const original = { ...process.env };

    afterEach(() => {
        process.env = { ...original };
    });

    it("returns true when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set", () => {
        process.env = {
            ...original,
            GOOGLE_CLIENT_ID: "id",
            GOOGLE_CLIENT_SECRET: "secret",
            AUTH_GOOGLE_ID: "",
            AUTH_GOOGLE_SECRET: "",
        };
        expect(isGoogleOAuthConfigured()).toBe(true);
    });

    it("returns true when AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET are set", () => {
        process.env = {
            ...original,
            GOOGLE_CLIENT_ID: "",
            GOOGLE_CLIENT_SECRET: "",
            AUTH_GOOGLE_ID: "id",
            AUTH_GOOGLE_SECRET: "secret",
        };
        expect(isGoogleOAuthConfigured()).toBe(true);
    });

    it("returns false when either credential is missing", () => {
        process.env = {
            ...original,
            GOOGLE_CLIENT_ID: "id",
            GOOGLE_CLIENT_SECRET: "",
        };
        expect(isGoogleOAuthConfigured()).toBe(false);
    });

    it("reports diagnostics without exposing secrets", () => {
        process.env = {
            ...original,
            AUTH_SECRET: "secret",
            NEXTAUTH_URL: "https://www.example.com",
            NEXT_PUBLIC_APP_URL: "https://www.example.com",
            GOOGLE_CLIENT_ID: "",
            GOOGLE_CLIENT_SECRET: "",
        };
        expect(getAuthEnvDiagnostics()).toEqual({
            hasAuthSecret: true,
            hasNextAuthUrl: true,
            nextAuthUrlValid: true,
            hasPublicAppUrl: true,
            googleOAuthConfigured: false,
        });
    });
});
