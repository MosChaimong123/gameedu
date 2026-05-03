import { beforeEach, describe, it, vi } from "vitest";
import { expectAppErrorResponse } from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

describe("user upgrade route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated upgrade requests with a structured auth error", async () => {
    mockAuth.mockResolvedValue(null);

    const { POST } = await import("@/app/api/user/upgrade/route");
    const response = await POST(
      new Request("http://localhost/api/user/upgrade", {
        method: "POST",
        body: JSON.stringify({ plan: "PRO" }),
        headers: { "Content-Type": "application/json" },
      })
    );

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
  });

  it("returns a structured gone response for the disabled self-service upgrade endpoint", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const { POST } = await import("@/app/api/user/upgrade/route");
    const response = await POST(
      new Request("http://localhost/api/user/upgrade", {
        method: "POST",
        body: JSON.stringify({ plan: "PRO" }),
        headers: { "Content-Type": "application/json" },
      })
    );

    await expectAppErrorResponse(response, {
      status: 410,
      code: "ENDPOINT_NO_LONGER_AVAILABLE",
      message: "Endpoint no longer available",
    });
  });
});
