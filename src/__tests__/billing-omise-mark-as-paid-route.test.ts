import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockGetAppEnv = vi.fn();
const mockGetThaiBillingProviderId = vi.fn();
const mockOmiseRetrieveCharge = vi.fn();
const mockOmiseMarkChargeAsPaid = vi.fn();
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
    omiseMarkChargeAsPaid: mockOmiseMarkChargeAsPaid,
}));

vi.mock("@/lib/billing/omise-entitlement", () => ({
    applyPlusFromPaidOmiseCharge: mockApplyPlusFromPaidOmiseCharge,
}));

vi.mock("next/headers", () => ({
    cookies: mockCookies,
}));

const OMISE_COOKIE = "ge_omise_charge";

function jar(chargeId: string | undefined) {
    return {
        get: (key: string) =>
            key === OMISE_COOKIE && chargeId ? { value: chargeId } : undefined,
    };
}

async function callPost() {
    const mod = await import("@/app/api/billing/omise/mark-as-paid/route");
    return mod.POST();
}

describe("billing omise mark-as-paid route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        mockAuth.mockResolvedValue({ user: { id: "user-1", role: "TEACHER" } });
        mockGetAppEnv.mockReturnValue({ OMISE_SECRET_KEY: "skey_test_xxx" });
        mockGetThaiBillingProviderId.mockReturnValue("omise");
    });

    it("rejects in live mode", async () => {
        mockGetAppEnv.mockReturnValue({ OMISE_SECRET_KEY: "skey_live_xxx" });
        mockCookies.mockResolvedValue(jar("chrg_1"));
        const res = await callPost();
        expect(res.status).toBe(400);
    });

    it("rejects when not signed in", async () => {
        mockAuth.mockResolvedValue(null);
        mockCookies.mockResolvedValue(jar("chrg_1"));
        const res = await callPost();
        expect(res.status).toBe(401);
    });

    it("rejects students", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u", role: "STUDENT" } });
        mockCookies.mockResolvedValue(jar("chrg_1"));
        const res = await callPost();
        expect(res.status).toBe(403);
    });

    it("404 when no pending charge cookie", async () => {
        mockCookies.mockResolvedValue(jar(undefined));
        const res = await callPost();
        expect(res.status).toBe(404);
    });

    it("rejects when charge belongs to a different user", async () => {
        mockCookies.mockResolvedValue(jar("chrg_other"));
        mockOmiseRetrieveCharge.mockResolvedValue({
            ok: true,
            charge: {
                object: "charge",
                id: "chrg_other",
                metadata: { user_id: "different" },
            },
        });
        const res = await callPost();
        expect(res.status).toBe(403);
    });

    it("marks the charge paid and applies PLUS, clearing the cookie", async () => {
        mockCookies.mockResolvedValue(jar("chrg_paid"));
        mockOmiseRetrieveCharge
            .mockResolvedValueOnce({
                ok: true,
                charge: {
                    object: "charge",
                    id: "chrg_paid",
                    status: "pending",
                    paid: false,
                    metadata: { user_id: "user-1", interval: "month" },
                },
            })
            .mockResolvedValueOnce({
                ok: true,
                charge: {
                    object: "charge",
                    id: "chrg_paid",
                    status: "successful",
                    paid: true,
                    metadata: { user_id: "user-1", interval: "month" },
                },
            });
        mockOmiseMarkChargeAsPaid.mockResolvedValue({
            ok: true,
            charge: {
                object: "charge",
                id: "chrg_paid",
                status: "successful",
                paid: true,
                metadata: { user_id: "user-1", interval: "month" },
            },
        });
        mockApplyPlusFromPaidOmiseCharge.mockResolvedValue("applied");

        const res = await callPost();
        expect(res.status).toBe(200);
        const body = (await res.json()) as { ok: boolean; outcome: string };
        expect(body.outcome).toBe("applied");
        const setCookie = res.headers.get("set-cookie") ?? "";
        expect(setCookie.toLowerCase()).toContain(OMISE_COOKIE);
        expect(setCookie.toLowerCase()).toMatch(/expires|max-age=0/);
    });

    it("propagates the Omise error message when mark_as_paid fails", async () => {
        mockCookies.mockResolvedValue(jar("chrg_x"));
        mockOmiseRetrieveCharge.mockResolvedValue({
            ok: true,
            charge: {
                object: "charge",
                id: "chrg_x",
                metadata: { user_id: "user-1" },
            },
        });
        mockOmiseMarkChargeAsPaid.mockResolvedValue({
            ok: false,
            message: "charge not in pending state",
            httpStatus: 400,
        });

        const res = await callPost();
        expect(res.status).toBe(400);
        const body = (await res.json()) as { ok: boolean; error: string };
        expect(body.ok).toBe(false);
        expect(body.error).toContain("charge not in pending state");
    });
});
