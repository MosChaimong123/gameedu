import { beforeEach, describe, it, vi } from "vitest";
import {
  expectAppErrorResponse,
  makeJsonRequest,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";
const {
  InvalidClassroomBasicUpdateError,
  mockAuth,
  mockIsTeacherOrAdmin,
  mockGetLimitsForUser,
  mockClassroomFindMany,
  mockClassroomCount,
  mockClassroomCreate,
  mockClassroomFindUnique,
  mockClassroomDelete,
  mockUpdateClassroomBasics,
} = vi.hoisted(() => {
  class InvalidClassroomBasicUpdateError extends Error {
    constructor(message = "Invalid classroom update") {
      super(message);
      this.name = "InvalidClassroomBasicUpdateError";
    }
  }

  return {
    InvalidClassroomBasicUpdateError,
    mockAuth: vi.fn(),
    mockIsTeacherOrAdmin: vi.fn(),
    mockGetLimitsForUser: vi.fn(),
    mockClassroomFindMany: vi.fn(),
    mockClassroomCount: vi.fn(),
    mockClassroomCreate: vi.fn(),
    mockClassroomFindUnique: vi.fn(),
    mockClassroomDelete: vi.fn(),
    mockUpdateClassroomBasics: vi.fn(),
  };
});

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/role-guards", () => ({
  isTeacherOrAdmin: mockIsTeacherOrAdmin,
}));

vi.mock("@/lib/plan/plan-access", () => ({
  getLimitsForUser: mockGetLimitsForUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findMany: mockClassroomFindMany,
      count: mockClassroomCount,
      create: mockClassroomCreate,
      findUnique: mockClassroomFindUnique,
      delete: mockClassroomDelete,
    },
  },
}));

vi.mock("@/lib/services/classroom-settings/update-classroom-basics", () => {
  return {
    InvalidClassroomBasicUpdateError,
    updateClassroomBasics: mockUpdateClassroomBasics,
  };
});

describe("classrooms route auth contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "teacher-1", role: "TEACHER", plan: "FREE" },
    });
    mockIsTeacherOrAdmin.mockReturnValue(true);
    mockGetLimitsForUser.mockReturnValue({
      maxClassrooms: Number.POSITIVE_INFINITY,
    });
    mockClassroomFindMany.mockResolvedValue([]);
    mockClassroomCount.mockResolvedValue(0);
    mockClassroomCreate.mockResolvedValue({
      id: "class-1",
      name: "Math",
      teacherId: "teacher-1",
    });
    mockClassroomFindUnique.mockResolvedValue({
      id: "class-1",
      name: "Math",
      teacherId: "teacher-1",
    });
    mockClassroomDelete.mockResolvedValue({
      id: "class-1",
      name: "Math",
      teacherId: "teacher-1",
    });
    mockUpdateClassroomBasics.mockResolvedValue({
      id: "class-1",
      name: "Updated Math",
      teacherId: "teacher-1",
    });
  });

  it("rejects unauthenticated classroom listing requests", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/classrooms/route");

    const response = await GET();

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
  });

  it("rejects classroom creation for non-teacher users", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "student-1", role: "STUDENT", plan: "FREE" },
    });
    mockIsTeacherOrAdmin.mockReturnValueOnce(false);
    const { POST } = await import("@/app/api/classrooms/route");

    const response = await POST(makeJsonRequest({ name: "Math" }));

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });

  it("returns invalid payload when classroom name is missing", async () => {
    const { POST } = await import("@/app/api/classrooms/route");

    const response = await POST(makeJsonRequest({ grade: "6" }));

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "Name is required",
    });
  });

  it("returns not found when the requested classroom does not belong to the current teacher", async () => {
    mockClassroomFindUnique.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/classrooms/[id]/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-missing") as never,
      makeRouteParams({ id: "class-missing" })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });

  it("rejects classroom detail requests for non-teacher users", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "student-1", role: "STUDENT", plan: "FREE" },
    });
    mockIsTeacherOrAdmin.mockReturnValueOnce(false);
    const { GET } = await import("@/app/api/classrooms/[id]/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1") as never,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });

  it("returns invalid payload when classroom basics update validation fails", async () => {
    mockUpdateClassroomBasics.mockRejectedValueOnce(
      new InvalidClassroomBasicUpdateError("Invalid quizReviewMode")
    );
    const { PATCH } = await import("@/app/api/classrooms/[id]/route");

    const response = await PATCH(
      makeJsonRequest({ quizReviewMode: "bad-mode" }),
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "Invalid quizReviewMode",
    });
  });

  it("returns not found when deleting a classroom that no longer exists", async () => {
    mockClassroomDelete.mockRejectedValueOnce({ code: "P2025" });
    const { DELETE } = await import("@/app/api/classrooms/[id]/route");

    const response = await DELETE(
      new Request("http://localhost/api/classrooms/class-missing", { method: "DELETE" }) as never,
      makeRouteParams({ id: "class-missing" })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });
});
