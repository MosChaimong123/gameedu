import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockFindUnique = vi.fn();
const mockResolveThaiBillingAdapter = vi.fn();
const mockResolvePublicAppOrigin = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("@/lib/billing/providers/resolve-thai-adapter", () => ({
  resolveThaiBillingAdapter: mockResolveThaiBillingAdapter,
}));

vi.mock("@/lib/billing/resolve-public-url", () => ({
  resolvePublicAppOrigin: mockResolvePublicAppOrigin,
}));

describe("billing thai start route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses public app origin for Omise return URL", async () => {
    const startPlusPurchase = vi.fn().mockResolvedValue({
      ok: true,
      redirectUrl: "https://pay.omise.co/abc",
      pendingChargeId: "chrg_test_123",
    });

    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "TEACHER" } });
    mockFindUnique.mockResolvedValue({ plan: "FREE" });
    mockResolveThaiBillingAdapter.mockReturnValue({ startPlusPurchase });
    mockResolvePublicAppOrigin.mockReturnValue("https://www.teachplayedu.com");

    const { POST } = await import("@/app/api/billing/thai/start/route");
    const response = await POST(
      new Request("http://0.0.0.0:10000/api/billing/thai/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: "month" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://pay.omise.co/abc",
    });
    expect(startPlusPurchase).toHaveBeenCalledWith({
      userId: "user-1",
      interval: "month",
      appOrigin: "https://www.teachplayedu.com",
    });
  });
});

