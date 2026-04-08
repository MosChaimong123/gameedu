import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockToPrismaJson = vi.fn((value) => value);
const mockParseUserSettings = vi.fn((value) => value);

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
  },
}));

vi.mock("@/lib/prisma-json", () => ({
  toPrismaJson: mockToPrismaJson,
}));

vi.mock("@/lib/user-settings", () => ({
  parseUserSettings: mockParseUserSettings,
}));

describe("user settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUserFindUnique.mockResolvedValue({
      settings: {
        accessibility: {
          reducedMotion: false,
          reducedSound: false,
        },
      },
    });
    mockUserUpdate.mockResolvedValue({
      settings: {
        accessibility: {
          reducedMotion: true,
          reducedSound: false,
        },
      },
    });
  });

  it("rejects non-object accessibility payloads", async () => {
    const { PATCH } = await import("@/app/api/user/settings/route");

    const response = await PATCH({
      json: async () => ({ accessibility: "bad" }),
    } as NextRequest);

    expect(response.status).toBe(400);
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("rejects non-boolean accessibility flags", async () => {
    const { PATCH } = await import("@/app/api/user/settings/route");

    const response = await PATCH({
      json: async () => ({ accessibility: { reducedMotion: "yes" } }),
    } as NextRequest);

    expect(response.status).toBe(400);
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns normalized parsed settings after a valid update", async () => {
    mockParseUserSettings
      .mockReturnValueOnce({
        accessibility: {
          reducedMotion: false,
          reducedSound: false,
        },
      })
      .mockReturnValueOnce({
        accessibility: {
          reducedMotion: true,
          reducedSound: false,
        },
      });

    const { PATCH } = await import("@/app/api/user/settings/route");

    const response = await PATCH({
      json: async () => ({ accessibility: { reducedMotion: true } }),
    } as NextRequest);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      settings: {
        accessibility: {
          reducedMotion: true,
          reducedSound: false,
        },
      },
    });
    expect(mockUserUpdate).toHaveBeenCalledTimes(1);
  });
});
