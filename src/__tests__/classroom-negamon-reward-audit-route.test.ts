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

describe("classroom Negamon reward audit route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSessionUser.mockResolvedValue({ id: "teacher-1" });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1" });
    mockListRecentAuditEvents.mockResolvedValue([]);
  });

  it("requires an authenticated teacher", async () => {
    mockRequireSessionUser.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/negamon/reward-audit/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/negamon/reward-audit") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(401);
    expect(mockListRecentAuditEvents).not.toHaveBeenCalled();
  });

  it("requires the classroom to belong to the teacher", async () => {
    mockClassroomFindUnique.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/negamon/reward-audit/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/negamon/reward-audit") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(403);
    expect(mockListRecentAuditEvents).not.toHaveBeenCalled();
  });

  it("returns filtered reward sync audit summary", async () => {
    mockListRecentAuditEvents.mockResolvedValue([
      {
        action: "classroom.negamon_battle.rewards_applied",
        category: "classroom",
        reason: null,
        status: "success",
        targetType: "classroom",
        targetId: "class-1",
        metadata: {
          gamePin: "123456",
          recipientCount: 1,
          totalExp: 80,
          appliedLinkedIdentityCount: 1,
        },
        timestamp: new Date("2026-04-30T00:00:00.000Z"),
      },
      {
        action: "classroom.negamon_battle.rewards_skipped",
        category: "classroom",
        reason: "no_awards",
        status: "success",
        targetType: "classroom",
        targetId: "class-1",
        metadata: {
          gamePin: "999999",
          reason: "no_awards",
          skippedPlayerCount: 2,
        },
        timestamp: new Date("2026-04-30T01:00:00.000Z"),
      },
    ]);
    const { GET } = await import("@/app/api/classrooms/[id]/negamon/reward-audit/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/negamon/reward-audit?gamePin=123456&limit=10") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockClassroomFindUnique).toHaveBeenCalledWith({
      where: { id: "class-1", teacherId: "teacher-1" },
      select: { id: true },
    });
    expect(mockListRecentAuditEvents).toHaveBeenCalledWith(200, {
      targetId: "class-1",
      category: "classroom",
      actionPrefix: "classroom.negamon_battle.rewards_",
    });

    const body = await response.json();
    expect(body.filters).toMatchObject({
      classId: "class-1",
      gamePin: "123456",
      reason: null,
      limit: 10,
    });
    expect(body.summary).toMatchObject({
      eventCount: 1,
      appliedEventCount: 1,
      skippedEventCount: 0,
      recipientCount: 1,
      totalExp: 80,
      appliedLinkedIdentityCount: 1,
    });
    expect(body.events).toHaveLength(1);
  });
});
