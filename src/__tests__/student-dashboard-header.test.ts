import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StudentDashboardHeader } from "@/components/student/student-dashboard-header";

const mockSyncAccountButtonSpy = vi.fn();
const mockPageBackLinkSpy = vi.fn();

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => React.createElement("img", props),
}));

vi.mock("framer-motion", () => {
  const MotionDiv = ({
    children,
    whileHover: _whileHover,
    whileTap: _whileTap,
    initial: _initial,
    animate: _animate,
    transition: _transition,
    ...rest
  }: {
    children?: React.ReactNode;
    whileHover?: unknown;
    whileTap?: unknown;
    initial?: unknown;
    animate?: unknown;
    transition?: unknown;
  } & Record<string, unknown>) =>
    React.createElement("div", rest as React.HTMLAttributes<HTMLDivElement>, children);

  return {
    motion: {
      div: MotionDiv,
    },
  };
});

vi.mock("@/components/language-toggle", () => ({
  LanguageToggle: () => React.createElement("span", { "data-testid": "lang-toggle-mock" }),
}));

vi.mock("@/components/ui/page-back-link", () => ({
  PageBackLink: (props: unknown) => {
    mockPageBackLinkSpy(props);
    return React.createElement("a");
  },
}));

vi.mock("@/components/student/sync-account-button", () => ({
  SyncAccountButton: (props: unknown) => {
    mockSyncAccountButtonSpy(props);
    return React.createElement("button");
  },
}));

describe("student dashboard header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows sync CTA only when a signed-in user is not yet linked to the student", () => {
    renderToStaticMarkup(
      React.createElement(StudentDashboardHeader, {
        t: (key: string) => key,
        classroom: {
          id: "class-1",
          name: "Class 1",
          teacher: { name: "Teacher A" },
          gamifiedSettings: {},
        },
        student: {
          id: "student-1",
          classId: "class-1",
          loginCode: "111111",
          name: "Alice",
          userId: null,
          behaviorPoints: 10,
          gold: 20,
          streak: 1,
          lastCheckIn: null,
          inventory: [],
          battleLoadout: [],
          equippedFrame: null,
          negamonSkills: [],
        },
        code: "ABC123",
        currentUserId: "user-1",
        mode: "learn",
        classIcon: null,
        isImageIcon: false,
        themeClass: "from-sky-500 to-indigo-500",
        themeStyle: {},
        notificationTray: React.createElement("div"),
        onToggleMode: vi.fn(),
      })
    );

    expect(mockPageBackLinkSpy).toHaveBeenCalledTimes(1);
    expect(mockSyncAccountButtonSpy).toHaveBeenCalledTimes(1);
    expect((mockSyncAccountButtonSpy.mock.calls[0][0] as { loginCode: string }).loginCode).toBe("ABC123");
  });

  it("hides sync CTA when the student is already linked", () => {
    renderToStaticMarkup(
      React.createElement(StudentDashboardHeader, {
        t: (key: string) => key,
        classroom: {
          id: "class-1",
          name: "Class 1",
          teacher: { name: "Teacher A" },
          gamifiedSettings: {},
        },
        student: {
          id: "student-1",
          classId: "class-1",
          loginCode: "111111",
          name: "Alice",
          userId: "user-1",
          behaviorPoints: 10,
          gold: 20,
          streak: 1,
          lastCheckIn: null,
          inventory: [],
          battleLoadout: [],
          equippedFrame: null,
          negamonSkills: [],
        },
        code: "ABC123",
        currentUserId: "user-1",
        mode: "game",
        classIcon: "icon",
        isImageIcon: false,
        themeClass: "from-sky-500 to-indigo-500",
        themeStyle: {},
        notificationTray: React.createElement("div"),
        onToggleMode: vi.fn(),
      })
    );

    expect(mockSyncAccountButtonSpy).not.toHaveBeenCalled();
  });
});
