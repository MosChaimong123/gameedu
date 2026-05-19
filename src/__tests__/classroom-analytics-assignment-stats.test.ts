import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireSessionUser = vi.fn();
const mockClassroomFindUnique = vi.fn();

vi.mock("@/lib/auth-guards", () => ({
  requireSessionUser: mockRequireSessionUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
  },
}));

describe("classroom analytics assignment stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSessionUser.mockResolvedValue({ id: "teacher-1" });
  });

  it("normalizes checklist submission bitmasks into actual checklist points", async () => {
    mockClassroomFindUnique.mockResolvedValueOnce({
      assignments: [
        {
          id: "assignment-1",
          name: "Checklist Work",
          type: "checklist",
          checklists: [
            { text: "A", points: 2 },
            { text: "B", points: 3 },
            { text: "C", points: 5 },
          ],
          maxScore: 10,
          passScore: 5,
          deadline: null,
          visible: true,
        },
      ],
      students: [
        {
          id: "student-1",
          name: "Alice",
          nickname: null,
          behaviorPoints: 0,
          attendance: "PRESENT",
          submissions: [{ assignmentId: "assignment-1", score: 0b011, submittedAt: new Date("2026-05-04T00:00:00.000Z"), content: null }],
          history: [],
          achievements: [],
        },
        {
          id: "student-2",
          name: "Bob",
          nickname: null,
          behaviorPoints: 0,
          attendance: "PRESENT",
          submissions: [{ assignmentId: "assignment-1", score: 0b100, submittedAt: new Date("2026-05-04T00:00:00.000Z"), content: null }],
          history: [],
          achievements: [],
        },
        {
          id: "student-3",
          name: "Cara",
          nickname: null,
          behaviorPoints: 0,
          attendance: "ABSENT",
          submissions: [],
          history: [],
          achievements: [],
        },
      ],
    });

    const route = await import("@/app/api/classrooms/[id]/analytics/route");
    const response = await route.GET({} as never, {
      params: Promise.resolve({ id: "class-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.assignmentStats).toEqual([
      {
        id: "assignment-1",
        name: "Checklist Work",
        type: "checklist",
        maxScore: 10,
        passScore: 5,
        submittedCount: 2,
        totalStudents: 3,
        submissionRate: 67,
        avgScore: 5,
        passCount: 2,
        worksheetPendingReviewCount: 0,
        notSubmitted: [{ id: "student-3", name: "Cara" }],
      },
    ]);
  });

  it("counts pending manual worksheet review items", async () => {
    mockClassroomFindUnique.mockResolvedValueOnce({
      assignments: [
        {
          id: "worksheet-1",
          name: "Worksheet Review",
          type: "worksheet",
          checklists: null,
          maxScore: 12,
          passScore: null,
          deadline: null,
          visible: true,
        },
      ],
      students: [
        {
          id: "student-1",
          name: "Alice",
          nickname: null,
          behaviorPoints: 0,
          attendance: "PRESENT",
          submissions: [
            {
              assignmentId: "worksheet-1",
              score: 6,
              submittedAt: new Date("2026-05-04T00:00:00.000Z"),
              content: JSON.stringify({
                mode: "worksheet",
                answers: {},
                itemResults: [
                  { itemId: "a", correct: null, score: 0, maxScore: 2, needsReview: true },
                  { itemId: "b", correct: true, score: 2, maxScore: 2, needsReview: false },
                ],
              }),
            },
          ],
          history: [],
          achievements: [],
        },
      ],
    });

    const route = await import("@/app/api/classrooms/[id]/analytics/route");
    const response = await route.GET({} as never, {
      params: Promise.resolve({ id: "class-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.assignmentStats[0]).toEqual(
      expect.objectContaining({
        id: "worksheet-1",
        worksheetPendingReviewCount: 1,
      })
    );
  });
});
