import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockGetAppEnv = vi.fn();
const mockGetThaiBillingProviderId = vi.fn();
const mockResolvePublicAppOrigin = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/env", () => ({
    getAppEnv: mockGetAppEnv,
}));

vi.mock("@/lib/billing/thai-billing-env", () => ({
    getThaiBillingProviderId: mockGetThaiBillingProviderId,
}));

vi.mock("@/lib/billing/resolve-public-url", () => ({
    resolvePublicAppOrigin: mockResolvePublicAppOrigin,
}));

const baseEnv = {
    OMISE_SECRET_KEY: undefined as string | undefined,
    NEXT_PUBLIC_OMISE_PUBLIC_KEY: undefined as string | undefined,
    OMISE_PLUS_MONTHLY_SATANG: undefined as string | undefined,
    OMISE_PLUS_YEARLY_SATANG: undefined as string | undefined,
};

function readyEnv(overrides: Partial<typeof baseEnv> = {}) {
    return {
        ...baseEnv,
        OMISE_SECRET_KEY: "skey_test_xxx",
        NEXT_PUBLIC_OMISE_PUBLIC_KEY: "pkey_test_xxx",
        OMISE_PLUS_MONTHLY_SATANG: "29000",
        OMISE_PLUS_YEARLY_SATANG: "290000",
        ...overrides,
    };
}

async function callGet() {
    const mod = await import("@/app/api/billing/thai/status/route");
    return mod.GET();
}

describe("billing thai status route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it("rejects unauthenticated callers", async () => {
        mockAuth.mockResolvedValue(null);
        mockGetAppEnv.mockReturnValue(baseEnv);
        mockGetThaiBillingProviderId.mockReturnValue(undefined);
        mockResolvePublicAppOrigin.mockReturnValue("https://www.teachplayedu.com");

        const res = await callGet();
        expect(res.status).toBe(401);
    });

    it("rejects non-staff users (STUDENT)", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
        mockGetAppEnv.mockReturnValue(baseEnv);
        mockGetThaiBillingProviderId.mockReturnValue("omise");
        mockResolvePublicAppOrigin.mockReturnValue("https://www.teachplayedu.com");

        const res = await callGet();
        expect(res.status).toBe(403);
    });

    it("reports ready=true and redacted-but-present env when fully configured", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        mockGetAppEnv.mockReturnValue(readyEnv());
        mockGetThaiBillingProviderId.mockReturnValue("omise");
        mockResolvePublicAppOrigin.mockReturnValue("https://www.teachplayedu.com");

        const res = await callGet();
        expect(res.status).toBe(200);
        const body = (await res.json()) as Record<string, unknown> & {
            omise: Record<string, unknown>;
        };

        expect(body.ready).toBe(true);
        expect(body.provider).toBe("omise");
        expect(body.appOrigin).toBe("https://www.teachplayedu.com");
        expect(body.issues).toEqual([]);
        expect(body.omise.hasSecretKey).toBe(true);
        expect(body.omise.secretKeyMode).toBe("test");
        expect(body.omise.hasPublicKey).toBe(true);
        expect(body.omise.publicKeyMode).toBe("test");
        expect(body.omise.monthlySatang).toBe(29000);
        expect(body.omise.yearlySatang).toBe(290000);
        expect(JSON.stringify(body)).not.toContain("skey_test_xxx");
        expect(JSON.stringify(body)).not.toContain("pkey_test_xxx");
    });

    it("flags missing OMISE_SECRET_KEY when provider=omise", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
        mockGetAppEnv.mockReturnValue(readyEnv({ OMISE_SECRET_KEY: undefined }));
        mockGetThaiBillingProviderId.mockReturnValue("omise");
        mockResolvePublicAppOrigin.mockReturnValue("https://www.teachplayedu.com");

        const res = await callGet();
        expect(res.status).toBe(200);
        const body = (await res.json()) as { ready: boolean; issues: string[] };

        expect(body.ready).toBe(false);
        expect(body.issues).toContain("OMISE_SECRET_KEY missing");
    });

    it("flags Omise key mode mismatch (test secret + live public)", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        mockGetAppEnv.mockReturnValue(
            readyEnv({
                OMISE_SECRET_KEY: "skey_test_xxx",
                NEXT_PUBLIC_OMISE_PUBLIC_KEY: "pkey_live_xxx",
            }),
        );
        mockGetThaiBillingProviderId.mockReturnValue("omise");
        mockResolvePublicAppOrigin.mockReturnValue("https://www.teachplayedu.com");

        const res = await callGet();
        const body = (await res.json()) as { ready: boolean; issues: string[] };

        expect(body.ready).toBe(false);
        expect(
            body.issues.some((m) => m.includes("Omise key mode mismatch")),
        ).toBe(true);
    });

    it("flags missing app origin", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        mockGetAppEnv.mockReturnValue(readyEnv());
        mockGetThaiBillingProviderId.mockReturnValue("omise");
        mockResolvePublicAppOrigin.mockReturnValue("");

        const res = await callGet();
        const body = (await res.json()) as { ready: boolean; issues: string[] };

        expect(body.ready).toBe(false);
        expect(body.issues).toContain("NEXT_PUBLIC_APP_URL / NEXTAUTH_URL not set");
    });

    it("flags BILLING_THAI_PROVIDER not set", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        mockGetAppEnv.mockReturnValue(baseEnv);
        mockGetThaiBillingProviderId.mockReturnValue(undefined);
        mockResolvePublicAppOrigin.mockReturnValue("https://www.teachplayedu.com");

        const res = await callGet();
        const body = (await res.json()) as { ready: boolean; issues: string[] };

        expect(body.ready).toBe(false);
        expect(body.issues).toContain("BILLING_THAI_PROVIDER not set");
    });

    it("flags an unimplemented BILLING_THAI_PROVIDER value", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        mockGetAppEnv.mockReturnValue(readyEnv());
        mockGetThaiBillingProviderId.mockReturnValue("scb");
        mockResolvePublicAppOrigin.mockReturnValue("https://www.teachplayedu.com");

        const res = await callGet();
        const body = (await res.json()) as { ready: boolean; issues: string[] };

        expect(body.ready).toBe(false);
        expect(
            body.issues.some((m) => m.includes('BILLING_THAI_PROVIDER="scb" not implemented')),
        ).toBe(true);
    });
});
