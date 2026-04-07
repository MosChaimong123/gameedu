import { beforeEach, describe, expect, it, vi } from "vitest";

const mockConsumeRateLimit = vi.fn();
const mockStudentFindUnique = vi.fn();

vi.mock("@/lib/security/rate-limit", () => ({
  buildRateLimitKey: (...parts: string[]) => parts.join(":"),
  getRequestClientIdentifier: () => "test-client",
  consumeRateLimit: mockConsumeRateLimit,
  createRateLimitResponse: (retryAfterSeconds: number) =>
    Response.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    ),
}));

vi.mock("@/lib/db", () => ({
  db: {
    student: {
      findUnique: mockStudentFindUnique,
    },
    notification: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("student notifications rate limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsumeRateLimit.mockReturnValue({
      allowed: false,
      retryAfterSeconds: 30,
      remaining: 0,
    });
  });

  it("returns 429 before querying the database when the limit is exceeded", async () => {
    const { GET } = await import("@/app/api/student/[code]/notifications/route");
    const response = await GET({ headers: new Headers() } as Request, {
      params: Promise.resolve({ code: "ABC123" }),
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(mockStudentFindUnique).not.toHaveBeenCalled();
  });
});
