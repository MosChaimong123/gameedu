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

describe("classroom Negamon reward remediation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSessionUser.mockResolvedValue({ id: "teacher-1" });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1" });
    mockListRecentAuditEvents.mockResolvedValue([]);
  });

  it("requires an authenticated teacher", async () => {
    mockRequireSessionUser.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/negamon/reward-remediation/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/negamon/reward-remediation") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(401);
    expect(mockListRecentAuditEvents).not.toHaveBeenCalled();
  });

  it("returns remediation summary filtered by classroom and reward game pin", async () => {
    mockListRecentAuditEvents.mockResolvedValue([
      {
        action: "classroom.student.profile_updated",
        category: "classroom",
        reason: null,
        status: "success",
        targetType: "student",
        targetId: "student-1",
        metadata: {
          classroomId: "class-1",
          source: "negamon_reward_audit",
          rewardGamePin: "123456",
          changes: {
            nickname: { before: "Ali", after: "Ace" },
          },
        },
        timestamp: new Date("2026-04-30T00:00:00.000Z"),
      },
      {
        action: "classroom.student.profile_updated",
        category: "classroom",
        reason: null,
        status: "success",
        targetType: "student",
        targetId: "student-2",
        metadata: {
          classroomId: "class-2",
          source: "negamon_reward_audit",
          rewardGamePin: "123456",
          changes: {
            name: { before: "Bob", after: "Bobby" },
          },
        },
        timestamp: new Date("2026-04-30T01:00:00.000Z"),
      },
    ]);

    const { GET } = await import("@/app/api/classrooms/[id]/negamon/reward-remediation/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/negamon/reward-remediation?gamePin=123456&limit=20") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockListRecentAuditEvents).toHaveBeenCalledWith(200, {
      action: "classroom.student.profile_updated",
      category: "classroom",
    });

    const body = await response.json();
    expect(body.filters).toMatchObject({
      classId: "class-1",
      gamePin: "123456",
      limit: 20,
    });
    expect(body.summary).toMatchObject({
      eventCount: 1,
      studentCount: 1,
      nicknameChangeCount: 1,
      gamePinCount: 1,
    });
    expect(body.events).toHaveLength(1);
  });
});
