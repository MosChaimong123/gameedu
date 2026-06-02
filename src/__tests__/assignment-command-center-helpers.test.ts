import { describe, expect, it } from "vitest";
import {
  buildAttendanceTabHref,
  buildAssignmentClassroomHref,
  buildClassroomAssignmentsHref,
  buildAssignmentOverviewUrl,
  buildAssignmentReminderMessage,
  formatAssignmentClassSummary,
  getReminderCandidates,
} from "@/components/dashboard/assignment-command-center.helpers";

describe("assignment command center helpers", () => {
  it("builds assignment overview URL with selected range", () => {
    expect(buildAssignmentOverviewUrl(7)).toBe("/api/teacher/assignments/overview?range=7d");
    expect(buildAssignmentOverviewUrl(14)).toBe("/api/teacher/assignments/overview?range=14d");
    expect(buildAssignmentOverviewUrl(30)).toBe("/api/teacher/assignments/overview?range=30d");
  });

  it("builds classroom deep-link with assignment focus", () => {
    expect(buildAssignmentClassroomHref("class-1")).toBe(
      "/dashboard/classrooms/class-1?tab=classroom&focus=assignments"
    );
  });

  it("adds highlightAssignmentId when provided", () => {
    expect(buildAssignmentClassroomHref("class-1", "507f1f77bcf86cd799439011")).toBe(
      "/dashboard/classrooms/class-1?tab=classroom&focus=assignments&highlightAssignmentId=507f1f77bcf86cd799439011"
    );
  });

  it("builds attendance tab deep-link", () => {
    expect(buildAttendanceTabHref("class-1")).toBe("/dashboard/classrooms/class-1?tab=attendance");
  });

  it("builds classroom assignment deep-link alias", () => {
    expect(buildClassroomAssignmentsHref("class-1")).toBe(
      "/dashboard/classrooms/class-1?tab=classroom&focus=assignments"
    );
  });

  it("formats class summary placeholders", () => {
    const text = formatAssignmentClassSummary(
      "{overdue} overdue - {dueSoon} due soon - {missing} missing slots",
      { overdueCount: 2, dueWithinRangeCount: 5, missingSubmissionSlots: 9 }
    );
    expect(text).toBe("2 overdue - 5 due soon - 9 missing slots");
  });

  it("keeps reminder candidates focused on missing urgent work", () => {
    const candidates = getReminderCandidates([
      {
        assignmentId: "a-overdue",
        classId: "class-1",
        classroomName: "Math",
        name: "Old homework",
        type: "assignment",
        deadline: "2026-04-05T00:00:00.000Z",
        missingSubmissions: 2,
        overdue: true,
        dueWithinRange: false,
      },
      {
        assignmentId: "a-complete",
        classId: "class-1",
        classroomName: "Math",
        name: "Done",
        type: "assignment",
        deadline: "2026-04-08T00:00:00.000Z",
        missingSubmissions: 0,
        overdue: false,
        dueWithinRange: true,
      },
      {
        assignmentId: "a-no-deadline",
        classId: "class-2",
        classroomName: "Science",
        name: "No deadline",
        type: "assignment",
        deadline: null,
        missingSubmissions: 4,
        overdue: false,
        dueWithinRange: false,
      },
    ]);

    expect(candidates.map((item) => item.assignmentId)).toEqual(["a-overdue"]);
  });

  it("builds a copyable assignment reminder message", () => {
    const message = buildAssignmentReminderMessage({
      assignmentId: "a-soon",
      classId: "class-1",
      classroomName: "Math",
      name: "Quiz 1",
      type: "quiz",
      deadline: "2026-04-08T00:00:00.000Z",
      missingSubmissions: 3,
      overdue: false,
      dueWithinRange: true,
    });

    expect(message).toContain("GameEdu reminder");
    expect(message).toContain("Class: Math");
    expect(message).toContain("Assignment: Quiz 1");
    expect(message).toContain("Still missing: 3 submission(s)");
  });
});
