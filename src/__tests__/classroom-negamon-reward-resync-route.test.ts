import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireSessionUser = vi.fn();
const mockResyncNegamonBattleRewardsForGamePin = vi.fn();

vi.mock("@/lib/auth-guards", () => ({
  requireSessionUser: mockRequireSessionUser,
}));

vi.mock("@/lib/negamon/sync-negamon-battle-rewards", () => ({
  resyncNegamonBattleRewardsForGamePin: mockResyncNegamonBattleRewardsForGamePin,
}));

describe("classroom Negamon reward re-sync route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSessionUser.mockResolvedValue({ id: "teacher-1" });
    mockResyncNegamonBattleRewardsForGamePin.mockResolvedValue({
      gamePin: "123456",
      requestedByUserId: "teacher-1",
      appliedCount: 1,
      skippedCount: 0,
      unresolvedCount: 0,
      reason: "applied",
    });
  });

  it("requires an authenticated teacher", async () => {
    mockRequireSessionUser.mockResolvedValue(null);
    const { POST } = await import("@/app/api/classrooms/[id]/negamon/reward-resync/route");

    const response = await POST(
      new Request("http://localhost/api/classrooms/class-1/negamon/reward-resync", {
        method: "POST",
        body: JSON.stringify({ gamePin: "123456" }),
      }) as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(401);
    expect(mockResyncNegamonBattleRewardsForGamePin).not.toHaveBeenCalled();
  });

  it("requires a game pin", async () => {
    const { POST } = await import("@/app/api/classrooms/[id]/negamon/reward-resync/route");

    const response = await POST(
      new Request("http://localhost/api/classrooms/class-1/negamon/reward-resync", {
        method: "POST",
        body: JSON.stringify({}),
      }) as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(400);
    expect(mockResyncNegamonBattleRewardsForGamePin).not.toHaveBeenCalled();
  });

  it("returns the re-sync result", async () => {
    const { POST } = await import("@/app/api/classrooms/[id]/negamon/reward-resync/route");

    const response = await POST(
      new Request("http://localhost/api/classrooms/class-1/negamon/reward-resync", {
        method: "POST",
        body: JSON.stringify({ gamePin: "123456" }),
      }) as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockResyncNegamonBattleRewardsForGamePin).toHaveBeenCalledWith({
      classroomId: "class-1",
      teacherId: "teacher-1",
      gamePin: "123456",
    });

    const body = await response.json();
    expect(body).toMatchObject({
      gamePin: "123456",
      appliedCount: 1,
      reason: "applied",
    });
  });
});
