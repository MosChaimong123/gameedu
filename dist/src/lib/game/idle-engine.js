"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdleEngine = void 0;
const db_1 = require("../db");
const classroom_utils_1 = require("../classroom-utils");
const game_constants_1 = require("./game-constants");
const farming_system_1 = require("./farming-system");
const job_system_1 = require("./job-system");
const game_stats_1 = require("./game-stats");
const skill_tree_1 = require("./skill-tree");
// Default cooldown (in turns) for each skill effect type
const DEFAULT_COOLDOWN_BY_EFFECT = {
    POISON: 3,
    BUFF_ATK: 5,
    BUFF_DEF: 3,
    DEFEND: 3,
    DEBUFF_ATK: 3,
    CRIT_BUFF: 4,
    ARMOR_PIERCE: 3,
    HEAL: 4,
    SLOW: 3,
    STUN: 4,
    REGEN: 5,
    LIFESTEAL: 3,
    EXECUTE: 4,
    DEF_BREAK: 4,
    MANA_SURGE: 2,
};
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
    static parseGameStats(gameStats) {
        var _a;
        const defaults = this.getDefaultStats();
        let stats = {};
        if (!gameStats)
            return defaults;
        if (typeof gameStats === 'string') {
            try {
                stats = JSON.parse(gameStats);
            }
            catch (e) {
                return defaults;
            }
        }
        else if (typeof gameStats === "object") {
            stats = gameStats;
        }
        // Merge with defaults to ensure level and xp exist
        const merged = {
            ...defaults,
            ...stats
        };
        const skillState = (0, skill_tree_1.normalizeSkillTreeState)({
            skillPointsAvailable: merged.skillPointsAvailable,
            skillPointsSpent: merged.skillPointsSpent,
            skillTreeProgress: merged.skillTreeProgress,
            lastRespecAt: merged.lastRespecAt,
        }, (_a = merged.level) !== null && _a !== void 0 ? _a : 1);
        return {
            ...merged,
            ...skillState,
        };
    }
    static calculateCurrentResources(student, activeEvents = []) {
        var _a, _b;
        const now = new Date();
        const lastSync = student.lastSyncTime ? new Date(student.lastSyncTime) : now;
        const stats = this.parseGameStats(student.gameStats);
        // Calculate time difference in seconds with millisecond precision
        const secondsPassed = (now.getTime() - lastSync.getTime()) / 1000;
        if (secondsPassed <= 0) {
            return { stats, earnedGold: 0, secondsPassed: 0, syncTime: now };
        }
        // Calculate gold rate based on rank, behavior points, equipment and EVENTS
        const goldRate = this.calculateGoldRate(student.points, stats, (_a = student.classroom) === null || _a === void 0 ? void 0 : _a.levelConfig, (_b = student.items) !== null && _b !== void 0 ? _b : [], activeEvents);
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
     * Returns raw (unflored) base stats from level and equipment only.
     * Does NOT apply job class multipliers or passives.
     * Use this when job multipliers will be applied afterwards (e.g. StatCalculator),
     * to avoid double-flooring that causes 1-unit stat inconsistencies.
     */
    static computeRawStats(points, equippedItems = [], level = 1) {
        // Base Stats from Level
        let totalAtk = 10 + (level * 3);
        let totalDef = 5 + (level * 2);
        let totalHp = 100 + (level * 15);
        let totalSpd = 10 + (level * 1);
        let totalCrit = 0.05 + (level * 0.002); // 5% + 0.2% per level
        let totalLuck = 0.01 + (level * 0.001); // 1% + 0.1% per level
        let totalMag = 5 + (level * 2);
        let totalMaxMp = 50 + (level * 5);
        // Bonus from Equipment (float accumulation — no floor here)
        if (Array.isArray(equippedItems)) {
            equippedItems.forEach(si => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
                totalAtk += (((_a = si.item) === null || _a === void 0 ? void 0 : _a.baseAtk) || 0) * levelBonus;
                totalDef += (((_b = si.item) === null || _b === void 0 ? void 0 : _b.baseDef) || 0) * levelBonus;
                totalHp += (((_c = si.item) === null || _c === void 0 ? void 0 : _c.baseHp) || 0) * levelBonus;
                totalSpd += (((_d = si.item) === null || _d === void 0 ? void 0 : _d.baseSpd) || 0) * levelBonus;
                totalCrit += (((_e = si.item) === null || _e === void 0 ? void 0 : _e.baseCrit) || 0) * levelBonus;
                totalLuck += (((_f = si.item) === null || _f === void 0 ? void 0 : _f.baseLuck) || 0) * levelBonus;
                totalMag += (((_g = si.item) === null || _g === void 0 ? void 0 : _g.baseMag) || 0) * levelBonus;
                totalMaxMp += (((_h = si.item) === null || _h === void 0 ? void 0 : _h.baseMp) || 0) * levelBonus;
            });
        }
        // Return floats — caller is responsible for flooring after multipliers
        return {
            atk: totalAtk,
            def: totalDef,
            hp: totalHp,
            spd: totalSpd,
            crit: totalCrit,
            luck: totalLuck,
            mag: totalMag,
            maxMp: totalMaxMp,
        };
    }
    /**
     * Calculates total character stats based on behavior points, items, and job class.
     * Applies job multipliers and passives on top of the raw base+equipment stats.
     */
    static calculateCharacterStats(points, equippedItems = [], level = 1, jobClass = null, jobTier = "BASE", advanceClass = null) {
        // 1. Raw base + equipment stats (float, no job multipliers)
        const raw = this.computeRawStats(points, equippedItems, level);
        // 2. Apply Job Class Multipliers if applicable
        let effectiveJobKey = null;
        let multipliers = null;
        if (jobClass) {
            effectiveJobKey = (0, job_system_1.resolveEffectiveJobKey)({ jobClass, jobTier, advanceClass });
            multipliers = (0, job_system_1.getStatMultipliers)(effectiveJobKey, jobTier);
        }
        let totalAtk = multipliers ? raw.atk * multipliers.atk : raw.atk;
        let totalDef = multipliers ? raw.def * multipliers.def : raw.def;
        let totalHp = multipliers ? raw.hp * multipliers.hp : raw.hp;
        let totalSpd = multipliers ? raw.spd * multipliers.spd : raw.spd;
        let totalCrit = multipliers ? raw.crit * multipliers.crit : raw.crit;
        let totalMag = multipliers ? raw.mag * multipliers.mag : raw.mag;
        let totalMaxMp = multipliers ? raw.maxMp * multipliers.mp : raw.maxMp;
        let totalLuck = multipliers ? raw.luck * multipliers.luck : raw.luck;
        // 3. Apply Job Passives (+X% stats)
        const afterPassives = effectiveJobKey
            ? (0, job_system_1.applyJobPassiveMultipliers)({ hp: totalHp, atk: totalAtk, def: totalDef, spd: totalSpd,
                mag: totalMag, maxMp: totalMaxMp, crit: totalCrit, luck: totalLuck }, (0, job_system_1.getPassivesForClass)(effectiveJobKey))
            : { hp: totalHp, atk: totalAtk, def: totalDef, spd: totalSpd,
                mag: totalMag, maxMp: totalMaxMp, crit: totalCrit, luck: totalLuck };
        // 4. Floor at the end (single floor per stat — no double-flooring)
        return {
            atk: Math.floor(afterPassives.atk),
            def: Math.floor(afterPassives.def),
            hp: Math.floor(afterPassives.hp),
            spd: Math.floor(afterPassives.spd),
            crit: Number(afterPassives.crit.toFixed(2)),
            luck: Number(afterPassives.luck.toFixed(2)),
            mag: Math.floor(afterPassives.mag),
            maxMp: Math.floor(afterPassives.maxMp),
        };
    }
    /**
     * Determines the gold earning rate per second.
     * Logic: Rank-based Rate (if configured) OR (Base Rate * Multipliers)
     * Multipliers are calculated from behavior points, equipped items, and ACTIVE EVENTS.
     */
    static calculateGoldRate(points, stats, levelConfig, equippedItems = [], activeEvents = []) {
        // 1. Base Rate (Strictly from Classroom Rank Settings)
        const rankEntry = (0, classroom_utils_1.getRankEntry)(points, levelConfig);
        // If the rank has a goldRate set by the teacher, use it. 
        // If not, fallback to a minimal 1 gold/hour to avoid zero income.
        let baseRatePerSec = (rankEntry && typeof rankEntry.goldRate === 'number')
            ? rankEntry.goldRate / 3600
            : 1 / 3600;
        // 2. Multipliers (Items & Events only)
        // Removed level-based multipliers to ensure a Level 100 student without items 
        // earns exactly the same as a Level 1 student at the same rank.
        let totalMultiplier = 1;
        // Equipment Bonuses
        if (Array.isArray(equippedItems)) {
            equippedItems.forEach(si => {
                var _a;
                const levelBonus = 1 + (si.enhancementLevel || 0) * 0.1;
                if ((_a = si.item) === null || _a === void 0 ? void 0 : _a.goldMultiplier) {
                    totalMultiplier += si.item.goldMultiplier * levelBonus;
                }
            });
        }
        // Active Event Bonuses — stacked additively (not multiplicatively) to prevent exponential abuse.
        // Two ×1.5 events yield +0.5+0.5 = ×2.0 total, not ×2.25.
        const GOLD_MULTIPLIER_CAP = 10;
        if (Array.isArray(activeEvents)) {
            activeEvents.forEach(event => {
                var _a, _b;
                if (event.type === 'GOLD_BOOST' && ((_a = event.multiplier) !== null && _a !== void 0 ? _a : 0) > 1) {
                    totalMultiplier += ((_b = event.multiplier) !== null && _b !== void 0 ? _b : 1) - 1;
                }
            });
        }
        // Final Formula: Base Rank Rate * (Items + Events Multipliers), capped at 10×
        return baseRatePerSec * Math.min(GOLD_MULTIPLIER_CAP, totalMultiplier);
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
        // Use the higher of ATK or MAG so magic classes (Mage/Healer) are not penalized
        const effectiveDamage = Math.max(stats.atk, stats.mag);
        const baseDamage = Math.floor(effectiveDamage * itemMultiplier);
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
        var _a;
        try {
            const consumeStamina = (_a = options.consumeStamina) !== null && _a !== void 0 ? _a : true;
            const MAX_RETRIES = 3;
            const RETRY_CONFLICT_ERROR = "BOSS_CONFLICT_RETRY";
            // 1. Fetch student once for damage calculation baseline
            const student = await db_1.db.student.findUnique({
                where: { id: studentId },
                select: {
                    points: true,
                    items: { include: { item: true }, where: { isEquipped: true } },
                    stamina: true,
                    gameStats: true
                }
            });
            if (consumeStamina && (!student || student.stamina <= 0)) {
                return { error: "Insufficient stamina" };
            }
            // 2. Calculate Damage once to avoid inconsistent rerolls across retries
            let damage = 0;
            let isCrit = false;
            if (typeof options.damageOverride === 'number') {
                damage = options.damageOverride;
            }
            else {
                const stats = this.parseGameStats(student === null || student === void 0 ? void 0 : student.gameStats);
                const battleResult = this.calculateBossDamage((student === null || student === void 0 ? void 0 : student.points) || 0, (student === null || student === void 0 ? void 0 : student.items) || [], (stats === null || stats === void 0 ? void 0 : stats.level) || 1);
                damage = battleResult.damage;
                isCrit = battleResult.isCrit;
            }
            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                try {
                    const txResult = await db_1.db.$transaction(async (tx) => {
                        var _a, _b, _c, _d, _e, _f;
                        // Always read latest state inside transaction
                        const classroom = await tx.classroom.findUnique({
                            where: { id: classId },
                            select: { gamifiedSettings: true, updatedAt: true }
                        });
                        if (!classroom) {
                            return { error: "Classroom not found" };
                        }
                        const settings = (_a = classroom === null || classroom === void 0 ? void 0 : classroom.gamifiedSettings) !== null && _a !== void 0 ? _a : {};
                        if (!((_b = settings.boss) === null || _b === void 0 ? void 0 : _b.active) || settings.boss.currentHp <= 0) {
                            return { error: "No active boss" };
                        }
                        // Guarded stamina decrement prevents negative stamina under concurrency
                        if (consumeStamina) {
                            const staminaUpdate = await tx.student.updateMany({
                                where: { id: studentId, stamina: { gte: 1 } },
                                data: { stamina: { decrement: 1 } }
                            });
                            if (staminaUpdate.count === 0) {
                                return { error: "Insufficient stamina" };
                            }
                        }
                        const newHp = Math.max(0, settings.boss.currentHp - damage);
                        const isDefeated = settings.boss.currentHp > 0 && newHp <= 0;
                        const alreadyDistributed = Boolean((_c = settings.boss) === null || _c === void 0 ? void 0 : _c.rewardDistributedAt);
                        // Optimistic concurrency check by updatedAt to avoid lost updates
                        const classroomUpdate = await tx.classroom.updateMany({
                            where: {
                                id: classId,
                                updatedAt: classroom.updatedAt
                            },
                            data: {
                                gamifiedSettings: {
                                    ...settings,
                                    boss: {
                                        ...settings.boss,
                                        currentHp: newHp,
                                        active: newHp > 0,
                                        ...(isDefeated && !alreadyDistributed
                                            ? { rewardDistributedAt: new Date().toISOString() }
                                            : {})
                                    }
                                }
                            }
                        });
                        if (classroomUpdate.count === 0) {
                            throw new Error(RETRY_CONFLICT_ERROR);
                        }
                        // If this request is responsible for the first defeat distribution,
                        // distribute rewards inside the same transaction to keep it atomic.
                        if (isDefeated && !alreadyDistributed) {
                            await this.distributeBossRewardsTx(tx, classId, {
                                ...settings.boss,
                                rewardDistributedAt: new Date().toISOString()
                            });
                        }
                        const [updatedClassroom, updatedStudent] = await Promise.all([
                            tx.classroom.findUnique({
                                where: { id: classId },
                                select: { gamifiedSettings: true }
                            }),
                            consumeStamina
                                ? tx.student.findUnique({
                                    where: { id: studentId },
                                    select: { stamina: true }
                                })
                                : Promise.resolve(null)
                        ]);
                        return {
                            boss: (_d = updatedClassroom === null || updatedClassroom === void 0 ? void 0 : updatedClassroom.gamifiedSettings) === null || _d === void 0 ? void 0 : _d.boss,
                            staminaLeft: (_f = (_e = updatedStudent === null || updatedStudent === void 0 ? void 0 : updatedStudent.stamina) !== null && _e !== void 0 ? _e : student === null || student === void 0 ? void 0 : student.stamina) !== null && _f !== void 0 ? _f : 0,
                            isDefeated
                        };
                    });
                    if ("error" in txResult) {
                        return { error: txResult.error };
                    }
                    return {
                        boss: txResult.boss,
                        damage,
                        isCrit,
                        staminaLeft: txResult.staminaLeft
                    };
                }
                catch (error) {
                    if (error instanceof Error && error.message === RETRY_CONFLICT_ERROR && attempt < MAX_RETRIES - 1) {
                        continue;
                    }
                    throw error;
                }
            }
            return { error: "Conflict while attacking boss, please retry" };
        }
        catch (error) {
            console.error("[IdleEngine] Error applying boss damage:", error);
            // Log more details about the error if possible
            if (error && typeof error === "object" && "code" in error)
                console.error("Error Code:", error.code);
            if (error && typeof error === "object" && "meta" in error)
                console.error("Error Meta:", error.meta);
            const message = error instanceof Error ? error.message : "Unknown";
            return { error: `Internal error: ${message}` };
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
                const stats = this.parseGameStats(student.gameStats);
                const xpReward = Math.floor(rewardGold * 0.5); // XP is half of Gold for boss
                const xpResult = this.calculateXpGain(stats, xpReward);
                const updatedStats = {
                    ...stats,
                    gold: (stats.gold || 0) + rewardGold,
                    level: xpResult.level,
                    xp: xpResult.xp
                };
                const updateData = {
                    points: { increment: rewardGold },
                    gameStats: (0, game_stats_1.toPrismaJson)(updatedStats),
                    history: {
                        create: {
                            reason: `🚀 รางวัลพิชิต ${bossName}!`,
                            value: rewardGold,
                            timestamp: new Date()
                        }
                    }
                };
                await db_1.db.student.update({
                    where: { id: student.id },
                    data: updateData
                });
            }
            console.log(`[IdleEngine] Distributed ${rewardGold} gold to ${students.length} students for defeating ${bossName}`);
        }
        catch (error) {
            console.error("Error distributing boss rewards:", error);
        }
    }
    /**
     * Atomic version: distribute rewards using the provided transaction client.
     * Must be called within the same transaction where classroom boss defeat is committed.
     */
    static async distributeBossRewardsTx(tx, classId, bossSettings) {
        const rewardGold = bossSettings.rewardGold || 500;
        const bossName = bossSettings.name || "World Boss";
        // 1. Get all students in this class
        const students = (await tx.student.findMany({
            where: { classId },
            select: { id: true, gameStats: true },
        }));
        // 2. Distribute to each student inside the same DB transaction
        for (const student of students) {
            const stats = this.parseGameStats(student.gameStats);
            const xpReward = Math.floor(rewardGold * 0.5); // XP is half of Gold for boss
            const xpResult = this.calculateXpGain(stats, xpReward);
            const updatedStats = {
                ...stats,
                gold: (stats.gold || 0) + rewardGold,
                level: xpResult.level,
                xp: xpResult.xp,
            };
            const updateData = {
                points: { increment: rewardGold },
                gameStats: (0, game_stats_1.toPrismaJson)(updatedStats),
                history: {
                    create: {
                        reason: `🚀 รางวัลพิชิต ${bossName}!`,
                        value: rewardGold,
                        timestamp: new Date(),
                    },
                },
            };
            await tx.student.update({
                where: { id: student.id },
                data: updateData,
            });
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
        console.log(`[XP_DEBUG] Start: Lv.${level}, XP:${xp}, Adding:${xpToAdd}`);
        let earnedXp = xp + xpToAdd;
        let leveledUp = false;
        while (earnedXp >= this.getXpRequirement(level)) {
            const req = this.getXpRequirement(level);
            console.log(`[XP_DEBUG] Leveling Up: ${level} -> ${level + 1}. Required: ${req}, Earned: ${earnedXp}`);
            earnedXp -= req;
            level++;
            leveledUp = true;
        }
        console.log(`[XP_DEBUG] End: Lv.${level}, NewXP:${earnedXp}, LeveledUp:${leveledUp}`);
        return {
            level,
            xp: Math.max(0, earnedXp),
            leveledUp,
            newMaxMp: this.calculateCharacterStats(0, [], level).maxMp // Return new max MP if needed
        };
    }
    /**
     * Processes skill usage: Checks MP, applies effects, and updates DB.
     */
    static async useSkill(studentId, skillId, classId) {
        var _a;
        try {
            const { buildGlobalSkillMap } = require("./job-system");
            const baseSkill = buildGlobalSkillMap()[skillId];
            // 1. Fetch student data
            const student = await db_1.db.student.findUnique({
                where: { id: studentId },
                select: {
                    points: true,
                    mana: true,
                    stamina: true,
                    gameStats: true,
                    items: { where: { isEquipped: true }, include: { item: true } }
                }
            });
            if (!student)
                return { error: "Student not found" };
            const stats = this.parseGameStats(student.gameStats);
            const rank = (0, skill_tree_1.getSkillRank)((_a = stats.skillTreeProgress) !== null && _a !== void 0 ? _a : {}, skillId);
            const skill = baseSkill ? (0, skill_tree_1.getEffectiveSkillAtRank)(baseSkill, rank) : undefined;
            if (!skill)
                return { error: "Skill not found" };
            // 2. Check Resource Requirement (AP vs MP)
            const isAP = skill.costType === "AP";
            const currentResource = isAP ? student.stamina : student.mana;
            const resourceName = isAP ? "พลังกาย (Stamina)" : "มานา (Mana)";
            if (currentResource < skill.cost) {
                return { error: `${resourceName} ไม่เพียงพอ` };
            }
            let resultMessage = "";
            // 3. Apply Skill Effect
            // Most skills currently contribute to Boss Damage in this simple engine
            const battleRes = this.calculateBossDamage(student.points, student.items, stats.level);
            const bonusDamage = Math.floor(battleRes.damage * (isAP ? 1.5 : 2.0)); // Magic usually deals more raw dmg
            const bossResult = await this.applyBossDamage(classId, studentId, {
                damageOverride: bonusDamage,
                consumeStamina: false // Already handled manually below via AP/MP
            });
            if (bossResult.error)
                return { error: bossResult.error };
            resultMessage = `ใช้ ${skill.name} สร้างความเสียหาย ${bonusDamage} ใส่บอส!`;
            // 4. Deduct Resource and Update History
            const updateData = {
                history: {
                    create: {
                        reason: `🔮 ใช้ทักษะ: ${skill.name}`,
                        value: 0,
                        timestamp: new Date()
                    }
                }
            };
            if (isAP) {
                updateData.stamina = { decrement: skill.cost };
            }
            else {
                updateData.mana = { decrement: skill.cost };
            }
            const updatedStudent = await db_1.db.student.update({
                where: { id: studentId },
                data: updateData
            });
            return {
                success: true,
                message: resultMessage,
                mana: updatedStudent.mana,
                stamina: updatedStudent.stamina,
                boss: bossResult.boss
            };
        }
        catch (error) {
            console.error("[IdleEngine] Skill Error:", error);
            return { error: "เกิดข้อผิดพลาดในการใช้สกิล" };
        }
    }
    /**
     * Solo Farming: Get or initialize farming state
     */
    static getFarmingState(student) {
        const stats = this.parseGameStats(student.gameStats);
        if (stats.farming) {
            return stats.farming;
        }
        // Initialize if no farming state exists
        const wave = 1;
        const monster = (0, farming_system_1.spawnSoloMonster)(stats.level || 1, wave);
        return { currentWave: wave, monster };
    }
    /**
     * Solo Farming: Handle manual attack on monster
     */
    static async attackMonster(studentId) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
            const student = await db_1.db.student.findUnique({
                where: { id: studentId },
                include: { items: { where: { isEquipped: true }, include: { item: true } } }
            });
            if (!student)
                return { error: "Student not found" };
            const stats = this.parseGameStats(student.gameStats);
            const farming = this.getFarmingState(student);
            const monster = { ...farming.monster }; // mutable copy
            // 1. Calculate character stats
            const charStats = this.calculateCharacterStats(student.points, student.items, stats.level, student.jobClass, student.jobTier || "BASE", (_a = student.advanceClass) !== null && _a !== void 0 ? _a : null);
            // 2. Initialize playerHp (first time or after level-up)
            let playerHp = (_b = farming.playerHp) !== null && _b !== void 0 ? _b : charStats.hp;
            const playerMaxHp = (_c = farming.playerMaxHp) !== null && _c !== void 0 ? _c : charStats.hp;
            let activeEffects = { ...((_d = farming.activeEffects) !== null && _d !== void 0 ? _d : {}) };
            let skillCooldowns = { ...((_e = farming.skillCooldowns) !== null && _e !== void 0 ? _e : {}) };
            // 3. Read effect values for this turn (before decrement)
            let poisonDamage = 0;
            const atkBuffMulti = activeEffects.atkBuff ? activeEffects.atkBuff.multiplier : 1.0;
            const defBuffReduction = activeEffects.defBuff ? activeEffects.defBuff.reduction : 0.0;
            const atkDebuffReduction = activeEffects.atkDebuff ? activeEffects.atkDebuff.reduction : 0.0;
            const critBonus = activeEffects.critBuff ? activeEffects.critBuff.bonus : 0.0;
            const defBreakAmplify = activeEffects.defBreak ? activeEffects.defBreak.amplify : 0.0;
            const slowSkipChance = activeEffects.slow ? activeEffects.slow.skipChance : 0.0;
            const isStunned = !!(activeEffects.stun && activeEffects.stun.turnsLeft > 0);
            if (activeEffects.regen && activeEffects.regen.turnsLeft > 0) {
                playerHp = Math.min(playerMaxHp, playerHp + activeEffects.regen.healPerTurn);
            }
            if (activeEffects.poison && activeEffects.poison.turnsLeft > 0) {
                poisonDamage = activeEffects.poison.damagePerTurn;
                monster.hp = Math.max(0, monster.hp - poisonDamage);
            }
            // 4. Player normal attack (ATK buff + CRIT buff + DEF break included)
            const isCrit = Math.random() < (charStats.crit + critBonus);
            const damage = Math.floor(charStats.atk * (isCrit ? 2.0 : 1.0) * atkBuffMulti * (1 + defBreakAmplify));
            monster.hp = Math.max(0, monster.hp - damage);
            // 5. Per-hit XP
            const hitXp = Math.max(1, Math.floor(farming.currentWave * 0.5));
            let xpResult = this.calculateXpGain(stats, hitXp);
            stats.level = xpResult.level;
            stats.xp = xpResult.xp;
            // 6. Handle Monster Defeat
            let rewardLoot = null;
            let nextWave = farming.currentWave;
            let newMonster = monster;
            let isDefeated = monster.hp <= 0;
            if (isDefeated) {
                activeEffects = {}; // clear effects on kill
                rewardLoot = (0, farming_system_1.rollFarmingLoot)(farming.currentWave);
                nextWave++;
                newMonster = (0, farming_system_1.spawnSoloMonster)(stats.level, nextWave);
                stats.gold = (stats.gold || 0) + rewardLoot.gold;
                xpResult = this.calculateXpGain(stats, rewardLoot.xp);
                stats.xp = xpResult.xp;
                stats.level = xpResult.level;
            }
            // 7. Monster Counter-Attack (if it survived, slow/stun may skip it)
            let monsterDamage = 0;
            let playerDied = false;
            let deathPenaltyWave = 0;
            const skipCounterAttack = isStunned || Math.random() < slowSkipChance;
            if (!isDefeated && !skipCounterAttack) {
                const rawDmg = Math.max(1, Math.floor(monster.atk * (1 - atkDebuffReduction) - charStats.def * 0.4));
                monsterDamage = Math.max(1, Math.floor(rawDmg * (1 - defBuffReduction)));
                playerHp = Math.max(0, playerHp - monsterDamage);
                if (playerHp <= 0) {
                    playerDied = true;
                    // Death penalty: retreat 2 waves (minimum wave 1)
                    deathPenaltyWave = Math.max(1, Math.floor(farming.currentWave * 0.9));
                    nextWave = deathPenaltyWave;
                    newMonster = (0, farming_system_1.spawnSoloMonster)(stats.level, deathPenaltyWave);
                    activeEffects = {}; // clear all status effects on death
                    playerHp = Math.floor(playerMaxHp * 0.5); // respawn at 50% HP
                }
            }
            // 8. Decrement effect turns at end of turn
            if (!isDefeated) {
                const next = {};
                if (activeEffects.poison && activeEffects.poison.turnsLeft > 1)
                    next.poison = { ...activeEffects.poison, turnsLeft: activeEffects.poison.turnsLeft - 1 };
                if (activeEffects.atkBuff && activeEffects.atkBuff.turnsLeft > 1)
                    next.atkBuff = { ...activeEffects.atkBuff, turnsLeft: activeEffects.atkBuff.turnsLeft - 1 };
                if (activeEffects.defBuff && activeEffects.defBuff.turnsLeft > 1)
                    next.defBuff = { ...activeEffects.defBuff, turnsLeft: activeEffects.defBuff.turnsLeft - 1 };
                if (activeEffects.atkDebuff && activeEffects.atkDebuff.turnsLeft > 1)
                    next.atkDebuff = { ...activeEffects.atkDebuff, turnsLeft: activeEffects.atkDebuff.turnsLeft - 1 };
                if (activeEffects.critBuff && activeEffects.critBuff.turnsLeft > 1)
                    next.critBuff = { ...activeEffects.critBuff, turnsLeft: activeEffects.critBuff.turnsLeft - 1 };
                if (activeEffects.defBreak && activeEffects.defBreak.turnsLeft > 1)
                    next.defBreak = { ...activeEffects.defBreak, turnsLeft: activeEffects.defBreak.turnsLeft - 1 };
                if (activeEffects.slow && activeEffects.slow.turnsLeft > 1)
                    next.slow = { ...activeEffects.slow, turnsLeft: activeEffects.slow.turnsLeft - 1 };
                if (activeEffects.stun && activeEffects.stun.turnsLeft > 1)
                    next.stun = { turnsLeft: activeEffects.stun.turnsLeft - 1 };
                if (activeEffects.regen && activeEffects.regen.turnsLeft > 1)
                    next.regen = { ...activeEffects.regen, turnsLeft: activeEffects.regen.turnsLeft - 1 };
                activeEffects = next;
                // Decrement skill cooldowns
                const nextCooldowns = {};
                for (const [sid, cd] of Object.entries(skillCooldowns)) {
                    if (cd > 1)
                        nextCooldowns[sid] = cd - 1;
                }
                skillCooldowns = nextCooldowns;
            }
            // 9. Level-up HP/Mana refill
            let finalPlayerHp = playerHp;
            let finalPlayerMaxHp = playerMaxHp;
            let newMana = student.mana;
            if (xpResult.leveledUp) {
                const lvStats = this.calculateCharacterStats(student.points, student.items, xpResult.level, student.jobClass, student.jobTier || "BASE", (_f = student.advanceClass) !== null && _f !== void 0 ? _f : null);
                newMana = lvStats.maxMp;
                finalPlayerHp = lvStats.hp;
                finalPlayerMaxHp = lvStats.hp;
            }
            const updatedFarming = {
                currentWave: nextWave,
                monster: newMonster,
                playerHp: finalPlayerHp,
                playerMaxHp: finalPlayerMaxHp,
                playerMaxMp: xpResult.leveledUp
                    ? this.calculateCharacterStats(student.points, student.items, xpResult.level, student.jobClass, student.jobTier || "BASE", (_g = student.advanceClass) !== null && _g !== void 0 ? _g : null).maxMp
                    : charStats.maxMp,
                activeEffects: Object.keys(activeEffects).length > 0 ? activeEffects : undefined,
                skillCooldowns: Object.keys(skillCooldowns).length > 0 ? skillCooldowns : undefined,
            };
            const updatedStats = { ...stats, farming: updatedFarming };
            // Unlock new skills if leveled up
            let updatedJobSkills;
            if (xpResult.leveledUp) {
                const eff = (0, job_system_1.resolveEffectiveJobKey)({
                    jobClass: student.jobClass,
                    jobTier: student.jobTier || "BASE",
                    advanceClass: (_h = student.advanceClass) !== null && _h !== void 0 ? _h : null,
                });
                const currentSkillIds = Array.isArray(student.jobSkills)
                    ? student.jobSkills
                    : [];
                const newSkills = (0, job_system_1.getNewlyUnlockedSkills)(eff, stats.level, xpResult.level, currentSkillIds);
                if (newSkills.length > 0) {
                    updatedJobSkills = [...currentSkillIds, ...newSkills];
                }
            }
            const data = {
                stamina: { decrement: 1 },
                mana: newMana,
                gameStats: (0, game_stats_1.toPrismaJson)(updatedStats),
                ...(updatedJobSkills ? { jobSkills: updatedJobSkills } : {}),
                history: {
                    create: {
                        reason: isDefeated ? `⚔️ กำจัดมอนสเตอร์ Wave ${farming.currentWave}` : "⚔️ โจมทีมอนสเตอร์",
                        value: 0
                    }
                }
            };
            if ((rewardLoot === null || rewardLoot === void 0 ? void 0 : rewardLoot.materials) && rewardLoot.materials.length > 0) {
                for (const mat of rewardLoot.materials) {
                    await db_1.db.material.upsert({
                        where: { studentId_type: { studentId, type: mat.type } },
                        update: { quantity: { increment: mat.quantity } },
                        create: { studentId, type: mat.type, quantity: mat.quantity }
                    });
                }
            }
            const finalStudent = await db_1.db.student.update({ where: { id: studentId }, data });
            return {
                success: true,
                damage,
                isCrit,
                poisonDamage,
                isDefeated,
                loot: rewardLoot,
                stamina: finalStudent.stamina,
                farming: updatedFarming,
                gold: this.parseGameStats(finalStudent.gameStats).gold,
                xp: this.parseGameStats(finalStudent.gameStats).xp,
                leveledUp: xpResult.leveledUp,
                newLevel: xpResult.level,
                mana: finalStudent.mana,
                monsterDamage,
                playerHp: finalPlayerHp,
                playerMaxHp: finalPlayerMaxHp,
                activeEffects: updatedFarming.activeEffects,
                skillCooldowns: updatedFarming.skillCooldowns,
                playerDied,
                deathPenaltyWave,
            };
        }
        catch (error) {
            console.error("[IdleEngine] Farming Attack Error:", error);
            return { error: "เกิดข้อผิดพลาดในการต่อสู้" };
        }
    }
    /**
     * Solo Farming: Use Skill on monster
     */
    static async useSkillOnMonster(studentId, skillId) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2;
        try {
            const { buildGlobalSkillMap } = require("./job-system");
            const baseSkill = buildGlobalSkillMap()[skillId];
            const student = await db_1.db.student.findUnique({
                where: { id: studentId },
                include: { items: { where: { isEquipped: true }, include: { item: true } } }
            });
            if (!student)
                return { error: "Student not found" };
            const stats = this.parseGameStats(student.gameStats);
            const rank = (0, skill_tree_1.getSkillRank)((_a = stats.skillTreeProgress) !== null && _a !== void 0 ? _a : {}, skillId);
            const skill = baseSkill ? (0, skill_tree_1.getEffectiveSkillAtRank)(baseSkill, rank) : undefined;
            if (!skill)
                return { error: "ไม่พบทักษะ" };
            const isAP = skill.costType === "AP";
            const currentResource = isAP ? student.stamina : student.mana;
            if (currentResource < skill.cost)
                return { error: "พลังงานไม่เพียงพอ" };
            const farming = this.getFarmingState(student);
            const monster = { ...farming.monster }; // mutable copy
            // Check skill cooldown
            let skillCooldowns = { ...((_b = farming.skillCooldowns) !== null && _b !== void 0 ? _b : {}) };
            const remainingCooldown = (_c = skillCooldowns[skillId]) !== null && _c !== void 0 ? _c : 0;
            if (remainingCooldown > 0)
                return { error: `สกิลยังไม่พร้อม (${remainingCooldown} เทิร์น)`, cooldownRemaining: remainingCooldown };
            const { StatCalculator } = require("./stat-calculator");
            const charStats = StatCalculator.compute(student.points, student.items, stats.level, student.jobClass, student.jobTier || "BASE", (_d = student.advanceClass) !== null && _d !== void 0 ? _d : null);
            // Initialize playerHp
            let playerHp = (_e = farming.playerHp) !== null && _e !== void 0 ? _e : charStats.hp;
            const playerMaxHp = (_f = farming.playerMaxHp) !== null && _f !== void 0 ? _f : charStats.hp;
            let activeEffects = { ...((_g = farming.activeEffects) !== null && _g !== void 0 ? _g : {}) };
            // Read active effect values for this turn
            let poisonDamage = 0;
            const atkBuffMulti = activeEffects.atkBuff ? activeEffects.atkBuff.multiplier : 1.0;
            const skillAtkDebuffReduction = activeEffects.atkDebuff ? activeEffects.atkDebuff.reduction : 0.0;
            const skillCritBonus = activeEffects.critBuff ? activeEffects.critBuff.bonus : 0.0;
            const skillDefBreakAmplify = activeEffects.defBreak ? activeEffects.defBreak.amplify : 0.0;
            const skillSlowSkipChance = activeEffects.slow ? activeEffects.slow.skipChance : 0.0;
            const skillIsStunned = !!(activeEffects.stun && activeEffects.stun.turnsLeft > 0);
            if (activeEffects.regen && activeEffects.regen.turnsLeft > 0) {
                playerHp = Math.min(playerMaxHp, playerHp + activeEffects.regen.healPerTurn);
            }
            if (activeEffects.poison && activeEffects.poison.turnsLeft > 0) {
                poisonDamage = activeEffects.poison.damagePerTurn;
                monster.hp = Math.max(0, monster.hp - poisonDamage);
            }
            // Apply skill effect by type
            let skillDamage = 0;
            let isForcedCrit = false;
            let healAmount = 0;
            let newEffectDescription = "";
            const effect = (_h = skill.effect) !== null && _h !== void 0 ? _h : "DAMAGE";
            switch (effect) {
                case "DAMAGE": {
                    const usesMag = skill.damageBase === "MAG";
                    const base = usesMag ? charStats.mag : charStats.atk;
                    const mult = (_j = skill.damageMultiplier) !== null && _j !== void 0 ? _j : (usesMag ? 2.5 : 1.5);
                    isForcedCrit = skill.isCrit === true || (!skill.isCrit && Math.random() < skillCritBonus);
                    skillDamage = Math.floor(base * mult * (isForcedCrit ? 2.0 : 1.0) * atkBuffMulti * (1 + skillDefBreakAmplify));
                    monster.hp = Math.max(0, monster.hp - skillDamage);
                    break;
                }
                case "POISON": {
                    const usesMag = skill.damageBase === "MAG";
                    const base = usesMag ? charStats.mag : charStats.atk;
                    const mult = (_k = skill.damageMultiplier) !== null && _k !== void 0 ? _k : 1.5;
                    isForcedCrit = skill.isCrit === true || (!skill.isCrit && Math.random() < skillCritBonus);
                    skillDamage = Math.floor(base * mult * (isForcedCrit ? 2.0 : 1.0) * atkBuffMulti * (1 + skillDefBreakAmplify));
                    monster.hp = Math.max(0, monster.hp - skillDamage);
                    activeEffects.poison = { damagePerTurn: Math.max(1, Math.floor(base * 0.15)), turnsLeft: 3 };
                    newEffectDescription = "☠️ วางยาพิษ 3 เทิร์น";
                    break;
                }
                case "BUFF_DEF":
                case "DEFEND": {
                    activeEffects.defBuff = { reduction: 0.5, turnsLeft: 2 };
                    newEffectDescription = "🛡️ ลดดาเมจ 50% (2 เทิร์น)";
                    break;
                }
                case "BUFF_ATK": {
                    activeEffects.atkBuff = { multiplier: 1.4, turnsLeft: 3 };
                    newEffectDescription = "⚔️ เพิ่ม ATK 40% (3 เทิร์น)";
                    break;
                }
                case "DEBUFF_ATK": {
                    const usesMag = skill.damageBase === "MAG";
                    const base = usesMag ? charStats.mag : charStats.atk;
                    const mult = (_l = skill.damageMultiplier) !== null && _l !== void 0 ? _l : 1.5;
                    skillDamage = Math.floor(base * mult * atkBuffMulti * (1 + skillDefBreakAmplify));
                    monster.hp = Math.max(0, monster.hp - skillDamage);
                    activeEffects.atkDebuff = { reduction: 0.30, turnsLeft: 2 };
                    newEffectDescription = "🌪️ ลดพลังโจมตีศัตรู 30% (2 เทิร์น)";
                    break;
                }
                case "CRIT_BUFF": {
                    activeEffects.critBuff = { bonus: 0.30, turnsLeft: 3 };
                    newEffectDescription = "🎯 เพิ่มโอกาส CRIT 30% (3 เทิร์น)";
                    break;
                }
                case "ARMOR_PIERCE": {
                    const mult = (_m = skill.damageMultiplier) !== null && _m !== void 0 ? _m : 2.5;
                    skillDamage = Math.floor(charStats.atk * mult * atkBuffMulti);
                    monster.hp = Math.max(0, monster.hp - skillDamage);
                    activeEffects.defBreak = { amplify: 0.20, turnsLeft: 3 };
                    newEffectDescription = "🔓 ทะลวงเกราะ รับดาเมจ +20% (3 เทิร์น)";
                    break;
                }
                case "HEAL": {
                    const mult = (_o = skill.damageMultiplier) !== null && _o !== void 0 ? _o : 1.5;
                    healAmount = Math.floor(charStats.mag * mult);
                    playerHp = Math.min(playerMaxHp, playerHp + healAmount);
                    newEffectDescription = `❤️ ฟื้นคืน HP ${healAmount.toLocaleString()}`;
                    break;
                }
                case "SLOW": {
                    const usesMag = skill.damageBase === "MAG";
                    const base = usesMag ? charStats.mag : charStats.atk;
                    const mult = (_p = skill.damageMultiplier) !== null && _p !== void 0 ? _p : 1.5;
                    skillDamage = Math.floor(base * mult * atkBuffMulti * (1 + skillDefBreakAmplify));
                    monster.hp = Math.max(0, monster.hp - skillDamage);
                    activeEffects.slow = { skipChance: 0.35, turnsLeft: 2 };
                    newEffectDescription = "🧊 ชะลอศัตรู 35% โอกาสไม่โจมตี (2 เทิร์น)";
                    break;
                }
                case "STUN": {
                    const usesMag = skill.damageBase === "MAG";
                    const base = usesMag ? charStats.mag : charStats.atk;
                    const mult = (_q = skill.damageMultiplier) !== null && _q !== void 0 ? _q : 1.5;
                    skillDamage = Math.floor(base * mult * atkBuffMulti * (1 + skillDefBreakAmplify));
                    monster.hp = Math.max(0, monster.hp - skillDamage);
                    if (Math.random() < 0.50) {
                        activeEffects.stun = { turnsLeft: 1 };
                        newEffectDescription = "⚡ สตัน! ศัตรูไม่โจมตีเทิร์นนี้";
                    }
                    else {
                        newEffectDescription = "⚡ ฟ้าผ่า — สตันพลาด";
                    }
                    break;
                }
                case "REGEN": {
                    const healPerTurn = Math.max(1, Math.floor(charStats.mag * 0.25));
                    activeEffects.regen = { healPerTurn, turnsLeft: 4 };
                    newEffectDescription = `💚 ฟื้นฟู ${healPerTurn.toLocaleString()} HP/เทิร์น (4 เทิร์น)`;
                    break;
                }
                case "LIFESTEAL": {
                    const usesMag = skill.damageBase === "MAG";
                    const base = usesMag ? charStats.mag : charStats.atk;
                    const mult = (_r = skill.damageMultiplier) !== null && _r !== void 0 ? _r : 1.5;
                    isForcedCrit = skill.isCrit === true || (!skill.isCrit && Math.random() < skillCritBonus);
                    skillDamage = Math.floor(base * mult * (isForcedCrit ? 2.0 : 1.0) * atkBuffMulti * (1 + skillDefBreakAmplify));
                    monster.hp = Math.max(0, monster.hp - skillDamage);
                    healAmount = Math.floor(skillDamage * 0.30);
                    playerHp = Math.min(playerMaxHp, playerHp + healAmount);
                    newEffectDescription = `🩸 ดูดเลือด ฟื้นคืน ${healAmount.toLocaleString()} HP`;
                    break;
                }
                case "EXECUTE": {
                    const hpPercent = monster.maxHp > 0 ? monster.hp / monster.maxHp : 1;
                    const execMult = hpPercent < 0.30 ? ((_s = skill.damageMultiplier) !== null && _s !== void 0 ? _s : 3.0) * 1.8 : ((_t = skill.damageMultiplier) !== null && _t !== void 0 ? _t : 3.0);
                    skillDamage = Math.floor(charStats.atk * execMult * atkBuffMulti * (1 + skillDefBreakAmplify));
                    monster.hp = Math.max(0, monster.hp - skillDamage);
                    newEffectDescription = hpPercent < 0.30 ? "💀 ประหาร! ดาเมจสูงสุด" : "🗡️ โจมตี";
                    break;
                }
                case "DEF_BREAK": {
                    const usesMag = skill.damageBase === "MAG";
                    const base = usesMag ? charStats.mag : charStats.atk;
                    const mult = (_u = skill.damageMultiplier) !== null && _u !== void 0 ? _u : 2.0;
                    skillDamage = Math.floor(base * mult * atkBuffMulti);
                    monster.hp = Math.max(0, monster.hp - skillDamage);
                    activeEffects.defBreak = { amplify: 0.50, turnsLeft: 3 };
                    newEffectDescription = "💢 ทำลายเกราะ รับดาเมจ +50% (3 เทิร์น)";
                    break;
                }
                case "MANA_SURGE": {
                    const mult = (_v = skill.damageMultiplier) !== null && _v !== void 0 ? _v : 2.7;
                    isForcedCrit = skill.isCrit === true || (!skill.isCrit && Math.random() < skillCritBonus);
                    skillDamage = Math.floor(charStats.mag * mult * (isForcedCrit ? 2.0 : 1.0) * atkBuffMulti * (1 + skillDefBreakAmplify));
                    monster.hp = Math.max(0, monster.hp - skillDamage);
                    healAmount = 10; // flag: treated as MP restore in finalMana calc below
                    newEffectDescription = "🔮 Mana Surge +10 MP";
                    break;
                }
                default: {
                    const usesMag = skill.damageBase === "MAG";
                    const base = usesMag ? charStats.mag : charStats.atk;
                    skillDamage = Math.floor(base * ((_w = skill.damageMultiplier) !== null && _w !== void 0 ? _w : 1.5) * atkBuffMulti * (1 + skillDefBreakAmplify));
                    monster.hp = Math.max(0, monster.hp - skillDamage);
                }
            }
            // Set skill cooldown after use
            let skillCd = (_y = (_x = skill.cooldown) !== null && _x !== void 0 ? _x : DEFAULT_COOLDOWN_BY_EFFECT[effect]) !== null && _y !== void 0 ? _y : 0;
            if (skillCd === 0) {
                // DAMAGE skills get cooldown based on multiplier strength
                const mult = (_z = skill.damageMultiplier) !== null && _z !== void 0 ? _z : 1.5;
                skillCd = mult < 1.5 ? 3 : mult < 2.0 ? 4 : mult < 2.5 ? 5 : mult < 3.0 ? 6 : mult < 3.5 ? 7 : 8;
            }
            if (skillCd > 0)
                skillCooldowns[skillId] = skillCd;
            // Per-skill XP (3× normal rate)
            const hitXp = Math.max(2, Math.floor(farming.currentWave * 0.5 * 3));
            let xpResult = this.calculateXpGain(stats, hitXp);
            stats.level = xpResult.level;
            stats.xp = xpResult.xp;
            // Handle Monster Defeat
            let rewardLoot = null;
            let nextWave = farming.currentWave;
            let newMonster = monster;
            let isDefeated = monster.hp <= 0;
            if (isDefeated) {
                activeEffects = {};
                rewardLoot = (0, farming_system_1.rollFarmingLoot)(farming.currentWave);
                nextWave++;
                newMonster = (0, farming_system_1.spawnSoloMonster)(stats.level, nextWave);
                stats.gold = (stats.gold || 0) + rewardLoot.gold;
                xpResult = this.calculateXpGain(stats, rewardLoot.xp);
                stats.xp = xpResult.xp;
                stats.level = xpResult.level;
            }
            // Monster Counter-Attack (slow/stun may skip it)
            let monsterDamage = 0;
            let playerDied = false;
            let deathPenaltyWave = 0;
            const skillSkipCounter = skillIsStunned || Math.random() < skillSlowSkipChance;
            if (!isDefeated && !skillSkipCounter) {
                const activeDefReduction = activeEffects.defBuff ? activeEffects.defBuff.reduction : 0.0;
                const rawDmg = Math.max(1, Math.floor(monster.atk * (1 - skillAtkDebuffReduction) - charStats.def * 0.4));
                monsterDamage = Math.max(1, Math.floor(rawDmg * (1 - activeDefReduction)));
                playerHp = Math.max(0, playerHp - monsterDamage);
                if (playerHp <= 0) {
                    playerDied = true;
                    // Death penalty: retreat 2 waves (minimum wave 1)
                    deathPenaltyWave = Math.max(1, Math.floor(farming.currentWave * 0.9));
                    nextWave = deathPenaltyWave;
                    newMonster = (0, farming_system_1.spawnSoloMonster)(stats.level, deathPenaltyWave);
                    activeEffects = {}; // clear all status effects on death
                    playerHp = Math.floor(playerMaxHp * 0.5); // respawn at 50% HP
                }
            }
            // Decrement effect turns
            if (!isDefeated) {
                const next = {};
                if (activeEffects.poison && activeEffects.poison.turnsLeft > 1)
                    next.poison = { ...activeEffects.poison, turnsLeft: activeEffects.poison.turnsLeft - 1 };
                if (activeEffects.atkBuff && activeEffects.atkBuff.turnsLeft > 1)
                    next.atkBuff = { ...activeEffects.atkBuff, turnsLeft: activeEffects.atkBuff.turnsLeft - 1 };
                if (activeEffects.defBuff && activeEffects.defBuff.turnsLeft > 1)
                    next.defBuff = { ...activeEffects.defBuff, turnsLeft: activeEffects.defBuff.turnsLeft - 1 };
                if (activeEffects.atkDebuff && activeEffects.atkDebuff.turnsLeft > 1)
                    next.atkDebuff = { ...activeEffects.atkDebuff, turnsLeft: activeEffects.atkDebuff.turnsLeft - 1 };
                if (activeEffects.critBuff && activeEffects.critBuff.turnsLeft > 1)
                    next.critBuff = { ...activeEffects.critBuff, turnsLeft: activeEffects.critBuff.turnsLeft - 1 };
                if (activeEffects.defBreak && activeEffects.defBreak.turnsLeft > 1)
                    next.defBreak = { ...activeEffects.defBreak, turnsLeft: activeEffects.defBreak.turnsLeft - 1 };
                if (activeEffects.slow && activeEffects.slow.turnsLeft > 1)
                    next.slow = { ...activeEffects.slow, turnsLeft: activeEffects.slow.turnsLeft - 1 };
                if (activeEffects.stun && activeEffects.stun.turnsLeft > 1)
                    next.stun = { turnsLeft: activeEffects.stun.turnsLeft - 1 };
                if (activeEffects.regen && activeEffects.regen.turnsLeft > 1)
                    next.regen = { ...activeEffects.regen, turnsLeft: activeEffects.regen.turnsLeft - 1 };
                activeEffects = next;
                // Decrement skill cooldowns
                const nextCooldowns = {};
                for (const [sid, cd] of Object.entries(skillCooldowns)) {
                    if (cd > 1)
                        nextCooldowns[sid] = cd - 1;
                }
                skillCooldowns = nextCooldowns;
            }
            // Resolve mana + level-up refill
            let finalPlayerHp = playerHp;
            let finalPlayerMaxHp = playerMaxHp;
            let finalMana;
            if (xpResult.leveledUp) {
                const lvStats = StatCalculator.compute(student.points, student.items, xpResult.level, student.jobClass, student.jobTier || "BASE", (_0 = student.advanceClass) !== null && _0 !== void 0 ? _0 : null);
                finalMana = lvStats.maxMp;
                finalPlayerHp = lvStats.hp;
                finalPlayerMaxHp = lvStats.hp;
            }
            else {
                const mpRestore = effect === "MANA_SURGE" ? 10 : 0;
                finalMana = isAP
                    ? Math.min(charStats.maxMp, student.mana + mpRestore)
                    : Math.min(charStats.maxMp, Math.max(0, student.mana - skill.cost + mpRestore));
                // MANA_SURGE healAmount was repurposed as flag — clear it
                if (effect === "MANA_SURGE")
                    healAmount = 0;
            }
            const updatedFarming = {
                currentWave: nextWave,
                monster: newMonster,
                playerHp: finalPlayerHp,
                playerMaxHp: finalPlayerMaxHp,
                playerMaxMp: xpResult.leveledUp
                    ? StatCalculator.compute(student.points, student.items, xpResult.level, student.jobClass, student.jobTier || "BASE", (_1 = student.advanceClass) !== null && _1 !== void 0 ? _1 : null).maxMp
                    : charStats.maxMp,
                activeEffects: Object.keys(activeEffects).length > 0 ? activeEffects : undefined,
                skillCooldowns: Object.keys(skillCooldowns).length > 0 ? skillCooldowns : undefined,
            };
            const updatedStats = { ...stats, farming: updatedFarming };
            // Unlock new skills if leveled up
            let updatedJobSkillsSkill;
            if (xpResult.leveledUp) {
                const eff = (0, job_system_1.resolveEffectiveJobKey)({
                    jobClass: student.jobClass,
                    jobTier: student.jobTier || "BASE",
                    advanceClass: (_2 = student.advanceClass) !== null && _2 !== void 0 ? _2 : null,
                });
                const currentSkillIds = Array.isArray(student.jobSkills)
                    ? student.jobSkills
                    : [];
                const newSkills = (0, job_system_1.getNewlyUnlockedSkills)(eff, stats.level, xpResult.level, currentSkillIds);
                if (newSkills.length > 0) {
                    updatedJobSkillsSkill = [...currentSkillIds, ...newSkills];
                }
            }
            const data = {
                mana: finalMana,
                gameStats: (0, game_stats_1.toPrismaJson)(updatedStats),
                ...(updatedJobSkillsSkill ? { jobSkills: updatedJobSkillsSkill } : {}),
                history: {
                    create: {
                        reason: `🔮 ใช้ทักษะ ${skill.name}${newEffectDescription ? ` — ${newEffectDescription}` : ""}`,
                        value: 0
                    }
                }
            };
            if (isAP)
                data.stamina = { decrement: skill.cost };
            if (rewardLoot === null || rewardLoot === void 0 ? void 0 : rewardLoot.materials) {
                for (const mat of rewardLoot.materials) {
                    await db_1.db.material.upsert({
                        where: { studentId_type: { studentId, type: mat.type } },
                        update: { quantity: { increment: mat.quantity } },
                        create: { studentId, type: mat.type, quantity: mat.quantity }
                    });
                }
            }
            const updatedStudent = await db_1.db.student.update({ where: { id: studentId }, data });
            return {
                success: true,
                damage: skillDamage,
                isCrit: isForcedCrit,
                poisonDamage,
                healAmount,
                effect,
                newEffectDescription,
                isDefeated,
                loot: rewardLoot,
                gold: this.parseGameStats(updatedStudent.gameStats).gold,
                xp: this.parseGameStats(updatedStudent.gameStats).xp,
                leveledUp: xpResult.leveledUp,
                newLevel: xpResult.level,
                mana: updatedStudent.mana,
                stamina: updatedStudent.stamina,
                farming: updatedFarming,
                monsterDamage,
                playerHp: finalPlayerHp,
                playerMaxHp: finalPlayerMaxHp,
                activeEffects: updatedFarming.activeEffects,
                skillCooldowns: updatedFarming.skillCooldowns,
                playerDied,
                deathPenaltyWave,
            };
        }
        catch (error) {
            console.error("[IdleEngine] Farming Skill Error:", error);
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
            },
            skillPointsAvailable: 0,
            skillPointsSpent: 0,
            skillTreeProgress: {},
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
