import { describe, expect, it } from "vitest";

describe("student sync route", () => {
  it("returns gone for the removed legacy sync endpoint", async () => {
    const { POST } = await import("@/app/api/student/[code]/sync/route");
    const response = await POST(
      new Request("http://localhost/api/student/ABC123/sync", { method: "POST" }) as never,
      { params: Promise.resolve({ code: "ABC123" }) }
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "ENDPOINT_NO_LONGER_AVAILABLE",
        message: "Endpoint no longer available",
      },
    });
  });
});
