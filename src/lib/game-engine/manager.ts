

import { AbstractGameEngine } from "./abstract-game";
import { GoldQuestEngine } from "./gold-quest-engine";
import { CryptoHackEngine } from "./crypto-hack-engine";
import { db } from "../db";

class GameManager {
    private static instance: GameManager;
    private games: Map<string, AbstractGameEngine>;
    private loopInterval: NodeJS.Timeout | null = null;
    private io: any;

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

    public setIO(io: any) {
        this.io = io;
        for (const game of this.games.values()) {
            game.setIO(io);
        }
    }

    // --- Persistence ---

    private async saveGameToHistory(game: AbstractGameEngine) {
        if (!game.startTime || game.hasArchived) return;

        try {
            await db.gameHistory.create({
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
        } catch (err) {
            console.error(`[Persistence] Failed to archive history for ${game.pin}`, err);
        }
    }

    private async saveGame(game: AbstractGameEngine) {
        // ... (existing save logic)
        try {
            const data = game.serialize();

            await db.activeGame.upsert({
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
            await db.activeGame.delete({ where: { pin } }).catch(() => { });
        } catch (err) {
            // Ignore error if already deleted
        }
    }

    public async recoverGames() {
        console.log("[Persistence] Recovering games...");
        try {
            const activeGames = await db.activeGame.findMany();

            for (const record of activeGames) {
                if (this.games.has(record.pin)) continue;

                let game: AbstractGameEngine;

                if (record.gameMode === "CRYPTO_HACK") {
                    game = new CryptoHackEngine(
                        record.pin,
                        record.hostId,
                        "",
                        record.settings as any,
                        record.questions as any[],
                        null as any
                    );
                } else {
                    // Default to Gold Quest
                    game = new GoldQuestEngine(
                        record.pin,
                        record.hostId,
                        "",
                        record.settings as any,
                        record.questions as any[],
                        null as any
                    );
                }

                // restore data
                game.restore({
                    ...record,
                    state: record.state
                });

                this.games.set(record.pin, game);
                console.log(`[Persistence] Recovered game ${record.pin} (${record.gameMode})`);
            }
        } catch (err) {
            console.error("[Persistence] Recovery failed", err);
        }
    }

    // --- Global Loop ---

    private startGameLoop() {
        if (this.loopInterval) return;

        let tickCount = 0;

        this.loopInterval = setInterval(() => {
            const now = Date.now();
            tickCount++;

            for (const [pin, game] of this.games.entries()) {
                // 1. Tick logic
                try {
                    game.tick();
                } catch (e) {
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

export const gameManager = GameManager.getInstance();
