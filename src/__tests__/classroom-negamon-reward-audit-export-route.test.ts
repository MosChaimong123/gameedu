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

describe("classroom Negamon reward audit export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSessionUser.mockResolvedValue({ id: "teacher-1" });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1" });
    mockListRecentAuditEvents.mockResolvedValue([]);
  });

  it("requires an authenticated teacher", async () => {
    mockRequireSessionUser.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/negamon/reward-audit/export/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/negamon/reward-audit/export") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(401);
    expect(mockListRecentAuditEvents).not.toHaveBeenCalled();
  });

  it("exports filtered reward audit rows as csv and sanitizes spreadsheet-like values", async () => {
    mockListRecentAuditEvents.mockResolvedValue([
      {
        action: "classroom.negamon_battle.rewards_applied",
        category: "classroom",
        reason: null,
        status: "success",
        targetType: "classroom",
        targetId: "class-1",
        metadata: {
          gamePin: "=123456",
          recipientCount: 1,
          totalExp: 80,
          linkedIdentityCount: 1,
          nameFallbackCount: 0,
          skippedPlayerCount: 1,
          skippedAmbiguousNameCount: 1,
          skippedInvalidStudentIdCount: 0,
          skippedNoMatchCount: 0,
          recipients: [{ studentId: "student-1", identitySource: "@student" }],
          skippedPlayers: [{ name: "+Alice", reason: "ambiguous_name" }],
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
        },
        timestamp: new Date("2026-04-30T01:00:00.000Z"),
      },
    ]);
    const { GET } = await import("@/app/api/classrooms/[id]/negamon/reward-audit/export/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/negamon/reward-audit/export?gamePin==123456") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain("negamon-reward-audit.csv");
    expect(mockListRecentAuditEvents).toHaveBeenCalledWith(500, {
      targetId: "class-1",
      category: "classroom",
      actionPrefix: "classroom.negamon_battle.rewards_",
    });

    const csv = await response.text();
    expect(csv).toContain("gamePin");
    expect(csv).toContain(`"'=123456"`);
    expect(csv).toContain(`"[{""studentId"":""student-1"",""identitySource"":""'@student""}]"`);
    expect(csv).toContain(`"[{""name"":""'+Alice"",""reason"":""ambiguous_name""}]"`);
    expect(csv).not.toContain("999999");
  });
});
