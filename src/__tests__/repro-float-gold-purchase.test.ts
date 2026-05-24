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

describe("buyStudentShopItem float-gold reproduction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles floating-point gold during purchase correctly", async () => {
    // 1. Initial state: Student has 4727.8 gold
    tx.student.findFirst.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      gold: 4727.8,
      inventory: [],
    });

    // 2. Buy "held_echo_battery" (900 gold)
    tx.student.updateMany.mockResolvedValue({ count: 1 });

    // 3. After decrement: 4727.8 - 900 = 3827.8
    tx.student.findUniqueOrThrow.mockResolvedValue({
      gold: 3827.8,
      inventory: ["held_echo_battery"],
    });

    tx.economyTransaction.create.mockResolvedValue({ id: "ledger-1" });

    // We must dynamic import to ensure we use the updated code
    const { buyStudentShopItem } = await import(
      "@/lib/services/student-economy/buy-student-shop-item"
    );

    const result = await buyStudentShopItem("abc123", "held_echo_battery", {
      db: db as never,
    });

    // BEFORE FIX: This would throw an Error("ECONOMY_LEDGER_BALANCE_MISMATCH")
    // AFTER FIX: It should succeed and balanceAfter should be truncated to 3827
    
    expect(result.ok).toBe(true);
    expect(tx.economyTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        balanceBefore: 4727,
        balanceAfter: 3827,
        amount: -900,
      }),
    });
  });
});
