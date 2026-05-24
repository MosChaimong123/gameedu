import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {},
}));

const tx = {
  student: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  economyTransaction: {
    create: vi.fn(),
  },
};

const db = {
  $transaction: vi.fn(async (fn: (innerTx: typeof tx) => unknown) => fn(tx)),
};

describe("buyStudentShopItem ledger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("spends gold atomically and records a shop ledger transaction", async () => {
    tx.student.findFirst.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      gold: 250,
      inventory: [],
    });
    tx.student.updateMany.mockResolvedValue({ count: 1 });
    tx.student.findUniqueOrThrow.mockResolvedValue({
      gold: 150,
      inventory: ["frame_fire_t1"],
    });
    tx.economyTransaction.create.mockResolvedValue({ id: "ledger-1" });

    const { buyStudentShopItem } = await import(
      "@/lib/services/student-economy/buy-student-shop-item"
    );
    const result = await buyStudentShopItem("abc123", "frame_fire_t1", {
      db: db as never,
    });

    expect(result).toEqual({
      ok: true,
      success: true,
      newGold: 150,
      inventory: ["frame_fire_t1"],
      inventoryChange: {
        consumedItemIds: [],
        grantedItemIds: ["frame_fire_t1"],
        equippedItemIds: [],
        unequippedItemIds: [],
      },
      itemEffects: [],
      gameState: {
        gold: 150,
        inventory: ["frame_fire_t1"],
      },
    });
    expect(tx.student.updateMany).toHaveBeenCalledWith({
      where: {
        id: "student-1",
        gold: { gte: 100 },
        NOT: { inventory: { has: "frame_fire_t1" } },
      },
      data: {
        gold: { decrement: 100 },
        inventory: ["frame_fire_t1"],
      },
    });
    expect(tx.economyTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "student-1",
        classId: "class-1",
        type: "spend",
        source: "shop",
        amount: -100,
        balanceBefore: 250,
        balanceAfter: 150,
        sourceRefId: null,
        metadata: {
          itemId: "frame_fire_t1",
          itemType: "frame",
          price: 100,
          rarity: "common",
        },
      }),
    });
  });

  it("does not write a ledger row when the student has insufficient gold", async () => {
    tx.student.findFirst.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      gold: 10,
      inventory: [],
    });

    const { buyStudentShopItem } = await import(
      "@/lib/services/student-economy/buy-student-shop-item"
    );
    const result = await buyStudentShopItem("abc123", "frame_fire_t1", {
      db: db as never,
    });

    expect(result).toEqual({ ok: false, reason: "not_enough_gold" });
    expect(tx.student.updateMany).not.toHaveBeenCalled();
    expect(tx.economyTransaction.create).not.toHaveBeenCalled();
  });

  it("returns V2 inventory and effect summaries for held battle item purchases", async () => {
    tx.student.findFirst.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      gold: 1200,
      inventory: [],
    });
    tx.student.updateMany.mockResolvedValue({ count: 1 });
    tx.student.findUniqueOrThrow.mockResolvedValue({
      gold: 0,
      inventory: ["held_guard_core"],
    });
    tx.economyTransaction.create.mockResolvedValue({ id: "ledger-1" });

    const { buyStudentShopItem } = await import(
      "@/lib/services/student-economy/buy-student-shop-item"
    );
    const result = await buyStudentShopItem("abc123", "held_guard_core", {
      db: db as never,
    });

    expect(result).toMatchObject({
      ok: true,
      inventory: ["held_guard_core"],
      inventoryChange: {
        consumedItemIds: [],
        grantedItemIds: ["held_guard_core"],
      },
      itemEffects: [{ kind: "damage_taken_multiplier", multiplier: 0.9 }],
    });
    expect(tx.student.updateMany).toHaveBeenCalledWith({
      where: {
        id: "student-1",
        gold: { gte: 1200 },
        NOT: { inventory: { has: "held_guard_core" } },
      },
      data: {
        gold: { decrement: 1200 },
        inventory: ["held_guard_core"],
      },
    });
  });

  it("rejects buying the same held item twice (including legacy inventory ids)", async () => {
    tx.student.findFirst.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      gold: 5000,
      inventory: ["item_buckler"],
    });

    const { buyStudentShopItem } = await import(
      "@/lib/services/student-economy/buy-student-shop-item"
    );
    const result = await buyStudentShopItem("abc123", "held_guard_core", {
      db: db as never,
    });

    expect(result).toEqual({ ok: false, reason: "already_owned" });
    expect(tx.student.updateMany).not.toHaveBeenCalled();
  });
});
