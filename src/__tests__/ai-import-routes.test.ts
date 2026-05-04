import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeJsonRequest } from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();
const mockGetLimitsForUser = vi.fn();
const mockConsumeRateLimitWithStore = vi.fn();
const mockLogAuditEvent = vi.fn();
const mockGenerateContent = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/plan/plan-access", () => ({
  getLimitsForUser: mockGetLimitsForUser,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  buildRateLimitKey: (...parts: string[]) => parts.join(":"),
  getRequestClientIdentifier: () => "test-client",
  consumeRateLimitWithStore: mockConsumeRateLimitWithStore,
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

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mockLogAuditEvent,
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
}));

function makeFormRequest(file?: File): Request {
  const formData = new FormData();
  if (file) {
    formData.append("file", file);
  }
  return new Request("http://localhost/api/ai/parse-file", {
    method: "POST",
    body: formData,
  });
}

describe("AI import routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "teacher-1", role: "TEACHER", plan: "PRO" },
    });
    mockGetLimitsForUser.mockReturnValue({
      aiQuestionGeneration: true,
      aiFileParse: true,
    });
    mockConsumeRateLimitWithStore.mockResolvedValue({
      allowed: true,
      remaining: 9,
      retryAfterSeconds: 60,
    });
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("returns a structured error when AI generation returns invalid question JSON", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify([{ question: "Missing options", correctAnswer: 0 }]),
      },
    });
    const { POST } = await import("@/app/api/ai/generate-questions/route");

    const response = await POST(makeJsonRequest({ content: "Lesson text", count: 1 }));
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
      })
    );
  });

  it("rejects AI file parsing when no file is provided", async () => {
    const { POST } = await import("@/app/api/ai/parse-file/route");

    const response = await POST(makeFormRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "NO_FILE",
        message: "No file uploaded",
      },
    });
  });

  it("rejects AI file parsing when the plan does not include it", async () => {
    mockGetLimitsForUser.mockReturnValueOnce({
      aiQuestionGeneration: true,
      aiFileParse: false,
    });
    const { POST } = await import("@/app/api/ai/parse-file/route");

    const response = await POST(makeFormRequest(new File(["hello"], "lesson.txt", { type: "text/plain" })));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: {
        code: "PLAN_LIMIT_AI_FEATURE",
        message: "AI file parsing is not included in your plan",
      },
    });
  });
});
