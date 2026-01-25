"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoldQuestEngine = void 0;
const abstract_game_1 = require("./abstract-game");
const gold_quest_1 = require("../game/gold-quest");
class GoldQuestEngine extends abstract_game_1.AbstractGameEngine {
    constructor(pin, hostId, setId, settings, questions, io) {
        super(pin, hostId, setId, settings, questions, io);
        this.gameMode = "GOLD_QUEST";
    }
    getPlayer(socketId) {
        return super.getPlayer(socketId);
    }
    addPlayer(player, socket) {
        // Initialize specific Gold Quest properties
        player.gold = 0;
        player.multiplier = 1;
        player.streak = 0;
        super.addPlayer(player, socket);
    }
    handleEvent(eventName, payload, socket) {
        switch (eventName) {
            case "open-chest":
                this.handleOpenChest(socket);
                break;
            case "use-interaction":
                this.handleInteraction(socket, payload);
                break;
            case "submit-answer":
                this.handleSubmitAnswer(socket, payload);
                break;
            case "request-question":
                this.handleRequestQuestion(socket);
                break;
        }
    }
    tick() {
        super.tick(); // Checks Time Limit
        // Check Gold Goal
        if (this.status === "PLAYING" && this.settings.winCondition === "GOLD") {
            const winner = this.players.find(p => p.gold >= this.settings.goldGoal);
            if (winner) {
                this.endGame();
            }
        }
    }
    // --- Specific Logic ---
    handleOpenChest(socket) {
        if (this.status !== "PLAYING")
            return;
        const player = this.getPlayer(socket.id);
        if (!player)
            return;
        const reward = (0, gold_quest_1.generateChestReward)();
        let newTotal = player.gold;
        if (reward.type === "GOLD") {
            const amount = reward.value * player.multiplier;
            player.gold += amount;
            newTotal = player.gold;
            player.multiplier = 1;
        }
        else if (reward.type === "MULTIPLIER") {
            player.multiplier = reward.value;
        }
        else if (reward.type === "LOSE_GOLD") {
            const loss = Math.floor(player.gold * (reward.value / 100));
            player.gold = Math.max(0, player.gold - loss);
            newTotal = player.gold;
        }
        socket.emit("chest-result", { reward, newTotal });
        this.statusUpdate(); // Broadcast new scores
    }
    handleInteraction(socket, payload) {
        const { targetId, type } = payload;
        const actor = this.getPlayer(socket.id);
        const victim = this.getPlayer(targetId);
        if (!actor || !victim)
            return;
        if (type === "SWAP") {
            const temp = actor.gold;
            actor.gold = victim.gold;
            victim.gold = temp;
            this.io.to(victim.id).emit("player-gold-update", { gold: victim.gold });
        }
        else if (type === "STEAL") {
            const stealPercent = 25; // Could be config
            const stealAmount = Math.floor(victim.gold * (stealPercent / 100));
            victim.gold -= stealAmount;
            actor.gold += stealAmount;
            this.io.to(victim.id).emit("player-gold-update", { gold: victim.gold });
        }
        this.io.to(actor.id).emit("player-gold-update", { gold: actor.gold });
        // Broadcast effect event for feed
        this.io.to(this.pin).emit("interaction-effect", {
            source: actor.name,
            target: victim.name,
            type,
            amount: 0
        });
        this.statusUpdate();
    }
    handleSubmitAnswer(socket, payload) {
        const { questionId, answerIndex } = payload;
        const question = this.questions.find(q => q.id === questionId);
        if (!question)
            return;
        const isCorrect = question.correctAnswer === answerIndex;
        socket.emit("answer-result", { correct: isCorrect });
    }
    handleRequestQuestion(socket) {
        if (!this.questions || this.questions.length === 0)
            return;
        // Random question
        // In future: Track seen questions per player
        const q = this.questions[Math.floor(Math.random() * this.questions.length)];
        socket.emit("next-question", {
            id: q.id,
            question: q.question,
            options: q.options,
            timeLimit: q.timeLimit,
            image: q.image
        });
    }
    endGame() {
        // Sync gold to generic score for history/leaderboards
        this.players.forEach(p => {
            p.score = p.gold;
        });
        // Sort players before sending
        this.players.sort((a, b) => b.gold - a.gold);
        super.endGame();
    }
    // --- Persistence ---
    serialize() {
        const base = super.serialize();
        return {
            ...base,
            gameMode: "GOLD_QUEST",
            // No extra global state for now, but good hook for later
            state: {}
        };
    }
    restore(data) {
        super.restore(data);
        // Any specific state restoration can go here
        // Players are already restored by base
    }
}
exports.GoldQuestEngine = GoldQuestEngine;
