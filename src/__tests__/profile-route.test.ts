import { beforeEach, describe, expect, it, vi } from "vitest";

function makeJsonRequest(body: Record<string, unknown>): Request {
  return {
    json: async () => body,
  } as Request;
}

const mockAuth = vi.fn();
const mockUserUpdate = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      update: mockUserUpdate,
    },
  },
}));

describe("profile route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUserUpdate.mockResolvedValue({
      id: "user-1",
      name: "Teacher",
      image: "avatar.png",
      email: "teacher@example.com",
      role: "TEACHER",
    });
  });

  it("returns a structured auth-required error when no session user exists", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { PATCH } = await import("@/app/api/user/profile/route");

    const response = await PATCH(makeJsonRequest({
      name: "Teacher",
    }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "AUTH_REQUIRED",
        message: "Unauthorized",
      },
    });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns not found when the session user no longer exists", async () => {
    mockUserUpdate.mockRejectedValueOnce({ code: "P2025" });
    const { PATCH } = await import("@/app/api/user/profile/route");

    const response = await PATCH(makeJsonRequest({
      name: "Teacher",
    }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Not found",
      },
    });
  });

  it("returns only a safe user profile subset", async () => {
    const { PATCH } = await import("@/app/api/user/profile/route");
    const response = await PATCH(makeJsonRequest({
      name: " Teacher ",
      image: " avatar.png ",
    }));

    expect(response.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "Teacher", image: "avatar.png" },
      select: {
        id: true,
        name: true,
        image: true,
        email: true,
        role: true,
      },
    });

    await expect(response.json()).resolves.toEqual({
      id: "user-1",
      name: "Teacher",
      image: "avatar.png",
      email: "teacher@example.com",
      role: "TEACHER",
    });
  });
});
