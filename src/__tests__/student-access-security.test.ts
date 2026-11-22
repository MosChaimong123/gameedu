import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  studentFindUnique: vi.fn(),
  studentUpdate: vi.fn(),
  accessCreate: vi.fn(),
  accessUpdateMany: vi.fn(),
  classroomFindFirst: vi.fn(),
  studentFindMany: vi.fn(),
  consumeLimit: vi.fn(),
  audit: vi.fn(),
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    student: { findUnique: mocks.studentFindUnique, findMany: mocks.studentFindMany, update: mocks.studentUpdate },
    classroom: { findFirst: mocks.classroomFindFirst },
    studentAccessSession: { create: mocks.accessCreate, updateMany: mocks.accessUpdateMany },
  },
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/security/rate-limit", () => ({
  buildRateLimitKey: (...parts: string[]) => parts.join(":"),
  consumeRateLimitWithStore: mocks.consumeLimit,
  digestRateLimitIdentifier: (value: string) => `digest:${value}`,
  getRequestClientIdentifier: () => "client:test",
}));
vi.mock("@/lib/security/audit-log", () => ({ logAuditEvent: mocks.audit }));

describe("Phase 8E student code exchange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeLimit.mockResolvedValue({ allowed: true });
    mocks.accessCreate.mockResolvedValue({ id: "session-1" });
    mocks.studentUpdate.mockResolvedValue({ id: "student-1" });
    mocks.accessUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("rejects legacy six-character codes before database lookup", async () => {
    const { POST } = await import("@/app/api/student/access/exchange/route");
    const response = await POST(new Request("https://example.test/api/student/access/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "ABC234" }),
    }) as never);

    expect(response.status).toBe(401);
    expect(mocks.studentFindUnique).not.toHaveBeenCalled();
  });

  it("exchanges a current code for a scoped HttpOnly cookie without echoing the secret", async () => {
    mocks.studentFindUnique.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      loginCodeVersion: 3,
      loginCodeDisabledAt: null,
    });
    const { POST } = await import("@/app/api/student/access/exchange/route");
    const response = await POST(new Request("https://example.test/api/student/access/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "test-agent" },
      body: JSON.stringify({ code: "ABCDEFGHJKM2" }),
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, redirectTo: "/student/access" });
    expect(JSON.stringify(body)).not.toContain("ABCDEFGHJKM2");
    expect(response.headers.get("set-cookie")).toContain("student_access=");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(mocks.accessCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ studentId: "student-1", classId: "class-1", codeVersion: 3 }),
    }));
  });
});

describe("Phase 8E teacher revocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    mocks.classroomFindFirst.mockResolvedValue({ id: "class-1" });
    mocks.studentFindMany.mockResolvedValue([{ id: "student-1" }]);
    mocks.studentUpdate.mockResolvedValue({ id: "student-1" });
    mocks.accessUpdateMany.mockResolvedValue({ count: 2 });
  });

  it("revokes a student's code and every active scoped session", async () => {
    const { POST } = await import("@/app/api/classrooms/[id]/student-codes/route");
    const response = await POST(new Request("https://example.test/api/classrooms/class-1/student-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke", studentId: "student-1" }),
    }), { params: Promise.resolve({ id: "class-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.studentUpdate).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: {
        loginCodeVersion: { increment: 1 },
        loginCodeDisabledAt: expect.any(Date),
      },
    });
    expect(mocks.accessUpdateMany).toHaveBeenCalledWith({
      where: { studentId: { in: ["student-1"] }, revokedAt: null },
      data: { revokedAt: expect.any(Date), revokedReason: "teacher_code_revoked" },
    });
  });
});
