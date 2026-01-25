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
    async saveGame(game) {
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
            console.error(`[Persistence] Failed to delete game ${pin}`, err);
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
                // Re-instantiate
                // Defaulting to GoldQuestEngine for now as it's the only one
                const game = new gold_quest_engine_1.GoldQuestEngine(record.pin, record.hostId, "", // SetId might be missing in record if we didn't save it separate, but it's in serialize? Ah, abstract game has it.
                record.settings, record.questions, 
                // IO is tricky. We need the IO instance. 
                // But GameManager doesn't hold IO unless we pass it.
                // We passed IO to createGame. We need to store IO in GameManager?
                // OR pass IO to recoverGames from server.ts?
                // Let's assume we can't easily get IO here without storing it.
                null // Temporary null, we need to fix this.
                );
                // restore data
                game.restore({
                    ...record,
                    // Map DB fields to Restore fields if needed
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
    // We need IO to recover games properly.
    // Let's add setIO or pass it to recoverGames.
    setIO(io) {
        this.io = io;
        // Propagate to all existing games (especially recovered ones)
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
                game.tick();
                // 2. Cleanup Stale Games
                if (game.status === "ENDED" && game.endTime && (now - game.endTime > 5 * 60 * 1000)) {
                    this.removeGame(pin);
                }
                // 3. Persistence Snapshot (Every 5 seconds)
                if (tickCount % 5 === 0 && game.status === "PLAYING") {
                    this.saveGame(game);
                }
            }
        }, 1000);
        console.log("[GameManager] Helper loop started");
    }
}
exports.gameManager = GameManager.getInstance();
