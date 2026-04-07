import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  expectAppErrorResponse,
  makeJsonRequest,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();
const mockQuizFindMany = vi.fn();
const mockQuizCreate = vi.fn();
const mockQuizFindFirst = vi.fn();
const mockResultCreate = vi.fn();
const mockQuestionSetFindMany = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    oMRQuiz: {
      findMany: mockQuizFindMany,
      create: mockQuizCreate,
      findFirst: mockQuizFindFirst,
    },
    oMRResult: {
      create: mockResultCreate,
    },
    questionSet: {
      findMany: mockQuestionSetFindMany,
    },
  },
}));

describe("omr route role authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuizFindFirst.mockResolvedValue({ id: "quiz-1", teacherId: "teacher-1" });
  });

  it("rejects OMR set listing for non-teacher roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    const { GET } = await import("@/app/api/omr/sets/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Forbidden",
      },
    });
    expect(mockQuestionSetFindMany).not.toHaveBeenCalled();
  });

  it("rejects quiz listing for non-teacher roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    const { GET } = await import("@/app/api/omr/quizzes/route");

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mockQuizFindMany).not.toHaveBeenCalled();
  });

  it("rejects quiz creation for non-teacher roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    const { POST } = await import("@/app/api/omr/quizzes/route");

    const response = await POST(makeJsonRequest({ title: "Quiz", questionCount: 20 }));

    expect(response.status).toBe(403);
    expect(mockQuizCreate).not.toHaveBeenCalled();
  });

  it("rejects result uploads for non-teacher roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    const { POST } = await import("@/app/api/omr/quizzes/[quizId]/results/route");

    const response = await POST(
      makeJsonRequest({ score: 10, total: 20, answers: [] }),
      makeRouteParams({ quizId: "quiz-1" })
    );

    expect(response.status).toBe(403);
    expect(mockResultCreate).not.toHaveBeenCalled();
  });

  it("rejects quiz detail access for non-teacher roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    const { GET } = await import("@/app/api/omr/quizzes/[quizId]/route");

    const response = await GET(
      {} as Request,
      makeRouteParams({ quizId: "quiz-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mockQuizFindFirst).not.toHaveBeenCalled();
  });

  it("rejects quiz detail updates for non-teacher roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    const { PUT } = await import("@/app/api/omr/quizzes/[quizId]/route");

    const response = await PUT(
      makeJsonRequest({ title: "Updated quiz" }),
      makeRouteParams({ quizId: "quiz-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });

  it("rejects quiz detail deletion for non-teacher roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    const { DELETE } = await import("@/app/api/omr/quizzes/[quizId]/route");

    const response = await DELETE(
      {} as Request,
      makeRouteParams({ quizId: "quiz-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });
});
