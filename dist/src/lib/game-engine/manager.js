"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameManager = void 0;
const gold_quest_engine_1 = require("./gold-quest-engine");
const crypto_hack_engine_1 = require("./crypto-hack-engine");
class GameManager {
    constructor() {
        this.loopInterval = null;
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
        else {
            // Default fallback
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
    removeGame(pin) {
        this.games.delete(pin);
        this.deleteGameOnDb(pin);
        console.log(`[GameManager] Removed game ${pin}`);
    }
    // --- Persistence ---
    async saveGameToHistory(game) {
        if (!game.startTime || game.hasArchived)
            return;
        try {
            const { PrismaClient } = require("@prisma/client");
            const prisma = new PrismaClient();
            await prisma.gameHistory.create({
                data: {
                    hostId: game.hostId,
                    gameMode: game.gameMode,
                    pin: game.pin,
                    startedAt: new Date(game.startTime),
                    endedAt: new Date(game.endTime || Date.now()),
                    settings: game.settings,
                    players: JSON.parse(JSON.stringify(game.players))
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
            const { PrismaClient } = require("@prisma/client");
            const prisma = new PrismaClient(); // In prod, use singleton prisma
            const data = game.serialize();
            await prisma.activeGame.upsert({
                where: { pin: game.pin },
                update: {
                    state: data.state,
                    players: data.players, // JSON
                    settings: data.settings,
                    startTime: data.startTime ? new Date(data.startTime) : null,
                },
                create: {
                    pin: game.pin,
                    gameMode: game.gameMode, // Dynamic game mode
                    hostId: game.hostId,
                    settings: data.settings,
                    players: data.players,
                    questions: data.questions,
                    startTime: data.startTime ? new Date(data.startTime) : null,
                    state: data.state
                }
            });
        }
        catch (err) {
            console.error(`[Persistence] Failed to save game ${game.pin}`, err);
        }
    }
    async deleteGameOnDb(pin) {
        try {
            const { PrismaClient } = require("@prisma/client");
            const prisma = new PrismaClient();
            await prisma.activeGame.delete({ where: { pin } }).catch(() => { });
        }
        catch (err) {
            // Ignore error if already deleted
        }
    }
    async recoverGames() {
        console.log("[Persistence] Recovering games...");
        try {
            const { PrismaClient } = require("@prisma/client");
            const prisma = new PrismaClient();
            const activeGames = await prisma.activeGame.findMany();
            for (const record of activeGames) {
                if (this.games.has(record.pin))
                    continue;
                // Re-instantiate based on mode
                // TODO: Support CryptoHack recovery properly (need serialization fix)
                const game = new gold_quest_engine_1.GoldQuestEngine(record.pin, record.hostId, "", record.settings, record.questions, null);
                // restore data
                game.restore({
                    ...record,
                    state: record.state
                });
                this.games.set(record.pin, game);
                console.log(`[Persistence] Recovered game ${record.pin}`);
            }
        }
        catch (err) {
            console.error("[Persistence] Recovery failed", err);
        }
    }
    setIO(io) {
        this.io = io;
        for (const game of this.games.values()) {
            game.setIO(io);
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
                // 2. Check for End & Archive
                if (game.status === "ENDED" && !game.hasArchived) {
                    this.saveGameToHistory(game);
                }
                // 3. Cleanup Stale Games
                if (game.status === "ENDED" && game.endTime && (now - game.endTime > 5 * 60 * 1000)) {
                    this.removeGame(pin);
                }
                // 4. Persistence Snapshot (Every 5 seconds)
                if (tickCount % 5 === 0 && game.status === "PLAYING") {
                    this.saveGame(game);
                }
            }
        }, 1000);
        console.log("[GameManager] Helper loop started");
    }
}
exports.gameManager = GameManager.getInstance();
