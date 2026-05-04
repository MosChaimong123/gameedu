import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  expectAppErrorResponse,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();
const mockCanUserAccessClassroom = vi.fn();
const mockCanLoginCodeAccessClassroom = vi.fn();
const mockStudentGroupFindMany = vi.fn();
const mockStudentFindMany = vi.fn();
const mockClassroomFindUnique = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/authorization/resource-access", () => ({
  canUserAccessClassroom: mockCanUserAccessClassroom,
  canLoginCodeAccessClassroom: mockCanLoginCodeAccessClassroom,
}));

vi.mock("@/lib/db", () => ({
  db: {
    studentGroup: {
      findMany: mockStudentGroupFindMany,
    },
    student: {
      findMany: mockStudentFindMany,
    },
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
  },
}));

describe("classroom group scores route authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStudentGroupFindMany.mockResolvedValue([]);
    mockStudentFindMany.mockResolvedValue([]);
    mockClassroomFindUnique.mockResolvedValue({ assignments: [] });
    mockCanUserAccessClassroom.mockResolvedValue(false);
    mockCanLoginCodeAccessClassroom.mockResolvedValue(false);
  });

  it("rejects requests without a session or student code", async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/groups/scores/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/groups/scores") as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
    expect(mockStudentGroupFindMany).not.toHaveBeenCalled();
  });

  it("allows student-code access only for students in the requested classroom", async () => {
    mockAuth.mockResolvedValue(null);
    mockCanLoginCodeAccessClassroom.mockResolvedValue(true);
    const { GET } = await import("@/app/api/classrooms/[id]/groups/scores/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/groups/scores?code=abc123") as never,
      makeRouteParams({ id: "class-1" })
    );

    expect(response.status).toBe(200);
    expect(mockCanLoginCodeAccessClassroom).toHaveBeenCalledWith(
      expect.anything(),
      "ABC123",
      "class-1"
    );
    expect(mockStudentGroupFindMany).toHaveBeenCalledTimes(1);
  });

  it("rejects student codes from another classroom", async () => {
    mockAuth.mockResolvedValue(null);
    mockCanLoginCodeAccessClassroom.mockResolvedValue(false);
    const { GET } = await import("@/app/api/classrooms/[id]/groups/scores/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/groups/scores?code=abc123") as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mockStudentGroupFindMany).not.toHaveBeenCalled();
  });

  it("allows teacher/admin sessions that can access the classroom", async () => {
    mockAuth.mockResolvedValue({ user: { id: "teacher-1" } });
    mockCanUserAccessClassroom.mockResolvedValue(true);
    const { GET } = await import("@/app/api/classrooms/[id]/groups/scores/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/groups/scores") as never,
      makeRouteParams({ id: "class-1" })
    );

    expect(response.status).toBe(200);
    expect(mockCanUserAccessClassroom).toHaveBeenCalledWith(
      expect.anything(),
      "teacher-1",
      "class-1"
    );
  });
});
