import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  expectAppErrorResponse,
  makeJsonRequest,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";
import { OMR_QUESTION_COUNT, OMR_TEMPLATE_ID } from "@/lib/omr-template";

const mockAuth = vi.fn();
const mockIsTeacherOrAdmin = vi.fn();
const mockGetLimitsForUser = vi.fn();
const mockClassroomFindFirst = vi.fn();
const mockOmrQuizFindMany = vi.fn();
const mockOmrQuizCreate = vi.fn();
const mockOmrQuizFindFirst = vi.fn();
const mockOmrQuizUpdate = vi.fn();
const mockOmrQuizDelete = vi.fn();
const mockOmrResultCreate = vi.fn();
const mockOmrResultFindFirst = vi.fn();
const mockOmrResultUpdate = vi.fn();
const mockOmrResultCount = vi.fn();
const mockStudentFindFirst = vi.fn();

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/role-guards", () => ({ isTeacherOrAdmin: mockIsTeacherOrAdmin }));
vi.mock("@/lib/plan/plan-access", () => ({ getLimitsForUser: mockGetLimitsForUser }));
vi.mock("@/lib/db", () => ({
  db: {
    classroom: { findFirst: mockClassroomFindFirst },
    oMRQuiz: {
      findMany: mockOmrQuizFindMany,
      create: mockOmrQuizCreate,
      findFirst: mockOmrQuizFindFirst,
      update: mockOmrQuizUpdate,
      delete: mockOmrQuizDelete,
    },
    oMRResult: {
      create: mockOmrResultCreate,
      findFirst: mockOmrResultFindFirst,
      update: mockOmrResultUpdate,
      count: mockOmrResultCount,
    },
    student: { findFirst: mockStudentFindFirst },
  },
}));

function completeAnswerKey(answer = "A") {
  return Object.fromEntries(
    Array.from({ length: OMR_QUESTION_COUNT }, (_, index) => [String(index + 1), answer])
  );
}

function detectedAnswers(answer = "A") {
  return Array.from({ length: OMR_QUESTION_COUNT }, (_, index) => ({
    question: index + 1,
    answer,
    confidence: 0.95,
    ambiguous: false,
  }));
}

function validResultBody() {
  return {
    studentCode: "00001",
    answers: detectedAnswers(),
  };
}

