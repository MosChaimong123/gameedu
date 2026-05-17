import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockGetThaiBillingProviderId = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/billing/thai-billing-env", () => ({
    getThaiBillingProviderId: mockGetThaiBillingProviderId,
}));

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
        mockGetThaiBillingProviderId.mockReturnValue(undefined);

        const res = await callGet();
        expect(res.status).toBe(401);
    });

    it("rejects non-staff users (STUDENT)", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
        mockGetThaiBillingProviderId.mockReturnValue("mock");

        const res = await callGet();
        expect(res.status).toBe(403);
    });

    it("reports ready=true when BILLING_THAI_PROVIDER=mock", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        mockGetThaiBillingProviderId.mockReturnValue("mock");

        const res = await callGet();
        expect(res.status).toBe(200);
        const body = (await res.json()) as {
            ready: boolean;
            provider: string;
            issues: string[];
        };

        expect(body.ready).toBe(true);
        expect(body.provider).toBe("mock");
        expect(body.issues).toEqual([]);
    });

    it("flags unsupported provider values", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        mockGetThaiBillingProviderId.mockReturnValue("omise");

        const res = await callGet();
        const body = (await res.json()) as { ready: boolean; issues: string[] };

        expect(body.ready).toBe(false);
        expect(body.issues.some((m) => m.includes("omise"))).toBe(true);
    });

    it("flags BILLING_THAI_PROVIDER not set", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        mockGetThaiBillingProviderId.mockReturnValue(undefined);

        const res = await callGet();
        const body = (await res.json()) as { ready: boolean; issues: string[] };

        expect(body.ready).toBe(false);
        expect(body.issues.some((m) => m.includes("BILLING_THAI_PROVIDER"))).toBe(true);
    });
});
