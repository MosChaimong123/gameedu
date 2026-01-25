"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractGameEngine = void 0;
class AbstractGameEngine {
    constructor(pin, hostId, setId, settings, questions, io) {
        // --- Persistence Flags ---
        this.hasArchived = false;
        this.pin = pin;
        this.hostId = hostId;
        this.setId = setId;
        this.status = "LOBBY";
        this.players = [];
        this.settings = settings;
        this.questions = questions;
        this.io = io;
    }
    setIO(io) {
        this.io = io;
    }
    // --- Player Management ---
    addPlayer(player, socket) {
        this.players.push(player);
        this.statusUpdate();
    }
    removePlayer(socketId) {
        this.players = this.players.filter(p => p.id !== socketId);
        this.statusUpdate();
    }
    getPlayer(socketId) {
        return this.players.find(p => p.id === socketId);
    }
    handleReconnection(player, socket) {
        player.id = socket.id;
        player.isConnected = true;
        this.statusUpdate();
    }
    handleDisconnect(socketId) {
        const player = this.getPlayer(socketId);
        if (player) {
            player.isConnected = false;
            // Don't auto-remove, allow for reconnect
            // But maybe notify host?
        }
    }
    // --- Game Cycle ---
    startGame() {
        this.status = "PLAYING";
        this.startTime = Date.now();
        this.io.to(this.pin).emit("game-started", {
            startTime: this.startTime,
            settings: this.settings
        });
    }
    endGame() {
        this.status = "ENDED";
        this.endTime = Date.now();
        this.io.to(this.pin).emit("game-over", {
            players: this.players
        });
        // History saving is now handled by GameManager
    }
    // Called every second by the Manager
    tick() {
        if (this.status !== "PLAYING")
            return;
        // Base Time Limit Check
        if (this.settings.winCondition === "TIME" && this.startTime && this.settings.timeLimitMinutes) {
            const now = Date.now();
            const elapsed = (now - this.startTime) / 1000;
            if (elapsed >= this.settings.timeLimitMinutes * 60) {
                this.endGame();
            }
        }
    }
    // Helper to broadcast updates
    statusUpdate() {
        this.io.to(this.pin).emit("player-joined", { players: this.players });
        if (this.status === "PLAYING") {
            this.io.to(this.pin).emit("game-state-update", { players: this.players });
        }
    }
    // --- Serialization for Persistence ---
    serialize() {
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
    restore(data) {
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
        this.players = data.players.map((p) => ({
            ...p,
            isConnected: false, // Force disconnect state on restore
            id: "" // Reset Socket ID as it's invalid
        }));
    }
}
exports.AbstractGameEngine = AbstractGameEngine;
