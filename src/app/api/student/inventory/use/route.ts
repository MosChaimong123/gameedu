import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { MATERIAL_TYPES, MATERIAL_TIER_MAP } from "@/lib/game/crafting-system";
import { StatCalculator } from "@/lib/game/stat-calculator";

const COMMON_MATERIALS = MATERIAL_TYPES.filter((t) => MATERIAL_TIER_MAP[t] === "COMMON");
const RARE_MATERIALS   = MATERIAL_TYPES.filter((t) => MATERIAL_TIER_MAP[t] === "RARE");

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentItemId, studentId, quantity = 1 } = await req.json();

    if (!studentItemId || !studentId) {
      return NextResponse.json({ error: "Missing studentItemId or studentId" }, { status: 400 });
    }

    const useQty = Math.max(1, Number(quantity));

    // 1. Get the student item and the item data
    const studentItem = await db.studentItem.findUnique({
      where: { id: studentItemId },
      include: { item: true }
    });

    if (!studentItem || studentItem.studentId !== studentId) {
      return NextResponse.json({ error: "Item not found or unauthorized" }, { status: 404 });
    }

    const item = studentItem.item;

    // 2. Check if it's consumable
    if (item.type !== "CONSUMABLE") {
      return NextResponse.json({ error: "ไอเทมนี้ไม่สามารถใช้งานได้" }, { status: 400 });
    }

    if (studentItem.quantity < useQty) {
      return NextResponse.json({ error: "จำนวนไอเทมไม่เพียงพอ" }, { status: 400 });
    }

    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { items: { where: { isEquipped: true }, include: { item: true } } },
    });

    if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // 3. Perform consumption and apply effect
    const txResult = await db.$transaction(async (tx: any) => {
      // Decrease quantity
      if (studentItem.quantity > useQty) {
        await tx.studentItem.update({
          where: { id: studentItemId },
          data: { quantity: { decrement: useQty } }
        });
      } else {
        await tx.studentItem.delete({
          where: { id: studentItemId }
        });
      }

      const currentGameStats: any = (student as any).gameStats ?? {};
      const staminaAmount = (item.staminaRestore || 0) * useQty;
      const manaAmount = (item.manaRestore || 0) * useQty;
      const newStamina = student.stamina + staminaAmount;
      const newMana = (student.mana || 0) + manaAmount;

      // HP Potion: restore farming.playerHp immediately if in farming mode,
      // otherwise store pendingHpBonus for Battle mode
      let newGameStats = { ...currentGameStats };
      let farmingHealAmount = 0;
      if ((item as any).hpRestorePercent && (item as any).hpRestorePercent > 0) {
        const bonus = (item as any).hpRestorePercent as number;
        const farming = currentGameStats.farming;
        if (farming?.playerHp != null && farming?.playerMaxHp != null) {
          // Farming mode: heal directly
          const heal = Math.floor(farming.playerMaxHp * bonus * useQty);
          farmingHealAmount = heal;
          newGameStats.farming = {
            ...farming,
            playerHp: Math.min(farming.playerMaxHp, farming.playerHp + heal),
          };
        } else {
          // Battle / other mode: store pending bonus
          const current = currentGameStats.pendingHpBonus ?? 0;
          newGameStats.pendingHpBonus = Math.max(current, bonus);
        }
      }

      // Phoenix Feather: increment charges (max 1 active at a time)
      if ((item as any).isPhoenix) {
        newGameStats.phoenixCharges = Math.min(1, (currentGameStats.phoenixCharges ?? 0) + useQty);
      }

      // Battle stat buffs: take max of each stat so larger buffs win
      const buffAtk: number = (item as any).buffAtk ?? 0;
      const buffDef: number = (item as any).buffDef ?? 0;
      const buffSpd: number = (item as any).buffSpd ?? 0;
      if (buffAtk > 0 || buffDef > 0 || buffSpd > 0) {
        const cur = currentGameStats.pendingBattleBuff ?? { atk: 0, def: 0, spd: 0 };
        newGameStats.pendingBattleBuff = {
          atk: Math.max(cur.atk ?? 0, buffAtk),
          def: Math.max(cur.def ?? 0, buffDef),
          spd: Math.max(cur.spd ?? 0, buffSpd),
        };
      }

      // Level Up Tome: instantly +1 level, reset XP to 0, refresh farming HP/MP
      if ((item as any).isLevelUp) {
        const currentLevel: number = currentGameStats.level ?? 1;
        const newLevel = currentLevel + 1;
        const newCharStats = StatCalculator.compute(
          (student as any).points ?? 0,
          (student as any).items ?? [],
          newLevel,
          (student as any).jobClass ?? null,
          (student as any).jobTier ?? "BASE",
          (student as any).advanceClass ?? null
        );
        newGameStats.level = newLevel;
        newGameStats.xp = 0;
        if (newGameStats.farming) {
          newGameStats.farming = {
            ...newGameStats.farming,
            playerHp: newCharStats.hp,
            playerMaxHp: newCharStats.hp,
            playerMaxMp: newCharStats.maxMp,
          };
        }
      }

      // Transmute Stone: consume 5 COMMON materials → 1 RARE material
      let transmuteResult: { from: string; to: string } | null = null;
      if ((item as any).isTransmute) {
        const TRANSMUTE_COST = 5;
        // Find all COMMON materials the student has with quantity ≥ TRANSMUTE_COST
        const ownedMaterials = await tx.material.findMany({
          where: {
            studentId,
            type: { in: [...COMMON_MATERIALS] },
            quantity: { gte: TRANSMUTE_COST },
          },
          orderBy: { quantity: "desc" },
        });
        if (ownedMaterials.length === 0) {
          throw new Error(`ต้องมีวัตถุดิบ COMMON อย่างน้อย ${TRANSMUTE_COST} ชิ้นเพื่อใช้ Transmute Stone`);
        }
        // Pick the one with the most (already sorted desc)
        const source = ownedMaterials[0];
        // Deduct 5 from source
        await tx.material.update({
          where: { studentId_type: { studentId, type: source.type } },
          data: { quantity: { decrement: TRANSMUTE_COST } },
        });
        // Give 1 random RARE material
        const rareMat = RARE_MATERIALS[Math.floor(Math.random() * RARE_MATERIALS.length)];
        await tx.material.upsert({
          where: { studentId_type: { studentId, type: rareMat } },
          update: { quantity: { increment: 1 } },
          create: { studentId, type: rareMat, quantity: 1 },
        });
        transmuteResult = { from: source.type, to: rareMat };
      }

      // Economy boosts: extend expiry if already active
      const now = Date.now();
      const goldMins: number = (item as any).buffGoldMinutes ?? 0;
      if (goldMins > 0) {
        const existing = currentGameStats.goldBoostExpiry ?? 0;
        const base = Math.max(existing, now);
        newGameStats.goldBoostExpiry = base + goldMins * 60_000 * useQty;
      }
      const xpMins: number = (item as any).buffXpMinutes ?? 0;
      if (xpMins > 0) {
        const existing = currentGameStats.xpBoostExpiry ?? 0;
        const base = Math.max(existing, now);
        newGameStats.xpBoostExpiry = base + xpMins * 60_000 * useQty;
      }

      const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: {
          stamina: newStamina,
          mana: newMana,
          gameStats: newGameStats,
        }
      });
      return { student: updatedStudent, transmuteResult, farmingHealAmount };
    });

    const result = txResult.student;
    const finalTransmuteResult = txResult.transmuteResult;
    const finalFarmingHealAmount = txResult.farmingHealAmount ?? 0;

    // Build response message
    const i = item as any;
    let message = `ใช้งาน ${item.name} จำนวน ${useQty} ชิ้นสำเร็จ!`;
    if (item.staminaRestore) message += ` ฟื้นฟู Stamina เป็น ${result.stamina}`;
    else if (item.manaRestore) message += ` ฟื้นฟู Mana เป็น ${result.mana}`;
    else if (i.hpRestorePercent) {
      if (finalFarmingHealAmount > 0) message += ` ฟื้นฟู HP +${finalFarmingHealAmount.toLocaleString()} ❤️`;
      else message += ` HP +${Math.round(i.hpRestorePercent * 100)}% ใน Battle ถัดไป ❤️`;
    }
    else if (i.isPhoenix) message += ` จะฟื้นคืนชีพพร้อม HP 50% เมื่อตายใน Battle ถัดไป 🪶`;
    else if (i.buffAtk || i.buffDef || i.buffSpd) {
      const parts: string[] = [];
      if (i.buffAtk) parts.push(`ATK +${Math.round(i.buffAtk * 100)}%`);
      if (i.buffDef) parts.push(`DEF +${Math.round(i.buffDef * 100)}%`);
      if (i.buffSpd) parts.push(`SPD +${Math.round(i.buffSpd * 100)}%`);
      message += ` ${parts.join(", ")} ใน Battle ถัดไป ⚔️`;
    } else if (i.buffGoldMinutes) message += ` Gold ×2 เป็นเวลา ${i.buffGoldMinutes * useQty} นาที 🪙`;
    else if (i.buffXpMinutes) message += ` XP ×2 เป็นเวลา ${i.buffXpMinutes * useQty} นาที 📚`;
    else if (i.isTransmute && finalTransmuteResult) {
      message += ` แปลง 5× ${finalTransmuteResult.from} → 1× ${finalTransmuteResult.to} สำเร็จ! 🪨`;
    }
    else if (i.isLevelUp) {
      const newLv = (result.gameStats as any)?.level ?? "?";
      message = `✨ เลื่อนระดับ! ขึ้นเป็น Lv.${newLv} 🎉`;
    }

    const finalGameStats = result.gameStats as any;
    return NextResponse.json({
      success: true,
      newStamina: result.stamina,
      newMana: result.mana,
      newPlayerHp: finalGameStats?.farming?.playerHp ?? null,
      newPlayerMaxHp: finalGameStats?.farming?.playerMaxHp ?? null,
      newLevel: (item as any).isLevelUp ? finalGameStats?.level : undefined,
      transmuteResult: finalTransmuteResult,
      message,
    });

  } catch (error) {
    console.error("Error using item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
