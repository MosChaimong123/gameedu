import { describe, expect, it } from "vitest";
import {
  estimateQuizAssignmentExpPreview,
  getStudentDueWork,
} from "@/components/student/student-dashboard-assignments.helpers";

describe("student dashboard assignment helpers", () => {
  it("returns urgent incomplete work sorted by overdue first", () => {
    const now = new Date("2026-06-01T08:00:00.000Z");

    const result = getStudentDueWork(
      [
        {
          id: "completed",
          name: "Completed",
          deadlineAt: new Date("2026-06-01T09:00:00.000Z"),
          deadlineValid: true,
          isCompleted: true,
          isQuiz: false,
          isWorksheet: true,
        },
        {
          id: "soon",
          name: "Soon",
          deadlineAt: new Date("2026-06-02T09:00:00.000Z"),
          deadlineValid: true,
          isCompleted: false,
          isQuiz: true,
          isWorksheet: false,
        },
        {
          id: "overdue",
          name: "Overdue",
          deadlineAt: new Date("2026-05-31T09:00:00.000Z"),
          deadlineValid: true,
          isCompleted: false,
          isQuiz: false,
          isWorksheet: true,
        },
        {
          id: "later",
          name: "Later",
          deadlineAt: new Date("2026-06-10T09:00:00.000Z"),
          deadlineValid: true,
          isCompleted: false,
          isQuiz: false,
          isWorksheet: false,
        },
      ],
      now
    );

    expect(result.map((item) => item.id)).toEqual(["overdue", "soon"]);
    expect(result[0]).toMatchObject({ isOverdue: true });
    expect(result[1]).toMatchObject({ isDueSoon: true });
  });

  it("respects the display limit", () => {
    const now = new Date("2026-06-01T08:00:00.000Z");
    const result = getStudentDueWork(
      Array.from({ length: 5 }, (_, index) => ({
        id: `task-${index}`,
        name: `Task ${index}`,
        deadlineAt: new Date(`2026-06-01T1${index}:00:00.000Z`),
        deadlineValid: true,
        isCompleted: false,
        isQuiz: false,
        isWorksheet: true,
      })),
      now,
      2
    );

    expect(result).toHaveLength(2);
  });

  it("estimates quiz reward preview only when Negamon rewards are active", () => {
    expect(
      estimateQuizAssignmentExpPreview({
        isQuiz: true,
        maxScore: 10,
        negamonSettings: {
          enabled: true,
          allowStudentChoice: true,
          expPerPoint: 6,
          expPerAttendance: 18,
          species: [],
          studentMonsters: {},
          disabledMoves: [],
        },
      })
    ).toBe(12);

    expect(
      estimateQuizAssignmentExpPreview({
        isQuiz: false,
        maxScore: 10,
        negamonSettings: {
          enabled: true,
          allowStudentChoice: true,
          expPerPoint: 6,
          expPerAttendance: 18,
          species: [],
          studentMonsters: {},
          disabledMoves: [],
        },
      })
    ).toBe(0);
  });
});
