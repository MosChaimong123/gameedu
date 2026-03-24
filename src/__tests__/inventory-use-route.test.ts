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
const mockStudentItemFindUnique = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockTransaction = vi.fn();
const mockCompute = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    studentItem: {
      findUnique: mockStudentItemFindUnique,
    },
    student: {
      findUnique: mockStudentFindUnique,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/game/stat-calculator", () => ({
  StatCalculator: {
    compute: mockCompute,
  },
}));

describe("inventory use route POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-consumable items", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockStudentItemFindUnique.mockResolvedValue({
      id: "si-1",
      studentId: "student-1",
      quantity: 1,
      item: { id: "item-1", type: "WEAPON" },
    });

    const { POST } = await import("@/app/api/student/inventory/use/route");
    const response = await POST(makeJsonRequest({ studentItemId: "si-1", studentId: "student-1", quantity: 1 }) as NextRequest);

    expect(response.status).toBe(400);
  });

  it("rechecks quantity inside transaction and returns 400 when latest quantity is insufficient", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockStudentItemFindUnique.mockResolvedValue({
      id: "si-1",
      studentId: "student-1",
      quantity: 3,
      item: { id: "item-1", type: "CONSUMABLE", manaRestore: 10 },
    });
    mockStudentFindUnique.mockResolvedValue({
      id: "student-1",
      items: [],
    });
    mockTransaction.mockImplementation(async (fn: (tx: {
      studentItem: {
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
      };
      student: {
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
      };
      material: {
        findMany: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        upsert: ReturnType<typeof vi.fn>;
      };
    }) => Promise<unknown>) => {
      const tx = {
        studentItem: {
          findUnique: vi.fn().mockResolvedValue({
            id: "si-1",
            studentId: "student-1",
            quantity: 1,
            item: { id: "item-1", type: "CONSUMABLE", manaRestore: 10 },
          }),
          update: vi.fn(),
          delete: vi.fn(),
        },
        student: {
          findUnique: vi.fn().mockResolvedValue({
            id: "student-1",
            stamina: 10,
            mana: 5,
            gameStats: {},
            items: [],
          }),
          update: vi.fn(),
        },
        material: {
          findMany: vi.fn(),
          update: vi.fn(),
          upsert: vi.fn(),
        },
      };
      return fn(tx);
    });

    const { POST } = await import("@/app/api/student/inventory/use/route");
    const response = await POST(makeJsonRequest({ studentItemId: "si-1", studentId: "student-1", quantity: 2 }) as NextRequest);

    expect(response.status).toBe(400);
  });

  it("heals farming hp directly when using an hp consumable during farming", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockStudentItemFindUnique.mockResolvedValue({
      id: "si-1",
      studentId: "student-1",
      quantity: 1,
      item: { id: "item-1", type: "CONSUMABLE", hpRestorePercent: 0.25, name: "HP Potion" },
    });
    mockStudentFindUnique.mockResolvedValue({
      id: "student-1",
      items: [],
    });
    mockTransaction.mockImplementation(async (fn: (tx: {
      studentItem: {
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
      };
      student: {
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
      };
      material: {
        findMany: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        upsert: ReturnType<typeof vi.fn>;
      };
    }) => Promise<unknown>) => {
      const tx = {
        studentItem: {
          findUnique: vi.fn().mockResolvedValue({
            id: "si-1",
            studentId: "student-1",
            quantity: 1,
            item: { id: "item-1", type: "CONSUMABLE", hpRestorePercent: 0.25, name: "HP Potion" },
          }),
          update: vi.fn(),
          delete: vi.fn(),
        },
        student: {
          findUnique: vi.fn().mockResolvedValue({
            id: "student-1",
            stamina: 20,
            mana: 10,
            gameStats: {
              farming: {
                playerHp: 40,
                playerMaxHp: 100,
              },
            },
            items: [],
            points: 0,
            jobClass: null,
            jobTier: "BASE",
            advanceClass: null,
          }),
          update: vi.fn().mockResolvedValue({
            stamina: 20,
            mana: 10,
            gameStats: {
              farming: {
                playerHp: 65,
                playerMaxHp: 100,
              },
            },
          }),
        },
        material: {
          findMany: vi.fn(),
          update: vi.fn(),
          upsert: vi.fn(),
        },
      };
      return fn(tx);
    });

    const { POST } = await import("@/app/api/student/inventory/use/route");
    const response = await POST(makeJsonRequest({ studentItemId: "si-1", studentId: "student-1", quantity: 1 }) as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.newPlayerHp).toBe(65);
  });
});
