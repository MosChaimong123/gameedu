import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  expectAppErrorResponse,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockStudentFindFirst = vi.fn();
const mockStudentFindMany = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    student: {
      findFirst: mockStudentFindFirst,
      findMany: mockStudentFindMany,
    },
  },
}));

describe("leaderboard route authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClassroomFindUnique.mockResolvedValue(null);
    mockStudentFindFirst.mockResolvedValue(null);
    mockStudentFindMany.mockResolvedValue([
      { id: "student-1", name: "Alice", avatar: "nova-1", behaviorPoints: 12 },
      { id: "student-2", name: "Bob", avatar: "nova-2", behaviorPoints: 20 },
    ]);
  });

  it("rejects requests without a session or student code", async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/leaderboard/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/leaderboard") as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
    expect(mockStudentFindMany).not.toHaveBeenCalled();
  });

  it("allows student-code access only for students in the requested classroom", async () => {
    mockAuth.mockResolvedValue(null);
    mockStudentFindFirst.mockResolvedValue({ classId: "class-1" });
    const { GET } = await import("@/app/api/classrooms/[id]/leaderboard/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/leaderboard?code=abc123") as never,
      makeRouteParams({ id: "class-1" })
    );

    expect(response.status).toBe(200);
    expect(mockStudentFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { loginCode: "ABC123" },
          { loginCode: "abc123" },
        ],
      },
      select: { classId: true },
    });
  });

  it("rejects student codes from another classroom", async () => {
    mockAuth.mockResolvedValue(null);
    mockStudentFindFirst.mockResolvedValue({ classId: "class-2" });
    const { GET } = await import("@/app/api/classrooms/[id]/leaderboard/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/leaderboard?code=abc123") as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mockStudentFindMany).not.toHaveBeenCalled();
  });
});
