import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockVerify = vi.fn();
const mockProcessEvent = vi.fn();

vi.mock("resend", () => ({
  Resend: class MockResend {
    webhooks = { verify: mockVerify };
  },
}));
vi.mock("@/lib/email/password-reset-delivery", () => ({
  processResendPasswordResetEvent: mockProcessEvent,
}));

function request(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/webhooks/resend", {
    method: "POST",
    headers,
    body: JSON.stringify({ type: "email.delivered" }),
  });
}

describe("POST /api/webhooks/resend", () => {
  afterEach(() => vi.unstubAllEnvs());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_test");
    mockVerify.mockReturnValue({
      type: "email.delivered",
      created_at: "2026-07-14T00:00:00.000Z",
      data: { email_id: "email-123" },
    });
    mockProcessEvent.mockResolvedValue({ matched: true, status: "DELIVERED" });
  });

  it("rejects requests without all Svix signature headers", async () => {
    const { POST } = await import("@/app/api/webhooks/resend/route");
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature before processing", async () => {
    mockVerify.mockImplementation(() => { throw new Error("invalid"); });
    const { POST } = await import("@/app/api/webhooks/resend/route");
    const response = await POST(request({
      "svix-id": "evt-1",
      "svix-timestamp": "123",
      "svix-signature": "v1,test",
    }));
    expect(response.status).toBe(400);
    expect(mockProcessEvent).not.toHaveBeenCalled();
  });

  it("verifies and processes a signed delivery event", async () => {
    const { POST } = await import("@/app/api/webhooks/resend/route");
    const response = await POST(request({
      "svix-id": "evt-1",
      "svix-timestamp": "123",
      "svix-signature": "v1,test",
    }));
    expect(response.status).toBe(200);
    expect(mockVerify).toHaveBeenCalledWith(expect.objectContaining({
      headers: { id: "evt-1", timestamp: "123", signature: "v1,test" },
      webhookSecret: "whsec_test",
    }));
    expect(mockProcessEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "email.delivered" }), "evt-1");
  });
});
