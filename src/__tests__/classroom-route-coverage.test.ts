import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  expectAppErrorResponse,
  makeJsonRequest,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockAttendanceRecordFindMany = vi.fn();
const mockSkillFindMany = vi.fn();
const mockSkillCreate = vi.fn();
const mockStudentFindUnique = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    attendanceRecord: {
      findMany: mockAttendanceRecordFindMany,
    },
    skill: {
      findMany: mockSkillFindMany,
      create: mockSkillCreate,
    },
    student: {
      findUnique: mockStudentFindUnique,
    },
  },
}));

describe("classroom route coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects attendance history access for unauthenticated requests", async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/attendance/history/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/attendance/history") as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
    expect(mockAttendanceRecordFindMany).not.toHaveBeenCalled();
  });

  it("rejects skill creation when the classroom is not owned by the caller", async () => {
    mockAuth.mockResolvedValue({ user: { id: "teacher-1" } });
    mockClassroomFindUnique.mockResolvedValue(null);
    const { POST } = await import("@/app/api/classrooms/[id]/skills/route");

    const response = await POST(
      makeJsonRequest({
        name: "Focus",
        weight: 10,
        type: "BUFF",
        icon: "sparkles",
      }) as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mockSkillCreate).not.toHaveBeenCalled();
  });

  it("rejects student history access for teachers outside the classroom", async () => {
    mockAuth.mockResolvedValue({ user: { id: "teacher-1" } });
    mockClassroomFindUnique.mockResolvedValue(null);
    const { GET } = await import(
      "@/app/api/classrooms/[id]/students/[studentId]/history/route"
    );

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/students/student-1/history") as never,
      makeRouteParams({ id: "class-1", studentId: "student-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mockStudentFindUnique).not.toHaveBeenCalled();
  });
});
