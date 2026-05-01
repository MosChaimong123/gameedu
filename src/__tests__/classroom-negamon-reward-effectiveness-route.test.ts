import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireSessionUser = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockListRecentAuditEvents = vi.fn();

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

vi.mock("@/lib/security/audit-log", () => ({
  listRecentAuditEvents: mockListRecentAuditEvents,
}));

describe("classroom Negamon reward effectiveness route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSessionUser.mockResolvedValue({ id: "teacher-1" });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1" });
    mockListRecentAuditEvents.mockResolvedValue([]);
  });

  it("requires an authenticated teacher", async () => {
    mockRequireSessionUser.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/negamon/reward-effectiveness/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/negamon/reward-effectiveness") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(401);
    expect(mockListRecentAuditEvents).not.toHaveBeenCalled();
  });

  it("returns effectiveness grouped by game pin", async () => {
    mockListRecentAuditEvents
      .mockResolvedValueOnce([
        {
          action: "classroom.negamon_battle.rewards_skipped",
          category: "classroom",
          reason: "no_awards",
          status: "success",
          targetType: "classroom",
          targetId: "class-1",
          metadata: {
            gamePin: "123456",
            skippedPlayerCount: 2,
          },
          timestamp: new Date("2026-04-30T01:00:00.000Z"),
        },
        {
          action: "classroom.negamon_battle.rewards_applied",
          category: "classroom",
          reason: null,
          status: "success",
          targetType: "classroom",
          targetId: "class-1",
          metadata: {
            gamePin: "999999",
            recipientCount: 1,
          },
          timestamp: new Date("2026-04-30T02:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          action: "classroom.student.profile_updated",
          category: "classroom",
          reason: null,
          status: "success",
          targetType: "student",
          targetId: "student-1",
          metadata: {
            source: "negamon_reward_audit",
            classroomId: "class-1",
            rewardGamePin: "123456",
          },
          timestamp: new Date("2026-04-30T03:00:00.000Z"),
        },
        {
          action: "classroom.student.profile_updated",
          category: "classroom",
          reason: null,
          status: "success",
          targetType: "student",
          targetId: "student-2",
          metadata: {
            source: "negamon_reward_audit",
            classroomId: "class-2",
            rewardGamePin: "123456",
          },
          timestamp: new Date("2026-04-30T04:00:00.000Z"),
        },
      ]);

    const { GET } = await import("@/app/api/classrooms/[id]/negamon/reward-effectiveness/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/negamon/reward-effectiveness?limit=10") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockListRecentAuditEvents).toHaveBeenNthCalledWith(1, 200, {
      targetId: "class-1",
      category: "classroom",
      actionPrefix: "classroom.negamon_battle.rewards_",
    });
    expect(mockListRecentAuditEvents).toHaveBeenNthCalledWith(2, 200, {
      action: "classroom.student.profile_updated",
      category: "classroom",
    });

    const body = await response.json();
    expect(body.filters).toMatchObject({
      classId: "class-1",
      gamePin: null,
      limit: 10,
    });
    expect(body.summary).toMatchObject({
      gamePinCount: 2,
      pinsWithSkips: 1,
      pinsWithRemediation: 1,
      totalSkippedPlayers: 2,
      totalRecipients: 1,
      totalRemediationEvents: 1,
    });
    expect(body.gamePins[0]).toMatchObject({
      gamePin: "123456",
      remediationEventCount: 1,
      skippedPlayerCount: 2,
    });
  });
});
