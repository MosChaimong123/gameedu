import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({
  auth: vi.fn(async (handler: (request: NextRequest) => Response) => {
    return async (request: NextRequest) => handler(request);
  }),
}));

describe("Next.js proxy contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports a callable proxy when Auth.js uses lazy configuration", async () => {
    const { proxy } = await import("@/proxy");

    expect(typeof proxy).toBe("function");
  });

  it("rejects legacy direct Student Code API routes", async () => {
    const { proxy } = await import("@/proxy");
    const response = await proxy(
      new NextRequest("http://localhost/api/student/profile/ABC123")
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "STUDENT_CODE_EXCHANGE_REQUIRED",
        message: "Use a student access session",
      },
    });
  });

  it("keeps canonical student access routes available", async () => {
    const { proxy } = await import("@/proxy");
    const response = await proxy(
      new NextRequest("http://localhost/api/student/access")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects nested legacy Student Code pages without leaking the code", async () => {
    const { proxy } = await import("@/proxy");
    const response = await proxy(
      new NextRequest("http://localhost/student/ABC123/quiz/assignment-1")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/student");
  });
});
