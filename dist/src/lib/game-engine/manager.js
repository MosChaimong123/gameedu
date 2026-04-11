"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameManager = void 0;
const gold_quest_engine_1 = require("./gold-quest-engine");
const crypto_hack_engine_1 = require("./crypto-hack-engine");
const negamon_battle_engine_1 = require("./negamon-battle-engine");
const db_1 = require("../db");
const prisma_json_1 = require("../prisma-json");
const sync_negamon_battle_rewards_1 = require("../negamon/sync-negamon-battle-rewards");
function isGameQuestion(value) {
    if (!value || typeof value !== "object")
        return false;
    const candidate = value;
    return (typeof candidate.id === "string" &&
        typeof candidate.question === "string" &&
        Array.isArray(candidate.options) &&
        typeof candidate.correctAnswer === "number");
}
function parseQuestions(value) {
    return Array.isArray(value) ? value.filter(isGameQuestion) : [];
}
function parseSettings(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
}
function parseRequiredSettings(value) {
    return parseSettings(value);
}
class GameManager {
    constructor() {
        this.loopInterval = null;
        this.io = null;
        this.games = new Map();
        this.startGameLoop();
    }
    static getInstance() {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager();
        }
        return GameManager.instance;
    }
    createGame(mode, pin, hostId, setId, settings, questions, io) {
        let game;
        if (mode === "GOLD_QUEST") {
            game = new gold_quest_engine_1.GoldQuestEngine(pin, hostId, setId, settings, questions, io);
        }
        else if (mode === "CRYPTO_HACK") {
            game = new crypto_hack_engine_1.CryptoHackEngine(pin, hostId, setId, settings, questions, io);
        }
        else if (mode === "NEGAMON_BATTLE") {
            game = new negamon_battle_engine_1.NegamonBattleEngine(pin, hostId, setId, settings, questions, io);
        }
        else {
            // CLASSIC or unknown → Gold Quest
            game = new gold_quest_engine_1.GoldQuestEngine(pin, hostId, setId, settings, questions, io);
        }
        this.games.set(pin, game);
        this.saveGame(game); // Initial Save
        console.log(`[GameManager] Created game ${pin} (Mode: ${mode})`);
        return game;
    }
    getGame(pin) {
        return this.games.get(pin);
    }
    findGameBySocket(socketId) {
        for (const game of this.games.values()) {
            if (game.getPlayer(socketId)) {
                return game;
            }
        }
        return undefined;
    }
    findGameByHostSocket(socketId) {
        for (const game of this.games.values()) {
            if (game.isHostSocket(socketId)) {
                return game;
            }
        }
        return undefined;
    }
    removeGame(pin) {
        this.games.delete(pin);
        this.deleteGameOnDb(pin);
        console.log(`[GameManager] Removed game ${pin}`);
    }
    setIO(io) {
        this.io = io;
        for (const game of this.games.values()) {
            game.setIO(io);
        }
    }
    // --- Persistence ---
    async saveGameToHistory(game) {
        if (!game.startTime || game.hasArchived)
            return;
        try {
            await db_1.db.gameHistory.create({
                data: {
                    hostId: game.hostId,
                    setId: game.setId,
                    gameMode: game.gameMode,
                    pin: game.pin,
                    startedAt: new Date(game.startTime),
                    endedAt: new Date(game.endTime || Date.now()),
                    settings: (0, prisma_json_1.toPrismaJson)(game.settings),
                    players: (0, prisma_json_1.toPrismaJson)(game.players)
                }
            });
            console.log(`[Persistence] History archived for game ${game.pin}`);
            game.hasArchived = true;
        }
        catch (err) {
            console.error(`[Persistence] Failed to archive history for ${game.pin}`, err);
        }
    }
    async saveGame(game) {
        // ... (existing save logic)
        try {
            const data = game.serialize();
            await db_1.db.activeGame.upsert({
                where: { pin: game.pin },
                update: {
                    state: data.state === undefined ? undefined : (0, prisma_json_1.toPrismaJson)(data.state),
                    players: (0, prisma_json_1.toPrismaJson)(data.players),
                    settings: (0, prisma_json_1.toPrismaJson)(data.settings),
                    startTime: data.startTime ? new Date(data.startTime) : null,
                },
                create: {
                    pin: game.pin,
                    gameMode: game.gameMode, // Dynamic game mode
                    hostId: game.hostId,
                    settings: (0, prisma_json_1.toPrismaJson)(data.settings),
                    players: (0, prisma_json_1.toPrismaJson)(data.players),
                    questions: (0, prisma_json_1.toPrismaJson)(data.questions),
                    startTime: data.startTime ? new Date(data.startTime) : null,
                    state: data.state === undefined ? undefined : (0, prisma_json_1.toPrismaJson)(data.state)
                }
            });
        }
        catch (err) {
            console.error(`[Persistence] Failed to save game ${game.pin}`, err);
        }
    }
    async deleteGameOnDb(pin) {
        try {
            await db_1.db.activeGame.delete({ where: { pin } }).catch(() => { });
        }
        catch {
            // Ignore error if already deleted
        }
    }
    async recoverGames() {
        var _a;
        console.log("[Persistence] Recovering games...");
        try {
            // Battle RPG mode removed — drop any persisted sessions
            const removedBattle = await db_1.db.activeGame.deleteMany({
                where: { gameMode: "BATTLE_TURN" },
            });
            if (removedBattle.count > 0) {
                console.log(`[Persistence] Removed ${removedBattle.count} BATTLE_TURN game(s)`);
            }
            // Auto-delete stale games older than 24 hours
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const stale = await db_1.db.activeGame.deleteMany({ where: { updatedAt: { lt: cutoff } } });
            if (stale.count > 0)
                console.log(`[Persistence] Cleaned up ${stale.count} stale game(s)`);
            const activeGames = await db_1.db.activeGame.findMany();
            for (const record of activeGames) {
                if (this.games.has(record.pin))
                    continue;
                let game;
                if (record.gameMode === "CRYPTO_HACK") {
                    game = new crypto_hack_engine_1.CryptoHackEngine(record.pin, record.hostId, "", parseRequiredSettings(record.settings), parseQuestions(record.questions), null);
                }
                else if (record.gameMode === "NEGAMON_BATTLE") {
                    game = new negamon_battle_engine_1.NegamonBattleEngine(record.pin, record.hostId, "", parseSettings(record.settings), parseQuestions(record.questions), null);
                }
                else {
                    // Default to Gold Quest
                    game = new gold_quest_engine_1.GoldQuestEngine(record.pin, record.hostId, "", parseSettings(record.settings), parseQuestions(record.questions), null);
                }
                // restore data
                const persistedRecord = {
                    pin: record.pin,
                    hostId: record.hostId,
                    setId: "",
                    status: "PLAYING",
                    settings: parseSettings(record.settings),
                    players: [],
                    questions: parseQuestions(record.questions),
                    startTime: (_a = record.startTime) === null || _a === void 0 ? void 0 : _a.toISOString(),
                    state: record.state,
                };
                if (Array.isArray(record.players)) {
                    persistedRecord.players = record.players;
                }
                game.restore(persistedRecord);
                this.games.set(record.pin, game);
                console.log(`[Persistence] Recovered game ${record.pin} (${record.gameMode})`);
            }
        }
        catch (err) {
            console.error("[Persistence] Recovery failed", err);
        }
    }
    // --- Global Loop ---
    startGameLoop() {
        if (this.loopInterval)
            return;
        let tickCount = 0;
        this.loopInterval = setInterval(() => {
            const now = Date.now();
            tickCount++;
            for (const [pin, game] of this.games.entries()) {
                // 1. Tick logic
                try {
                    game.tick();
                }
                catch (e) {
                    console.error(`[GameManager] Error ticking game ${pin}`, e);
                }
                // 2. Negamon live battle → classroom EXP (once, if host linked a classroom)
                // ตั้ง flag ก่อน call async เพื่อป้องกัน tick ถัดไป trigger ซ้ำ (race condition)
                if (game.status === "ENDED" &&
                    game.gameMode === "NEGAMON_BATTLE" &&
                    game.settings.negamonRewardClassroomId &&
                    !game.negamonClassroomRewardsSynced) {
                    game.negamonClassroomRewardsSynced = true;
                    void (0, sync_negamon_battle_rewards_1.syncNegamonBattleRewardsToClassroom)(game)
                        .catch((err) => {
                        console.error(`[GameManager] Negamon classroom rewards failed for ${game.pin}`, err);
                        // ไม่ reset flag — EXP อาจบันทึกบางส่วนแล้ว การ retry จะทำให้ double EXP
                    });
                }
                // 3. Check for End & Archive
                if (game.status === "ENDED" && !game.hasArchived) {
                    this.saveGameToHistory(game);
                }
                // 4. Cleanup Stale Games
                if (game.status === "ENDED" && game.endTime && (now - game.endTime > 5 * 60 * 1000)) {
                    this.removeGame(pin);
                }
                // 5. Persistence Snapshot (Every 5 seconds)
                if (tickCount % 5 === 0 && game.status === "PLAYING") {
                    this.saveGame(game);
                }
            }
        }, 1000);
        console.log("[GameManager] Helper loop started");
    }
}
exports.gameManager = GameManager.getInstance();
