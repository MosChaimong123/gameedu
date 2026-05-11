import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  expectAppErrorResponse,
  makeJsonRequest,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();
const mockIsTeacherOrAdmin = vi.fn();
const mockGetLimitsForUser = vi.fn();
const mockOmrQuizFindMany = vi.fn();
const mockOmrQuizCreate = vi.fn();
const mockOmrQuizFindFirst = vi.fn();
const mockOmrQuizUpdate = vi.fn();
const mockOmrQuizDelete = vi.fn();
const mockOmrResultCreate = vi.fn();
const mockOmrResultCount = vi.fn();
const mockStudentFindUnique = vi.fn();

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
    oMRQuiz: {
      findMany: mockOmrQuizFindMany,
      create: mockOmrQuizCreate,
      findFirst: mockOmrQuizFindFirst,
      update: mockOmrQuizUpdate,
      delete: mockOmrQuizDelete,
    },
    oMRResult: {
      create: mockOmrResultCreate,
      count: mockOmrResultCount,
    },
    student: {
      findUnique: mockStudentFindUnique,
    },
  },
}));

describe("omr route auth contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "teacher-1", role: "TEACHER", plan: "FREE" },
    });
    mockIsTeacherOrAdmin.mockReturnValue(true);
    mockGetLimitsForUser.mockReturnValue({
      maxOmrScansPerMonth: Number.POSITIVE_INFINITY,
    });
    mockOmrQuizFindMany.mockResolvedValue([]);
    mockOmrQuizCreate.mockResolvedValue({ id: "quiz-1", title: "OMR 1" });
    mockOmrQuizFindFirst.mockResolvedValue({ id: "quiz-1", teacherId: "teacher-1" });
    mockOmrQuizUpdate.mockResolvedValue({ id: "quiz-1", title: "Updated OMR" });
    mockOmrQuizDelete.mockResolvedValue({ id: "quiz-1" });
    mockOmrResultCreate.mockResolvedValue({ id: "result-1", quizId: "quiz-1" });
    mockOmrResultCount.mockResolvedValue(0);
    mockStudentFindUnique.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      name: "Alice",
      nickname: "Ali",
    });
  });

  it("rejects unauthenticated OMR quiz reads", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/omr/quizzes/route");

    const response = await GET();

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
  });

  it("rejects OMR quiz creation for non-teacher users", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "student-1", role: "STUDENT", plan: "FREE" },
    });
    mockIsTeacherOrAdmin.mockReturnValueOnce(false);
    const { POST } = await import("@/app/api/omr/quizzes/route");

    const response = await POST(makeJsonRequest({ title: "OMR Quiz", questionCount: 10 }));

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });

  it("returns invalid payload when OMR quiz title is missing", async () => {
    const { POST } = await import("@/app/api/omr/quizzes/route");

    const response = await POST(makeJsonRequest({ questionCount: 10 }));

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "Title is required",
    });
  });

  it("returns invalid payload when OMR quiz question count is not a positive integer", async () => {
    const { POST } = await import("@/app/api/omr/quizzes/route");

    const response = await POST(makeJsonRequest({ title: "OMR Quiz", questionCount: 0 }));

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "Question count must be a positive integer",
    });
  });

  it("returns not found when requesting an OMR quiz outside the current account", async () => {
    mockOmrQuizFindFirst.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/omr/quizzes/[quizId]/route");

    const response = await GET(
      new Request("http://localhost/api/omr/quizzes/quiz-missing") as never,
      makeRouteParams({ quizId: "quiz-missing" })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });

  it("rejects OMR quiz detail reads for non-teacher users", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "student-1", role: "STUDENT", plan: "FREE" },
    });
    mockIsTeacherOrAdmin.mockReturnValueOnce(false);
    const { GET } = await import("@/app/api/omr/quizzes/[quizId]/route");

    const response = await GET(
      new Request("http://localhost/api/omr/quizzes/quiz-1") as never,
      makeRouteParams({ quizId: "quiz-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });

  it("returns not found when saving results to a quiz outside the current account", async () => {
    mockOmrQuizFindFirst.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/omr/quizzes/[quizId]/results/route");

    const response = await POST(
      makeJsonRequest({ studentName: "Alice", score: 8, total: 10, answers: {} }),
      makeRouteParams({ quizId: "quiz-missing" })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });

  it("returns invalid payload when saving a result with impossible score data", async () => {
    const { POST } = await import("@/app/api/omr/quizzes/[quizId]/results/route");

    const response = await POST(
      makeJsonRequest({ studentName: "Alice", score: 12, total: 10, answers: {} }),
      makeRouteParams({ quizId: "quiz-1" })
    );

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "Score and total are invalid",
    });
  });

  it("returns invalid payload when result answers are missing a JSON structure", async () => {
    const { POST } = await import("@/app/api/omr/quizzes/[quizId]/results/route");

    const response = await POST(
      makeJsonRequest({ studentName: "Alice", score: 8, total: 10, answers: "bad" }),
      makeRouteParams({ quizId: "quiz-1" })
    );

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "Answers must be an object or array",
    });
  });

  it("returns invalid payload when a provided student belongs to another classroom", async () => {
    mockOmrQuizFindFirst.mockResolvedValueOnce({ id: "quiz-1", teacherId: "teacher-1", classId: "class-1" });
    mockStudentFindUnique.mockResolvedValueOnce({
      id: "student-2",
      classId: "class-2",
      name: "Bob",
      nickname: null,
    });
    const { POST } = await import("@/app/api/omr/quizzes/[quizId]/results/route");

    const response = await POST(
      makeJsonRequest({ studentId: "student-2", score: 8, total: 10, answers: {} }),
      makeRouteParams({ quizId: "quiz-1" })
    );

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "Student does not belong to this quiz classroom",
    });
  });

  it("derives the student name from the linked student record when omitted", async () => {
    mockOmrQuizFindFirst.mockResolvedValueOnce({ id: "quiz-1", teacherId: "teacher-1", classId: "class-1" });
    const { POST } = await import("@/app/api/omr/quizzes/[quizId]/results/route");

    const response = await POST(
      makeJsonRequest({ studentId: "student-1", score: 8, total: 10, answers: {} }),
      makeRouteParams({ quizId: "quiz-1" })
    );

    expect(response.status).toBe(200);
    expect(mockOmrResultCreate).toHaveBeenCalledWith({
      data: {
        quizId: "quiz-1",
        studentId: "student-1",
        studentName: "Ali",
        score: 8,
        total: 10,
        answers: {},
      },
    });
  });

  it("returns plan limit when monthly OMR scan quota is exhausted", async () => {
    mockGetLimitsForUser.mockReturnValueOnce({ maxOmrScansPerMonth: 1 });
    mockOmrResultCount.mockResolvedValueOnce(1);
    const { POST } = await import("@/app/api/omr/quizzes/[quizId]/results/route");

    const response = await POST(
      makeJsonRequest({ studentName: "Alice", score: 8, total: 10, answers: {} }),
      makeRouteParams({ quizId: "quiz-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "PLAN_LIMIT_OMR_MONTHLY",
      message: "Monthly OMR scan limit reached for your plan",
    });
  });
});
