import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStudentFindFirst = vi.fn();
const mockAssignmentFindUnique = vi.fn();
const mockAssignmentSubmissionFindUnique = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    student: { findFirst: mockStudentFindFirst },
    assignment: { findUnique: mockAssignmentFindUnique },
    assignmentSubmission: { findUnique: mockAssignmentSubmissionFindUnique },
  },
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
    visible: true,
    deadline: null,
    maxScore: 10,
    quizData: { questions: [q1, q2] },
    quizReviewMode: null,
    classroom: { quizReviewMode: null },
  });
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
