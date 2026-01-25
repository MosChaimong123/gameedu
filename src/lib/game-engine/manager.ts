
import { AbstractGameEngine } from "./abstract-game";
import { GoldQuestEngine } from "./gold-quest-engine";
import { CryptoHackEngine } from "./crypto-hack-engine";

class GameManager {
    private static instance: GameManager;
    private games: Map<string, AbstractGameEngine>;
    private loopInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.games = new Map();
        this.startGameLoop();
    }

    public static getInstance(): GameManager {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager();
        }
        return GameManager.instance;
    }

    public createGame(
        mode: "GOLD_QUEST" | "CLASSIC" | "CRYPTO_HACK",
        pin: string,
        hostId: string,
        setId: string,
        settings: any,
        questions: any[],
        io: any
    ): AbstractGameEngine {
        let game: AbstractGameEngine;

        if (mode === "GOLD_QUEST") {
            game = new GoldQuestEngine(pin, hostId, setId, settings, questions, io);
        } else if (mode === "CRYPTO_HACK") {
            game = new CryptoHackEngine(pin, hostId, setId, settings, questions, io);
        } else {
            // Default fallback
            game = new GoldQuestEngine(pin, hostId, setId, settings, questions, io);
        }

        this.games.set(pin, game);
        this.saveGame(game); // Initial Save
        console.log(`[GameManager] Created game ${pin} (Mode: ${mode})`);
        return game;
    }

    public getGame(pin: string): AbstractGameEngine | undefined {
        return this.games.get(pin);
    }

    public findGameBySocket(socketId: string): AbstractGameEngine | undefined {
        for (const game of this.games.values()) {
            if (game.getPlayer(socketId)) {
                return game;
            }
        }
        return undefined;
    }

    public removeGame(pin: string) {
        this.games.delete(pin);
        this.deleteGameOnDb(pin);
        console.log(`[GameManager] Removed game ${pin}`);
    }

    // --- Persistence ---

    private async saveGame(game: AbstractGameEngine) {
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
        } catch (err) {
            console.error(`[Persistence] Failed to save game ${game.pin}`, err);
        }
    }

    private async deleteGameOnDb(pin: string) {
        try {
            const { PrismaClient } = require("@prisma/client");
            const prisma = new PrismaClient();
            await prisma.activeGame.delete({ where: { pin } }).catch(() => { });
        } catch (err) {
            console.error(`[Persistence] Failed to delete game ${pin}`, err);
        }
    }

    public async recoverGames() {
        console.log("[Persistence] Recovering games...");
        try {
            const { PrismaClient } = require("@prisma/client");
            const prisma = new PrismaClient();
            const activeGames = await prisma.activeGame.findMany();

            for (const record of activeGames) {
                if (this.games.has(record.pin)) continue;

                // Re-instantiate
                // Defaulting to GoldQuestEngine for now as it's the only one
                const game = new GoldQuestEngine(
                    record.pin,
                    record.hostId,
                    "", // SetId might be missing in record if we didn't save it separate, but it's in serialize? Ah, abstract game has it.
                    record.settings,
                    record.questions as any[],
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
        } catch (err) {
            console.error("[Persistence] Recovery failed", err);
        }
    }

    // We need IO to recover games properly.
    // Let's add setIO or pass it to recoverGames.
    public setIO(io: any) {
        this.io = io;
        // Propagate to all existing games (especially recovered ones)
        for (const game of this.games.values()) {
            game.setIO(io);
        }
    }
    private io: any;


    // --- Global Loop ---

    private startGameLoop() {
        if (this.loopInterval) return;

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

export const gameManager = GameManager.getInstance();
