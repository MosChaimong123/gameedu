import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { MATERIAL_TYPES, MATERIAL_TIER_MAP } from "@/lib/game/crafting-system";
import { parseGameStats, toPrismaJson } from "@/lib/game/game-stats";
import { RPG_COPY } from "@/lib/game/rpg-copy";
import {
  RPG_ROUTE_ERROR,
  RpgRouteError,
  toInventoryUseErrorResponse,
} from "@/lib/game/rpg-route-errors";
import { StatCalculator, type EquippedItemSource } from "@/lib/game/stat-calculator";

const COMMON_MATERIALS = MATERIAL_TYPES.filter((t) => MATERIAL_TIER_MAP[t] === "COMMON");
const RARE_MATERIALS = MATERIAL_TYPES.filter((t) => MATERIAL_TIER_MAP[t] === "RARE");

type InventoryUseBody = {
  studentItemId?: string;
  studentId?: string;
  quantity?: number;
};

type PendingBattleBuff = {
  atk?: number;
  def?: number;
  spd?: number;
};

type FarmingState = {
  playerHp?: number;
  playerMaxHp?: number;
  playerMaxMp?: number;
  skillCooldowns?: Record<string, number>;
  activeEffects?: {
    poison?: { damagePerTurn: number; turnsLeft: number };
    defBuff?: { reduction: number; turnsLeft: number };
    atkBuff?: { multiplier: number; turnsLeft: number };
    atkDebuff?: { reduction: number; turnsLeft: number };
    critBuff?: { bonus: number; turnsLeft: number };
    defBreak?: { amplify: number; turnsLeft: number };
    slow?: { skipChance: number; turnsLeft: number };
    stun?: { turnsLeft: number };
    regen?: { healPerTurn: number; turnsLeft: number };
  };
};

type InventoryGameStats = ReturnType<typeof parseGameStats> & {
  farming?: FarmingState;
  pendingHpBonus?: number;
  phoenixCharges?: number;
  pendingBattleBuff?: PendingBattleBuff;
  goldBoostExpiry?: number;
  xpBoostExpiry?: number;
};

type ConsumableItem = {
  id: string;
  name: string;
  type: string;
  staminaRestore?: number | null;
  manaRestore?: number | null;
  hpRestorePercent?: number | null;
  isPhoenix?: boolean | null;
  buffAtk?: number | null;
  buffDef?: number | null;
  buffSpd?: number | null;
  isLevelUp?: boolean | null;
  isTransmute?: boolean | null;
  buffGoldMinutes?: number | null;
  buffXpMinutes?: number | null;
  farmingBuffType?: string | null;
  farmingBuffTurns?: number | null;
};

type EquippedStudent = {
  id: string;
  stamina: number;
  mana: number | null;
  points: number;
  gameStats: unknown;
  items: EquippedItemSource[];
  jobClass: string | null;
  jobTier: string | null;
  advanceClass: string | null;
};

