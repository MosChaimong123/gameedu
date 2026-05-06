"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractGameEngine = void 0;
class AbstractGameEngine {
    constructor(pin, hostId, setId, settings, questions, io) {
        // --- Persistence Flags ---
        this.hasArchived = false;
        /** หลัง sync EXP เข้าห้องเรียน (Negamon + negamonRewardClassroomId) สำเร็จ */
        this.negamonClassroomRewardsSynced = false;
        this.pin = pin;
        this.hostId = hostId;
        this.setId = setId;
        this.status = "LOBBY";
        this.players = [];
        this.settings = settings;
        this.questions = questions;
        this.io = io;
        this.playerReconnectTokens = new Map();
    }
    setIO(io) {
        this.io = io;
    }
    // --- Player Management ---
    addPlayer(player, socket) {
        void socket;
        this.players.push(player);
        this.statusUpdate();
    }
    removePlayer(socketId) {
        const removedPlayer = this.players.find((p) => p.id === socketId);
        if (removedPlayer) {
            this.playerReconnectTokens.delete(removedPlayer.name);
        }
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
    registerHostConnection(socketId, reconnectToken) {
        this.hostSocketId = socketId;
        this.hostReconnectToken = reconnectToken;
    }
    reconnectHost(socketId, reconnectToken) {
        if (!this.hostReconnectToken || reconnectToken !== this.hostReconnectToken) {
            return false;
        }
        this.hostSocketId = socketId;
        return true;
    }
    isHostSocket(socketId) {
        return this.hostSocketId === socketId;
    }
    registerPlayerReconnectToken(playerName, reconnectToken) {
        this.playerReconnectTokens.set(playerName, reconnectToken);
    }
    getPlayerReconnectToken(playerName) {
        return this.playerReconnectTokens.get(playerName);
    }
    canReconnectPlayer(playerName, reconnectToken) {
        if (!reconnectToken)
            return false;
        const expected = this.playerReconnectTokens.get(playerName);
        if (expected === reconnectToken)
            return true;
        const player = this.players.find((p) => p.name === playerName);
        // After persistence recovery, socket ids and token map are cleared but roster remains.
        // Allow first rebind using the client's stored token, then register it on join.
        if (player && player.id === "" && expected === undefined) {
            return true;
        }
        return false;
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
            settings: this.settings,
            gameMode: this.gameMode
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
        this.hostSocketId = undefined;
        this.hostReconnectToken = undefined;
        this.playerReconnectTokens.clear();
    }
}
exports.AbstractGameEngine = AbstractGameEngine;
