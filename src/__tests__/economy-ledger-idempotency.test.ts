import { describe, expect, it, vi } from "vitest";
import { recordEconomyTransaction } from "@/lib/services/student-economy/economy-ledger";

describe("recordEconomyTransaction idempotency", () => {
  const input = {
    studentId: "student-1",
    classId: "class-1",
    type: "earn" as const,
    source: "quest" as const,
    amount: 5,
    balanceBefore: 10,
    balanceAfter: 15,
    idempotencyKey: "quest:student-1:daily:2026-04-07:quest_login",
    metadata: { questId: "quest_login" },
  };

  it("returns an existing ledger row when the idempotency key was already recorded", async () => {
    const existing = { id: "ledger-existing", idempotencyKey: input.idempotencyKey };
    const db = {
      economyTransaction: {
        findFirst: vi.fn().mockResolvedValue(existing),
        create: vi.fn(),
      },
    };

    await expect(recordEconomyTransaction(db as never, input)).resolves.toBe(existing);
    expect(db.economyTransaction.findFirst).toHaveBeenCalledWith({
      where: { idempotencyKey: input.idempotencyKey },
    });
    expect(db.economyTransaction.create).not.toHaveBeenCalled();
  });

  it("creates a ledger row when the idempotency key is new", async () => {
    const created = { id: "ledger-created", idempotencyKey: input.idempotencyKey };
    const db = {
      economyTransaction: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(created),
      },
    };

    await expect(recordEconomyTransaction(db as never, input)).resolves.toBe(created);
    expect(db.economyTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "student-1",
        classId: "class-1",
        type: "earn",
        source: "quest",
        amount: 5,
        balanceBefore: 10,
        balanceAfter: 15,
        idempotencyKey: input.idempotencyKey,
      }),
    });
  });

  it("rejects ledger rows whose balance math does not match the amount", async () => {
    const db = {
      economyTransaction: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    await expect(
      recordEconomyTransaction(db as never, {
        ...input,
        balanceAfter: 99,
      })
    ).rejects.toThrow("ECONOMY_LEDGER_BALANCE_MISMATCH");
    expect(db.economyTransaction.findFirst).not.toHaveBeenCalled();
    expect(db.economyTransaction.create).not.toHaveBeenCalled();
  });
});
