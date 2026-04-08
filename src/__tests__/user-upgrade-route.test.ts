import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

describe("user upgrade route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects self-service plan upgrades even for authenticated users", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const { POST } = await import("@/app/api/user/upgrade/route");
    const response = await POST(
      new Request("http://localhost/api/user/upgrade", {
        method: "POST",
        body: JSON.stringify({ plan: "PRO" }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe("Direct plan upgrades are disabled");
  });
});
