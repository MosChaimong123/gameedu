import { beforeEach, describe, it, vi } from "vitest";
import { expectAppErrorResponse } from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();
const mockIsTeacherOrAdmin = vi.fn();
const mockQuestionSetFindMany = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/role-guards", () => ({
  isTeacherOrAdmin: mockIsTeacherOrAdmin,
}));

vi.mock("@/lib/db", () => ({
  db: {
    questionSet: {
      findMany: mockQuestionSetFindMany,
    },
  },
}));

describe("omr sets route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    mockIsTeacherOrAdmin.mockReturnValue(true);
    mockQuestionSetFindMany.mockResolvedValue([]);
  });

  it("rejects unauthenticated access", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/omr/sets/route");

    const response = await GET();

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
  });

  it("rejects student access", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "student-1", role: "STUDENT" } });
    mockIsTeacherOrAdmin.mockReturnValueOnce(false);
    const { GET } = await import("@/app/api/omr/sets/route");

    const response = await GET();

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });
});
