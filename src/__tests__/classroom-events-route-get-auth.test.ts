import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  expectAppErrorResponse,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockStudentFindFirst = vi.fn();

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
    },
  },
}));

describe("GET /api/classrooms/[id]/events authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClassroomFindUnique.mockReset();
    mockStudentFindFirst.mockReset();
  });

  it("returns 401 without session or student code", async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/events/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/events") as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
    expect(mockClassroomFindUnique).not.toHaveBeenCalled();
    expect(mockStudentFindFirst).not.toHaveBeenCalled();
  });

  it("returns 403 when student code belongs to another classroom", async () => {
    mockAuth.mockResolvedValue(null);
    mockStudentFindFirst.mockResolvedValue({ classId: "class-2" });
    const { GET } = await import("@/app/api/classrooms/[id]/events/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/events?code=abc123") as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mockClassroomFindUnique).not.toHaveBeenCalled();
  });

  it("returns 200 for valid student code and loads events", async () => {
    mockAuth.mockResolvedValue(null);
    mockStudentFindFirst.mockResolvedValue({ classId: "class-1" });
    mockClassroomFindUnique.mockResolvedValue({
      teacherId: "teacher-1",
      gamifiedSettings: {},
    });
    const { GET } = await import("@/app/api/classrooms/[id]/events/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/events?code=abc123") as never,
      makeRouteParams({ id: "class-1" })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(mockClassroomFindUnique).toHaveBeenCalledTimes(1);
  });

  it("returns 200 for teacher session with classroom access", async () => {
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    mockClassroomFindUnique.mockImplementation(
      (args: { select?: Record<string, unknown> }) => {
        if (args.select && "gamifiedSettings" in args.select) {
          return Promise.resolve({
            teacherId: "teacher-1",
            gamifiedSettings: {},
          });
        }
        return Promise.resolve({
          teacherId: "teacher-1",
          students: [],
        });
      }
    );
    const { GET } = await import("@/app/api/classrooms/[id]/events/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/events") as never,
      makeRouteParams({ id: "class-1" })
    );

    expect(response.status).toBe(200);
    expect(mockClassroomFindUnique).toHaveBeenCalled();
  });
});
