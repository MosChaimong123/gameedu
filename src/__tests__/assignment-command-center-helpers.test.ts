import { describe, expect, it } from "vitest";
import {
  buildAttendanceTabHref,
  buildAssignmentClassroomHref,
  buildClassroomAssignmentsHref,
  buildAssignmentOverviewUrl,
  formatAssignmentClassSummary,
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
      "{overdue} overdue · {dueSoon} due soon · {missing} missing slots",
      { overdueCount: 2, dueWithinRangeCount: 5, missingSubmissionSlots: 9 }
    );
    expect(text).toBe("2 overdue · 5 due soon · 9 missing slots");
  });
});
