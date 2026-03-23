"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BattleTurnEngine = void 0;
exports.scaleMonsterHp = scaleMonsterHp;
exports.scaleMonsterAtk = scaleMonsterAtk;
const abstract_game_1 = require("./abstract-game");
const stat_calculator_1 = require("../game/stat-calculator");
const job_system_1 = require("../game/job-system");
const reward_manager_1 = require("../game/reward-manager");
const db_1 = require("../db");
// ─── Boss Config ──────────────────────────────────────────────────────────────
const BOSS_CONFIG = {
    id: "co-op-boss-01",
    name: "The Knowledge Devourer",
    baseBossHp: 5000,
    perPlayerHpBonus: 500,
    baseAtk: 80,
    attackIntervalMs: 15000,
};
// ─── Solo Monster Templates (scaled per level) ────────────────────────────────
const SOLO_MONSTER_TEMPLATES = [
    { name: "Slime", baseHp: 120, baseAtk: 15 },
    { name: "Goblin", baseHp: 180, baseAtk: 22 },
    { name: "Wolf", baseHp: 250, baseAtk: 30 },
    { name: "Orc", baseHp: 350, baseAtk: 40 },
    { name: "Troll", baseHp: 500, baseAtk: 55 },
    { name: "Dark Knight", baseHp: 700, baseAtk: 70 },
];
// ─── Loot Tables ─────────────────────────────────────────────────────────────
const COMMON_MATERIALS = ["Stone Fragment", "Wolf Fang", "Iron Ore", "Forest Herb"];
const RARE_MATERIALS = ["Dragon Scale", "Shadow Essence", "Thunder Crystal", "Void Shard"];
const EPIC_MATERIALS = ["Phoenix Feather", "Abyssal Core", "Celestial Dust"];
const LEGENDARY_MATERIALS = ["Ancient Relic"];
function rollMaterials(wave) {
    const drops = [];
    let pool;
    if (wave <= 3) {
        pool = COMMON_MATERIALS;
    }
    else if (wave <= 6) {
        pool = [...COMMON_MATERIALS, ...RARE_MATERIALS];
    }
    else if (wave <= 9) {
        pool = [...RARE_MATERIALS, ...EPIC_MATERIALS];
    }
    else {
        pool = [...EPIC_MATERIALS, ...LEGENDARY_MATERIALS];
    }
    // Roll 1-2 drops
    const count = Math.random() < 0.4 ? 2 : 1;
    for (let i = 0; i < count; i++) {
        const type = pool[Math.floor(Math.random() * pool.length)];
        const existing = drops.find((d) => d.type === type);
        if (existing) {
            existing.quantity++;
        }
        else {
            drops.push({ type, quantity: 1 });
        }
    }
    return drops;
}
function rollGold(wave) {
    const base = 20 + wave * 10;
    return base + Math.floor(Math.random() * base);
}
function rollXp(wave) {
    return 10 + wave * 5;
}
// ─── Wave Scaling (7.10) ──────────────────────────────────────────────────────
/**
 * Scale monster HP: baseHp × (1 + wave × 0.15)
 * Scale monster ATK: baseAtk × (1 + wave × 0.10)
 */
