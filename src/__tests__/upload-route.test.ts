import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockWriteFile = vi.fn();
const mockMkdir = vi.fn();
const mockLogAuditEvent = vi.fn();
const mockConsumeRateLimitWithStore = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("fs/promises", () => ({
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mockLogAuditEvent,
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

function createUploadRequest(file: File): Request {
  const formData = new FormData();
  formData.append("file", file);
  return new Request("http://localhost/api/upload", {
    method: "POST",
    body: formData,
  });
}

describe("upload route POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockConsumeRateLimitWithStore.mockResolvedValue({
      allowed: true,
      remaining: 14,
      retryAfterSeconds: 60,
    });
  });

  it("rejects unauthenticated uploads", async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import("@/app/api/upload/route");

    const response = await POST(
      createUploadRequest(new File(["hello"], "note.txt", { type: "text/plain" })) as never
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: {
        code: "AUTH_REQUIRED",
        message: "Unauthorized",
      },
    });
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "upload.denied",
        metadata: expect.objectContaining({ reason: "unauthorized" }),
      })
    );
  });

  it("rejects unsupported file types even for authenticated users", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const { POST } = await import("@/app/api/upload/route");

    const response = await POST(
      createUploadRequest(new File(["<svg/>"], "avatar.svg", { type: "image/svg+xml" })) as never
    );
    const body = await response.json();

    expect(response.status).toBe(415);
    expect(body).toEqual({
      error: {
        code: "UNSUPPORTED_FILE_TYPE",
        message: "Unsupported file type",
      },
    });
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user-1",
        action: "upload.denied",
        metadata: expect.objectContaining({ reason: "unsupported_type" }),
      })
    );
  });

  it("rejects files that exceed the allowed size for their MIME type", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const oversizedText = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      "large.txt",
      { type: "text/plain" }
    );
    const { POST } = await import("@/app/api/upload/route");

    const response = await POST(createUploadRequest(oversizedText) as never);
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body).toEqual({
      error: {
        code: "FILE_TOO_LARGE",
        message: "File too large",
      },
    });
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user-1",
        action: "upload.denied",
        metadata: expect.objectContaining({ reason: "file_too_large" }),
      })
    );
  });

  it("accepts allowed authenticated uploads", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const { POST } = await import("@/app/api/upload/route");

    const response = await POST(
      createUploadRequest(new File(["hello"], "note.txt", { type: "text/plain" })) as never
    );

    expect(response.status).toBe(200);
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    expect(mockWriteFile.mock.calls[0]?.[0]).toMatch(/\.txt$/);
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user-1",
        action: "upload.succeeded",
        metadata: expect.objectContaining({
          originalFileName: "note.txt",
          mimeType: "text/plain",
        }),
      })
    );
  });

  it("uses a safe server-side extension instead of the original filename extension", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const { POST } = await import("@/app/api/upload/route");

    const response = await POST(
      createUploadRequest(new File(["hello"], "evil.html", { type: "text/plain" })) as never
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockWriteFile.mock.calls[0]?.[0]).toMatch(/\.txt$/);
    expect(mockWriteFile.mock.calls[0]?.[0]).not.toMatch(/\.html$/);
    expect(body.fileName).toMatch(/\.txt$/);
    expect(body.originalFileName).toBe("evil.html");
  });

  it("includes actor context in upload failure audit logs after authentication", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockWriteFile.mockRejectedValueOnce(new Error("disk full"));
    const { POST } = await import("@/app/api/upload/route");

    const response = await POST(
      createUploadRequest(new File(["hello"], "note.txt", { type: "text/plain" })) as never
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal Server Error",
      },
    });
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user-1",
        action: "upload.failed",
        status: "error",
      })
    );
  });
});
