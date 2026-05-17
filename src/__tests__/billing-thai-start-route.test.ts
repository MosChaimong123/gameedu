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
    vi.resetModules();
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "TEACHER" } });
    mockFindUnique.mockResolvedValue({ plan: "FREE" });
    mockResolvePublicAppOrigin.mockReturnValue("https://www.teachplayedu.com");
  });

  it("defaults to PromptPay and uses the public app origin for the return URL", async () => {
    const startPlusPurchase = vi.fn().mockResolvedValue({
      ok: true,
      redirectUrl: "https://www.teachplayedu.com/dashboard/upgrade?checkout=thai_mock",
    });
    mockResolveThaiBillingAdapter.mockReturnValue({ startPlusPurchase });

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
      url: "https://www.teachplayedu.com/dashboard/upgrade?checkout=thai_mock",
    });
    expect(startPlusPurchase).toHaveBeenCalledWith({
      userId: "user-1",
      interval: "month",
      appOrigin: "https://www.teachplayedu.com",
      paymentMethod: "promptpay",
    });
  });

  it("forwards a mobile-banking paymentMethod choice to the adapter", async () => {
    const startPlusPurchase = vi.fn().mockResolvedValue({
      ok: true,
      redirectUrl: "https://www.teachplayedu.com/dashboard/upgrade?checkout=thai_mock&interval=year",
    });
    mockResolveThaiBillingAdapter.mockReturnValue({ startPlusPurchase });

    const { POST } = await import("@/app/api/billing/thai/start/route");
    const response = await POST(
      new Request("http://0.0.0.0:10000/api/billing/thai/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interval: "year",
          paymentMethod: "mobile_banking_scb",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(startPlusPurchase).toHaveBeenCalledWith({
      userId: "user-1",
      interval: "year",
      appOrigin: "https://www.teachplayedu.com",
      paymentMethod: "mobile_banking_scb",
    });
  });

  it("rejects unknown paymentMethod values with 400", async () => {
    const startPlusPurchase = vi.fn();
    mockResolveThaiBillingAdapter.mockReturnValue({ startPlusPurchase });

    const { POST } = await import("@/app/api/billing/thai/start/route");
    const response = await POST(
      new Request("http://0.0.0.0:10000/api/billing/thai/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interval: "month",
          paymentMethod: "mobile_banking_truemoney",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(startPlusPurchase).not.toHaveBeenCalled();
  });
});

