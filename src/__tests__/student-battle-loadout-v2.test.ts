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
      inventory: ["item_iron_shield", "use_charge_capsule"],
    });
    db.student.update.mockResolvedValue({});

    const { setStudentBattleLoadout } = await import(
      "@/lib/services/student-economy/set-student-battle-loadout"
    );
    const result = await setStudentBattleLoadout(
      "abc123",
      ["item_iron_shield", "use_charge_capsule"],
      { db: db as never }
    );

    expect(result).toMatchObject({
      ok: true,
      battleLoadout: ["held_guard_core", "use_charge_capsule"],
      inventoryChange: {
        consumedItemIds: ["held_guard_core", "use_charge_capsule"],
        grantedItemIds: [],
      },
      itemEffects: expect.arrayContaining([
        { kind: "damage_taken_multiplier", multiplier: 0.9 },
        { kind: "restore_energy", amount: 18 },
      ]),
    });
    expect(db.student.update).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: { battleLoadout: ["held_guard_core", "use_charge_capsule"] },
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

  it("rejects reward items from the saved loadout", async () => {
    db.student.findFirst.mockResolvedValue({
      id: "student-1",
      inventory: ["reward_lucky_coin"],
    });

    const { setStudentBattleLoadout } = await import(
      "@/lib/services/student-economy/set-student-battle-loadout"
    );
    const result = await setStudentBattleLoadout("abc123", ["reward_lucky_coin"], {
      db: db as never,
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "invalid_loadout",
      code: "CATEGORY_LIMIT",
    });
    expect(db.student.update).not.toHaveBeenCalled();
  });
});
