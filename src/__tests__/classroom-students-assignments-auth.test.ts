import { beforeEach, describe, it, vi } from "vitest";
import {
  expectAppErrorResponse,
  makeJsonRequest,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();
const mockIsTeacherOrAdmin = vi.fn();
const mockGenerateStudentLoginCode = vi.fn();
const mockSendNotification = vi.fn();
const mockParseQuizReviewModeFromRequest = vi.fn();
const mockLogAuditEvent = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockStudentFindMany = vi.fn();
const mockStudentCreateMany = vi.fn();
const mockStudentUpdate = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockStudentDelete = vi.fn();
const mockAssignmentFindMany = vi.fn();
const mockAssignmentCreate = vi.fn();
const mockAssignmentUpdate = vi.fn();
const mockAssignmentFindUnique = vi.fn();
const mockAssignmentDelete = vi.fn();
const mockQuestionSetFindUnique = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/role-guards", () => ({
  isTeacherOrAdmin: mockIsTeacherOrAdmin,
}));

vi.mock("@/lib/student-login-code", () => ({
  generateStudentLoginCode: mockGenerateStudentLoginCode,
}));

vi.mock("@/lib/notifications", () => ({
  sendNotification: mockSendNotification,
}));

vi.mock("@/lib/quiz-review-policy", () => ({
  parseQuizReviewModeFromRequest: mockParseQuizReviewModeFromRequest,
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mockLogAuditEvent,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    student: {
      findMany: mockStudentFindMany,
      createMany: mockStudentCreateMany,
      update: mockStudentUpdate,
      findUnique: mockStudentFindUnique,
      delete: mockStudentDelete,
    },
    assignment: {
      findMany: mockAssignmentFindMany,
      create: mockAssignmentCreate,
      update: mockAssignmentUpdate,
      findUnique: mockAssignmentFindUnique,
      delete: mockAssignmentDelete,
    },
    questionSet: {
      findUnique: mockQuestionSetFindUnique,
    },
  },
}));

describe("classroom students and assignments auth contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    mockIsTeacherOrAdmin.mockReturnValue(true);
    mockGenerateStudentLoginCode.mockReturnValue("ABC123");
    mockSendNotification.mockResolvedValue(undefined);
    mockParseQuizReviewModeFromRequest.mockReturnValue({ ok: true, value: "end_only" });
    mockClassroomFindUnique.mockResolvedValue({
      id: "class-1",
      teacherId: "teacher-1",
      students: [],
      assignments: [],
    });
    mockStudentFindMany.mockResolvedValue([]);
    mockStudentCreateMany.mockResolvedValue({ count: 1 });
    mockStudentUpdate.mockResolvedValue({ id: "student-1" });
    mockStudentFindUnique.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      name: "Alice",
      nickname: null,
      avatar: "1",
      order: 0,
    });
    mockStudentDelete.mockResolvedValue({ id: "student-1" });
    mockAssignmentFindMany.mockResolvedValue([]);
    mockAssignmentCreate.mockResolvedValue({
      id: "assignment-1",
      type: "score",
      deadline: null,
    });
    mockAssignmentUpdate.mockResolvedValue({ id: "assignment-1" });
    mockAssignmentFindUnique.mockResolvedValue({
      id: "assignment-1",
      classId: "class-1",
      type: "score",
      quizSetId: null,
    });
    mockAssignmentDelete.mockResolvedValue({ id: "assignment-1" });
    mockQuestionSetFindUnique.mockResolvedValue({
      questions: [],
      creatorId: "teacher-1",
    });
  });

  it("rejects unauthenticated student creation", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/classrooms/[id]/students/route");

    const response = await POST(
      makeJsonRequest({ students: [{ name: "Alice" }] }),
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
  });

  it("rejects student reorder for non-teacher users", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "student-1", role: "STUDENT" } });
    mockIsTeacherOrAdmin.mockReturnValueOnce(false);
    const { PATCH } = await import("@/app/api/classrooms/[id]/students/route");

    const response = await PATCH(
      makeJsonRequest([{ id: "student-1", order: 1 }] as unknown as Record<string, unknown>),
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });

  it("returns invalid payload for malformed student creation data", async () => {
    const { POST } = await import("@/app/api/classrooms/[id]/students/route");

    const response = await POST(
      makeJsonRequest({ students: null }),
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "Invalid data",
    });
  });

  it("returns not found when reordering students outside the classroom", async () => {
    mockStudentFindMany.mockResolvedValueOnce([{ id: "student-1", classId: "class-2" }]);
    const { PATCH } = await import("@/app/api/classrooms/[id]/students/route");

    const response = await PATCH(
      {
        json: async () => [{ id: "student-1", order: 1 }],
      } as Request,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });

  it("returns not found when patching a missing student", async () => {
    mockStudentFindUnique.mockResolvedValueOnce(null);
    const { PATCH } = await import("@/app/api/classrooms/[id]/students/[studentId]/route");

    const response = await PATCH(
      makeJsonRequest({ name: "Alice 2" }),
      makeRouteParams({ id: "class-1", studentId: "student-missing" })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });

  it("rejects unauthenticated assignment creation", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/classrooms/[id]/assignments/route");

    const response = await POST(
      makeJsonRequest({ name: "Quiz 1" }),
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
  });

  it("rejects assignment reorder for non-teacher users", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "student-1", role: "STUDENT" } });
    mockIsTeacherOrAdmin.mockReturnValueOnce(false);
    const { PATCH } = await import("@/app/api/classrooms/[id]/assignments/route");

    const response = await PATCH(
      {
        json: async () => [{ id: "assignment-1", order: 1 }],
      } as Request,
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });

  it("returns invalid payload when assignment name is missing", async () => {
    const { POST } = await import("@/app/api/classrooms/[id]/assignments/route");

    const response = await POST(
      makeJsonRequest({ type: "score" }),
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "Name is required",
    });
  });

  it("returns not found when quiz assignment references another teacher's question set", async () => {
    mockQuestionSetFindUnique.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/classrooms/[id]/assignments/route");

    const response = await POST(
      makeJsonRequest({ name: "Quiz 1", type: "quiz", quizSetId: "set-missing" }),
      makeRouteParams({ id: "class-1" })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });

  it("returns invalid payload when assignment patch has invalid review mode", async () => {
    mockParseQuizReviewModeFromRequest.mockReturnValueOnce({ ok: false });
    mockAssignmentFindUnique.mockResolvedValueOnce({
      id: "assignment-1",
      classId: "class-1",
      type: "quiz",
      quizSetId: "set-1",
    });
    const { PATCH } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/route");

    const response = await PATCH(
      makeJsonRequest({ quizReviewMode: "bad-mode" }),
      makeRouteParams({ id: "class-1", assignmentId: "assignment-1" })
    );

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "Invalid quizReviewMode",
    });
  });

  it("returns not found when deleting a missing assignment", async () => {
    mockAssignmentFindUnique.mockResolvedValueOnce(null);
    const { DELETE } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/route");

    const response = await DELETE(
      new Request("http://localhost/api/classrooms/class-1/assignments/assignment-missing", {
        method: "DELETE",
      }) as never,
      makeRouteParams({ id: "class-1", assignmentId: "assignment-missing" })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });
});
