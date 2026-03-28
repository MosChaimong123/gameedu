"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const auth_1 = require("@/auth");
const crafting_system_1 = require("@/lib/game/crafting-system");
const game_stats_1 = require("@/lib/game/game-stats");
const rpg_copy_1 = require("@/lib/game/rpg-copy");
const rpg_route_errors_1 = require("@/lib/game/rpg-route-errors");
const stat_calculator_1 = require("@/lib/game/stat-calculator");
const COMMON_MATERIALS = crafting_system_1.MATERIAL_TYPES.filter((t) => crafting_system_1.MATERIAL_TIER_MAP[t] === "COMMON");
const RARE_MATERIALS = crafting_system_1.MATERIAL_TYPES.filter((t) => crafting_system_1.MATERIAL_TIER_MAP[t] === "RARE");
async function POST(req) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { studentItemId, studentId, quantity = 1 } = (await req.json());
        if (!studentItemId || !studentId) {
            return server_1.NextResponse.json({ error: "Missing studentItemId or studentId" }, { status: 400 });
        }
        const useQty = Math.max(1, Number(quantity));
        const studentItem = await db_1.db.studentItem.findUnique({
            where: { id: studentItemId },
            include: { item: true },
        });
        if (!studentItem || studentItem.studentId !== studentId) {
            return server_1.NextResponse.json({ error: "Item not found or unauthorized" }, { status: 404 });
        }
        const item = studentItem.item;
        if (item.type !== "CONSUMABLE") {
            return server_1.NextResponse.json({ error: rpg_copy_1.RPG_COPY.inventory.unusableItem }, { status: 400 });
        }
        if (studentItem.quantity < useQty) {
            return server_1.NextResponse.json({ error: rpg_copy_1.RPG_COPY.inventory.insufficientQuantity }, { status: 400 });
        }
        const student = await db_1.db.student.findUnique({
            where: { id: studentId },
            include: { items: { where: { isEquipped: true }, include: { item: true } } },
        });
        if (!student) {
            return server_1.NextResponse.json({ error: "Student not found" }, { status: 404 });
        }
        const txResult = await db_1.db.$transaction(async (tx) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
            const latestStudentItem = await tx.studentItem.findUnique({
                where: { id: studentItemId },
                include: { item: true },
            });
            if (!latestStudentItem || latestStudentItem.studentId !== studentId) {
                throw new rpg_route_errors_1.RpgRouteError(rpg_route_errors_1.RPG_ROUTE_ERROR.itemNotFound);
            }
            if (latestStudentItem.quantity < useQty) {
                throw new rpg_route_errors_1.RpgRouteError(rpg_route_errors_1.RPG_ROUTE_ERROR.insufficientQuantity);
            }
            const latestStudent = await tx.student.findUnique({
                where: { id: studentId },
                include: { items: { where: { isEquipped: true }, include: { item: true } } },
            });
            if (!latestStudent) {
                throw new rpg_route_errors_1.RpgRouteError(rpg_route_errors_1.RPG_ROUTE_ERROR.studentNotFound);
            }
            if (latestStudentItem.quantity > useQty) {
                await tx.studentItem.update({
                    where: { id: studentItemId },
                    data: { quantity: { decrement: useQty } },
                });
            }
            else {
                await tx.studentItem.delete({
                    where: { id: studentItemId },
                });
            }
            const currentGameStats = (0, game_stats_1.parseGameStats)(latestStudent.gameStats);
            const staminaAmount = (item.staminaRestore || 0) * useQty;
            const manaAmount = (item.manaRestore || 0) * useQty;
            const newStamina = latestStudent.stamina + staminaAmount;
            const newMana = (latestStudent.mana || 0) + manaAmount;
            let newGameStats = { ...currentGameStats };
            let farmingHealAmount = 0;
            if (item.hpRestorePercent && item.hpRestorePercent > 0) {
                const bonus = item.hpRestorePercent;
                const farming = currentGameStats.farming;
                if ((farming === null || farming === void 0 ? void 0 : farming.playerHp) != null && (farming === null || farming === void 0 ? void 0 : farming.playerMaxHp) != null) {
                    const heal = Math.floor(farming.playerMaxHp * bonus * useQty);
                    farmingHealAmount = heal;
                    newGameStats.farming = {
                        ...farming,
                        playerHp: Math.min(farming.playerMaxHp, farming.playerHp + heal),
                    };
                }
                else {
                    const current = (_a = currentGameStats.pendingHpBonus) !== null && _a !== void 0 ? _a : 0;
                    newGameStats.pendingHpBonus = Math.max(current, bonus);
                }
            }
            if (item.isPhoenix) {
                newGameStats.phoenixCharges = Math.min(1, ((_b = currentGameStats.phoenixCharges) !== null && _b !== void 0 ? _b : 0) + useQty);
            }
            const buffAtk = (_c = item.buffAtk) !== null && _c !== void 0 ? _c : 0;
            const buffDef = (_d = item.buffDef) !== null && _d !== void 0 ? _d : 0;
            const buffSpd = (_e = item.buffSpd) !== null && _e !== void 0 ? _e : 0;
            if (buffAtk > 0 || buffDef > 0 || buffSpd > 0) {
                const cur = (_f = currentGameStats.pendingBattleBuff) !== null && _f !== void 0 ? _f : { atk: 0, def: 0, spd: 0 };
                newGameStats.pendingBattleBuff = {
                    atk: Math.max((_g = cur.atk) !== null && _g !== void 0 ? _g : 0, buffAtk),
                    def: Math.max((_h = cur.def) !== null && _h !== void 0 ? _h : 0, buffDef),
                    spd: Math.max((_j = cur.spd) !== null && _j !== void 0 ? _j : 0, buffSpd),
                };
            }
            if (item.isLevelUp) {
                const currentLevel = (_k = currentGameStats.level) !== null && _k !== void 0 ? _k : 1;
                const newLevel = currentLevel + 1;
                const newCharStats = stat_calculator_1.StatCalculator.compute((_l = latestStudent.points) !== null && _l !== void 0 ? _l : 0, ((_m = latestStudent.items) !== null && _m !== void 0 ? _m : []), newLevel, (_o = latestStudent.jobClass) !== null && _o !== void 0 ? _o : null, (_p = latestStudent.jobTier) !== null && _p !== void 0 ? _p : "BASE", (_q = latestStudent.advanceClass) !== null && _q !== void 0 ? _q : null);
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
                const buffTurns = ((_r = item.farmingBuffTurns) !== null && _r !== void 0 ? _r : 3) * useQty;
                const farming = newGameStats.farming;
                const ae = { ...((_s = farming.activeEffects) !== null && _s !== void 0 ? _s : {}) };
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
                        const regenHeal = Math.max(1, Math.floor(((_t = farming.playerMaxHp) !== null && _t !== void 0 ? _t : 100) * 0.08));
                        ae.regen = { healPerTurn: regenHeal, turnsLeft: buffTurns };
                        break;
                    }
                }
                newGameStats.farming = { ...farming, activeEffects: ae };
            }
            let transmuteResult = null;
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
                    throw new Error(rpg_copy_1.RPG_COPY.inventory.transmuteRequirement(TRANSMUTE_COST));
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
            const goldMins = (_u = item.buffGoldMinutes) !== null && _u !== void 0 ? _u : 0;
            if (goldMins > 0) {
                const existing = (_v = currentGameStats.goldBoostExpiry) !== null && _v !== void 0 ? _v : 0;
                const base = Math.max(existing, now);
                newGameStats.goldBoostExpiry = base + goldMins * 60000 * useQty;
            }
            const xpMins = (_w = item.buffXpMinutes) !== null && _w !== void 0 ? _w : 0;
            if (xpMins > 0) {
                const existing = (_x = currentGameStats.xpBoostExpiry) !== null && _x !== void 0 ? _x : 0;
                const base = Math.max(existing, now);
                newGameStats.xpBoostExpiry = base + xpMins * 60000 * useQty;
            }
            const updatedStudentRecord = await tx.student.update({
                where: { id: studentId },
                data: {
                    stamina: newStamina,
                    mana: newMana,
                    gameStats: (0, game_stats_1.toPrismaJson)(newGameStats),
                },
            });
            const updatedStudent = {
                stamina: updatedStudentRecord.stamina,
                mana: (_y = updatedStudentRecord.mana) !== null && _y !== void 0 ? _y : 0,
                gameStats: (0, game_stats_1.parseGameStats)(updatedStudentRecord.gameStats),
            };
            return { student: updatedStudent, transmuteResult, farmingHealAmount };
        });
        const result = txResult.student;
        const finalTransmuteResult = txResult.transmuteResult;
        const finalFarmingHealAmount = (_b = txResult.farmingHealAmount) !== null && _b !== void 0 ? _b : 0;
        const farmingBuffTurns = ((_c = item.farmingBuffTurns) !== null && _c !== void 0 ? _c : 3) * useQty;
        let message = `ใช้งาน ${item.name} จำนวน ${useQty} ชิ้นสำเร็จ`;
        if (item.staminaRestore) {
            message += ` ฟื้นฟู Stamina เป็น ${result.stamina}`;
        }
        else if (item.manaRestore) {
            message += ` ฟื้นฟู Mana เป็น ${result.mana}`;
        }
        else if (item.hpRestorePercent) {
            if (finalFarmingHealAmount > 0) {
                message += ` ฟื้นฟู HP +${finalFarmingHealAmount.toLocaleString()}`;
            }
            else {
                message += ` ได้บัฟ HP +${Math.round(item.hpRestorePercent * 100)}% ในการต่อสู้ครั้งถัดไป`;
            }
        }
        else if (item.isPhoenix) {
            message += ` จะชุบชีวิตพร้อม HP 50% เมื่อแพ้ในการต่อสู้ครั้งถัดไป`;
        }
        else if (item.buffAtk || item.buffDef || item.buffSpd) {
            const parts = [];
            if (item.buffAtk)
                parts.push(`ATK +${Math.round(item.buffAtk * 100)}%`);
            if (item.buffDef)
                parts.push(`DEF +${Math.round(item.buffDef * 100)}%`);
            if (item.buffSpd)
                parts.push(`SPD +${Math.round(item.buffSpd * 100)}%`);
            message += ` ได้บัฟ ${parts.join(", ")} ในการต่อสู้ครั้งถัดไป`;
        }
        else if (item.buffGoldMinutes) {
            message += ` ได้บัฟ Gold x2 เป็นเวลา ${item.buffGoldMinutes * useQty} นาที`;
        }
        else if (item.buffXpMinutes) {
            message += ` ได้บัฟ XP x2 เป็นเวลา ${item.buffXpMinutes * useQty} นาที`;
        }
        else if (item.isTransmute && finalTransmuteResult) {
            message += ` แปลง 5x ${finalTransmuteResult.from} เป็น 1x ${finalTransmuteResult.to} สำเร็จ`;
        }
        else if (item.farmingBuffType) {
            const buffLabels = {
                BUFF_ATK: `⚔️ ATK +40%`,
                BUFF_DEF: `🛡️ ลดดาเมจ 50%`,
                CRIT_BUFF: `🎯 CRIT +30%`,
                REGEN: `🌿 Regen HP 8%/เทิร์น`,
            };
            const label = (_d = buffLabels[item.farmingBuffType]) !== null && _d !== void 0 ? _d : item.farmingBuffType;
            message += ` ได้บัฟ ${label} เป็นเวลา ${farmingBuffTurns} เทิร์น`;
        }
        else if (item.isLevelUp) {
            const newLv = (_f = (_e = result.gameStats) === null || _e === void 0 ? void 0 : _e.level) !== null && _f !== void 0 ? _f : "?";
            message = `เลเวลอัปสำเร็จ ตอนนี้เป็น Lv.${newLv}`;
        }
        const finalGameStats = result.gameStats;
        return server_1.NextResponse.json({
            success: true,
            newStamina: result.stamina,
            newMana: result.mana,
            newPlayerHp: (_h = (_g = finalGameStats === null || finalGameStats === void 0 ? void 0 : finalGameStats.farming) === null || _g === void 0 ? void 0 : _g.playerHp) !== null && _h !== void 0 ? _h : null,
            newPlayerMaxHp: (_k = (_j = finalGameStats === null || finalGameStats === void 0 ? void 0 : finalGameStats.farming) === null || _j === void 0 ? void 0 : _j.playerMaxHp) !== null && _k !== void 0 ? _k : null,
            newLevel: item.isLevelUp ? finalGameStats === null || finalGameStats === void 0 ? void 0 : finalGameStats.level : undefined,
            farmingActiveEffects: (_m = (_l = finalGameStats === null || finalGameStats === void 0 ? void 0 : finalGameStats.farming) === null || _l === void 0 ? void 0 : _l.activeEffects) !== null && _m !== void 0 ? _m : null,
            farmingBuffType: (_o = item.farmingBuffType) !== null && _o !== void 0 ? _o : null,
            transmuteResult: finalTransmuteResult,
            message,
        });
    }
    catch (error) {
        console.error("Error using item:", error);
        const knownErrorResponse = (0, rpg_route_errors_1.toInventoryUseErrorResponse)(error);
        if (knownErrorResponse)
            return knownErrorResponse;
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
