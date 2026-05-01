import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockGameHistoryFindMany = vi.fn();
const mockGameHistoryFindUnique = vi.fn();
const mockQuestionSetFindUnique = vi.fn();
const mockRedirect = vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
});

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    gameHistory: {
      findMany: mockGameHistoryFindMany,
      findUnique: mockGameHistoryFindUnique,
    },
    questionSet: {
      findUnique: mockQuestionSetFindUnique,
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
  })),
}));

vi.mock("next/link", () => ({
  default: ({ children }: { children: unknown }) => children,
}));

vi.mock("lucide-react", () => ({
  Calendar: "CalendarIcon",
  Clock: "ClockIcon",
  Users: "UsersIcon",
  ArrowRight: "ArrowRightIcon",
  BarChart3: "BarChart3Icon",
  TrendingUp: "TrendingUpIcon",
  Trophy: "TrophyIcon",
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: unknown }) => children,
}));

vi.mock("@/components/ui/page-back-link", () => ({
  PageBackLink: () => null,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: unknown }) => children,
  CardContent: ({ children }: { children: unknown }) => children,
  CardHeader: ({ children }: { children: unknown }) => children,
  CardTitle: ({ children }: { children: unknown }) => children,
}));

vi.mock("@/components/dashboard/reports/analysis-dashboard", () => ({
  AnalysisDashboard: () => null,
}));

vi.mock("@/components/dashboard/teacher-command-center", () => ({
  TeacherCommandCenter: () => null,
}));

vi.mock("@/components/dashboard/assignment-command-center", () => ({
  AssignmentCommandCenter: () => null,
}));

vi.mock("@/components/dashboard/reports/reports-tabs", () => ({
  ReportsTabs: () => null,
}));

describe("history and reports pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    mockGameHistoryFindMany.mockResolvedValue([]);
    mockGameHistoryFindUnique.mockResolvedValue({
      id: "history-1",
      hostId: "teacher-1",
      setId: "set-1",
      gameMode: "GOLD_QUEST",
      startedAt: new Date("2026-04-02T09:00:00.000Z"),
      endedAt: new Date("2026-04-02T09:10:00.000Z"),
      players: [],
      settings: {},
    });
    mockQuestionSetFindUnique.mockResolvedValue({ questions: [] });
  });

  it(
    "queries only list fields for history page",
    async () => {
      const HistoryPage = (await import("@/app/dashboard/history/page")).default;

      await HistoryPage();

      expect(mockGameHistoryFindMany).toHaveBeenCalledWith({
        where: { hostId: "teacher-1" },
        orderBy: { endedAt: "desc" },
        select: {
          id: true,
          gameMode: true,
          endedAt: true,
          players: true,
          pin: true,
        },
      });
    },
    30_000
  );

  it(
    "queries only list fields for reports page",
    async () => {
      const ReportsPage = (await import("@/app/dashboard/reports/page")).default;

      await ReportsPage();

      expect(mockGameHistoryFindMany).toHaveBeenCalledWith({
        where: { hostId: "teacher-1" },
        orderBy: { endedAt: "desc" },
        select: {
          id: true,
          gameMode: true,
          endedAt: true,
          players: true,
        },
      });
    },
    30_000
  );

  it("queries only required detail fields for report detail page", async () => {
    const ReportDetailPage = (await import("@/app/dashboard/reports/[id]/page")).default;

    await ReportDetailPage({ params: Promise.resolve({ id: "history-1" }) });

    expect(mockGameHistoryFindUnique).toHaveBeenCalledWith({
      where: { id: "history-1" },
      select: {
        id: true,
        hostId: true,
        setId: true,
        gameMode: true,
        startedAt: true,
        endedAt: true,
        players: true,
      },
    });
    expect(mockQuestionSetFindUnique).toHaveBeenCalledWith({
      where: { id: "set-1" },
      select: {
        questions: true,
      },
    });
    expect(mockGameHistoryFindMany).toHaveBeenCalledWith({
      where: { hostId: "teacher-1" },
      orderBy: { endedAt: "asc" },
      select: {
        endedAt: true,
        players: true,
      },
    });
  });

  it("queries only required detail fields for history detail page", async () => {
    const HistoryDetailPage = (await import("@/app/dashboard/history/[id]/page")).default;

    await HistoryDetailPage({ params: Promise.resolve({ id: "history-1" }) });

    expect(mockGameHistoryFindUnique).toHaveBeenCalledWith({
      where: { id: "history-1" },
      select: {
        id: true,
        hostId: true,
        gameMode: true,
        endedAt: true,
        startedAt: true,
        players: true,
        settings: true,
      },
    });
  });
});
