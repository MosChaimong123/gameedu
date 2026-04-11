import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClassroomFindFirst = vi.fn();
const mockClassroomFindMany = vi.fn();
const mockAssignmentFindMany = vi.fn();
const mockAssignmentSubmissionGroupBy = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findFirst: mockClassroomFindFirst,
      findMany: mockClassroomFindMany,
    },
    assignment: {
      findMany: mockAssignmentFindMany,
    },
    assignmentSubmission: {
      groupBy: mockAssignmentSubmissionGroupBy,
    },
  },
}));

describe("teacher assignment overview service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-06T00:00:00.000Z"));
  });

  it("parses range query safely", async () => {
    const { parseAssignmentOverviewRangeDays } = await import(
      "@/lib/services/teacher/get-teacher-assignment-overview"
    );

    expect(parseAssignmentOverviewRangeDays(null)).toBe(14);
    expect(parseAssignmentOverviewRangeDays("7")).toBe(7);
    expect(parseAssignmentOverviewRangeDays("30d")).toBe(30);
    expect(parseAssignmentOverviewRangeDays("99")).toBe(14);
    expect(parseAssignmentOverviewRangeDays("oops")).toBe(14);
  });

  it("returns null when classId is not owned by teacher", async () => {
    mockClassroomFindFirst.mockResolvedValue(null);

    const { getTeacherAssignmentOverview } = await import(
      "@/lib/services/teacher/get-teacher-assignment-overview"
    );
    const result = await getTeacherAssignmentOverview("teacher-1", {
      classId: "507f1f77bcf86cd799439011",
      rangeDays: 14,
    });

    expect(result).toBeNull();
    expect(mockClassroomFindMany).not.toHaveBeenCalled();
  });

  it("aggregates overdue, due-soon, and missing submission slots", async () => {
    mockClassroomFindMany.mockResolvedValue([
      {
        id: "class-1",
        name: "Math",
        emoji: "📘",
        grade: "G6",
        updatedAt: new Date("2026-04-05T00:00:00.000Z"),
        _count: { students: 3 },
      },
      {
        id: "class-2",
        name: "Science",
        emoji: "🧪",
        grade: "G7",
        updatedAt: new Date("2026-04-04T00:00:00.000Z"),
        _count: { students: 2 },
      },
    ]);

    mockAssignmentFindMany.mockResolvedValue([
      {
        id: "a-overdue",
        classId: "class-1",
        name: "Old HW",
        type: "standard",
        deadline: new Date("2026-04-05T00:00:00.000Z"),
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        classroom: { name: "Math" },
      },
      {
        id: "a-soon",
        classId: "class-1",
        name: "Quiz 1",
        type: "quiz",
        deadline: new Date("2026-04-10T00:00:00.000Z"),
        createdAt: new Date("2026-04-02T00:00:00.000Z"),
        classroom: { name: "Math" },
      },
      {
        id: "a-nodl",
        classId: "class-2",
        name: "Lab Report",
        type: "checklist",
        deadline: null,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
        classroom: { name: "Science" },
      },
    ]);

    mockAssignmentSubmissionGroupBy.mockResolvedValue([
      { assignmentId: "a-overdue", _count: { _all: 1 } },
      { assignmentId: "a-soon", _count: { _all: 2 } },
      { assignmentId: "a-nodl", _count: { _all: 0 } },
    ]);

    const { getTeacherAssignmentOverview } = await import(
      "@/lib/services/teacher/get-teacher-assignment-overview"
    );
    const result = await getTeacherAssignmentOverview("teacher-1", {
      rangeDays: 14,
    });

    expect(result).not.toBeNull();
    expect(result?.totals).toMatchObject({
      visibleAssignmentCount: 3,
      overdueAssignmentCount: 1,
      dueWithinRangeCount: 1,
      missingSubmissionSlots: 5,
    });
    expect(result?.classrooms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "class-1",
          overdueCount: 1,
          dueWithinRangeCount: 1,
          missingSubmissionSlots: 3,
        }),
        expect.objectContaining({
          id: "class-2",
          overdueCount: 0,
          dueWithinRangeCount: 0,
          missingSubmissionSlots: 2,
        }),
      ])
    );
    expect(result?.items.map((i) => i.assignmentId)).toEqual(
      expect.arrayContaining(["a-overdue", "a-soon", "a-nodl"])
    );
  });
});
