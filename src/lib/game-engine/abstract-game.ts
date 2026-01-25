
import { Server, Socket } from "socket.io";
import { db as prisma } from "../db";
import { GameSession, BasePlayer } from "../types/game";

export abstract class AbstractGameEngine {
    public abstract gameMode: string; // Enforce game mode definition
    public pin: string;
    public hostId: string;
    public setId: string;
    public status: "LOBBY" | "PLAYING" | "ENDED";
    public players: BasePlayer[];
    public settings: any;
    public startTime?: number;
    public endTime?: number;
    public questions: any[];
    protected io: any; // SocketIO.Server

    constructor(
        pin: string,
        hostId: string,
        setId: string,
        settings: any,
        questions: any[],
        io: any
    ) {
        this.pin = pin;
        this.hostId = hostId;
        this.setId = setId;
        this.status = "LOBBY";
        this.players = [];
        this.settings = settings;
        this.questions = questions;
        this.io = io;
    }

    public setIO(io: any) {
        this.io = io;
    }

    // --- Player Management ---

    public addPlayer(player: BasePlayer, socket: Socket): void {
        this.players.push(player);
        this.statusUpdate();
    }

    public removePlayer(socketId: string): void {
        this.players = this.players.filter(p => p.id !== socketId);
        this.statusUpdate();
    }

    public getPlayer(socketId: string): BasePlayer | undefined {
        return this.players.find(p => p.id === socketId);
    }

    public handleReconnection(player: BasePlayer, socket: Socket): void {
        player.id = socket.id;
        player.isConnected = true;
        this.statusUpdate();
    }

    public handleDisconnect(socketId: string): void {
        const player = this.getPlayer(socketId);
        if (player) {
            player.isConnected = false;
            // Don't auto-remove, allow for reconnect
            // But maybe notify host?
        }
    }

    // --- Game Cycle ---

    public startGame(): void {
        this.status = "PLAYING";
        this.startTime = Date.now();
        this.io.to(this.pin).emit("game-started", {
            startTime: this.startTime,
            settings: this.settings
        });
    }

    public endGame(): void {
        this.status = "ENDED";
        this.endTime = Date.now();
        this.io.to(this.pin).emit("game-over", {
            players: this.players
        });

        // Auto-save history
        this.saveHistory().catch(err => {
            console.error(`[Game ${this.pin}] Failed to save history:`, err);
        });
    }

    private async saveHistory() {
        if (!this.startTime) return;

        try {
            await prisma.gameHistory.create({
                data: {
                    hostId: this.hostId,
                    gameMode: this.gameMode,
                    pin: this.pin,
                    startedAt: new Date(this.startTime),
                    endedAt: new Date(),
                    settings: this.settings,
                    players: JSON.parse(JSON.stringify(this.players)) // Ensure clean JSON
                }
            });
            console.log(`[Game ${this.pin}] History saved successfully.`);
        } catch (error) {
            console.error(`[Game ${this.pin}] Error saving history:`, error);
            throw error;
        }
    }

    // Called every second by the Manager
    public tick(): void {
        if (this.status !== "PLAYING") return;

        // Base Time Limit Check
        if (this.settings.winCondition === "TIME" && this.startTime && this.settings.timeLimitMinutes) {
            const now = Date.now();
            const elapsed = (now - this.startTime) / 1000;
            if (elapsed >= this.settings.timeLimitMinutes * 60) {
                this.endGame();
            }
        }
    }

    // Abstract methods to be implemented by specific derived classes
    public abstract handleEvent(eventName: string, payload: any, socket: Socket): void;

    // Helper to broadcast updates
    protected statusUpdate(): void {
        this.io.to(this.pin).emit("player-joined", { players: this.players });
        if (this.status === "PLAYING") {
            this.io.to(this.pin).emit("game-state-update", { players: this.players });
        }
    }

    // --- Serialization for Persistence ---

    public serialize(): any {
        return {
            pin: this.pin,
            hostId: this.hostId,
            setId: this.setId,
            status: this.status,
            settings: this.settings,
            players: this.players,
            questions: this.questions,
            startTime: this.startTime,
            endTime: this.endTime,
            // Derived classes will extend this
        };
    }

    public restore(data: any): void {
        this.pin = data.pin;
        this.hostId = data.hostId;
        this.setId = data.setId;
        this.status = data.status;
        this.settings = data.settings;
        this.questions = data.questions;
        this.startTime = data.startTime ? new Date(data.startTime).getTime() : undefined;
        this.endTime = data.endTime ? new Date(data.endTime).getTime() : undefined;

        // Players handling might need specific derived logic
        // But base properties are safe to restore here
        // Note: Socket connections are LOST on restart so isConnected will be false
        this.players = data.players.map((p: any) => ({
            ...p,
            isConnected: false, // Force disconnect state on restore
            id: "" // Reset Socket ID as it's invalid
        }));
    }
}
