"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdleEngine = void 0;
const db_1 = require("@/lib/db");
const classroom_utils_1 = require("@/lib/classroom-utils");
const game_constants_1 = require("./game-constants");
/**
 * Core RPG Idle Engine
 * Handles timestamp-based calculations for passive income and progression.
 */
class IdleEngine {
    /**
     * Calculates the current gold balance of a student based on time passed since last sync.
     * @param student The student object from database
     * @param activeEvents Optional array of active events for multipliers
     * @returns The updated game stats and the amount of gold earned
     */
    static calculateCurrentResources(student, activeEvents = []) {
        var _a;
        const now = new Date();
        const lastSync = student.lastSyncTime ? new Date(student.lastSyncTime) : now;
        const stats = student.gameStats || this.getDefaultStats();
        // Calculate time difference in seconds with millisecond precision
        const secondsPassed = (now.getTime() - lastSync.getTime()) / 1000;
        if (secondsPassed <= 0) {
            return { stats, earnedGold: 0, secondsPassed: 0, syncTime: now };
        }
        // Calculate gold rate based on rank, behavior points, equipment and EVENTS
        const goldRate = this.calculateGoldRate(student.points, stats, (_a = student.classroom) === null || _a === void 0 ? void 0 : _a.levelConfig, student.items, activeEvents);
        const earnedGold = secondsPassed * goldRate;
        const updatedStats = {
            ...stats,
            gold: (stats.gold || 0) + earnedGold,
        };
        return {
            stats: updatedStats,
            earnedGold,
            secondsPassed,
            syncTime: now
        };
    }
    /**
     * Calculates total character stats based on behavior points, items, and level.
     */
    static calculateCharacterStats(points, equippedItems = [], level = 1) {
        // 1. Base Stats from Points (Behavior)
        // Every 10 points = 1 ATK, 1 DEF, 10 HP
        const baseAtk = 10 + Math.floor(points / 10);
        const baseDef = 5 + Math.floor(points / 20);
        const baseHp = 100 + Math.floor(points / 1);
        // Advanced Base Stats (Starting fixed values)
        const baseSpd = 10;
        const baseCrit = 0.05; // 5% base
        const baseLuck = 0.01; // 1% base
        const baseMag = 5;
        const baseMaxMp = 50 + (level * 5); // MP grows with level
        let totalAtk = baseAtk;
        let totalDef = baseDef;
        let totalHp = baseHp;
        let totalSpd = baseSpd;
        let totalCrit = baseCrit;
        let totalLuck = baseLuck;
        let totalMag = baseMag;
        let totalMaxMp = baseMaxMp;
        // 2. Bonus from Equipment
        if (Array.isArray(equippedItems)) {
            equippedItems.forEach(si => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
                // Core Stats
                totalAtk += (((_a = si.item) === null || _a === void 0 ? void 0 : _a.baseAtk) || 0) * levelBonus;
                totalDef += (((_b = si.item) === null || _b === void 0 ? void 0 : _b.baseDef) || 0) * levelBonus;
                totalHp += (((_c = si.item) === null || _c === void 0 ? void 0 : _c.baseHp) || 0) * levelBonus;
                // Advanced Stats from Item Template
                totalSpd += (((_d = si.item) === null || _d === void 0 ? void 0 : _d.baseSpd) || 0) * levelBonus;
                totalCrit += (((_e = si.item) === null || _e === void 0 ? void 0 : _e.baseCrit) || 0) * levelBonus;
                totalLuck += (((_f = si.item) === null || _f === void 0 ? void 0 : _f.baseLuck) || 0) * levelBonus;
                totalMag += (((_g = si.item) === null || _g === void 0 ? void 0 : _g.baseMag) || 0) * levelBonus;
                totalMaxMp += (((_h = si.item) === null || _h === void 0 ? void 0 : _h.baseMp) || 0) * levelBonus;
            });
        }
        return {
            atk: Math.floor(totalAtk),
            def: Math.floor(totalDef),
            hp: Math.floor(totalHp),
            spd: Math.floor(totalSpd),
            crit: Number(totalCrit.toFixed(2)),
            luck: Number(totalLuck.toFixed(2)),
            mag: Math.floor(totalMag),
            maxMp: Math.floor(totalMaxMp)
        };
    }
    /**
     * Determines the gold earning rate per second.
     * Logic: Rank-based Rate (if configured) OR (Base Rate * Multipliers)
     * Multipliers are calculated from behavior points, equipped items, and ACTIVE EVENTS.
     */
    static calculateGoldRate(points, stats, levelConfig, equippedItems = [], activeEvents = []) {
        // 1. Level-based Passive Income (New)
        // Each level adds 0.05 gold/sec base passive income
        const levelIncome = (stats.level || 1) * 0.05;
        // 2. Calculate Multipliers from Equipment
        let goldMultiplier = 1;
        if (Array.isArray(equippedItems)) {
            equippedItems.forEach(si => {
                var _a;
                const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
                if ((_a = si.item) === null || _a === void 0 ? void 0 : _a.goldMultiplier) {
                    goldMultiplier += si.item.goldMultiplier * levelBonus;
                }
            });
        }
        // 3. Apply multipliers from Active Events
        if (Array.isArray(activeEvents)) {
            activeEvents.forEach(event => {
                if (event.type === 'GOLD_BOOST' && event.multiplier > 1) {
                    goldMultiplier *= event.multiplier;
                }
            });
        }
        // 4. Try to get rate from Specific Rank Configuration (Gold per Minute)
        let finalBaseRate = this.BASE_GOLD_RATE;
        const rankEntry = (0, classroom_utils_1.getRankEntry)(points, levelConfig);
        if (rankEntry && typeof rankEntry.goldRate === 'number') {
            finalBaseRate = rankEntry.goldRate / 60;
        }
        else {
            // Legacy/Fallback Logic
            const rankMultiplier = 1 + Math.floor(points / 100) * 0.1;
            finalBaseRate = this.BASE_GOLD_RATE * rankMultiplier;
        }
        // Formula: (Rank Rate + Level Passive) * Multipliers
        return (finalBaseRate + levelIncome) * goldMultiplier;
    }
    /**
     * Calculates the damage multiplier for World Boss battles based on equipped items and stats.
     * Includes Critical Hit logic.
     */
    static calculateBossDamage(points, equippedItems = [], level = 1) {
        const stats = this.calculateCharacterStats(points, equippedItems, level);
        let itemMultiplier = 1;
        if (Array.isArray(equippedItems)) {
            equippedItems.forEach(si => {
                var _a;
                const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
                if ((_a = si.item) === null || _a === void 0 ? void 0 : _a.bossDamageMultiplier) {
                    itemMultiplier += si.item.bossDamageMultiplier * levelBonus;
                }
            });
        }
        const baseDamage = Math.floor(stats.atk * itemMultiplier);
        // Critical Hit Logic
        const isCrit = Math.random() < stats.crit;
        const finalDamage = isCrit ? Math.floor(baseDamage * 2) : baseDamage;
        return {
            damage: finalDamage,
            isCrit,
            stats // Returning full stats for reference in UI
        };
    }
    /**
     * Applies damage to the world boss in a classroom.
     * Now requires studentId to handle stamina consumption.
     * @param options.damageOverride Optional fixed damage (e.g. from assignment)
     * @param options.consumeStamina Whether to consume stamina (default: true)
     */
    static async applyBossDamage(classId, studentId, options = { consumeStamina: true }) {
        var _a, _b, _c, _d;
        try {
            // 1. Fetch current boss status and student stamina
            const [classroom, student] = await Promise.all([
                db_1.db.classroom.findUnique({
                    where: { id: classId },
                    select: { gamifiedSettings: true }
                }),
                db_1.db.student.findUnique({
                    where: { id: studentId },
                    select: { points: true, items: { include: { item: true }, where: { isEquipped: true } }, stamina: true, gameStats: true }
                })
            ]);
            const settings = (classroom === null || classroom === void 0 ? void 0 : classroom.gamifiedSettings) || {};
            if (!((_a = settings === null || settings === void 0 ? void 0 : settings.boss) === null || _a === void 0 ? void 0 : _a.active) || settings.boss.currentHp <= 0) {
                return { error: "No active boss" };
            }
            const consumeStamina = (_b = options.consumeStamina) !== null && _b !== void 0 ? _b : true;
            if (consumeStamina && (!student || student.stamina <= 0)) {
                return { error: "Insufficient stamina" };
            }
            // 2. Calculate Damage
            let damage = 0;
            let isCrit = false;
            if (typeof options.damageOverride === 'number') {
                damage = options.damageOverride;
            }
            else {
                const stats = student === null || student === void 0 ? void 0 : student.gameStats;
                const battleResult = this.calculateBossDamage((student === null || student === void 0 ? void 0 : student.points) || 0, (student === null || student === void 0 ? void 0 : student.items) || [], (stats === null || stats === void 0 ? void 0 : stats.level) || 1);
                damage = battleResult.damage;
                isCrit = battleResult.isCrit;
            }
            // 3. Atomic Updates
            const newHp = Math.max(0, settings.boss.currentHp - damage);
            const isDefeated = settings.boss.currentHp > 0 && newHp <= 0;
            const [updatedClassroom, updatedStudent] = await db_1.db.$transaction([
                db_1.db.classroom.update({
                    where: { id: classId },
                    data: {
                        gamifiedSettings: {
                            ...settings,
                            boss: {
                                ...settings.boss,
                                currentHp: newHp,
                                active: newHp > 0
                            }
                        }
                    }
                }),
                // Only update student if we consume stamina
                ...(consumeStamina ? [
                    db_1.db.student.update({
                        where: { id: studentId },
                        data: {
                            stamina: { decrement: 1 }
                        }
                    })
                ] : [])
            ]);
            // 4. Distribute Rewards if defeated
            if (isDefeated) {
                await this.distributeBossRewards(classId, settings.boss);
            }
            return {
                boss: updatedClassroom.gamifiedSettings.boss,
                damage,
                isCrit,
                staminaLeft: (_d = (_c = updatedStudent === null || updatedStudent === void 0 ? void 0 : updatedStudent.stamina) !== null && _c !== void 0 ? _c : student === null || student === void 0 ? void 0 : student.stamina) !== null && _d !== void 0 ? _d : 0
            };
        }
        catch (error) {
            console.error("[IdleEngine] Error applying boss damage:", error);
            // Log more details about the error if possible
            if (error.code)
                console.error("Error Code:", error.code);
            if (error.meta)
                console.error("Error Meta:", error.meta);
            return { error: `Internal error: ${error.message || "Unknown"}` };
        }
    }
    /**
     * Helper to refill stamina based on points (e.g. teacher gives +10 points = +1 stamina if max not reached)
     */
    static async handleStaminaRefill(studentId, pointIncrease) {
        if (pointIncrease < 10)
            return; // Only "Significant" good deeds refill stamina
        // Simple logic: +1 stamina for every 10 points added manually
        const refillAmount = Math.floor(pointIncrease / 10);
        await db_1.db.student.update({
            where: { id: studentId },
            data: {
                stamina: {
                    increment: refillAmount
                }
            }
        }).catch(() => { });
    }
    /**
     * Distributes rewards to all students in a classroom after defeating a boss.
     */
    static async distributeBossRewards(classId, bossSettings) {
        try {
            const rewardGold = bossSettings.rewardGold || 500;
            const bossName = bossSettings.name || "World Boss";
            // 1. Get all students in this class
            const students = await db_1.db.student.findMany({
                where: { classId },
                select: { id: true, gameStats: true }
            });
            // 2. Process each student (can't use updateMany easily for JSON fields)
            for (const student of students) {
                const stats = student.gameStats || this.getDefaultStats();
                const updatedStats = {
                    ...stats,
                    gold: (stats.gold || 0) + rewardGold
                };
                await db_1.db.student.update({
                    where: { id: student.id },
                    data: {
                        points: { increment: rewardGold }, // Add to Behavior Points too
                        gameStats: updatedStats,
                        history: {
                            create: {
                                reason: `🚀 รางวัลพิชิต ${bossName}!`,
                                value: rewardGold,
                                timestamp: new Date()
                            }
                        }
                    }
                });
            }
            console.log(`[IdleEngine] Distributed ${rewardGold} gold to ${students.length} students for defeating ${bossName}`);
        }
        catch (error) {
            console.error("Error distributing boss rewards:", error);
        }
    }
    /**
     * Calculates the XP needed for a specific level.
     * Exponential growth: 100 * (1.2 ^ (level - 1))
     */
    static getXpRequirement(level) {
        return Math.floor(100 * Math.pow(1.2, level - 1));
    }
    /**
     * Adds XP to a student and handles automatic level up.
     */
    static calculateXpGain(currentStats, xpToAdd) {
        let { level, xp } = currentStats;
        let earnedXp = xp + xpToAdd;
        let leveledUp = false;
        while (earnedXp >= this.getXpRequirement(level)) {
            earnedXp -= this.getXpRequirement(level);
            level++;
            leveledUp = true;
        }
        return {
            level,
            xp: Math.max(0, earnedXp),
            leveledUp
        };
    }
    /**
     * Processes skill usage: Checks MP, applies effects, and updates DB.
     */
    static async useSkill(studentId, skillId, classId) {
        try {
            const skill = this.SKILLS.find(s => s.id === skillId);
            if (!skill)
                return { error: "Skill not found" };
            // 1. Fetch student data
            const student = await db_1.db.student.findUnique({
                where: { id: studentId },
                select: {
                    points: true,
                    mana: true,
                    gameStats: true,
                    items: { where: { isEquipped: true }, include: { item: true } }
                }
            });
            if (!student || student.mana < skill.manaCost) {
                return { error: "มานาไม่เพียงพอ" };
            }
            const stats = student.gameStats || this.getDefaultStats();
            let resultMessage = "";
            let bonusUpdates = {};
            // 2. Apply Skill Effect
            if (skill.type === "BOSS_DAMAGE") {
                const battleRes = this.calculateBossDamage(student.points, student.items, stats.level);
                const bonusDamage = Math.floor(battleRes.damage * (skill.value || 1.5));
                const bossResult = await this.applyBossDamage(classId, studentId, {
                    damageOverride: bonusDamage,
                    consumeStamina: false // Skills use MP, not Stamina
                });
                if (bossResult.error)
                    return { error: bossResult.error };
                resultMessage = `ใช้ ${skill.name} สร้างความเสียหาย ${bonusDamage} ใส่บอส!`;
            }
            else if (skill.type === "HEAL") {
                resultMessage = `ใช้ ${skill.name} ฟื้นฟูพลังชีวิต (ฟีเจอร์นี้จะใช้ได้ในโหมดต่อสู้)`;
            }
            else {
                resultMessage = `ใช้ทักษะ ${skill.name} สำเร็จ!`;
            }
            // 3. Deduct MP and Update History
            const updatedStudent = await db_1.db.student.update({
                where: { id: studentId },
                data: {
                    mana: { decrement: skill.manaCost },
                    history: {
                        create: {
                            reason: `🔮 ใช้ทักษะ: ${skill.name}`,
                            value: 0,
                            timestamp: new Date()
                        }
                    }
                }
            });
            return {
                success: true,
                message: resultMessage,
                mana: updatedStudent.mana
            };
        }
        catch (error) {
            console.error("[IdleEngine] Skill Error:", error);
            return { error: "เกิดข้อผิดพลาดในการใช้สกิล" };
        }
    }
    /**
     * Provides default game stats for new students or missing data
     */
    static getDefaultStats() {
        return {
            gold: 0,
            level: 1,
            xp: 0,
            inventory: [],
            equipment: {},
            multipliers: {
                gold: 1,
                xp: 1
            }
        };
    }
}
exports.IdleEngine = IdleEngine;
// Base rates
IdleEngine.BASE_GOLD_RATE = 0.1; // Gold per second at Rank 1
IdleEngine.SECONDS_IN_MINUTE = 60;
/**
 * Skills definitions
 */
IdleEngine.SKILLS = game_constants_1.SKILLS;
