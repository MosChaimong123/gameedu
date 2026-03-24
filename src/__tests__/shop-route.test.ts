import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

type JsonRequestBody = Record<string, unknown>;
type MockJsonRequest = Pick<NextRequest, "json">;

function makeJsonRequest(body: JsonRequestBody): MockJsonRequest {
  return {
    json: async () => body,
  };
}

const mockAuth = vi.fn();
const mockItemFindUnique = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockStudentItemFindFirst = vi.fn();
const mockTransaction = vi.fn();
const mockBuildStudentItemStatSnapshot = vi.fn(() => ({
  hp: 10,
  atk: 5,
  def: 3,
  spd: 1,
  crit: 0.01,
  luck: 0.01,
  mag: 2,
  mp: 4,
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    item: {
      findUnique: mockItemFindUnique,
    },
    student: {
      findUnique: mockStudentFindUnique,
    },
    studentItem: {
      findFirst: mockStudentItemFindFirst,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/game/student-item-stats", () => ({
  buildStudentItemStatSnapshot: mockBuildStudentItemStatSnapshot,
}));

describe("shop route POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import("@/app/api/shop/route");

    const response = await POST(makeJsonRequest({ itemId: "item-1", studentId: "student-1" }) as NextRequest);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects duplicate non-consumable purchases", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockItemFindUnique.mockResolvedValue({
      id: "item-1",
      type: "WEAPON",
      currency: "GOLD",
      price: 100,
    });
    mockStudentFindUnique.mockResolvedValue({
      id: "student-1",
      points: 0,
      gameStats: { gold: 500 },
    });
    mockStudentItemFindFirst.mockResolvedValue({ id: "owned-1", quantity: 1 });

    const { POST } = await import("@/app/api/shop/route");
    const response = await POST(makeJsonRequest({ itemId: "item-1", studentId: "student-1", quantity: 1 }) as NextRequest);

    expect(response.status).toBe(400);
  });

  it("returns 400 when latest gold inside transaction is insufficient", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockItemFindUnique.mockResolvedValue({
      id: "item-1",
      type: "CONSUMABLE",
      currency: "GOLD",
      price: 100,
    });
    mockStudentFindUnique.mockResolvedValue({
      id: "student-1",
      points: 0,
      gameStats: { gold: 500 },
    });
    mockStudentItemFindFirst.mockResolvedValue(null);
    mockTransaction.mockImplementation(async (fn: (tx: {
      student: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
      studentItem: { findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
    }) => Promise<unknown>) => {
      const tx = {
        student: {
          findUnique: vi.fn().mockResolvedValue({ points: 0, gameStats: { gold: 50 } }),
          update: vi.fn(),
        },
        studentItem: {
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
          create: vi.fn(),
        },
      };
      return fn(tx);
    });

    const { POST } = await import("@/app/api/shop/route");
    const response = await POST(makeJsonRequest({ itemId: "item-1", studentId: "student-1", quantity: 2 }) as NextRequest);

    expect(response.status).toBe(400);
  });

  it("increments quantity when buying a consumable already present in inventory", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockItemFindUnique.mockResolvedValue({
      id: "item-1",
      type: "CONSUMABLE",
      currency: "GOLD",
      price: 50,
    });
    mockStudentFindUnique.mockResolvedValue({
      id: "student-1",
      points: 0,
      gameStats: { gold: 500 },
    });
    mockStudentItemFindFirst.mockResolvedValue({ id: "owned-1", quantity: 3 });

    const txUpdate = vi.fn().mockResolvedValue({});
    mockTransaction.mockImplementation(async (fn: (tx: {
      student: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
      studentItem: { findFirst: ReturnType<typeof vi.fn>; update: typeof txUpdate; create: ReturnType<typeof vi.fn> };
    }) => Promise<unknown>) => {
      const tx = {
        student: {
          findUnique: vi.fn().mockResolvedValue({ points: 0, gameStats: { gold: 500 } }),
          update: vi.fn(),
        },
        studentItem: {
          findFirst: vi.fn().mockResolvedValue({ id: "owned-1", quantity: 3 }),
          update: txUpdate,
          create: vi.fn(),
        },
      };

      const result = await fn(tx);
      return result ?? { points: 0, gameStats: { gold: 400 } };
    });

    const { POST } = await import("@/app/api/shop/route");
    const response = await POST(makeJsonRequest({ itemId: "item-1", studentId: "student-1", quantity: 2 }) as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(txUpdate).toHaveBeenCalledWith({
      where: { id: "owned-1" },
      data: { quantity: { increment: 2 } },
    });
    expect(payload.success).toBe(true);
  });
});
