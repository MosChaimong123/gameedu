import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStudentFindFirst = vi.fn();
const mockStudentUpdate = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    student: {
      findFirst: mockStudentFindFirst,
      update: mockStudentUpdate,
    },
  },
}));

describe("student economy command routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns app error payload when equipping an item not in inventory", async () => {
    mockStudentFindFirst.mockResolvedValue({
      id: "student-1",
      inventory: ["frame_a"],
    });

    const { POST } = await import("@/app/api/student/[code]/shop/equip/route");
    const request = {
      json: vi.fn().mockResolvedValue({ itemId: "frame_b" }),
    } as unknown as NextRequest;

    const response = await POST(request, {
      params: Promise.resolve({ code: "abc123" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Not in inventory",
      },
    });
    expect(mockStudentUpdate).not.toHaveBeenCalled();
  });

  it("returns disabled when Negamon unlock-skill is called", async () => {
    const { POST } = await import("@/app/api/student/[code]/negamon/unlock-skill/route");
    const request = {
      json: vi.fn().mockResolvedValue({ skillId: "gold_flow" }),
    } as unknown as NextRequest;

    const response = await POST(request, {
      params: Promise.resolve({ code: "abc123" }),
    });

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NEGAMON_PASSIVES_DISABLED",
        message: "Negamon passive skills are disabled",
      },
    });
  });
});
