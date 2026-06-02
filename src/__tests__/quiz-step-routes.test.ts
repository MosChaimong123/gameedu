import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStudentFindFirst = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockStudentUpdate = vi.fn();
const mockAssignmentFindUnique = vi.fn();
const mockAssignmentSubmissionFindUnique = vi.fn();
const mockAssignmentSubmissionUpsert = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockTransaction = vi.fn();
const mockNotifyNegamonRankUpIfNeeded = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    student: {
      findFirst: mockStudentFindFirst,
      findUnique: mockStudentFindUnique,
      update: mockStudentUpdate,
    },
    assignment: { findUnique: mockAssignmentFindUnique },
    assignmentSubmission: {
      findUnique: mockAssignmentSubmissionFindUnique,
      upsert: mockAssignmentSubmissionUpsert,
    },
    classroom: { findUnique: mockClassroomFindUnique },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/negamon/negamon-rank-notify", () => ({
  notifyNegamonRankUpIfNeeded: mockNotifyNegamonRankUpIfNeeded,
}));

const q1 = {
  id: "q1",
  question: "1+1",
  options: ["1", "2", "3"],
  correctAnswer: 1,
};
const q2 = { ...q1, id: "q2", correctAnswer: 0 };

function setupOpenQuiz() {
  mockStudentFindFirst.mockResolvedValue({ id: "student-1" });
  mockAssignmentSubmissionFindUnique.mockResolvedValue(null);
  mockAssignmentFindUnique.mockResolvedValue({
    type: "quiz",
    name: "Quiz 1",
    visible: true,
    deadline: null,
    maxScore: 10,
    quizData: { questions: [q1, q2] },
    quizReviewMode: null,
    classroom: { quizReviewMode: null },
  });
  mockClassroomFindUnique.mockResolvedValue({
    levelConfig: null,
    gamifiedSettings: { negamon: { enabled: false } },
  });
  mockAssignmentSubmissionUpsert.mockResolvedValue({ id: "submission-1" });
  mockStudentFindUnique.mockResolvedValue({ behaviorPoints: 10, loginCode: "ABC" });
  mockStudentUpdate.mockResolvedValue({ behaviorPoints: 22, loginCode: "ABC" });
  mockNotifyNegamonRankUpIfNeeded.mockResolvedValue(undefined);
  mockTransaction.mockImplementation(async (callback) =>
    callback({
      assignmentSubmission: { upsert: mockAssignmentSubmissionUpsert },
      student: {
        findUnique: mockStudentFindUnique,
        update: mockStudentUpdate,
      },
    })
  );
}

describe("quiz question GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupOpenQuiz();
  });

  it("returns one question without correctAnswer", async () => {
    const { GET } = await import(
      "@/app/api/classrooms/[id]/assignments/[assignmentId]/question/route"
    );
    const res = await GET(
      new Request(
        "http://local.test/api/classrooms/class-1/assignments/asg-1/question?studentCode=ABC&index=0"
      ),
      { params: Promise.resolve({ id: "class-1", assignmentId: "asg-1" }) }
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      total: number;
      question: { options: string[] };
    };
    expect(data.total).toBe(2);
    expect(data.question.options).toEqual(["1", "2", "3"]);
    expect(JSON.stringify(data)).not.toContain("correctAnswer");
  });

  it("rejects out-of-range index", async () => {
    const { GET } = await import(
      "@/app/api/classrooms/[id]/assignments/[assignmentId]/question/route"
    );
    const res = await GET(
      new Request(
        "http://local.test/api/classrooms/class-1/assignments/asg-1/question?studentCode=ABC&index=9"
      ),
      { params: Promise.resolve({ id: "class-1", assignmentId: "asg-1" }) }
    );
    expect(res.status).toBe(400);
  });
});

describe("quiz submit POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupOpenQuiz();
  });

  it("returns expBonus when a Negamon quiz reward is awarded", async () => {
    mockClassroomFindUnique.mockResolvedValue({
      levelConfig: { ranks: [] },
      gamifiedSettings: { negamon: { enabled: true, expPerPoint: 6 } },
    });

    const { POST } = await import(
      "@/app/api/classrooms/[id]/assignments/[assignmentId]/submit/route"
    );
    const res = await POST(
      {
        json: async () => ({
          studentCode: "ABC",
          answers: [1, 0],
          integrity: { events: [] },
        }),
        headers: new Headers(),
      } as Request,
      { params: Promise.resolve({ id: "class-1", assignmentId: "asg-1" }) }
    );

    expect(res.status).toBe(200);
    expect(mockStudentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "student-1" },
        data: expect.objectContaining({
          behaviorPoints: { increment: 12 },
          history: {
            create: expect.objectContaining({
              value: 12,
              reason: "Negamon Quest: Quiz 1 (100%)",
            }),
          },
        }),
      })
    );

    const body = await res.json();
    expect(body).toMatchObject({
      score: 10,
      expBonus: 12,
      submissionId: "submission-1",
    });
  });

  it("returns expBonus 0 for already submitted quizzes", async () => {
    mockAssignmentSubmissionFindUnique.mockResolvedValue({
      score: 8,
      attemptStartedAt: new Date("2026-06-01T00:00:00.000Z"),
      quizCompletedAt: new Date("2026-06-01T00:05:00.000Z"),
    });

    const { POST } = await import(
      "@/app/api/classrooms/[id]/assignments/[assignmentId]/submit/route"
    );
    const res = await POST(
      {
        json: async () => ({
          studentCode: "ABC",
          answers: [1, 0],
          integrity: { events: [] },
        }),
        headers: new Headers(),
      } as Request,
      { params: Promise.resolve({ id: "class-1", assignmentId: "asg-1" }) }
    );

    expect(res.status).toBe(200);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(await res.json()).toMatchObject({
      alreadySubmitted: true,
      score: 8,
      expBonus: 0,
    });
  });
});

describe("quiz check-answer POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupOpenQuiz();
  });

  it("acknowledges accepted answer without revealing correctness", async () => {
    const { POST } = await import(
      "@/app/api/classrooms/[id]/assignments/[assignmentId]/check-answer/route"
    );

    const ok = await POST(
      {
        json: async () => ({
          studentCode: "ABC",
          questionIndex: 0,
          selectedIndex: 1,
        }),
      } as Request,
      { params: Promise.resolve({ id: "class-1", assignmentId: "asg-1" }) }
    );
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ accepted: true });
  });
});
