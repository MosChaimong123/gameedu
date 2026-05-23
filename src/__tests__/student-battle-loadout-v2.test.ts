import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {},
}));

const db = {
  student: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

describe("setStudentBattleLoadout V2 inventory contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns consumed inventory change and item effects for valid battle items", async () => {
    db.student.findFirst.mockResolvedValue({
      id: "student-1",
      inventory: ["item_iron_shield", "item_lucky_coin"],
    });
    db.student.update.mockResolvedValue({});

    const { setStudentBattleLoadout } = await import(
      "@/lib/services/student-economy/set-student-battle-loadout"
    );
    const result = await setStudentBattleLoadout(
      "abc123",
      ["item_iron_shield", "item_lucky_coin"],
      { db: db as never }
    );

    expect(result).toMatchObject({
      ok: true,
      battleLoadout: ["item_iron_shield", "item_lucky_coin"],
      inventoryChange: {
        consumedItemIds: ["item_iron_shield", "item_lucky_coin"],
        grantedItemIds: [],
      },
      itemEffects: expect.arrayContaining([
        { kind: "stat_boost", stat: "def", multiplier: 1.15 },
        { kind: "gold_bonus", amount: 15 },
      ]),
    });
    expect(db.student.update).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: { battleLoadout: ["item_iron_shield", "item_lucky_coin"] },
    });
  });

  it("rejects loadout items that are not in inventory", async () => {
    db.student.findFirst.mockResolvedValue({
      id: "student-1",
      inventory: [],
    });

    const { setStudentBattleLoadout } = await import(
      "@/lib/services/student-economy/set-student-battle-loadout"
    );
    const result = await setStudentBattleLoadout("abc123", ["item_buckler"], {
      db: db as never,
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "invalid_loadout",
      code: "NOT_IN_STOCK",
    });
    expect(db.student.update).not.toHaveBeenCalled();
  });
});
