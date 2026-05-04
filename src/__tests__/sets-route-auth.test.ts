import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  expectAppErrorResponse,
  makeJsonRequest,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();
const mockIsTeacherOrAdmin = vi.fn();
const mockGetLimitsForUser = vi.fn();
const mockCountQuestionsInJson = vi.fn();
const mockQuestionSetFindMany = vi.fn();
const mockQuestionSetCount = vi.fn();
const mockQuestionSetCreate = vi.fn();
const mockQuestionSetFindUnique = vi.fn();
const mockQuestionSetUpdate = vi.fn();
const mockQuestionSetDelete = vi.fn();
const mockFolderFindFirst = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/role-guards", () => ({
  isTeacherOrAdmin: mockIsTeacherOrAdmin,
}));

vi.mock("@/lib/plan/plan-access", () => ({
  getLimitsForUser: mockGetLimitsForUser,
  countQuestionsInJson: mockCountQuestionsInJson,
}));

vi.mock("@/lib/db", () => ({
  db: {
    questionSet: {
      findMany: mockQuestionSetFindMany,
      count: mockQuestionSetCount,
      create: mockQuestionSetCreate,
      findUnique: mockQuestionSetFindUnique,
      update: mockQuestionSetUpdate,
      delete: mockQuestionSetDelete,
    },
    folder: {
      findFirst: mockFolderFindFirst,
    },
  },
}));

describe("sets route auth contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "teacher-1", role: "TEACHER", plan: "FREE" },
    });
    mockIsTeacherOrAdmin.mockReturnValue(true);
    mockGetLimitsForUser.mockReturnValue({
      maxQuestionSets: Number.POSITIVE_INFINITY,
      maxQuestionsPerSet: Number.POSITIVE_INFINITY,
    });
    mockCountQuestionsInJson.mockReturnValue(1);
    mockQuestionSetFindMany.mockResolvedValue([]);
    mockQuestionSetCount.mockResolvedValue(0);
    mockQuestionSetCreate.mockResolvedValue({
      id: "set-1",
      title: "Quiz 1",
      creatorId: "teacher-1",
    });
    mockQuestionSetFindUnique.mockResolvedValue({
      id: "set-1",
      title: "Quiz 1",
      creatorId: "teacher-1",
      questions: [],
    });
    mockQuestionSetUpdate.mockResolvedValue({
      id: "set-1",
      title: "Updated Quiz",
      creatorId: "teacher-1",
    });
    mockQuestionSetDelete.mockResolvedValue({ id: "set-1" });
    mockFolderFindFirst.mockResolvedValue({ id: "folder-1" });
  });

  it("rejects unauthenticated set listing requests", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/sets/route");

    const response = await GET();

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
  });

  it("rejects set creation for non-teacher users", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "student-1", role: "STUDENT", plan: "FREE" },
    });
    mockIsTeacherOrAdmin.mockReturnValueOnce(false);
    const { POST } = await import("@/app/api/sets/route");

    const response = await POST(makeJsonRequest({ title: "Quiz 1" }));

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });

  it("returns not found when the requested set does not belong to the current user", async () => {
    mockQuestionSetFindUnique.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/sets/[id]/route");

    const response = await GET(
      new Request("http://localhost/api/sets/set-missing") as never,
      makeRouteParams({ id: "set-missing" })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });

  it("returns not found when moving a set into a missing folder", async () => {
    mockFolderFindFirst.mockResolvedValueOnce(null);
    const { PATCH } = await import("@/app/api/sets/[id]/route");

    const response = await PATCH(
      makeJsonRequest({ folderId: "folder-missing" }),
      makeRouteParams({ id: "set-1" })
    );

    await expectAppErrorResponse(response, {
      status: 404,
      code: "NOT_FOUND",
      message: "Not found",
    });
  });

  it("rejects corrupt question payloads before updating a set", async () => {
    const { PATCH } = await import("@/app/api/sets/[id]/route");

    const response = await PATCH(
      makeJsonRequest({
        questions: [
          {
            id: "q1",
            question: "Broken",
            options: ["Only one option"],
            optionTypes: ["TEXT"],
            questionType: "MULTIPLE_CHOICE",
            correctAnswer: 4,
            timeLimit: 20,
            explanation: "",
          },
        ],
      }),
      makeRouteParams({ id: "set-1" })
    );

    await expectAppErrorResponse(response, {
      status: 400,
      code: "INVALID_PAYLOAD",
      message: "Invalid question data",
    });
    expect(mockQuestionSetUpdate).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated delete requests", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { DELETE } = await import("@/app/api/sets/[id]/route");

    const response = await DELETE(
      new Request("http://localhost/api/sets/set-1", { method: "DELETE" }) as never,
      makeRouteParams({ id: "set-1" })
    );

    await expectAppErrorResponse(response, {
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Unauthorized",
    });
  });
});
