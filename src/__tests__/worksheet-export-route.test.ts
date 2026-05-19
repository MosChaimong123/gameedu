import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireSessionUser = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockAssignmentFindUnique = vi.fn();
const mockAssignmentSubmissionFindMany = vi.fn();

vi.mock("@/lib/auth-guards", () => ({
  requireSessionUser: mockRequireSessionUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    assignment: {
      findUnique: mockAssignmentFindUnique,
    },
    assignmentSubmission: {
      findMany: mockAssignmentSubmissionFindMany,
    },
  },
}));

describe("worksheet export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSessionUser.mockResolvedValue({ id: "teacher-1" });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1" });
    mockAssignmentFindUnique.mockResolvedValue({
      id: "assignment-1",
      classId: "class-1",
      name: "Worksheet A",
      type: "worksheet",
      maxScore: 10,
    });
    mockAssignmentSubmissionFindMany.mockResolvedValue([]);
  });

  it("requires an authenticated teacher", async () => {
    mockRequireSessionUser.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/worksheet/export/route");
    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/assignments/assignment-1/worksheet/export") as never,
      { params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }) }
    );

    expect(response.status).toBe(401);
  });

  it("rejects classrooms outside the teacher scope", async () => {
    mockClassroomFindUnique.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/worksheet/export/route");
    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/assignments/assignment-1/worksheet/export") as never,
      { params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }) }
    );

    expect(response.status).toBe(403);
  });

  it("exports worksheet submissions as csv and sanitizes spreadsheet-like values", async () => {
    mockAssignmentSubmissionFindMany.mockResolvedValue([
      {
        id: "sub-1",
        score: 7,
        submittedAt: new Date("2026-05-19T10:00:00.000Z"),
        content: JSON.stringify({
          mode: "worksheet",
          reviewedAt: "2026-05-19T10:10:00.000Z",
          answers: {
            "short-1": '=cmd|"/C calc"!A0',
          },
          itemResults: [
            {
              itemId: "short-1",
              correct: null,
              score: 0,
              maxScore: 2,
              needsReview: true,
            },
          ],
        }),
        student: {
          id: "student-1",
          name: "Alice",
          nickname: "+A",
          loginCode: "@code",
        },
      },
    ]);

    const { GET } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/worksheet/export/route");
    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/assignments/assignment-1/worksheet/export") as never,
      { params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }) }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain("worksheet-submissions.csv");
    const csv = await response.text();
    expect(csv).toContain("pendingReviewCount");
    expect(csv).toContain(`"'+A"`);
    expect(csv).toContain(`"'@code"`);
    expect(csv).toContain(`"'=cmd|\\""\/C calc\\""!A0"`.replace("\\/", "/"));
  });
});