function scaleMonsterHp(baseHp, wave) {
    return Math.floor(baseHp * (1 + wave * 0.15));
}
function scaleMonsterAtk(baseAtk, wave) {
    return Math.floor(baseAtk * (1 + wave * 0.10));
}
function spawnSoloMonster(level, wave) {
    // Pick template based on level bracket
    const templateIdx = Math.min(Math.floor((level - 1) / 10), SOLO_MONSTER_TEMPLATES.length - 1);
    const template = SOLO_MONSTER_TEMPLATES[templateIdx];
    const hp = scaleMonsterHp(template.baseHp, wave);
    const atk = scaleMonsterAtk(template.baseAtk, wave);
    return { name: template.name, hp, maxHp: hp, atk, wave };
}
// ─── Default SOLO_FARMING timer ───────────────────────────────────────────────
const DEFAULT_SOLO_FARMING_MS = 5 * 60 * 1000; // 5 minutes
// ─── BattleTurnEngine ─────────────────────────────────────────────────────────
class BattleTurnEngine extends abstract_game_1.AbstractGameEngine {
    constructor(pin, hostId, setId, settings, questions, io, soloFarmingDurationMs = DEFAULT_SOLO_FARMING_MS) {
        super(pin, hostId, setId, settings, questions, io);
        this.gameMode = "BATTLE_TURN";
        this.players = [];
        this.battlePhase = "LOBBY";
        this.boss = null;
        this.bossTickInterval = null;
        this.soloFarmingTimer = null;
        this.soloFarmingDurationMs = soloFarmingDurationMs;
    }
    // ── Phase Helpers ────────────────────────────────────────────────────────────
    transitionTo(phase) {
        this.battlePhase = phase;
        this.io.to(this.pin).emit("battle-state", this.buildBattleState());
    }
    buildBattleState() {
        return {
            phase: this.battlePhase,
            players: this.players,
            boss: this.boss,
        };
    }
    statusUpdate() {
        this.io.to(this.pin).emit("battle-state", this.buildBattleState());
    }
    // ── Player Management ────────────────────────────────────────────────────────
    addPlayer(player, socket) {
        var _a, _b, _c, _d, _e, _f;
        const battlePlayer = {
            id: socket.id,
            name: (_a = player.name) !== null && _a !== void 0 ? _a : "Unknown",
            avatar: player.avatar,
            isConnected: true,
            score: (_b = player.score) !== null && _b !== void 0 ? _b : 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            // Stats will be populated in PREP phase
            hp: 100,
            maxHp: 100,
            ap: 0,
            maxAp: 100,
            mp: 0,
            maxMp: 50,
            atk: 10,
            def: 5,
            spd: 10,
            crit: 0.05,
            luck: 0.01,
            mag: 5,
            level: (_c = player.level) !== null && _c !== void 0 ? _c : 1,
            skills: [],
            isDefending: false,
            jobClass: (_d = player.jobClass) !== null && _d !== void 0 ? _d : null,
            jobTier: (_e = player.jobTier) !== null && _e !== void 0 ? _e : "BASE",
            wave: 1,
            soloMonster: null,
            studentId: (_f = player.studentId) !== null && _f !== void 0 ? _f : "",
            immortalUsed: false,
            hasLifesteal: false,
            hasImmortal: false,
            hasManaFlow: false,
            hasTimeWarp: false,
            earnedGold: 0,
            earnedXp: 0,
            itemDrops: [],
            materialDrops: [],
        };
        const existingIdx = this.players.findIndex((p) => p.studentId === battlePlayer.studentId && battlePlayer.studentId !== "");
        if (existingIdx !== -1) {
            this.players[existingIdx].id = socket.id;
            this.players[existingIdx].isConnected = true;
        }
        else {
            this.players.push(battlePlayer);
        }
        this.statusUpdate();
    }
    // ── Game Start ───────────────────────────────────────────────────────────────
    startGame() {
        super.startGame();
        this.startPrepPhase();
    }
    // ── 7.2 PREP Phase ───────────────────────────────────────────────────────────
    async startPrepPhase() {
        this.transitionTo("PREP");
        await Promise.all(this.players.map((player) => this.loadPlayerStats(player)));
        this.startBossRaidPhase();
    }
    async loadPlayerStats(player) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        if (!player.studentId)
            return;
        try {
            const student = await db_1.db.student.findUnique({
                where: { id: player.studentId },
                select: {
                    points: true,
                    gameStats: true,
                    jobClass: true,
                    jobTier: true,
                    jobSkills: true,
                    items: {
                        where: { isEquipped: true },
                        include: { item: true },
                    },
                },
            });
            if (!student)
                return;
            const gameStats = (_a = student.gameStats) !== null && _a !== void 0 ? _a : {};
            const level = (_b = gameStats.level) !== null && _b !== void 0 ? _b : 1;
            const stats = stat_calculator_1.StatCalculator.compute((_c = student.points) !== null && _c !== void 0 ? _c : 0, (_d = student.items) !== null && _d !== void 0 ? _d : [], level, (_e = student.jobClass) !== null && _e !== void 0 ? _e : null, (_f = student.jobTier) !== null && _f !== void 0 ? _f : "BASE");
            // Populate BattlePlayer fields
            player.hp = stats.hp;
            player.maxHp = stats.hp;
            player.mp = stats.maxMp;
            player.maxMp = stats.maxMp;
            player.atk = stats.atk;
            player.def = stats.def;
            player.spd = stats.spd;
            player.crit = stats.crit;
            player.luck = stats.luck;
            player.mag = stats.mag;
            player.level = level;
            player.jobClass = (_g = student.jobClass) !== null && _g !== void 0 ? _g : null;
            player.jobTier = (_h = student.jobTier) !== null && _h !== void 0 ? _h : "BASE";
            // 8.1–8.4: Populate special effect flags from equipped items
            player.hasLifesteal = stats.hasLifesteal;
            player.hasImmortal = stats.hasImmortal;
            player.hasManaFlow = stats.hasManaFlow;
            player.hasTimeWarp = stats.hasTimeWarp;
            // Load skills from jobSkills JSON
            const rawSkills = student.jobSkills;
            if (Array.isArray(rawSkills)) {
                player.skills = rawSkills;
            }
            else if (rawSkills && typeof rawSkills === "object") {
                player.skills = Object.values(rawSkills);
            }
            else {
                // Fallback: derive from job class definition
                const jobKey = ((_j = student.jobClass) !== null && _j !== void 0 ? _j : "NOVICE").toUpperCase();
                const classDef = job_system_1.JOB_CLASSES[jobKey];
                if (classDef) {
                    player.skills = classDef.skills
                        .filter((s) => s.unlockLevel <= level)
                        .map((s) => s.id);
                }
            }
        }
        catch (err) {
            console.error(`[BattleTurnEngine] Failed to load stats for player ${player.studentId}:`, err);
        }
    }
    // ── 7.3 CO_OP_BOSS_RAID Phase ────────────────────────────────────────────────
    startBossRaidPhase() {
        const playerCount = this.players.length;
        const maxHp = BOSS_CONFIG.baseBossHp + playerCount * BOSS_CONFIG.perPlayerHpBonus;
        // 8.4 Time Warp: reduce attack interval by 3000ms per player with Time Warp (min 5000ms)
        const timeWarpCount = this.players.filter((p) => p.hasTimeWarp).length;
        const attackIntervalMs = Math.max(5000, BOSS_CONFIG.attackIntervalMs - timeWarpCount * 3000);
        this.boss = {
            id: BOSS_CONFIG.id,
            name: BOSS_CONFIG.name,
            hp: maxHp,
            maxHp,
            atk: BOSS_CONFIG.baseAtk,
            lastAttackTick: Date.now(),
            attackIntervalMs,
        };
        this.transitionTo("CO_OP_BOSS_RAID");
        // Start boss attack tick using the (possibly reduced) interval
        this.bossTickInterval = setInterval(() => this.executeBossAttackTick(), attackIntervalMs);
    }
    // ── 7.4 Boss Attack Tick ─────────────────────────────────────────────────────
    executeBossAttackTick() {
        if (!this.boss || this.battlePhase !== "CO_OP_BOSS_RAID")
            return;
        this.boss.lastAttackTick = Date.now();
        for (const player of this.players) {
            if (!player.isConnected)
                continue;
            if (player.isDefending)
                continue;
            if (player.hp <= 0)
                continue;
            const damage = Math.max(1, this.boss.atk - player.def);
            player.hp = Math.max(0, player.hp - damage);
            // 8.2 Immortal: if HP would reach 0 and immortal hasn't been used, set to 1
            if (player.hp <= 0 && player.hasImmortal && !player.immortalUsed) {
                player.hp = 1;
                player.immortalUsed = true;
            }
            // Emit player-damaged to that player's socket
            this.io.to(player.id).emit("player-damaged", {
                playerId: player.id,
                damage,
                remainingHp: player.hp,
            });
            // Handle player death
            if (player.hp <= 0) {
                if (!player.immortalUsed) {
                    // Immortal effect handled in task 8 — for now just mark defeated
                }
            }
        }
        // Reset all isDefending flags
        for (const player of this.players) {
            player.isDefending = false;
        }
        // Emit boss-damaged to room (tick summary)
        this.io.to(this.pin).emit("boss-damaged", {
            currentHp: this.boss.hp,
            maxHp: this.boss.maxHp,
            lastAttackerId: null,
        });
        this.statusUpdate();
    }
    // ── 7.5 battle-action Handler ────────────────────────────────────────────────
    handleBattleAction(player, payload, socket) {
        if (this.battlePhase !== "CO_OP_BOSS_RAID") {
            socket.emit("error", { message: "Battle actions only allowed during CO_OP_BOSS_RAID phase." });
            return;
        }
        if (!this.boss)
            return;
        const { type, skillId } = payload;
        if (!type) {
            socket.emit("error", { message: "Missing action type." });
            return;
        }
        if (type === "ATTACK") {
            if (player.ap < 10) {
                socket.emit("error", { message: "Insufficient AP for ATTACK (requires 10 AP)." });
                return;
            }
            player.ap -= 10;
            const damage = player.atk; // base damage coefficient 1.0
            this.applyDamageToBoss(damage, player.id);
        }
        else if (type === "DEFEND") {
            player.isDefending = true;
            this.statusUpdate();
        }
        else if (type === "SKILL") {
            if (!skillId) {
                socket.emit("error", { message: "Missing skillId for SKILL action." });
                return;
            }
            if (!player.skills.includes(skillId)) {
                socket.emit("error", { message: `Skill ${skillId} is not unlocked.` });
                return;
            }
            this.executeSkillOnBoss(player, skillId, socket);
        }
        else {
            socket.emit("error", { message: `Unknown action type: ${type}` });
        }
    }
    applyDamageToBoss(damage, attackerId) {
        if (!this.boss)
            return;
        this.boss.hp = Math.max(0, this.boss.hp - damage);
        // 8.1 Lifesteal: heal attacker by 10% of damage dealt
        const attacker = this.players.find((p) => p.id === attackerId);
        if (attacker && attacker.hasLifesteal) {
            const healAmount = Math.max(1, Math.floor(damage * 0.1));
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
            this.io.to(attacker.id).emit("battle-event", {
                type: "HEAL",
                sourceId: attackerId,
                targetId: attackerId,
                value: healAmount,
            });
        }
        this.io.to(this.pin).emit("boss-damaged", {
            currentHp: this.boss.hp,
            maxHp: this.boss.maxHp,
            lastAttackerId: attackerId,
        });
        if (this.boss.hp <= 0) {
            this.handleBossDefeated();
        }
        else {
            this.statusUpdate();
        }
    }
    executeSkillOnBoss(player, skillId, socket) {
        var _a;
        // Find skill definition from job class
        const jobKey = ((_a = player.jobClass) !== null && _a !== void 0 ? _a : "NOVICE").toUpperCase();
        const classDef = job_system_1.JOB_CLASSES[jobKey];
        const skill = classDef === null || classDef === void 0 ? void 0 : classDef.skills.find((s) => s.id === skillId);
        if (!skill) {
            socket.emit("error", { message: `Skill definition not found for ${skillId}.` });
            return;
        }
        // Check resource
        if (skill.costType === "AP") {
            if (player.ap < skill.cost) {
                socket.emit("error", { message: `Insufficient AP for ${skill.name} (requires ${skill.cost} AP).` });
                return;
            }
            player.ap -= skill.cost;
        }
        else if (skill.costType === "MP") {
            if (player.mp < skill.cost) {
                socket.emit("error", { message: `Insufficient MP for ${skill.name} (requires ${skill.cost} MP).` });
                return;
            }
            player.mp -= skill.cost;
        }
        // Execute skill effect against boss
        let damage = 0;
        if (skill.effect === "DAMAGE") {
            // Simple damage multiplier based on skill cost tier
            const multiplier = 1 + skill.cost / 20;
            damage = Math.floor(player.atk * multiplier);
            this.applyDamageToBoss(damage, player.id);
        }
        else if (skill.effect === "BUFF_DEF") {
            player.isDefending = true;
        }
        else if (skill.effect === "BUFF_ATK") {
            // War Cry etc — simplified: deal bonus damage
            damage = Math.floor(player.atk * 0.5);
            this.applyDamageToBoss(damage, player.id);
        }
        else if (skill.effect === "HEAL") {
            const healAmount = Math.floor(player.mag * 1.5);
            player.hp = Math.min(player.maxHp, player.hp + healAmount);
        }
        this.statusUpdate();
    }
    // ── 7.6 Boss Defeat ──────────────────────────────────────────────────────────
    handleBossDefeated() {
        if (this.bossTickInterval) {
            clearInterval(this.bossTickInterval);
            this.bossTickInterval = null;
        }
        const rewards = this.players.map((p) => ({
            playerId: p.id,
            playerName: p.name,
            gold: 200,
            xp: 50,
        }));
        // Queue boss rewards for RESULT phase
        for (const player of this.players) {
            player.earnedGold += 200;
            player.earnedXp += 50;
        }
        this.io.to(this.pin).emit("boss-defeated", { rewards });
        this.startSoloFarmingPhase();
    }
    // ── 7.7 SOLO_FARMING Phase ───────────────────────────────────────────────────
    startSoloFarmingPhase() {
        // Assign each player a solo monster at wave 1
        for (const player of this.players) {
            player.wave = 1;
            player.soloMonster = spawnSoloMonster(player.level, player.wave);
            player.ap = 0; // Reset AP for farming phase
            this.io.to(player.id).emit("farming-state", {
                wave: player.wave,
                monster: player.soloMonster,
                ap: player.ap,
                mp: player.mp,
            });
        }
        this.transitionTo("SOLO_FARMING");
        // 7.11 Phase timer — default 5 minutes
        this.soloFarmingTimer = setTimeout(() => this.startResultPhase(), this.soloFarmingDurationMs);
    }
    // ── 7.8 Correct-Answer Handler in SOLO_FARMING ───────────────────────────────
    handleCorrectAnswerInFarming(player) {
        if (!player.soloMonster)
            return;
        // Auto-deal player.atk damage to soloMonster
        const damage = player.atk;
        player.soloMonster.hp = Math.max(0, player.soloMonster.hp - damage);
        if (player.soloMonster.hp <= 0) {
            this.handleMonsterDefeated(player);
        }
        else {
            this.io.to(player.id).emit("farming-state", {
                wave: player.wave,
                monster: player.soloMonster,
                ap: player.ap,
                mp: player.mp,
            });
        }
    }
    // ── 7.9 Monster Defeat ───────────────────────────────────────────────────────
    handleMonsterDefeated(player) {
        const wave = player.wave;
        const materials = rollMaterials(wave);
        const gold = rollGold(wave);
        const xp = rollXp(wave);
        // Accumulate rewards
        player.earnedGold += gold;
        player.earnedXp += xp;
        for (const mat of materials) {
            const existing = player.materialDrops.find((m) => m.type === mat.type);
            if (existing) {
                existing.quantity += mat.quantity;
            }
            else {
                player.materialDrops.push({ ...mat });
            }
        }
        const loot = {
            gold,
            xp,
            itemIds: [],
            materials,
        };
        const nextWave = wave + 1;
        this.io.to(player.id).emit("monster-defeated", {
            loot,
            nextWave,
        });
        // Spawn next wave monster
        player.wave = nextWave;
        player.soloMonster = spawnSoloMonster(player.level, nextWave);
        this.io.to(player.id).emit("next-wave", {
            wave: nextWave,
            monster: player.soloMonster,
        });
        this.io.to(player.id).emit("farming-state", {
            wave: player.wave,
            monster: player.soloMonster,
            ap: player.ap,
            mp: player.mp,
        });
    }
    // ── farming-action Handler ───────────────────────────────────────────────────
    handleFarmingAction(player, payload, socket) {
        if (this.battlePhase !== "SOLO_FARMING") {
            socket.emit("error", { message: "Farming actions only allowed during SOLO_FARMING phase." });
            return;
        }
        const { type, skillId } = payload;
        if (type === "SKILL") {
            if (!skillId) {
                socket.emit("error", { message: "Missing skillId for SKILL farming action." });
                return;
            }
            if (!player.skills.includes(skillId)) {
                socket.emit("error", { message: `Skill ${skillId} is not unlocked.` });
                return;
            }
            this.executeSkillOnMonster(player, skillId, socket);
        }
        else {
            socket.emit("error", { message: `Unknown farming action type: ${type}` });
        }
    }
    executeSkillOnMonster(player, skillId, socket) {
        var _a;
        if (!player.soloMonster)
            return;
        const jobKey = ((_a = player.jobClass) !== null && _a !== void 0 ? _a : "NOVICE").toUpperCase();
        const classDef = job_system_1.JOB_CLASSES[jobKey];
        const skill = classDef === null || classDef === void 0 ? void 0 : classDef.skills.find((s) => s.id === skillId);
        if (!skill) {
            socket.emit("error", { message: `Skill definition not found for ${skillId}.` });
            return;
        }
        if (skill.costType === "AP") {
            if (player.ap < skill.cost) {
                socket.emit("error", { message: `Insufficient AP for ${skill.name}.` });
                return;
            }
            player.ap -= skill.cost;
        }
        else if (skill.costType === "MP") {
            if (player.mp < skill.cost) {
                socket.emit("error", { message: `Insufficient MP for ${skill.name}.` });
                return;
            }
            player.mp -= skill.cost;
        }
        if (skill.effect === "DAMAGE") {
            const multiplier = 1 + skill.cost / 20;
            const damage = Math.floor(player.atk * multiplier);
            player.soloMonster.hp = Math.max(0, player.soloMonster.hp - damage);
            if (player.soloMonster.hp <= 0) {
                this.handleMonsterDefeated(player);
                return;
            }
        }
        else if (skill.effect === "HEAL") {
            const healAmount = Math.floor(player.mag * 1.5);
            player.hp = Math.min(player.maxHp, player.hp + healAmount);
        }
        this.io.to(player.id).emit("farming-state", {
            wave: player.wave,
            monster: player.soloMonster,
            ap: player.ap,
            mp: player.mp,
        });
    }
    // ── 7.11 RESULT Phase ────────────────────────────────────────────────────────
    async startResultPhase() {
        if (this.soloFarmingTimer) {
            clearTimeout(this.soloFarmingTimer);
            this.soloFarmingTimer = null;
        }
        if (this.bossTickInterval) {
            clearInterval(this.bossTickInterval);
            this.bossTickInterval = null;
        }
        this.transitionTo("RESULT");
        // Persist rewards and emit battle-ended (Requirement 15.5, 15.6)
        const finalRewards = await reward_manager_1.RewardManager.persistRewards(this.players);
        const hasError = finalRewards.some((r) => r.error === true);
        this.io.to(this.pin).emit("battle-ended", {
            players: finalRewards,
            ...(hasError ? { error: true } : {}),
        });
        super.endGame();
    }
    endGame() {
        // battle-ended is emitted in startResultPhase via RewardManager.
        super.endGame();
    }
    // ── Event Router ─────────────────────────────────────────────────────────────
    handleEvent(eventName, payload, socket) {
        if (!payload || typeof payload !== "object") {
            socket.emit("error", { message: `Invalid payload for event: ${eventName}` });
            return;
        }
        const player = this.players.find((p) => p.id === socket.id);
        switch (eventName) {
            case "start-battle":
                if (socket.id === this.hostId) {
                    this.startGame();
                }
                break;
            case "submit-answer":
                if (player)
                    this.handleSubmitAnswer(player, payload, socket);
                break;
            case "battle-action":
                if (player)
                    this.handleBattleAction(player, payload, socket);
                break;
            case "farming-action":
                if (player)
                    this.handleFarmingAction(player, payload, socket);
                break;
            case "request-question":
                this.handleRequestQuestion(socket);
                break;
            default:
                break;
        }
    }
    // ── Answer Handler ───────────────────────────────────────────────────────────
    handleSubmitAnswer(player, payload, socket) {
        const { questionId, answerIndex } = payload;
        if (questionId === undefined || answerIndex === undefined) {
            socket.emit("error", { message: "Missing questionId or answerIndex." });
            return;
        }
        const question = this.questions.find((q) => q.id === questionId);
        if (!question)
            return;
        const isCorrect = question.correctAnswer === answerIndex;
        if (isCorrect) {
            player.correctAnswers++;
            // Grant 20 AP, capped at maxAp
            player.ap = Math.min(player.maxAp, player.ap + 20);
            // 8.3 Mana Flow: increment mp by 5 on correct answer
            if (player.hasManaFlow) {
                player.mp = Math.min(player.maxMp, player.mp + 5);
            }
            socket.emit("answer-result", { correct: true, apGain: 20 });
            // In SOLO_FARMING, auto-deal damage
            if (this.battlePhase === "SOLO_FARMING") {
                this.handleCorrectAnswerInFarming(player);
            }
        }
        else {
            player.incorrectAnswers++;
            socket.emit("answer-result", { correct: false });
        }
        this.statusUpdate();
    }
    handleRequestQuestion(socket) {
        if (!this.questions || this.questions.length === 0)
            return;
        const q = this.questions[Math.floor(Math.random() * this.questions.length)];
        socket.emit("next-question", {
            id: q.id,
            question: q.question,
            options: q.options,
            image: q.image,
        });
    }
    // ── Tick ─────────────────────────────────────────────────────────────────────
    tick() {
        // Boss tick is handled by setInterval; no additional tick logic needed here
    }
    // ── Serialization ────────────────────────────────────────────────────────────
    serialize() {
        return {
            ...super.serialize(),
            battlePhase: this.battlePhase,
            boss: this.boss,
        };
    }
    restore(data) {
        var _a, _b;
        super.restore(data);
        this.battlePhase = (_a = data.battlePhase) !== null && _a !== void 0 ? _a : "LOBBY";
        this.boss = (_b = data.boss) !== null && _b !== void 0 ? _b : null;
    }
    // ── Cleanup ──────────────────────────────────────────────────────────────────
    cleanup() {
        if (this.bossTickInterval) {
            clearInterval(this.bossTickInterval);
            this.bossTickInterval = null;
        }
        if (this.soloFarmingTimer) {
            clearTimeout(this.soloFarmingTimer);
            this.soloFarmingTimer = null;
        }
    }
}
exports.BattleTurnEngine = BattleTurnEngine;
