import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    battleSession: {
      findMany: vi.fn(),
    },
    student: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/battle-read-auth", () => ({
  authorizeBattleRead: vi.fn(),
}));

describe("legacy auto battle route", () => {
  it("retires POST auto battle in favor of Negamon V4", async () => {
    const { POST } = await import("@/app/api/classrooms/[id]/battle/route");
    const response = await POST({} as never, {
      params: Promise.resolve({ id: "class-1" }),
    });

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "NEGAMON_AUTO_BATTLE_RETIRED",
      replacement: "/api/classrooms/[id]/battle/v4/start",
    });
  });
});
