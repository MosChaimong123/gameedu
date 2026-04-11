
import type { Server } from "socket.io";
import type { Prisma } from "@prisma/client";
import { AbstractGameEngine, type GameQuestion } from "./abstract-game";
import { GoldQuestEngine } from "./gold-quest-engine";
import { CryptoHackEngine } from "./crypto-hack-engine";
import { NegamonBattleEngine } from "./negamon-battle-engine";
import { db } from "../db";
import type { GameSettings } from "../types/game";
import { toPrismaJson } from "../prisma-json";
import { syncNegamonBattleRewardsToClassroom } from "../negamon/sync-negamon-battle-rewards";

type GameMode = "GOLD_QUEST" | "CLASSIC" | "CRYPTO_HACK" | "NEGAMON_BATTLE";

type PersistedGameRecord = {
    pin: string;
    hostId: string;
    setId: string;
    status: "LOBBY" | "PLAYING" | "ENDED";
    settings: Partial<GameSettings>;
    players: AbstractGameEngine["players"];
    questions: GameQuestion[];
    startTime?: number | string;
    endTime?: number | string;
    state?: unknown;
};

function isGameQuestion(value: unknown): value is GameQuestion {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Record<string, unknown>;
    return (
        typeof candidate.id === "string" &&
        typeof candidate.question === "string" &&
        Array.isArray(candidate.options) &&
        typeof candidate.correctAnswer === "number"
    );
}

function parseQuestions(value: Prisma.JsonValue): GameQuestion[] {
    return Array.isArray(value) ? value.filter(isGameQuestion) : [];
}

function parseSettings(value: Prisma.JsonValue): Partial<GameSettings> {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as unknown as Partial<GameSettings>)
        : {};
}

function parseRequiredSettings(value: Prisma.JsonValue): GameSettings {
    return parseSettings(value) as GameSettings;
}

class GameManager {
    private static instance: GameManager;
    private games: Map<string, AbstractGameEngine>;
    private loopInterval: NodeJS.Timeout | null = null;
    private io: Server | null = null;

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
        mode: GameMode,
        pin: string,
        hostId: string,
        setId: string,
        settings: GameSettings,
        questions: GameQuestion[],
        io: Server
    ): AbstractGameEngine {
        let game: AbstractGameEngine;

        if (mode === "GOLD_QUEST") {
            game = new GoldQuestEngine(pin, hostId, setId, settings, questions, io);
        } else if (mode === "CRYPTO_HACK") {
            game = new CryptoHackEngine(pin, hostId, setId, settings, questions, io);
        } else if (mode === "NEGAMON_BATTLE") {
            game = new NegamonBattleEngine(pin, hostId, setId, settings, questions, io);
        } else {
            // CLASSIC or unknown → Gold Quest
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

    public findGameByHostSocket(socketId: string): AbstractGameEngine | undefined {
        for (const game of this.games.values()) {
            if (game.isHostSocket(socketId)) {
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

    public setIO(io: Server) {
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
                    setId: game.setId,
                    gameMode: game.gameMode,
                    pin: game.pin,
                    startedAt: new Date(game.startTime),
                    endedAt: new Date(game.endTime || Date.now()),
                    settings: toPrismaJson(game.settings),
                    players: toPrismaJson(game.players)
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
                    state: data.state === undefined ? undefined : toPrismaJson(data.state),
                    players: toPrismaJson(data.players),
                    settings: toPrismaJson(data.settings),
                    startTime: data.startTime ? new Date(data.startTime) : null,
                },
                create: {
                    pin: game.pin,
                    gameMode: game.gameMode, // Dynamic game mode
                    hostId: game.hostId,
                    settings: toPrismaJson(data.settings),
                    players: toPrismaJson(data.players),
                    questions: toPrismaJson(data.questions),
                    startTime: data.startTime ? new Date(data.startTime) : null,
                    state: data.state === undefined ? undefined : toPrismaJson(data.state)
                }
            });
        } catch (err) {
            console.error(`[Persistence] Failed to save game ${game.pin}`, err);
        }
    }

    private async deleteGameOnDb(pin: string) {
        try {
            await db.activeGame.delete({ where: { pin } }).catch(() => { });
        } catch {
            // Ignore error if already deleted
        }
    }

    public async recoverGames() {
        console.log("[Persistence] Recovering games...");
        try {
            // Battle RPG mode removed — drop any persisted sessions
            const removedBattle = await db.activeGame.deleteMany({
                where: { gameMode: "BATTLE_TURN" },
            });
            if (removedBattle.count > 0) {
                console.log(`[Persistence] Removed ${removedBattle.count} BATTLE_TURN game(s)`);
            }

            // Auto-delete stale games older than 24 hours
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const stale = await db.activeGame.deleteMany({ where: { updatedAt: { lt: cutoff } } });
            if (stale.count > 0) console.log(`[Persistence] Cleaned up ${stale.count} stale game(s)`);

            const activeGames = await db.activeGame.findMany();

            for (const record of activeGames) {
                if (this.games.has(record.pin)) continue;

                let game: AbstractGameEngine;

                if (record.gameMode === "CRYPTO_HACK") {
                    game = new CryptoHackEngine(
                        record.pin,
                        record.hostId,
                        "",
                        parseRequiredSettings(record.settings),
                        parseQuestions(record.questions),
                        null as unknown as Server
                    );
                } else if (record.gameMode === "NEGAMON_BATTLE") {
                    game = new NegamonBattleEngine(
                        record.pin,
                        record.hostId,
                        "",
                        parseSettings(record.settings),
                        parseQuestions(record.questions),
                        null as unknown as Server
                    );
                } else {
                    // Default to Gold Quest
                    game = new GoldQuestEngine(
                        record.pin,
                        record.hostId,
                        "",
                        parseSettings(record.settings),
                        parseQuestions(record.questions),
                        null as unknown as Server
                    );
                }

                // restore data
                const persistedRecord: PersistedGameRecord = {
                    pin: record.pin,
                    hostId: record.hostId,
                    setId: "",
                    status: "PLAYING",
                    settings: parseSettings(record.settings),
                    players: [],
                    questions: parseQuestions(record.questions),
                    startTime: record.startTime?.toISOString(),
                    state: record.state,
                };
                if (Array.isArray(record.players)) {
                    persistedRecord.players = record.players as PersistedGameRecord["players"];
                }
                game.restore(persistedRecord);

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

                // 2. Negamon live battle → classroom EXP (once, if host linked a classroom)
                // ตั้ง flag ก่อน call async เพื่อป้องกัน tick ถัดไป trigger ซ้ำ (race condition)
                if (
                    game.status === "ENDED" &&
                    game.gameMode === "NEGAMON_BATTLE" &&
                    game.settings.negamonRewardClassroomId &&
                    !game.negamonClassroomRewardsSynced
                ) {
                    game.negamonClassroomRewardsSynced = true;
                    void syncNegamonBattleRewardsToClassroom(game)
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

export const gameManager = GameManager.getInstance();
