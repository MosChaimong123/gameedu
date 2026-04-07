import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockConsumeRateLimit = vi.fn();
const mockLogAuditEvent = vi.fn();
const mockGenerateContent = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: mockGenerateContent,
    }),
  })),
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mockLogAuditEvent,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  buildRateLimitKey: (...parts: string[]) => parts.join(":"),
  getRequestClientIdentifier: () => "test-client",
  consumeRateLimit: mockConsumeRateLimit,
  consumeRateLimitWithStore: mockConsumeRateLimit,
  createRateLimitResponse: (retryAfterSeconds: number) =>
    Response.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests",
        },
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    ),
}));

describe("AI route authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGenerateContent.mockReset();
    mockConsumeRateLimit.mockReturnValue({
      allowed: true,
      remaining: 9,
      retryAfterSeconds: 60,
    });
  });

  it("blocks students from generating AI questions", async () => {
    mockAuth.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });
    const { POST } = await import("@/app/api/ai/generate-questions/route");

    const response = await POST(
      {
        json: async () => ({
          content: "Lesson content",
          count: 5,
        }),
      } as Request
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Forbidden",
      },
    });
  });

  it("blocks students from parsing uploaded files for AI generation", async () => {
    mockAuth.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });
    const { POST } = await import("@/app/api/ai/parse-file/route");

    const formData = new FormData();
    formData.append("file", new File(["hello"], "lesson.txt", { type: "text/plain" }));

    const response = await POST(
      {
        formData: async () => formData,
      } as Request
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Forbidden",
      },
    });
  });

  it("returns 429 when AI question generation rate limit is exceeded", async () => {
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    mockConsumeRateLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 45,
    });
    const { POST } = await import("@/app/api/ai/generate-questions/route");

    const response = await POST(
      {
        headers: new Headers(),
        json: async () => ({
          content: "Lesson content",
          count: 5,
        }),
      } as Request
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("45");
    expect(body).toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests",
      },
    });
  });

  it("includes actor context in failed AI generation audit logs", async () => {
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    mockGenerateContent.mockRejectedValueOnce(new Error("Gemini exploded"));
    process.env.GEMINI_API_KEY = "test-key";
    const { POST } = await import("@/app/api/ai/generate-questions/route");

    const response = await POST(
      {
        headers: new Headers(),
        json: async () => ({
          content: "Lesson content",
          count: 5,
        }),
      } as Request
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal Error during AI generation",
      },
    });
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "teacher-1",
        action: "auth.ai_generate.failed",
        status: "error",
        reason: "internal_error",
      })
    );
  });

  it("parses plain text files without emitting debug console logs", async () => {
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { POST } = await import("@/app/api/ai/parse-file/route");

    const formData = new FormData();
    formData.append("file", new File(["Lesson content for parsing"], "lesson.txt", { type: "text/plain" }));

    const response = await POST(
      {
        formData: async () => formData,
      } as Request
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      text: "Lesson content for parsing",
      pdfData: null,
      fileName: "lesson.txt",
    });
    expect(consoleLogSpy).not.toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  it("returns a generic internal error when file parsing throws", async () => {
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/ai/parse-file/route");

    const brokenFile = {
      name: "broken.txt",
      type: "text/plain",
      arrayBuffer: async () => {
        throw new Error("parser exploded");
      },
    } as unknown as File;

    const response = await POST(
      {
        formData: async () =>
          ({
            get: () => brokenFile,
          }) as unknown as FormData,
      } as Request
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal Error during file parsing",
      },
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
