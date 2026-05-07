import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockGetAppEnv = vi.fn();
const mockGetThaiBillingProviderId = vi.fn();
const mockOmiseRetrieveCharge = vi.fn();
const mockApplyPlusFromPaidOmiseCharge = vi.fn();
const mockCookies = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/env", () => ({
    getAppEnv: mockGetAppEnv,
}));

vi.mock("@/lib/billing/thai-billing-env", () => ({
    getThaiBillingProviderId: mockGetThaiBillingProviderId,
}));

vi.mock("@/lib/billing/omise-api", () => ({
    omiseRetrieveCharge: mockOmiseRetrieveCharge,
}));

vi.mock("@/lib/billing/omise-entitlement", () => ({
    applyPlusFromPaidOmiseCharge: mockApplyPlusFromPaidOmiseCharge,
}));

vi.mock("next/headers", () => ({
    cookies: mockCookies,
}));

const OMISE_COOKIE = "ge_omise_charge";

function makeJar(chargeId: string | undefined) {
    return {
        get: (key: string) =>
            key === OMISE_COOKIE && chargeId ? { value: chargeId } : undefined,
    };
}

async function callPost() {
    const mod = await import("@/app/api/billing/omise/reconcile/route");
    return mod.POST();
}

describe("billing omise reconcile route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        mockAuth.mockResolvedValue({ user: { id: "user-1", role: "TEACHER" } });
        mockGetAppEnv.mockReturnValue({ OMISE_SECRET_KEY: "skey_test_xxx" });
        mockGetThaiBillingProviderId.mockReturnValue("omise");
    });

    it("returns no_pending_charge when cookie is missing", async () => {
        mockCookies.mockResolvedValue(makeJar(undefined));

        const res = await callPost();
        expect(res.status).toBe(200);
        const body = (await res.json()) as { outcome: string };
        expect(body.outcome).toBe("no_pending_charge");
    });

    it("applies PLUS and returns outcome=applied for a paid charge", async () => {
        mockCookies.mockResolvedValue(makeJar("chrg_test_paid"));
        mockOmiseRetrieveCharge.mockResolvedValue({
            ok: true,
            charge: {
                object: "charge",
                id: "chrg_test_paid",
                status: "successful",
                paid: true,
                metadata: { user_id: "user-1", interval: "month" },
            },
        });
        mockApplyPlusFromPaidOmiseCharge.mockResolvedValue("applied");

        const res = await callPost();
        expect(res.status).toBe(200);
        const body = (await res.json()) as Record<string, unknown>;
        expect(body.ok).toBe(true);
        expect(body.outcome).toBe("applied");
        expect(body.chargeStatus).toBe("successful");
        expect(body.chargePaid).toBe(true);
        const setCookie = res.headers.get("set-cookie") ?? "";
        expect(setCookie.toLowerCase()).toContain(OMISE_COOKIE);
        expect(setCookie.toLowerCase()).toMatch(/expires|max-age=0/);
    });

    it("keeps the cookie when the charge is still pending (skipped_not_paid)", async () => {
        mockCookies.mockResolvedValue(makeJar("chrg_test_pending"));
        mockOmiseRetrieveCharge.mockResolvedValue({
            ok: true,
            charge: {
                object: "charge",
                id: "chrg_test_pending",
                status: "pending",
                paid: false,
                metadata: { user_id: "user-1", interval: "month" },
            },
        });
        mockApplyPlusFromPaidOmiseCharge.mockResolvedValue("skipped_not_paid");

        const res = await callPost();
        expect(res.status).toBe(200);
        const body = (await res.json()) as Record<string, unknown>;
        expect(body.outcome).toBe("skipped_not_paid");
        expect(body.chargeStatus).toBe("pending");
        // cookie NOT cleared so the browser can poll
        const setCookie = res.headers.get("set-cookie") ?? "";
        expect(setCookie).not.toMatch(/expires|max-age=0/i);
    });

    it("rejects mismatched charge ownership", async () => {
        mockCookies.mockResolvedValue(makeJar("chrg_test_other"));
        mockOmiseRetrieveCharge.mockResolvedValue({
            ok: true,
            charge: {
                object: "charge",
                id: "chrg_test_other",
                status: "pending",
                metadata: { user_id: "different-user" },
            },
        });

        const res = await callPost();
        expect(res.status).toBe(403);
        const body = (await res.json()) as Record<string, unknown>;
        expect((body as { error?: { code?: string } }).error?.code).toBe(
            "BILLING_CHARGE_SESSION_MISMATCH",
        );
    });

    it("returns 502 and keeps cookie when Omise retrieve fails", async () => {
        mockCookies.mockResolvedValue(makeJar("chrg_test_x"));
        mockOmiseRetrieveCharge.mockResolvedValue({
            ok: false,
            message: "boom",
        });

        const res = await callPost();
        expect(res.status).toBe(502);
        const setCookie = res.headers.get("set-cookie") ?? "";
        expect(setCookie).not.toMatch(/expires|max-age=0/i);
    });
});
