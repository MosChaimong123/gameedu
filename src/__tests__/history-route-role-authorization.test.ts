import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  expectAppErrorResponse,
  makeJsonRequest,
  makeRouteParams,
} from "@/__tests__/utils/route-test-helpers";

const mockAuth = vi.fn();
const mockGameHistoryFindMany = vi.fn();
const mockGameHistoryCreate = vi.fn();
const mockGameHistoryFindUnique = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    gameHistory: {
      findMany: mockGameHistoryFindMany,
      create: mockGameHistoryCreate,
      findUnique: mockGameHistoryFindUnique,
    },
  },
}));

describe("history route role authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects history listing for non-teacher roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    const { GET } = await import("@/app/api/history/route");

    const response = await GET();

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mockGameHistoryFindMany).not.toHaveBeenCalled();
  });

  it("rejects history creation for non-teacher roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    const { POST } = await import("@/app/api/history/route");

    const response = await POST(
      makeJsonRequest({
        gameMode: "GOLD_QUEST",
        pin: "123456",
        startedAt: new Date().toISOString(),
        settings: {},
        players: [],
      }) as NextRequest
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mockGameHistoryCreate).not.toHaveBeenCalled();
  });

  it("rejects history detail access for non-teacher roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    const { GET } = await import("@/app/api/history/[id]/route");

    const response = await GET(
      {} as NextRequest,
      makeRouteParams({ id: "history-1" })
    );

    await expectAppErrorResponse(response, {
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    expect(mockGameHistoryFindUnique).not.toHaveBeenCalled();
  });
});
