import { beforeEach, describe, expect, it, vi } from "vitest";

type JsonRequestBody = Record<string, unknown>;

function makeJsonRequest(body: JsonRequestBody): Request {
  return {
    json: async () => body,
  } as Request;
}

const mockStudentFindFirst = vi.fn();
const mockAssignmentFindUnique = vi.fn();
const mockAssignmentSubmissionFindUnique = vi.fn();
const mockAssignmentSubmissionCreate = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockDbTransaction = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    student: {
      findFirst: mockStudentFindFirst,
    },
    assignment: {
      findUnique: mockAssignmentFindUnique,
    },
    assignmentSubmission: {
      findUnique: mockAssignmentSubmissionFindUnique,
      create: mockAssignmentSubmissionCreate,
    },
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    $transaction: mockDbTransaction,
  },
}));

describe("quiz submit authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStudentFindFirst.mockResolvedValue({ id: "student-1" });
    mockAssignmentSubmissionFindUnique.mockResolvedValue(null);
    mockAssignmentSubmissionCreate.mockResolvedValue({ id: "submission-1" });
    mockClassroomFindUnique.mockResolvedValue({
      levelConfig: null,
      gamifiedSettings: null,
    });
    mockDbTransaction.mockImplementation(
      async (fn: (tx: {
        assignmentSubmission: { create: typeof mockAssignmentSubmissionCreate };
        student: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
      }) => Promise<unknown>) => {
        const tx = {
          assignmentSubmission: {
            create: mockAssignmentSubmissionCreate,
          },
          student: {
            findUnique: vi.fn(),
            update: vi.fn(),
          },
        };
        return fn(tx);
      }
    );
  });

  const sampleQuestion = {
    id: "q1",
    question: "?",
    options: ["A", "B"],
    correctAnswer: 1,
  };

  it("rejects submissions to hidden quiz assignments", async () => {
    mockAssignmentFindUnique.mockResolvedValue({
      type: "quiz",
      name: "Hidden quiz",
      visible: false,
      quizData: { questions: [sampleQuestion] },
      maxScore: 10,
      quizReviewMode: null,
      classroom: { quizReviewMode: null },
    });

    const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/submit/route");
    const response = await POST(
      makeJsonRequest({ studentCode: "ABC123", answers: [1] }),
      { params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "INVALID_PAYLOAD",
        message: "Not a quiz assignment",
      },
    });
    expect(mockAssignmentSubmissionCreate).not.toHaveBeenCalled();
  });

  it("rejects submissions after the quiz deadline has passed", async () => {
    mockAssignmentFindUnique.mockResolvedValue({
      type: "quiz",
      name: "Past deadline",
      visible: true,
      deadline: new Date("2020-01-01T00:00:00.000Z"),
      quizData: { questions: [sampleQuestion] },
      maxScore: 10,
      quizReviewMode: null,
      classroom: { quizReviewMode: null },
    });

    const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/submit/route");
    const response = await POST(
      makeJsonRequest({ studentCode: "ABC123", answers: [1] }),
      { params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Assignment closed",
      },
    });
    expect(mockAssignmentSubmissionCreate).not.toHaveBeenCalled();
  });

  it("stores sanitized integrity telemetry on successful submit", async () => {
    mockAssignmentFindUnique.mockResolvedValue({
      type: "quiz",
      name: "Integrity quiz",
      visible: true,
      deadline: null,
      quizData: { questions: [sampleQuestion] },
      maxScore: 10,
      quizReviewMode: null,
      classroom: { quizReviewMode: null },
    });

    const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/submit/route");
    const response = await POST(
      makeJsonRequest({
        studentCode: "ABC123",
        answers: [1],
        integrity: {
          events: [
            { type: "document_hidden", t: 1_700_000_000_000 },
            { type: "hacked", t: 1 },
          ],
        },
      }),
      { params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockAssignmentSubmissionCreate).toHaveBeenCalled();
    const call = mockAssignmentSubmissionCreate.mock.calls[0][0] as {
      data: { cheatingLogs: unknown };
    };
    expect(Array.isArray(call.data.cheatingLogs)).toBe(true);
    const logs = call.data.cheatingLogs as { type: string }[];
    expect(logs.some((e) => e.type === "document_hidden")).toBe(true);
    expect(logs.some((e) => e.type === "hacked")).toBe(false);
  });

  it("rejects when answers length does not match question count", async () => {
    mockAssignmentFindUnique.mockResolvedValue({
      type: "quiz",
      name: "Two questions",
      visible: true,
      deadline: null,
      quizData: {
        questions: [
          {
            id: "q1",
            question: "?",
            options: ["a", "b"],
            correctAnswer: 0,
          },
          {
            id: "q2",
            question: "?",
            options: ["a", "b"],
            correctAnswer: 1,
          },
        ],
      },
      maxScore: 10,
      quizReviewMode: null,
      classroom: { quizReviewMode: null },
    });

    const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/submit/route");
    const response = await POST(
      makeJsonRequest({ studentCode: "ABC123", answers: [0] }),
      { params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "QUIZ_ALL_REQUIRED",
        message: "Answer every question before submitting.",
      },
    });
    expect(mockAssignmentSubmissionCreate).not.toHaveBeenCalled();
  });
});
