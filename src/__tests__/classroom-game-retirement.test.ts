import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({
  auth: vi.fn(async (handler: (request: NextRequest) => Response) => {
    return async (request: NextRequest) => handler(request);
  }),
}));

describe("classroom game retirement boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["POST", "/api/classrooms/class-1/battle"],
    ["POST", "/api/classrooms/class-1/battle/v4/start"],
    ["POST", "/api/classrooms/class-1/economy/adjust"],
    ["POST", "/api/classrooms/class-1/events"],
    ["DELETE", "/api/classrooms/class-1/events"],
    ["PATCH", "/api/classrooms/class-1/gamification-settings"],
    ["POST", "/api/classrooms/class-1/negamon/reward-resync"],
    ["POST", "/api/student/access/checkin"],
    ["GET", "/api/student/access/daily-quests"],
    ["POST", "/api/student/access/shop/buy"],
    ["POST", "/api/student/demo/checkin"],
    ["GET", "/api/student/demo/daily-quests"],
    ["POST", "/api/student/demo/shop/buy"],
    ["POST", "/api/student/negamon/select"],
  ])("returns 410 without running a retired mutation: %s %s", async (method, pathname) => {
    vi.stubEnv("CLASSROOM_GAME_SYSTEM_ENABLED", "false");
    const { proxy } = await import("@/proxy");

    const response = await proxy(new NextRequest(`http://localhost${pathname}`, { method }));

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "CLASSROOM_GAME_SYSTEM_RETIRED" },
    });
  });

  it.each([
    "/api/classrooms/class-1/battle",
    "/api/classrooms/class-1/economy/ledger",
    "/api/classrooms/class-1/events",
    "/api/classrooms/class-1/gamification-settings",
    "/api/classrooms/class-1/leaderboard",
    "/api/classrooms/class-1/negamon/reward-audit",
  ])("keeps authenticated historical reads reachable: %s", async (pathname) => {
    vi.stubEnv("CLASSROOM_GAME_SYSTEM_ENABLED", "false");
    const { proxy } = await import("@/proxy");

    const response = await proxy(new NextRequest(`http://localhost${pathname}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("keeps classroom learning APIs available", async () => {
    vi.stubEnv("CLASSROOM_GAME_SYSTEM_ENABLED", "false");
    const { proxy } = await import("@/proxy");

    const response = await proxy(
      new NextRequest("http://localhost/api/classrooms/class-1/assignments")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("supports an explicit rollback opt-in", async () => {
    vi.stubEnv("CLASSROOM_GAME_SYSTEM_ENABLED", "true");
    const { proxy } = await import("@/proxy");

    const response = await proxy(
      new NextRequest("http://localhost/api/classrooms/class-1/battle", { method: "POST" })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