type StudentItemRecord = {
  id: string;
  studentId: string;
  quantity: number;
  item: ConsumableItem;
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentItemId, studentId, quantity = 1 } = (await req.json()) as InventoryUseBody;

    if (!studentItemId || !studentId) {
      return NextResponse.json({ error: "Missing studentItemId or studentId" }, { status: 400 });
    }

    const useQty = Math.max(1, Number(quantity));

    const studentItem = await db.studentItem.findUnique({
      where: { id: studentItemId },
      include: { item: true },
    });

    if (!studentItem || studentItem.studentId !== studentId) {
      return NextResponse.json({ error: "Item not found or unauthorized" }, { status: 404 });
    }

    const item = studentItem.item as ConsumableItem;

    if (item.type !== "CONSUMABLE") {
      return NextResponse.json({ error: RPG_COPY.inventory.unusableItem }, { status: 400 });
    }

    if (studentItem.quantity < useQty) {
      return NextResponse.json({ error: RPG_COPY.inventory.insufficientQuantity }, { status: 400 });
    }

    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { items: { where: { isEquipped: true }, include: { item: true } } },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const txResult = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const latestStudentItem = await tx.studentItem.findUnique({
        where: { id: studentItemId },
        include: { item: true },
      }) as StudentItemRecord | null;

      if (!latestStudentItem || latestStudentItem.studentId !== studentId) {
        throw new RpgRouteError(RPG_ROUTE_ERROR.itemNotFound);
      }

      if (latestStudentItem.quantity < useQty) {
        throw new RpgRouteError(RPG_ROUTE_ERROR.insufficientQuantity);
      }

      const latestStudent = await tx.student.findUnique({
        where: { id: studentId },
        include: { items: { where: { isEquipped: true }, include: { item: true } } },
      }) as EquippedStudent | null;

      if (!latestStudent) {
        throw new RpgRouteError(RPG_ROUTE_ERROR.studentNotFound);
      }

      if (latestStudentItem.quantity > useQty) {
        await tx.studentItem.update({
          where: { id: studentItemId },
          data: { quantity: { decrement: useQty } },
        });
      } else {
        await tx.studentItem.delete({
          where: { id: studentItemId },
        });
      }

      const currentGameStats = parseGameStats(latestStudent.gameStats) as InventoryGameStats;
      const staminaAmount = (item.staminaRestore || 0) * useQty;
      const manaAmount = (item.manaRestore || 0) * useQty;
      const newStamina = latestStudent.stamina + staminaAmount;
      const newMana = (latestStudent.mana || 0) + manaAmount;

      let newGameStats = { ...currentGameStats };
      let farmingHealAmount = 0;

      if (item.hpRestorePercent && item.hpRestorePercent > 0) {
        const bonus = item.hpRestorePercent;
        const farming = currentGameStats.farming;

        if (farming?.playerHp != null && farming?.playerMaxHp != null) {
          const heal = Math.floor(farming.playerMaxHp * bonus * useQty);
          farmingHealAmount = heal;
          newGameStats.farming = {
            ...farming,
            playerHp: Math.min(farming.playerMaxHp, farming.playerHp + heal),
          };
        } else {
          const current = currentGameStats.pendingHpBonus ?? 0;
          newGameStats.pendingHpBonus = Math.max(current, bonus);
        }
      }

      if (item.isPhoenix) {
        newGameStats.phoenixCharges = Math.min(1, (currentGameStats.phoenixCharges ?? 0) + useQty);
      }

      const buffAtk = item.buffAtk ?? 0;
      const buffDef = item.buffDef ?? 0;
      const buffSpd = item.buffSpd ?? 0;
      if (buffAtk > 0 || buffDef > 0 || buffSpd > 0) {
        const cur = currentGameStats.pendingBattleBuff ?? { atk: 0, def: 0, spd: 0 };
        newGameStats.pendingBattleBuff = {
          atk: Math.max(cur.atk ?? 0, buffAtk),
          def: Math.max(cur.def ?? 0, buffDef),
          spd: Math.max(cur.spd ?? 0, buffSpd),
        };
      }

      if (item.isLevelUp) {
        const currentLevel: number = currentGameStats.level ?? 1;
        const newLevel = currentLevel + 1;
        const newCharStats = StatCalculator.compute(
          latestStudent.points ?? 0,
          (latestStudent.items ?? []) as EquippedItemSource[],
          newLevel,
          latestStudent.jobClass ?? null,
          latestStudent.jobTier ?? "BASE",
          latestStudent.advanceClass ?? null
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

      // Apply farming active effect buff
      if (item.farmingBuffType && newGameStats.farming) {
        const buffTurns = (item.farmingBuffTurns ?? 3) * useQty;
        const farming = newGameStats.farming;
        const ae = { ...(farming.activeEffects ?? {}) };
        switch (item.farmingBuffType) {
          case "BUFF_ATK":
            ae.atkBuff = { multiplier: 1.4, turnsLeft: buffTurns };
            break;
          case "BUFF_DEF":
            ae.defBuff = { reduction: 0.5, turnsLeft: buffTurns };
            break;
          case "CRIT_BUFF":
            ae.critBuff = { bonus: 0.3, turnsLeft: buffTurns };
            break;
          case "REGEN": {
            const regenHeal = Math.max(1, Math.floor((farming.playerMaxHp ?? 100) * 0.08));
            ae.regen = { healPerTurn: regenHeal, turnsLeft: buffTurns };
            break;
          }
        }
        newGameStats.farming = { ...farming, activeEffects: ae };
      }

      let transmuteResult: { from: string; to: string } | null = null;
      if (item.isTransmute) {
        const TRANSMUTE_COST = 5;
        const ownedMaterials = await tx.material.findMany({
          where: {
            studentId,
            type: { in: [...COMMON_MATERIALS] },
            quantity: { gte: TRANSMUTE_COST },
          },
          orderBy: { quantity: "desc" },
        });

        if (ownedMaterials.length === 0) {
          throw new Error(RPG_COPY.inventory.transmuteRequirement(TRANSMUTE_COST));
        }

        const source = ownedMaterials[0];
        await tx.material.update({
          where: { studentId_type: { studentId, type: source.type } },
          data: { quantity: { decrement: TRANSMUTE_COST } },
        });

        const rareMat = RARE_MATERIALS[Math.floor(Math.random() * RARE_MATERIALS.length)];
        await tx.material.upsert({
          where: { studentId_type: { studentId, type: rareMat } },
          update: { quantity: { increment: 1 } },
          create: { studentId, type: rareMat, quantity: 1 },
        });

        transmuteResult = { from: source.type, to: rareMat };
      }

      const now = Date.now();
      const goldMins = item.buffGoldMinutes ?? 0;
      if (goldMins > 0) {
        const existing = currentGameStats.goldBoostExpiry ?? 0;
        const base = Math.max(existing, now);
        newGameStats.goldBoostExpiry = base + goldMins * 60_000 * useQty;
      }

      const xpMins = item.buffXpMinutes ?? 0;
      if (xpMins > 0) {
        const existing = currentGameStats.xpBoostExpiry ?? 0;
        const base = Math.max(existing, now);
        newGameStats.xpBoostExpiry = base + xpMins * 60_000 * useQty;
      }

      const updatedStudentRecord = await tx.student.update({
        where: { id: studentId },
        data: {
          stamina: newStamina,
          mana: newMana,
          gameStats: toPrismaJson(newGameStats),
        },
      });

      const updatedStudent = {
        stamina: updatedStudentRecord.stamina,
        mana: updatedStudentRecord.mana ?? 0,
        gameStats: parseGameStats(updatedStudentRecord.gameStats) as InventoryGameStats,
      };

      return { student: updatedStudent, transmuteResult, farmingHealAmount };
    });

    const result = txResult.student;
    const finalTransmuteResult = txResult.transmuteResult;
    const finalFarmingHealAmount = txResult.farmingHealAmount ?? 0;

    const farmingBuffTurns = (item.farmingBuffTurns ?? 3) * useQty;
    let message = `ใช้งาน ${item.name} จำนวน ${useQty} ชิ้นสำเร็จ`;
    if (item.staminaRestore) {
      message += ` ฟื้นฟู Stamina เป็น ${result.stamina}`;
    } else if (item.manaRestore) {
      message += ` ฟื้นฟู Mana เป็น ${result.mana}`;
    } else if (item.hpRestorePercent) {
      if (finalFarmingHealAmount > 0) {
        message += ` ฟื้นฟู HP +${finalFarmingHealAmount.toLocaleString()}`;
      } else {
        message += ` ได้บัฟ HP +${Math.round(item.hpRestorePercent * 100)}% ในการต่อสู้ครั้งถัดไป`;
      }
    } else if (item.isPhoenix) {
      message += ` จะชุบชีวิตพร้อม HP 50% เมื่อแพ้ในการต่อสู้ครั้งถัดไป`;
    } else if (item.buffAtk || item.buffDef || item.buffSpd) {
      const parts: string[] = [];
      if (item.buffAtk) parts.push(`ATK +${Math.round(item.buffAtk * 100)}%`);
      if (item.buffDef) parts.push(`DEF +${Math.round(item.buffDef * 100)}%`);
      if (item.buffSpd) parts.push(`SPD +${Math.round(item.buffSpd * 100)}%`);
      message += ` ได้บัฟ ${parts.join(", ")} ในการต่อสู้ครั้งถัดไป`;
    } else if (item.buffGoldMinutes) {
      message += ` ได้บัฟ Gold x2 เป็นเวลา ${item.buffGoldMinutes * useQty} นาที`;
    } else if (item.buffXpMinutes) {
      message += ` ได้บัฟ XP x2 เป็นเวลา ${item.buffXpMinutes * useQty} นาที`;
    } else if (item.isTransmute && finalTransmuteResult) {
      message += ` แปลง 5x ${finalTransmuteResult.from} เป็น 1x ${finalTransmuteResult.to} สำเร็จ`;
    } else if (item.farmingBuffType) {
      const buffLabels: Record<string, string> = {
        BUFF_ATK:  `⚔️ ATK +40%`,
        BUFF_DEF:  `🛡️ ลดดาเมจ 50%`,
        CRIT_BUFF: `🎯 CRIT +30%`,
        REGEN:     `🌿 Regen HP 8%/เทิร์น`,
      };
      const label = buffLabels[item.farmingBuffType] ?? item.farmingBuffType;
      message += ` ได้บัฟ ${label} เป็นเวลา ${farmingBuffTurns} เทิร์น`;
    } else if (item.isLevelUp) {
      const newLv = result.gameStats?.level ?? "?";
      message = `เลเวลอัปสำเร็จ ตอนนี้เป็น Lv.${newLv}`;
    }

    const finalGameStats = result.gameStats;
    return NextResponse.json({
      success: true,
      newStamina: result.stamina,
      newMana: result.mana,
      newPlayerHp: finalGameStats?.farming?.playerHp ?? null,
      newPlayerMaxHp: finalGameStats?.farming?.playerMaxHp ?? null,
      newLevel: item.isLevelUp ? finalGameStats?.level : undefined,
      farmingActiveEffects: finalGameStats?.farming?.activeEffects ?? null,
      farmingBuffType: item.farmingBuffType ?? null,
      transmuteResult: finalTransmuteResult,
      message,
    });
  } catch (error) {
    console.error("Error using item:", error);
    const knownErrorResponse = toInventoryUseErrorResponse(error);
    if (knownErrorResponse) return knownErrorResponse;

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
