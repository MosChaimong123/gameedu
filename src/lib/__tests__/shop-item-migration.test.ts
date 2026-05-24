import { describe, expect, it } from "vitest";
import {
    normalizeInventoryChangeIds,
    normalizeStudentBattleKit,
    normalizeStudentInventoryItemIds,
} from "@/lib/shop-item-migration";

describe("shop item migration helpers", () => {
    it("normalizes legacy battle item ids inside inventory state", () => {
        expect(
            normalizeStudentInventoryItemIds([
                "item_iron_shield",
                " item_energy_orb ",
                "reward_lucky_coin",
            ])
        ).toEqual(["held_guard_core", "use_charge_capsule", "reward_lucky_coin"]);
    });

    it("filters reward items and inventory misses out of stored battle loadouts", () => {
        expect(
            normalizeStudentBattleKit({
                inventory: ["item_iron_shield", "use_charge_capsule"],
                battleLoadout: ["item_iron_shield", "reward_lucky_coin", "use_charge_capsule", "held_scope_prism"],
            })
        ).toEqual({
            inventory: ["held_guard_core", "use_charge_capsule"],
            battleLoadout: ["held_guard_core", "use_charge_capsule"],
        });
    });

    it("normalizes granted and consumed ids in inventory changes", () => {
        expect(
            normalizeInventoryChangeIds({
                consumedItemIds: ["item_iron_shield"],
                grantedItemIds: ["item_energy_orb", "reward_lucky_coin"],
            })
        ).toMatchObject({
            consumedItemIds: ["held_guard_core"],
            grantedItemIds: ["use_charge_capsule", "reward_lucky_coin"],
        });
    });
});