describe("omr route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "teacher-1", role: "TEACHER", plan: "FREE" },
    });
    mockIsTeacherOrAdmin.mockReturnValue(true);
    mockGetLimitsForUser.mockReturnValue({
      maxOmrScansPerMonth: Number.POSITIVE_INFINITY,
    });
    mockClassroomFindFirst.mockResolvedValue({ id: "class-1" });
    mockOmrQuizFindMany.mockResolvedValue([]);
    mockOmrQuizCreate.mockResolvedValue({ id: "quiz-1", title: "OMR 1" });
    mockOmrQuizFindFirst.mockResolvedValue({
      id: "quiz-1",
      teacherId: "teacher-1",
      classId: "class-1",
      questionCount: OMR_QUESTION_COUNT,
      answerKey: completeAnswerKey(),
    });
    mockOmrQuizUpdate.mockResolvedValue({ id: "quiz-1", title: "Updated OMR" });
    mockOmrQuizDelete.mockResolvedValue({ id: "quiz-1" });
    mockOmrResultCreate.mockResolvedValue({ id: "result-1", quizId: "quiz-1" });
    mockOmrResultFindFirst.mockResolvedValue(null);
    mockOmrResultUpdate.mockResolvedValue({ id: "result-1", quizId: "quiz-1" });
    mockOmrResultCount.mockResolvedValue(0);
    mockStudentFindFirst.mockResolvedValue({
      id: "student-1",
      name: "Alice",
      nickname: "Ali",
      order: 0,
    });
  });

  it("rejects unauthenticated OMR quiz reads", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/omr/quizzes/route");
    await expectAppErrorResponse(await GET(), {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
  });

  it("rejects OMR quiz creation for non-teacher users", async () => {
    mockIsTeacherOrAdmin.mockReturnValueOnce(false);
    const { POST } = await import("@/app/api/omr/quizzes/route");
    await expectAppErrorResponse(
      await POST(makeJsonRequest({ title: "OMR", classId: "class-1" })),
      { status: 403, code: "FORBIDDEN", message: "Forbidden" }
    );
  });

  it("requires a title and classroom", async () => {
    const { POST } = await import("@/app/api/omr/quizzes/route");
    await expectAppErrorResponse(
      await POST(makeJsonRequest({ classId: "class-1" })),
      { status: 400, code: "INVALID_PAYLOAD", message: "Title is required" }
    );
    await expectAppErrorResponse(
      await POST(makeJsonRequest({ title: "OMR" })),
      { status: 400, code: "INVALID_PAYLOAD", message: "Classroom is required" }
    );
  });

  it("accepts only the fixed 50-question template", async () => {
    const { POST } = await import("@/app/api/omr/quizzes/route");
    await expectAppErrorResponse(
      await POST(
        makeJsonRequest({ title: "OMR", classId: "class-1", questionCount: 20 })
      ),
      {
        status: 400,
        code: "INVALID_PAYLOAD",
        message: `Only the ${OMR_QUESTION_COUNT}-question ${OMR_TEMPLATE_ID} template is supported`,
      }
    );
  });

  it("rejects a classroom outside the teacher account", async () => {
    mockClassroomFindFirst.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/omr/quizzes/route");
    await expectAppErrorResponse(
      await POST(makeJsonRequest({ title: "OMR", classId: "other-class" })),
      { status: 404, code: "NOT_FOUND", message: "Not found" }
    );
  });

  it("creates a fixed answer key linked to the owned classroom", async () => {
    const { POST } = await import("@/app/api/omr/quizzes/route");
    const response = await POST(
      makeJsonRequest({ title: " Midterm ", classId: "class-1" })
    );
    expect(response.status).toBe(200);
    expect(mockOmrQuizCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Midterm",
          classId: "class-1",
          questionCount: OMR_QUESTION_COUNT,
          answerKey: expect.objectContaining({ "1": "", "50": "" }),
        }),
      })
    );
  });

  it("rejects an invalid answer key option", async () => {
    const { PUT } = await import("@/app/api/omr/quizzes/[quizId]/route");
    await expectAppErrorResponse(
      await PUT(
        makeJsonRequest({ answerKey: { ...completeAnswerKey(), "10": "F" } }),
        makeRouteParams({ quizId: "quiz-1" })
      ),
      {
        status: 400,
        code: "INVALID_PAYLOAD",
        message: "Answer for question 10 must be one of A, B, C, D, E",
      }
    );
  });

  it("returns not found when saving to a quiz outside the account", async () => {
    mockOmrQuizFindFirst.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/omr/quizzes/[quizId]/results/route");
    await expectAppErrorResponse(
      await POST(makeJsonRequest(validResultBody()), makeRouteParams({ quizId: "missing" })),
      { status: 404, code: "NOT_FOUND", message: "Not found" }
    );
  });

  it("requires exactly 50 well-formed answers", async () => {
    const { POST } = await import("@/app/api/omr/quizzes/[quizId]/results/route");
    await expectAppErrorResponse(
      await POST(
        makeJsonRequest({ studentCode: "00001", answers: detectedAnswers().slice(0, 49) }),
        makeRouteParams({ quizId: "quiz-1" })
      ),
      {
        status: 400,
        code: "INVALID_PAYLOAD",
        message: `Exactly ${OMR_QUESTION_COUNT} detected answers are required`,
      }
    );
  });

  it("rejects an incomplete server answer key", async () => {
    mockOmrQuizFindFirst.mockResolvedValueOnce({
      id: "quiz-1",
      classId: "class-1",
      questionCount: OMR_QUESTION_COUNT,
      answerKey: { ...completeAnswerKey(), "7": "" },
    });
    const { POST } = await import("@/app/api/omr/quizzes/[quizId]/results/route");
    await expectAppErrorResponse(
      await POST(makeJsonRequest(validResultBody()), makeRouteParams({ quizId: "quiz-1" })),
      {
        status: 400,
        code: "INVALID_PAYLOAD",
        message: "Answer key is incomplete at question 7",
      }
    );
  });

  it("maps the 5-digit code to classroom order and grades on the server", async () => {
    const answers = detectedAnswers();
    answers[49].answer = "B";
    const { POST } = await import("@/app/api/omr/quizzes/[quizId]/results/route");
    const response = await POST(
      makeJsonRequest({
        studentCode: "00001",
        answers,
        score: 50,
        total: 50,
      }),
      makeRouteParams({ quizId: "quiz-1" })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.grading).toMatchObject({
      score: 49,
      total: 50,
      studentName: "Ali",
      studentCode: "00001",
    });
    expect(mockStudentFindFirst).toHaveBeenCalledWith({
      where: { classId: "class-1", order: 0 },
      select: { id: true, name: true, nickname: true, order: true },
    });
    expect(mockOmrResultCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        quizId: "quiz-1",
        studentId: "student-1",
        studentName: "Ali",
        score: 49,
        total: 50,
      }),
    });
  });

  it("updates an existing student result instead of creating a duplicate", async () => {
    mockOmrResultFindFirst.mockResolvedValueOnce({ id: "existing-result" });
    const { POST } = await import("@/app/api/omr/quizzes/[quizId]/results/route");
    const response = await POST(
      makeJsonRequest(validResultBody()),
      makeRouteParams({ quizId: "quiz-1" })
    );
    expect(response.status).toBe(200);
    expect(mockOmrResultUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "existing-result" } })
    );
    expect(mockOmrResultCreate).not.toHaveBeenCalled();
    expect(mockOmrResultCount).not.toHaveBeenCalled();
  });

  it("returns the monthly plan limit before creating a new result", async () => {
    mockGetLimitsForUser.mockReturnValueOnce({ maxOmrScansPerMonth: 1 });
    mockOmrResultCount.mockResolvedValueOnce(1);
    const { POST } = await import("@/app/api/omr/quizzes/[quizId]/results/route");
    await expectAppErrorResponse(
      await POST(makeJsonRequest(validResultBody()), makeRouteParams({ quizId: "quiz-1" })),
      {
        status: 403,
        code: "PLAN_LIMIT_OMR_MONTHLY",
        message: "Monthly OMR scan limit reached for your plan",
      }
    );
  });
});
