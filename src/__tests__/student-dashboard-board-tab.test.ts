import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StudentDashboardBoardTab } from "@/components/student/student-dashboard-board-tab";

const mockClassBoardSpy = vi.fn();
const mockSyncAccountButtonSpy = vi.fn();

vi.mock("@/components/board/ClassBoard", () => ({
  ClassBoard: (props: unknown) => {
    mockClassBoardSpy(props);
    return React.createElement("div");
  },
}));

vi.mock("@/components/student/sync-account-button", () => ({
  SyncAccountButton: (props: unknown) => {
    mockSyncAccountButtonSpy(props);
    return React.createElement("button");
  },
}));

vi.mock("@/components/ui/tabs", () => ({
  TabsContent: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => children,
  CardContent: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => children,
}));

describe("student dashboard board tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the live class board when access is allowed", () => {
    renderToStaticMarkup(
      React.createElement(StudentDashboardBoardTab, {
        t: (key: string) => key,
        classId: "class-1",
        studentId: "student-1",
        currentUserId: "user-1",
        studentUserId: "user-1",
        code: "ABC123",
        canAccessBoard: true,
      })
    );

    expect(mockClassBoardSpy).toHaveBeenCalledTimes(1);
    expect((mockClassBoardSpy.mock.calls[0][0] as { classId: string }).classId).toBe("class-1");
    expect(mockSyncAccountButtonSpy).not.toHaveBeenCalled();
  });

  it("renders sync CTA gate when access is blocked for an unlinked student", () => {
    renderToStaticMarkup(
      React.createElement(StudentDashboardBoardTab, {
        t: (key: string) => key,
        classId: "class-1",
        studentId: "student-1",
        currentUserId: "user-1",
        studentUserId: null,
        code: "ABC123",
        canAccessBoard: false,
      })
    );

    expect(mockClassBoardSpy).not.toHaveBeenCalled();
    expect(mockSyncAccountButtonSpy).toHaveBeenCalledTimes(1);
    expect((mockSyncAccountButtonSpy.mock.calls[0][0] as { loginCode: string }).loginCode).toBe("ABC123");
  });
});
